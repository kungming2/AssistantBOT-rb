import { Hono } from 'hono';
import type { TaskRequest, TaskResponse } from '@devvit/web/server';
import { ARTEMIS_JOBS } from '../core/artemisSettings';
import { checkSubmittedPost, reconcileFilteredPosts } from '../core/artemisPosts';
import {
  recordDailyStatsForInstalledSubreddits,
  recordMonthlyStatsForInstalledSubreddits,
} from '../core/artemisStatsRecorder';
import { updateStatsWikiPages } from '../core/artemisStatsWiki';

export const schedulerRoutes = new Hono();
const TASK_OK = { status: 'ok' } satisfies TaskResponse;

schedulerRoutes.post('/artemis-check-submitted-post', async (c) => {
  const input = await c.req.json<TaskRequest<{ postId?: string; subredditName?: string }>>();

  if (input.name !== ARTEMIS_JOBS.checkSubmittedPost) {
    console.warn(`Unknown scheduled task: ${input.name}`);
    return c.json<TaskResponse>(TASK_OK, 200);
  }

  if (input.data?.postId && input.data?.subredditName) {
    await checkSubmittedPost(input.data.postId, input.data.subredditName);
  }

  return c.json<TaskResponse>(TASK_OK, 200);
});

schedulerRoutes.post('/artemis-reconcile-filtered-posts', async (c) => {
  const input = await c.req.json<TaskRequest>();

  if (input.name !== ARTEMIS_JOBS.reconcileFilteredPosts) {
    console.warn(`Unknown scheduled task: ${input.name}`);
    return c.json<TaskResponse>(TASK_OK, 200);
  }

  await reconcileFilteredPosts();
  return c.json<TaskResponse>(TASK_OK, 200);
});

schedulerRoutes.post('/artemis-record-daily-stats', async (c) => {
  const input = await c.req.json<TaskRequest>();

  if (input.name !== ARTEMIS_JOBS.recordDailyStats) {
    console.warn(`Unknown scheduled task: ${input.name}`);
    return c.json<TaskResponse>(TASK_OK, 200);
  }

  const subredditNames = await recordDailyStatsForInstalledSubreddits();
  await updateStatsWikiPages(subredditNames);
  return c.json<TaskResponse>(TASK_OK, 200);
});

schedulerRoutes.post('/artemis-record-monthly-stats', async (c) => {
  const input = await c.req.json<TaskRequest>();

  if (input.name !== ARTEMIS_JOBS.recordMonthlyStats) {
    console.warn(`Unknown scheduled task: ${input.name}`);
    return c.json<TaskResponse>(TASK_OK, 200);
  }

  const subredditNames = await recordMonthlyStatsForInstalledSubreddits();
  await updateStatsWikiPages(subredditNames);
  return c.json<TaskResponse>(TASK_OK, 200);
});
