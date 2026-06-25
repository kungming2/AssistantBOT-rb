import { reddit, type Post } from '@devvit/web/server';
import type { PostV2 } from '@devvit/web/shared';
import type { T3 } from '@devvit/shared-types/tid.js';
import { ARTEMIS_JOBS, ARTEMIS_SETTINGS } from './artemisSettings';
import { toT3 } from './artemisIds';
import { getInstalledSubredditNames } from './artemisStorage';
import { convertToString, convertToUnix, monthConvertToString } from './timekeeping';
import {
  recordStatsRun,
  saveMonthlyTopPosts,
  saveStatsPostSnapshot,
  saveSubscriberSnapshot,
  type MonthlyTopPost,
  type StatsPostSnapshot,
} from './artemisStatsStorage';

type TriggerPost = PostV2 & { id: string };

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function previousUtcDate(): string {
  return convertToString(nowSeconds() - 86400);
}

function createdSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

function triggerSnapshot(post: TriggerPost, subredditName: string): StatsPostSnapshot {
  return {
    postId: toT3(post.id),
    subredditName: subredditName.toLowerCase(),
    authorName: '',
    title: post.title,
    permalink: post.permalink,
    createdAt: post.createdAt || nowSeconds(),
    updatedAt: nowSeconds(),
    flairText: post.linkFlair?.text ?? '',
    flairTemplateId: post.linkFlair?.templateId ?? '',
    score: post.upvotes - post.downvotes,
    commentCount: post.numComments,
    removed: false,
    nsfw: post.nsfw,
    spoiler: post.isSpoiler,
    isSelf: post.isSelf,
    url: post.url,
  };
}

function modelSnapshot(post: Post, subredditName: string): StatsPostSnapshot {
  return {
    postId: post.id,
    subredditName: subredditName.toLowerCase(),
    authorName: post.authorName,
    title: post.title,
    permalink: post.permalink,
    createdAt: createdSeconds(post.createdAt),
    updatedAt: nowSeconds(),
    flairText: post.flair?.text ?? '',
    flairTemplateId: post.flair?.templateId ?? '',
    score: post.score,
    commentCount: post.numberOfComments,
    removed: post.removed || post.spam,
    nsfw: post.nsfw,
    spoiler: post.spoiler,
    isSelf: post.body !== undefined,
    url: post.url,
  };
}

function topPostSnapshot(post: Post): MonthlyTopPost {
  return {
    postId: post.id,
    title: post.title,
    permalink: post.permalink,
    score: post.score,
    commentCount: post.numberOfComments,
    flairText: post.flair?.text ?? '',
    createdAt: createdSeconds(post.createdAt),
  };
}

export async function recordStatsPostFromTrigger(params: {
  post: PostV2 | undefined;
  subredditName: string | undefined;
}): Promise<void> {
  const post = params.post as TriggerPost | undefined;
  const subredditName = params.subredditName?.toLowerCase();
  if (!post || !subredditName) {
    return;
  }

  await saveStatsPostSnapshot(triggerSnapshot(post, subredditName));
}

export async function recordRecentPostSnapshots(subredditName: string): Promise<void> {
  const posts = await reddit
    .getNewPosts({
      subredditName,
      limit: ARTEMIS_SETTINGS.statsRecentPostLimit,
      pageSize: 100,
    })
    .all();

  for (const post of posts) {
    await saveStatsPostSnapshot(modelSnapshot(post, subredditName));
  }
}

export async function recordSubredditSubscriberSnapshot(
  subredditName: string,
  date = previousUtcDate()
): Promise<void> {
  const subredditInfo = await reddit.getSubredditInfoByName(subredditName);
  await saveSubscriberSnapshot(date, subredditInfo.subscribersCount ?? 0);
}

export async function recordSubredditDailyStats(
  subredditName: string,
  date = previousUtcDate()
): Promise<void> {
  await recordRecentPostSnapshots(subredditName);
  await recordSubredditSubscriberSnapshot(subredditName, date);
  await recordStatsRun(ARTEMIS_JOBS.recordDailyStats, nowSeconds());
}

export async function recordDailyStatsForInstalledSubreddits(): Promise<string[]> {
  const subredditNames = await getInstalledSubredditNames();
  for (const subredditName of subredditNames) {
    await recordSubredditDailyStats(subredditName);
  }
  return subredditNames;
}

export async function recordSubredditMonthlyStats(subredditName: string): Promise<void> {
  const posts = await reddit
    .getTopPosts({
      subredditName,
      timeframe: 'month',
      limit: ARTEMIS_SETTINGS.statsMonthlyTopLimit,
      pageSize: ARTEMIS_SETTINGS.statsMonthlyTopLimit,
    })
    .all();
  const month = monthConvertToString(convertToUnix(previousUtcDate()));

  await saveMonthlyTopPosts(month, posts.map(topPostSnapshot));
  await recordStatsRun(ARTEMIS_JOBS.recordMonthlyStats, nowSeconds());
}

export async function recordMonthlyStatsForInstalledSubreddits(): Promise<string[]> {
  const subredditNames = await getInstalledSubredditNames();
  for (const subredditName of subredditNames) {
    await recordSubredditMonthlyStats(subredditName);
  }
  return subredditNames;
}

export async function refreshStatsPost(postId: T3, subredditName: string): Promise<void> {
  const post = await reddit.getPostById(postId);
  await saveStatsPostSnapshot(modelSnapshot(post, subredditName));
}
