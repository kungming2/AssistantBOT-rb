import { Hono } from 'hono';
import type {
  OnAppInstallRequest,
  OnAppUpgradeRequest,
  OnPostFlairUpdateRequest,
  OnPostSubmitRequest,
  TriggerResponse,
} from '@devvit/web/shared';
import { handlePostFlairUpdated, handlePostSubmitted } from '../core/artemisPosts';
import {
  loadSubredditConfig,
  loadSubredditConfigWithSource,
  type ArtemisSubredditConfigLoadResult,
} from '../core/artemisConfig';
import {
  initializeSubredditState,
  isFlairEnforcementEnabled,
} from '../core/artemisStorage';
import { recordStatsPostFromTrigger } from '../core/artemisStatsRecorder';
import { initializeStatsWikiPage } from '../core/artemisStatsWiki';
import { getPublicPostFlairs } from '../core/artemisFlair';
import { sendModeratorNotification } from '../core/artemisModmail';
import {
  msgModInstallLegacyConfigDetected,
  msgModInstallNoPublicFlairsWarning,
  msgModInstallOnboarding,
} from '../core/text';
import type { ArtemisSubredditConfig } from '../core/artemisTypes';

export const triggers = new Hono();

async function initializeSubredditInstall(
  subredditName: string
): Promise<ArtemisSubredditConfigLoadResult> {
  await initializeSubredditState(subredditName);
  const configResult = await loadSubredditConfigWithSource(subredditName);
  const { config } = configResult;
  if (config.statistics_updating_enabled) {
    try {
      await initializeStatsWikiPage(subredditName);
    } catch (err) {
      console.warn(`Artemis Install: statistics wiki setup failed for r/${subredditName}.`, err);
    }
  }
  return configResult;
}

async function loadTriggerConfig(
  subredditName: string | undefined
): Promise<ArtemisSubredditConfig | undefined> {
  return subredditName ? loadSubredditConfig(subredditName) : undefined;
}

async function sendInstallOnboardingNotification(
  subredditName: string,
  subredditId: string,
  legacyConfigApplied: boolean
): Promise<void> {
  let bodyMarkdown = msgModInstallOnboarding(subredditName);

  if (legacyConfigApplied) {
    bodyMarkdown += msgModInstallLegacyConfigDetected(subredditName);
  }

  if (await isFlairEnforcementEnabled(subredditName)) {
    try {
      const publicFlairs = await getPublicPostFlairs(subredditName);
      if (!publicFlairs.length) {
        bodyMarkdown += msgModInstallNoPublicFlairsWarning(subredditName);
      }
    } catch (err) {
      console.warn(`Artemis Install: could not check public flairs for r/${subredditName}.`, err);
    }
  }

  await sendModeratorNotification({
    subredditName,
    subredditId,
    subject: 'Artemis is now active',
    bodyMarkdown,
    logContext: 'install onboarding',
  });
}

triggers.post('/on-app-install', async (c) => {
  const input = await c.req.json<OnAppInstallRequest>();
  console.log('App installed to subreddit: r/' + input.subreddit?.name);
  if (input.subreddit?.name) {
    const configResult = await initializeSubredditInstall(input.subreddit.name);
    if (input.subreddit.id) {
      await sendInstallOnboardingNotification(
        input.subreddit.name,
        input.subreddit.id,
        configResult.legacyConfigApplied
      );
    }
  }

  return c.json<TriggerResponse>(
    {
      status: 'success',
    },
    200
  );
});

triggers.post('/on-app-upgrade', async (c) => {
  const input = await c.req.json<OnAppUpgradeRequest>();
  console.log('App upgraded on subreddit: r/' + input.subreddit?.name);
  if (input.subreddit?.name) {
    await initializeSubredditInstall(input.subreddit.name);
  }

  return c.json<TriggerResponse>(
    {
      status: 'success',
    },
    200
  );
});

triggers.post('/on-post-submit', async (c) => {
  const input = await c.req.json<OnPostSubmitRequest>();
  const config = await loadTriggerConfig(input.subreddit?.name);
  if (config?.statistics_updating_enabled !== false) {
    await recordStatsPostFromTrigger({
      post: input.post,
      subredditName: input.subreddit?.name,
    });
  }
  await handlePostSubmitted({
    post: input.post,
    author: input.author,
    subredditName: input.subreddit?.name,
    ...(config ? { config } : {}),
  });

  return c.json<TriggerResponse>(
    {
      status: 'success',
    },
    200
  );
});

triggers.post('/on-post-flair-update', async (c) => {
  const input = await c.req.json<OnPostFlairUpdateRequest>();
  const config = await loadTriggerConfig(input.subreddit?.name);
  if (config?.statistics_updating_enabled !== false) {
    await recordStatsPostFromTrigger({
      post: input.post,
      subredditName: input.subreddit?.name,
    });
  }
  await handlePostFlairUpdated({
    post: input.post,
    author: input.author,
    subredditName: input.subreddit?.name,
    ...(config ? { config } : {}),
  });

  return c.json<TriggerResponse>(
    {
      status: 'success',
    },
    200
  );
});
