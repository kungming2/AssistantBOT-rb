import type { ArtemisSubredditConfig } from './artemisTypes';

const DISCORD_WEBHOOK_HOST = 'discord.com';

type DiscordEmbed = {
  title: string;
  description: string;
  url?: string;
  color: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  footer?: { text: string };
  timestamp?: string;
};

type DiscordPayload = {
  username: string;
  embeds: DiscordEmbed[];
};

type DiscordStatisticsAlertType = 'daily' | 'monthly' | 'manual';

type DiscordFlairActionAlert = {
  subredditName: string;
  action: string;
  authorName: string;
  postTitle: string;
  postPermalink: string;
};

type DiscordRecentPostRefreshAlert = {
  subredditName: string;
  checked: number;
  unflaired: number;
};

function normalizeDiscordWebhookUrl(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return undefined;
  }

  if (url.protocol !== 'https:') {
    return undefined;
  }
  if (url.hostname.toLowerCase() !== DISCORD_WEBHOOK_HOST) {
    return undefined;
  }
  if (!url.pathname.startsWith('/api/webhooks/')) {
    return undefined;
  }

  return url.toString();
}

export function validateDiscordWebhookUrl(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value !== 'string') {
    return 'Discord webhook URL must be text.';
  }
  if (!normalizeDiscordWebhookUrl(value)) {
    return 'Enter a Discord webhook URL that starts with https://discord.com/api/webhooks/.';
  }
  return undefined;
}

function truncate(value: string, limit: number): string {
  if (value.length <= limit) {
    return value;
  }
  return `${value.slice(0, limit - 15)}... (truncated)`;
}

async function sendDiscordWebhook(
  config: ArtemisSubredditConfig,
  payload: DiscordPayload
): Promise<void> {
  const webhookUrl = normalizeDiscordWebhookUrl(config.discord_webhook_url);
  if (!webhookUrl) {
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      console.warn(`Artemis Discord: webhook returned HTTP ${response.status}.`);
    }
  } catch (err) {
    console.warn('Artemis Discord: could not send webhook alert.', err);
  }
}

export async function sendDiscordStatisticsAlert(
  config: ArtemisSubredditConfig,
  subredditName: string,
  alertType: DiscordStatisticsAlertType
): Promise<void> {
  if (!config.discord_alert_statistics_enabled) {
    return;
  }

  const title =
    alertType === 'monthly'
      ? 'Monthly statistics update completed'
      : alertType === 'manual'
        ? 'Manual statistics refresh completed'
        : 'Daily statistics update completed';

  await sendDiscordWebhook(config, {
    username: 'Artemis',
    embeds: [
      {
        title,
        description: `Artemis finished updating statistics for r/${subredditName}.`,
        url: `https://www.reddit.com/r/${subredditName}/wiki/assistantbot_statistics`,
        color: 0x3498db,
        timestamp: new Date().toISOString(),
      },
    ],
  });
}

export async function sendDiscordFlairActionAlert(
  config: ArtemisSubredditConfig,
  alert: DiscordFlairActionAlert
): Promise<void> {
  if (!config.discord_alert_flair_actions_enabled) {
    return;
  }

  await sendDiscordWebhook(config, {
    username: 'Artemis',
    embeds: [
      {
        title: alert.action,
        description: truncate(`[${alert.postTitle}](${alert.postPermalink})`, 4096),
        url: alert.postPermalink,
        color: 0xe67e22,
        fields: [
          { name: 'Subreddit', value: `r/${alert.subredditName}`, inline: true },
          { name: 'Author', value: `u/${alert.authorName}`, inline: true },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  });
}

export async function sendDiscordRecentPostRefreshAlert(
  config: ArtemisSubredditConfig,
  alert: DiscordRecentPostRefreshAlert
): Promise<void> {
  if (!config.discord_alert_flair_actions_enabled) {
    return;
  }

  await sendDiscordWebhook(config, {
    username: 'Artemis',
    embeds: [
      {
        title: 'Recent post flair refresh completed',
        description: `Artemis checked recent posts for missing flair in r/${alert.subredditName}.`,
        url: `https://www.reddit.com/r/${alert.subredditName}/new/`,
        color: 0xe67e22,
        fields: [
          { name: 'Checked', value: String(alert.checked), inline: true },
          { name: 'Missing flair', value: String(alert.unflaired), inline: true },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  });
}
