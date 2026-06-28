import { redis } from '@devvit/web/server';
import type { T3 } from '@devvit/shared-types/tid.js';
import { ARTEMIS_SETTINGS } from './artemisSettings';
import { hasInstallSetting, loadInstallSettings } from './artemisInstallSettings';
import type { FilteredPostRecord } from './artemisTypes';

const FILTERED_POSTS_KEY = 'artemis:filtered-posts';
const FILTERED_POST_INDEX_KEY = 'artemis:filtered-post-index';
const PROCESSED_POST_INDEX_KEY = 'artemis:processed-post-index';
const POST_OPERATIONS_KEY = 'artemis:post-operations';
const POST_OPERATIONS_INDEX_KEY = 'artemis:post-operations-index';
const SUBREDDIT_STATE_KEY = 'artemis:subreddit-state';
const COUNTERS_KEY = 'artemis:counters';
const DAILY_COUNTERS_PREFIX = 'artemis:daily-counters';

type SubredditState = {
  flairEnforcementEnabled: boolean;
  installedAt: number;
  legacyStatsArchived?: boolean;
  statsWikiReadyNotified?: boolean;
  statsWikiSetupWarningNotified?: boolean;
};

type PostOperation = {
  at: number;
  action: string;
};

function utcDate(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString().slice(0, 10);
}

function parseJson<T>(value: string | undefined): T | undefined {
  if (!value) {
    return undefined;
  }

  try {
    return JSON.parse(value) as T;
  } catch (err) {
    console.error('Artemis Storage: could not parse stored JSON.', err);
    return undefined;
  }
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function buildSubredditState(
  current: SubredditState | undefined,
  updates: Partial<SubredditState> = {}
): SubredditState {
  return {
    installedAt: updates.installedAt ?? current?.installedAt ?? nowSeconds(),
    flairEnforcementEnabled:
      updates.flairEnforcementEnabled ?? current?.flairEnforcementEnabled ?? true,
    legacyStatsArchived: updates.legacyStatsArchived ?? current?.legacyStatsArchived ?? false,
    statsWikiReadyNotified:
      updates.statsWikiReadyNotified ?? current?.statsWikiReadyNotified ?? false,
    statsWikiSetupWarningNotified:
      updates.statsWikiSetupWarningNotified ??
      current?.statsWikiSetupWarningNotified ??
      false,
  };
}

async function loadSubredditState(
  subredditName: string
): Promise<SubredditState | undefined> {
  const normalized = subredditName.toLowerCase();
  return parseJson<SubredditState>(await redis.hGet(SUBREDDIT_STATE_KEY, normalized));
}

async function saveSubredditState(
  subredditName: string,
  state: SubredditState
): Promise<void> {
  const normalized = subredditName.toLowerCase();
  await redis.hSet(SUBREDDIT_STATE_KEY, {
    [normalized]: JSON.stringify(state),
  });
}

async function updateSubredditState(
  subredditName: string,
  updates: Partial<SubredditState>
): Promise<void> {
  await saveSubredditState(
    subredditName,
    buildSubredditState(await loadSubredditState(subredditName), updates)
  );
}

export async function initializeSubredditState(subredditName: string): Promise<void> {
  const normalized = subredditName.toLowerCase();
  const existing = await redis.hGet(SUBREDDIT_STATE_KEY, normalized);
  if (existing) {
    return;
  }

  await saveSubredditState(subredditName, buildSubredditState(undefined));
}

export async function getInstalledSubredditNames(): Promise<string[]> {
  return redis.hKeys(SUBREDDIT_STATE_KEY);
}

export async function isFlairEnforcementEnabled(subredditName: string): Promise<boolean> {
  const installSettings = await loadInstallSettings();
  if (hasInstallSetting(installSettings, 'flair_enforcement_enabled')) {
    return installSettings.flair_enforcement_enabled === true;
  }

  const state = await loadSubredditState(subredditName);
  return state?.flairEnforcementEnabled ?? true;
}

export async function setFlairEnforcementEnabled(
  subredditName: string,
  enabled: boolean
): Promise<void> {
  await updateSubredditState(subredditName, { flairEnforcementEnabled: enabled });
}

export async function hasLegacyStatsArchive(subredditName: string): Promise<boolean> {
  const state = await loadSubredditState(subredditName);
  return state?.legacyStatsArchived ?? false;
}

export async function setLegacyStatsArchived(
  subredditName: string,
  archived: boolean
): Promise<void> {
  await updateSubredditState(subredditName, { legacyStatsArchived: archived });
}

export async function hasStatsWikiReadyNotificationBeenSent(
  subredditName: string
): Promise<boolean> {
  const state = await loadSubredditState(subredditName);
  return state?.statsWikiReadyNotified ?? false;
}

export async function setStatsWikiReadyNotificationSent(
  subredditName: string,
  sent: boolean
): Promise<void> {
  await updateSubredditState(subredditName, { statsWikiReadyNotified: sent });
}

export async function hasStatsWikiSetupWarningNotificationBeenSent(
  subredditName: string
): Promise<boolean> {
  const state = await loadSubredditState(subredditName);
  return state?.statsWikiSetupWarningNotified ?? false;
}

export async function setStatsWikiSetupWarningNotificationSent(
  subredditName: string,
  sent: boolean
): Promise<void> {
  await updateSubredditState(subredditName, { statsWikiSetupWarningNotified: sent });
}

export async function hasProcessedPost(postId: T3): Promise<boolean> {
  const score = await redis.zScore(PROCESSED_POST_INDEX_KEY, postId);
  return score !== undefined;
}

export async function markPostProcessed(postId: T3, timestamp: number): Promise<void> {
  await redis.zAdd(PROCESSED_POST_INDEX_KEY, { member: postId, score: timestamp });
  await redis.zRemRangeByRank(
    PROCESSED_POST_INDEX_KEY,
    0,
    -ARTEMIS_SETTINGS.processedPostRetention - 1
  );
}

export async function saveFilteredPost(record: FilteredPostRecord): Promise<void> {
  await redis.hSet(FILTERED_POSTS_KEY, {
    [record.postId]: JSON.stringify(record),
  });
  await redis.zAdd(FILTERED_POST_INDEX_KEY, {
    member: record.postId,
    score: record.createdAt,
  });
}

export async function getFilteredPost(postId: T3): Promise<FilteredPostRecord | undefined> {
  return parseJson<FilteredPostRecord>(await redis.hGet(FILTERED_POSTS_KEY, postId));
}

export async function deleteFilteredPost(postId: T3): Promise<void> {
  await redis.hDel(FILTERED_POSTS_KEY, [postId]);
  await redis.zRem(FILTERED_POST_INDEX_KEY, [postId]);
}

export async function listFilteredPosts(limit: number): Promise<FilteredPostRecord[]> {
  const indexedPosts = await redis.zRange(FILTERED_POST_INDEX_KEY, 0, Math.max(limit - 1, 0));
  const records: FilteredPostRecord[] = [];

  for (const { member } of indexedPosts) {
    const record = await getFilteredPost(member as T3);
    if (record) {
      records.push(record);
    }
  }

  return records;
}

export async function getPostOperations(postId: T3): Promise<PostOperation[]> {
  return parseJson<PostOperation[]>(await redis.hGet(POST_OPERATIONS_KEY, postId)) ?? [];
}

export async function hasPostOperation(postId: T3, action: string): Promise<boolean> {
  const operations = await getPostOperations(postId);
  return operations.some((operation) => operation.action === action);
}

export async function recordPostOperation(
  postId: T3,
  action: string,
  timestamp = Math.floor(Date.now() / 1000)
): Promise<void> {
  const operations = await getPostOperations(postId);
  operations.push({ at: timestamp, action });

  await redis.hSet(POST_OPERATIONS_KEY, {
    [postId]: JSON.stringify(operations),
  });
  await redis.zAdd(POST_OPERATIONS_INDEX_KEY, {
    member: postId,
    score: timestamp,
  });

  const staleOperations = await redis.zRange(
    POST_OPERATIONS_INDEX_KEY,
    0,
    -ARTEMIS_SETTINGS.operationsRetention - 1
  );
  if (staleOperations.length) {
    const stalePostIds = staleOperations.map(({ member }) => member);
    await redis.hDel(POST_OPERATIONS_KEY, stalePostIds);
    await redis.zRem(POST_OPERATIONS_INDEX_KEY, stalePostIds);
  }
}

export async function recordAction(
  action: string,
  options: { count?: number; postId?: T3; timestamp?: number } = {}
): Promise<void> {
  const count = options.count ?? 1;
  const timestamp = options.timestamp ?? Math.floor(Date.now() / 1000);

  await redis.hIncrBy(COUNTERS_KEY, action, count);
  await redis.hIncrBy(`${DAILY_COUNTERS_PREFIX}:${utcDate(timestamp)}`, action, count);

  if (options.postId && count === 1) {
    await recordPostOperation(options.postId, action, timestamp);
  }
}

export async function getActionCounters(): Promise<Record<string, number>> {
  const counters = await redis.hGetAll(COUNTERS_KEY);
  return Object.fromEntries(
    Object.entries(counters).map(([action, count]) => [action, Number.parseInt(count, 10) || 0])
  );
}

export async function getDailyActionCounters(date: string): Promise<Record<string, number>> {
  const counters = await redis.hGetAll(`${DAILY_COUNTERS_PREFIX}:${date}`);
  return Object.fromEntries(
    Object.entries(counters).map(([action, count]) => [action, Number.parseInt(count, 10) || 0])
  );
}
