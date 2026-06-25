import { redis } from '@devvit/web/server';
import type { T3 } from '@devvit/shared-types/tid.js';
import { ARTEMIS_SETTINGS } from './artemisSettings';

const STATS_POSTS_KEY = 'artemis:stats:post-snapshots';
const STATS_POST_INDEX_KEY = 'artemis:stats:post-index';
const STATS_SUBSCRIBERS_KEY = 'artemis:stats:subscribers';
const STATS_MONTHLY_TOP_KEY = 'artemis:stats:monthly-top';
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

export type MonthlyTopPost = {
  postId: T3;
  title: string;
  permalink: string;
  score: number;
  commentCount: number;
  flairText: string;
  createdAt: number;
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

export async function saveStatsPostSnapshot(snapshot: StatsPostSnapshot): Promise<void> {
  await redis.hSet(STATS_POSTS_KEY, {
    [snapshot.postId]: JSON.stringify(snapshot),
  });
  await redis.zAdd(STATS_POST_INDEX_KEY, {
    member: snapshot.postId,
    score: snapshot.createdAt,
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
      snapshots.push(snapshot);
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
