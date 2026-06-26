import { Hono } from 'hono';
import type {
  OnAppInstallRequest,
  OnAppUpgradeRequest,
  OnPostFlairUpdateRequest,
  OnPostSubmitRequest,
  TriggerResponse,
} from '@devvit/web/shared';
import { reddit } from '@devvit/web/server';
import type { T5 } from '@devvit/shared-types/tid.js';
import { handlePostFlairUpdated, handlePostSubmitted } from '../core/artemisPosts';
import { initializeSubredditState } from '../core/artemisStorage';
import { recordStatsPostFromTrigger } from '../core/artemisStatsRecorder';
import { initializeStatsWikiPage } from '../core/artemisStatsWiki';
import { msgModInstallOnboarding } from '../core/text';

export const triggers = new Hono();

async function initializeSubredditInstall(subredditName: string): Promise<void> {
  await initializeSubredditState(subredditName);
  await initializeStatsWikiPage(subredditName);
}

async function sendInstallOnboardingNotification(
  subredditName: string,
  subredditId: string
): Promise<void> {
  try {
    await reddit.modMail.createModNotification({
      subredditId: subredditId as T5,
      subject: 'Artemis is now active',
      bodyMarkdown: msgModInstallOnboarding(subredditName),
    });
  } catch (err) {
    console.warn(
      `Artemis Install: could not send onboarding Modmail notification for r/${subredditName}.`,
      err
    );
  }
}

triggers.post('/on-app-install', async (c) => {
  const input = await c.req.json<OnAppInstallRequest>();
  console.log('App installed to subreddit: r/' + input.subreddit?.name);
  if (input.subreddit?.name) {
    await initializeSubredditInstall(input.subreddit.name);
    if (input.subreddit.id) {
      await sendInstallOnboardingNotification(input.subreddit.name, input.subreddit.id);
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
  await recordStatsPostFromTrigger({
    post: input.post,
    subredditName: input.subreddit?.name,
  });
  await handlePostSubmitted({
    post: input.post,
    author: input.author,
    subredditName: input.subreddit?.name,
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
  await recordStatsPostFromTrigger({
    post: input.post,
    subredditName: input.subreddit?.name,
  });
  await handlePostFlairUpdated({
    post: input.post,
    author: input.author,
    subredditName: input.subreddit?.name,
  });

  return c.json<TriggerResponse>(
    {
      status: 'success',
    },
    200
  );
});
