import { Hono } from 'hono';
import type { MenuItemRequest } from '@devvit/web/shared';
import { checkRecentPostsForMissingFlair } from '../core/artemisPosts';
import {
  recordSubredditDailyStats,
  recordSubredditUserFlairAggregates,
  recordSubredditUserFlairStats,
} from '../core/artemisStatsRecorder';
import { updateStatsWikiPage } from '../core/artemisStatsWiki';
import { loadSubredditConfig } from '../core/artemisConfig';
import {
  sendDiscordRecentPostRefreshAlert,
  sendDiscordStatisticsAlert,
} from '../core/artemisDiscord';

type ToastResponse = {
  showToast: {
    text: string;
    appearance: 'neutral' | 'success';
  };
};

export const menuRoutes = new Hono();

function toast(text: string, appearance: ToastResponse['showToast']['appearance']): ToastResponse {
  return {
    showToast: {
      text,
      appearance,
    },
  };
}

async function subredditNameFromMenuRequest(request: Request): Promise<string | ToastResponse> {
  const input = (await request.json()) as MenuItemRequest;
  if (input.location !== 'subreddit') {
    return toast('Use this from the subreddit menu.', 'neutral');
  }

  const subredditName = request.headers.get('devvit-subreddit-name');
  if (!subredditName) {
    return toast('Artemis could not identify this subreddit.', 'neutral');
  }

  return subredditName;
}

menuRoutes.post('/check-recent-posts-flair', async (c) => {
  const subredditName = await subredditNameFromMenuRequest(c.req.raw);
  if (typeof subredditName !== 'string') {
    return c.json<ToastResponse>(subredditName, 200);
  }

  const result = await checkRecentPostsForMissingFlair(subredditName);
  await sendDiscordRecentPostRefreshAlert(await loadSubredditConfig(subredditName), {
    subredditName,
    checked: result.checked,
    unflaired: result.unflaired,
  });
  return c.json<ToastResponse>(
    toast(
      `Artemis checked ${result.checked} recent posts and found ${result.unflaired} without flair.`,
      'success'
    ),
    200
  );
});

menuRoutes.post('/refresh-statistics-page', async (c) => {
  const subredditName = await subredditNameFromMenuRequest(c.req.raw);
  if (typeof subredditName !== 'string') {
    return c.json<ToastResponse>(subredditName, 200);
  }

  const updated = await recordSubredditDailyStats(subredditName);
  if (!updated) {
    return c.json<ToastResponse>(
      toast(`Statistics updating is disabled for r/${subredditName}. Please enable it in app settings.`, 'neutral'),
      200
    );
  }

  await recordSubredditUserFlairStats(subredditName);
  await updateStatsWikiPage(subredditName);
  await sendDiscordStatisticsAlert(await loadSubredditConfig(subredditName), subredditName, 'manual');
  return c.json<ToastResponse>(
    toast(`Artemis refreshed the statistics page for r/${subredditName}.`, 'success'),
    200
  );
});

menuRoutes.post('/refresh-userflair-statistics', async (c) => {
  const subredditName = await subredditNameFromMenuRequest(c.req.raw);
  if (typeof subredditName !== 'string') {
    return c.json<ToastResponse>(subredditName, 200);
  }

  const config = await loadSubredditConfig(subredditName);
  if (!config.statistics_updating_enabled) {
    return c.json<ToastResponse>(
      toast(
        `Statistics updating is disabled for r/${subredditName}. Please enable it in app settings.`,
        'neutral'
      ),
      200
    );
  }
  if (!config.userflair_gathering_enabled) {
    return c.json<ToastResponse>(
      toast(
        `Userflair gathering is disabled for r/${subredditName}. Please enable it in app settings.`,
        'neutral'
      ),
      200
    );
  }

  const result = await recordSubredditUserFlairAggregates(subredditName);
  if (!result) {
    return c.json<ToastResponse>(
      toast(`Artemis could not refresh user flair statistics for r/${subredditName}.`, 'neutral'),
      200
    );
  }

  await updateStatsWikiPage(subredditName);
  await sendDiscordStatisticsAlert(config, subredditName, 'manual');
  return c.json<ToastResponse>(
    toast(
      `Artemis refreshed ${result.assignmentRows} user flair assignments across ${result.aggregateRows} flair values for r/${subredditName}.`,
      'success'
    ),
    200
  );
});
