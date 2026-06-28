import { redis } from '@devvit/web/server';
import type { T3 } from '@devvit/shared-types/tid.js';
import { ARTEMIS_SETTINGS } from './artemisSettings';
import { normalizeUnixSeconds } from './timekeeping';

const STATS_POSTS_KEY = 'artemis:stats:post-snapshots';
const STATS_POST_INDEX_KEY = 'artemis:stats:post-index';
const STATS_SUBSCRIBERS_KEY = 'artemis:stats:subscribers';
const STATS_MONTHLY_TOP_KEY = 'artemis:stats:monthly-top';
const STATS_MONTHLY_TOP_COMMENTS_KEY = 'artemis:stats:monthly-top-comments';
const STATS_LEGACY_MONTHLY_POSTS_KEY = 'artemis:stats:legacy-monthly-posts';
const STATS_USER_FLAIRS_KEY = 'artemis:stats:user-flairs';
const STATS_LAST_RUN_KEY = 'artemis:stats:last-run';

export type StatsPostSnapshot = {
  postId: T3;
  subredditName: string;
  authorName: string;
  title: string;
  permalink: string;
  createdAt: number;
  updatedAt: number;
  flairText: string;
  flairTemplateId: string;
  score: number;
  commentCount: number;
  removed: boolean;
  nsfw: boolean;
  spoiler: boolean;
  isSelf: boolean;
  url: string;
};

export type SubscriberSnapshot = {
  date: string;
  count: number;
};

export type UserFlairSnapshot = {
  subredditName: string;
  username: string;
  flairText: string;
  flairCssClass: string;
  updatedAt: number;
};

export type MonthlyTopPost = {
  postId: T3;
  title: string;
  permalink: string;
  score: number;
  commentCount: number;
  flairText: string;
  createdAt: number;
};

export type LegacyMonthlyPostStats = {
  month: string;
  total: number;
  flairCounts: Record<string, number>;
};

function parseJson<T>(value: string | undefined): T | undefined {
  if (!value) {
    return undefined;
  }

  try {
    return JSON.parse(value) as T;
  } catch (err) {
    console.error('Artemis Stats Storage: could not parse stored JSON.', err);
    return undefined;
  }
}

function normalizeStatsPostSnapshot(snapshot: StatsPostSnapshot): StatsPostSnapshot {
  return {
    ...snapshot,
    createdAt: normalizeUnixSeconds(snapshot.createdAt),
    updatedAt: normalizeUnixSeconds(snapshot.updatedAt),
  };
}

export async function saveStatsPostSnapshot(snapshot: StatsPostSnapshot): Promise<void> {
  const normalizedSnapshot = normalizeStatsPostSnapshot(snapshot);
  await redis.hSet(STATS_POSTS_KEY, {
    [normalizedSnapshot.postId]: JSON.stringify(normalizedSnapshot),
  });
  await redis.zAdd(STATS_POST_INDEX_KEY, {
    member: normalizedSnapshot.postId,
    score: normalizedSnapshot.createdAt,
  });

  const stalePosts = await redis.zRange(
    STATS_POST_INDEX_KEY,
    0,
    -ARTEMIS_SETTINGS.statsPostRetention - 1,
    { by: 'rank' }
  );
  if (stalePosts.length) {
    const stalePostIds = stalePosts.map(({ member }) => member);
    await redis.hDel(STATS_POSTS_KEY, stalePostIds);
    await redis.zRem(STATS_POST_INDEX_KEY, stalePostIds);
  }
}

export async function markStatsPostRemoved(postId: T3): Promise<void> {
  const snapshot = parseJson<StatsPostSnapshot>(await redis.hGet(STATS_POSTS_KEY, postId));
  if (!snapshot) {
    return;
  }

  await saveStatsPostSnapshot({
    ...snapshot,
    removed: true,
    updatedAt: Math.floor(Date.now() / 1000),
  });
}

export async function listStatsPostSnapshots(options: {
  start?: number;
  end?: number;
  limit?: number;
} = {}): Promise<StatsPostSnapshot[]> {
  const limit = options.limit ?? ARTEMIS_SETTINGS.statsPostListingLimit;
  const indexedPosts =
    options.start !== undefined && options.end !== undefined
      ? await redis.zRange(STATS_POST_INDEX_KEY, options.start, options.end, {
          by: 'score',
          limit: { offset: 0, count: limit },
        })
      : await redis.zRange(STATS_POST_INDEX_KEY, 0, Math.max(limit - 1, 0), {
          by: 'rank',
          reverse: true,
        });

  const snapshots: StatsPostSnapshot[] = [];
  for (const { member } of indexedPosts) {
    const snapshot = parseJson<StatsPostSnapshot>(await redis.hGet(STATS_POSTS_KEY, member));
    if (snapshot) {
      snapshots.push(normalizeStatsPostSnapshot(snapshot));
    }
  }

  return snapshots;
}

export async function saveSubscriberSnapshot(date: string, count: number): Promise<void> {
  await redis.hSet(STATS_SUBSCRIBERS_KEY, {
    [date]: String(count),
  });
}

export async function listSubscriberSnapshots(): Promise<SubscriberSnapshot[]> {
  const snapshots = await redis.hGetAll(STATS_SUBSCRIBERS_KEY);
  return Object.entries(snapshots)
    .map(([date, count]) => ({ date, count: Number.parseInt(count, 10) || 0 }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function userFlairKey(subredditName: string, username: string): string {
  return `${subredditName.toLowerCase()}:${username.toLowerCase()}`;
}

export async function saveUserFlairSnapshots(
  subredditName: string,
  snapshots: UserFlairSnapshot[]
): Promise<void> {
  const normalizedSubredditName = subredditName.toLowerCase();
  const existing = await redis.hGetAll(STATS_USER_FLAIRS_KEY);
  const staleKeys = Object.keys(existing).filter((key) =>
    key.startsWith(`${normalizedSubredditName}:`)
  );
  if (staleKeys.length) {
    await redis.hDel(STATS_USER_FLAIRS_KEY, staleKeys);
  }

  if (!snapshots.length) {
    return;
  }

  await redis.hSet(
    STATS_USER_FLAIRS_KEY,
    Object.fromEntries(
      snapshots.map((snapshot) => [
        userFlairKey(normalizedSubredditName, snapshot.username),
        JSON.stringify({
          ...snapshot,
          subredditName: normalizedSubredditName,
        }),
      ])
    )
  );
}

export async function listUserFlairSnapshots(): Promise<UserFlairSnapshot[]> {
  const stored = await redis.hGetAll(STATS_USER_FLAIRS_KEY);
  return Object.values(stored).flatMap((value) => {
    const snapshot = parseJson<UserFlairSnapshot>(value);
    return snapshot ? [snapshot] : [];
  });
}

export async function saveMonthlyTopPosts(month: string, posts: MonthlyTopPost[]): Promise<void> {
  await redis.hSet(STATS_MONTHLY_TOP_KEY, {
    [month]: JSON.stringify(posts),
  });
}

export async function listMonthlyTopPosts(): Promise<Record<string, MonthlyTopPost[]>> {
  const stored = await redis.hGetAll(STATS_MONTHLY_TOP_KEY);
  return Object.fromEntries(
    Object.entries(stored).map(([month, value]) => [
      month,
      parseJson<MonthlyTopPost[]>(value) ?? [],
    ])
  );
}

export async function saveMonthlyTopCommentedPosts(
  month: string,
  posts: MonthlyTopPost[]
): Promise<void> {
  await redis.hSet(STATS_MONTHLY_TOP_COMMENTS_KEY, {
    [month]: JSON.stringify(posts),
  });
}

export async function listMonthlyTopCommentedPosts(): Promise<Record<string, MonthlyTopPost[]>> {
  const stored = await redis.hGetAll(STATS_MONTHLY_TOP_COMMENTS_KEY);
  return Object.fromEntries(
    Object.entries(stored).map(([month, value]) => [
      month,
      parseJson<MonthlyTopPost[]>(value) ?? [],
    ])
  );
}

export async function saveLegacyMonthlyPostStats(
  stats: LegacyMonthlyPostStats[]
): Promise<void> {
  if (!stats.length) {
    return;
  }

  await redis.hSet(
    STATS_LEGACY_MONTHLY_POSTS_KEY,
    Object.fromEntries(stats.map((stat) => [stat.month, JSON.stringify(stat)]))
  );
}

export async function listLegacyMonthlyPostStats(): Promise<
  Record<string, LegacyMonthlyPostStats>
> {
  const stored = await redis.hGetAll(STATS_LEGACY_MONTHLY_POSTS_KEY);
  return Object.fromEntries(
    Object.entries(stored).flatMap(([month, value]) => {
      const stats = parseJson<LegacyMonthlyPostStats>(value);
      return stats ? [[month, stats]] : [];
    })
  );
}

export async function recordStatsRun(jobName: string, timestamp: number): Promise<void> {
  await redis.hSet(STATS_LAST_RUN_KEY, {
    [jobName]: String(timestamp),
  });
}

export async function listStatsRuns(): Promise<Record<string, number>> {
  const runs = await redis.hGetAll(STATS_LAST_RUN_KEY);
  return Object.fromEntries(
    Object.entries(runs).map(([jobName, timestamp]) => [
      jobName,
      Number.parseInt(timestamp, 10) || 0,
    ])
  );
}
