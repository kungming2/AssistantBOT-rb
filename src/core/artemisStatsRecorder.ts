import { reddit, type Post } from '@devvit/web/server';
import type { PostV2 } from '@devvit/web/shared';
import type { T3 } from '@devvit/shared-types/tid.js';
import { ARTEMIS_JOBS, ARTEMIS_SETTINGS } from './artemisSettings';
import { loadSubredditConfig } from './artemisConfig';
import { toT3 } from './artemisIds';
import { getInstalledSubredditNames } from './artemisStorage';
import { convertToString, convertToUnix, monthConvertToString, normalizeUnixSeconds } from './timekeeping';
import {
  listStatsPostSnapshots,
  recordStatsRun,
  saveMonthlyTopCommentedPosts,
  saveMonthlyTopPosts,
  saveStatsPostSnapshot,
  saveSubscriberSnapshot,
  saveUserFlairAggregates,
  type MonthlyTopPost,
  type StatsPostSnapshot,
  type UserFlairAggregate,
} from './artemisStatsStorage';

type TriggerPost = PostV2 & { id: string };

export type UserFlairGatheringSummary = {
  subredditName: string;
  pageCount: number;
  returnedRows: number;
  assignmentRows: number;
  aggregateRows: number;
  skippedRowsWithoutUser: number;
  usersWithFlairText: number;
  usersWithCssClass: number;
  usersWithBlankFlair: number;
  repeatedCursorDetected: boolean;
};

type UserFlairGatheringResult = UserFlairGatheringSummary & {
  aggregates: UserFlairAggregate[];
};

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
    createdAt: post.createdAt ? normalizeUnixSeconds(post.createdAt) : nowSeconds(),
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

function topPostSnapshotFromStats(snapshot: StatsPostSnapshot): MonthlyTopPost {
  return {
    postId: snapshot.postId,
    title: snapshot.title,
    permalink: snapshot.permalink,
    score: snapshot.score,
    commentCount: snapshot.commentCount,
    flairText: snapshot.flairText,
    createdAt: snapshot.createdAt,
  };
}

function nextMonthStart(month: string): number {
  const [year, monthNumber] = month.split('-').map(Number);
  if (year === undefined || monthNumber === undefined) {
    throw new Error(`Invalid month string: ${month}`);
  }
  return Math.floor(Date.UTC(year, monthNumber, 1) / 1000);
}

async function recordMonthlyTopCommentedPosts(
  subredditName: string,
  month: string
): Promise<void> {
  const monthStart = convertToUnix(`${month}-01`);
  const snapshots = await listStatsPostSnapshots({
    start: monthStart,
    end: nextMonthStart(month) - 1,
    limit: ARTEMIS_SETTINGS.statsPostRetention,
  });
  const posts = snapshots
    .filter((snapshot) => snapshot.subredditName === subredditName.toLowerCase())
    .sort(
      (a, b) =>
        b.commentCount - a.commentCount ||
        b.score - a.score ||
        a.title.localeCompare(b.title)
    )
    .slice(0, ARTEMIS_SETTINGS.statsMonthlyTopLimit)
    .map(topPostSnapshotFromStats);

  if (posts.length) {
    await saveMonthlyTopCommentedPosts(month, posts);
  }
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

export async function recordSubredditUserFlairAggregates(
  subredditName: string
): Promise<UserFlairGatheringSummary | undefined> {
  try {
    const result = await collectSubredditUserFlairAggregates(subredditName);
    await saveUserFlairAggregates(subredditName, result.aggregates);
    if (result.repeatedCursorDetected) {
      console.warn(
        `Artemis Stats Recorder: stopped user flair gathering for r/${subredditName} after a repeated pagination cursor.`
      );
    }
    return userFlairGatheringSummaryFromResult(result);
  } catch (err) {
    console.warn(
      `Artemis Stats Recorder: could not record user flair stats for r/${subredditName}.`,
      err
    );
  }
}

async function collectSubredditUserFlairAggregates(
  subredditName: string
): Promise<UserFlairGatheringResult> {
  const subreddit = await reddit.getSubredditByName(subredditName);
  const updatedAt = nowSeconds();
  const flairCounts = new Map<string, number>();
  const seenCursors = new Set<string>();
  let after: string | undefined;
  let pageCount = 0;
  let returnedRows = 0;
  let assignmentRows = 0;
  let skippedRowsWithoutUser = 0;
  let usersWithFlairText = 0;
  let usersWithCssClass = 0;
  let usersWithBlankFlair = 0;
  let repeatedCursorDetected = false;

  do {
    const response = await subreddit.getUserFlair(
      after
        ? { after, limit: ARTEMIS_SETTINGS.statsUserFlairPageLimit }
        : { limit: ARTEMIS_SETTINGS.statsUserFlairPageLimit }
    );

    pageCount += 1;
    returnedRows += response.users.length;

    for (const userFlair of response.users) {
      if (!userFlair.user) {
        skippedRowsWithoutUser += 1;
        continue;
      }

      const flairLabel = userFlairLabel(userFlair.flairText ?? '', userFlair.flairCssClass ?? '');

      assignmentRows += 1;
      usersWithFlairText += userFlair.flairText ? 1 : 0;
      usersWithCssClass += userFlair.flairCssClass ? 1 : 0;
      usersWithBlankFlair += userFlair.flairText || userFlair.flairCssClass ? 0 : 1;
      flairCounts.set(flairLabel, (flairCounts.get(flairLabel) ?? 0) + 1);
    }

    if (response.next && seenCursors.has(response.next)) {
      repeatedCursorDetected = true;
      after = undefined;
    } else {
      if (response.next) {
        seenCursors.add(response.next);
      }
      after = response.next;
    }
  } while (after);

  const aggregates = [...flairCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([flairLabel, count]) => ({
      subredditName: subredditName.toLowerCase(),
      flairLabel,
      count,
      updatedAt,
    }));

  return {
    subredditName: subredditName.toLowerCase(),
    pageCount,
    returnedRows,
    assignmentRows,
    aggregateRows: aggregates.length,
    skippedRowsWithoutUser,
    usersWithFlairText,
    usersWithCssClass,
    usersWithBlankFlair,
    repeatedCursorDetected,
    aggregates,
  };
}

function userFlairLabel(flairText: string, flairCssClass: string): string {
  const emojiLabel = userFlairEmojiLabel(flairText);
  if (emojiLabel) {
    return emojiLabel;
  }

  if (flairText) {
    return flairText;
  }
  if (flairCssClass) {
    return `(CSS class: ${flairCssClass})`;
  }
  return '(blank flair text)';
}

function userFlairEmojiLabel(flairText: string): string {
  const emojiRefs = flairText.match(/:[A-Za-z0-9_-]+:/g);
  if (!emojiRefs?.length) {
    return '';
  }

  return emojiRefs.join('');
}

function userFlairGatheringSummaryFromResult(
  result: UserFlairGatheringResult
): UserFlairGatheringSummary {
  return {
    subredditName: result.subredditName,
    pageCount: result.pageCount,
    returnedRows: result.returnedRows,
    assignmentRows: result.assignmentRows,
    aggregateRows: result.aggregateRows,
    skippedRowsWithoutUser: result.skippedRowsWithoutUser,
    usersWithFlairText: result.usersWithFlairText,
    usersWithCssClass: result.usersWithCssClass,
    usersWithBlankFlair: result.usersWithBlankFlair,
    repeatedCursorDetected: result.repeatedCursorDetected,
  };
}

async function updateUserFlairAggregatesForConfig(
  subredditName: string,
  enabled: boolean
): Promise<void> {
  if (enabled) {
    await recordSubredditUserFlairAggregates(subredditName);
  } else {
    await saveUserFlairAggregates(subredditName, []);
  }
}

export async function recordSubredditUserFlairStats(subredditName: string): Promise<boolean> {
  const config = await loadSubredditConfig(subredditName);
  if (!config.statistics_updating_enabled) {
    return false;
  }

  await updateUserFlairAggregatesForConfig(subredditName, config.userflair_gathering_enabled);
  return true;
}

export async function recordSubredditDailyStats(
  subredditName: string,
  date = previousUtcDate()
): Promise<boolean> {
  const config = await loadSubredditConfig(subredditName);
  if (!config.statistics_updating_enabled) {
    return false;
  }

  await recordRecentPostSnapshots(subredditName);
  await recordSubredditSubscriberSnapshot(subredditName, date);
  if (!config.userflair_gathering_enabled) {
    await saveUserFlairAggregates(subredditName, []);
  }
  await recordStatsRun(ARTEMIS_JOBS.recordDailyStats, nowSeconds());
  return true;
}

export async function recordSubredditRecentPostStats(subredditName: string): Promise<boolean> {
  const config = await loadSubredditConfig(subredditName);
  if (!config.statistics_updating_enabled) {
    return false;
  }

  await recordRecentPostSnapshots(subredditName);
  return true;
}

export async function recordRecentPostStatsForInstalledSubreddits(): Promise<string[]> {
  const subredditNames = await getInstalledSubredditNames();
  const updatedSubredditNames: string[] = [];
  for (const subredditName of subredditNames) {
    if (await recordSubredditRecentPostStats(subredditName)) {
      updatedSubredditNames.push(subredditName);
    }
  }
  return updatedSubredditNames;
}

export async function recordDailyStatsForInstalledSubreddits(): Promise<string[]> {
  const subredditNames = await getInstalledSubredditNames();
  const updatedSubredditNames: string[] = [];
  for (const subredditName of subredditNames) {
    if (await recordSubredditDailyStats(subredditName)) {
      updatedSubredditNames.push(subredditName);
    }
  }
  return updatedSubredditNames;
}

export async function recordSubredditMonthlyStats(subredditName: string): Promise<boolean> {
  const config = await loadSubredditConfig(subredditName);
  if (!config.statistics_updating_enabled) {
    return false;
  }

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
  await recordMonthlyTopCommentedPosts(subredditName, month);
  await updateUserFlairAggregatesForConfig(subredditName, config.userflair_gathering_enabled);
  await recordStatsRun(ARTEMIS_JOBS.recordMonthlyStats, nowSeconds());
  return true;
}

export async function recordMonthlyStatsForInstalledSubreddits(): Promise<string[]> {
  const subredditNames = await getInstalledSubredditNames();
  const updatedSubredditNames: string[] = [];
  for (const subredditName of subredditNames) {
    if (await recordSubredditMonthlyStats(subredditName)) {
      updatedSubredditNames.push(subredditName);
    }
  }
  return updatedSubredditNames;
}

export async function refreshStatsPost(postId: T3, subredditName: string): Promise<void> {
  const post = await reddit.getPostById(postId);
  await saveStatsPostSnapshot(modelSnapshot(post, subredditName));
}
