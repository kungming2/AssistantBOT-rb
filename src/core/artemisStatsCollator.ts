import { ARTEMIS_JOBS, ARTEMIS_SETTINGS } from './artemisSettings';
import { getActionCounters } from './artemisStorage';
import {
  listMonthlyTopPosts,
  listStatsPostSnapshots,
  listStatsRuns,
  listSubscriberSnapshots,
  type MonthlyTopPost,
  type StatsPostSnapshot,
} from './artemisStatsStorage';
import { monthConvertToString, timeConvertToString } from './timekeeping';

type MonthlyPostStats = {
  total: number;
  noFlair: number;
  removed: number;
  nsfw: number;
  spoiler: number;
  totalScore: number;
  totalComments: number;
  flairCounts: Map<string, number>;
};

function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}

function markdownEscape(value: string): string {
  return value.replace(/([\\`*_{}[\]()#+\-.!|>])/g, '\\$1');
}

function increment(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function topFlairs(flairCounts: Map<string, number>): string {
  const flairs = [...flairCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([flair, count]) => `${markdownEscape(flair)} (${formatNumber(count)})`);

  return flairs.length ? flairs.join(', ') : 'None';
}

function aggregateMonthlyPostStats(snapshots: StatsPostSnapshot[]): Map<string, MonthlyPostStats> {
  const months = new Map<string, MonthlyPostStats>();

  for (const snapshot of snapshots) {
    const month = monthConvertToString(snapshot.createdAt);
    const stats =
      months.get(month) ??
      ({
        total: 0,
        noFlair: 0,
        removed: 0,
        nsfw: 0,
        spoiler: 0,
        totalScore: 0,
        totalComments: 0,
        flairCounts: new Map<string, number>(),
      } satisfies MonthlyPostStats);

    stats.total += 1;
    stats.noFlair += snapshot.flairText || snapshot.flairTemplateId ? 0 : 1;
    stats.removed += snapshot.removed ? 1 : 0;
    stats.nsfw += snapshot.nsfw ? 1 : 0;
    stats.spoiler += snapshot.spoiler ? 1 : 0;
    stats.totalScore += snapshot.score;
    stats.totalComments += snapshot.commentCount;
    increment(stats.flairCounts, snapshot.flairText || 'None');

    months.set(month, stats);
  }

  return months;
}

function formatMonthlyTopPosts(month: string, posts: MonthlyTopPost[]): string {
  if (!posts.length) {
    return '';
  }

  const lines = posts
    .slice(0, ARTEMIS_SETTINGS.statsMonthlyTopLimit)
    .map((post, index) => {
      const flair = post.flairText ? ` | ${markdownEscape(post.flairText)}` : '';
      return `${index + 1}. [${markdownEscape(post.title)}](${post.permalink}) - ${formatNumber(
        post.score
      )} points, ${formatNumber(post.commentCount)} comments${flair}`;
    });

  return `\n\n### Top Posts: ${month}\n\n${lines.join('\n')}`;
}

export async function collateBotStatusSection(): Promise<string> {
  const [counters, runs] = await Promise.all([getActionCounters(), listStatsRuns()]);
  const counterEntries = Object.entries(counters).sort((a, b) => a[0].localeCompare(b[0]));
  const dailyRun = runs[ARTEMIS_JOBS.recordDailyStats];
  const monthlyRun = runs[ARTEMIS_JOBS.recordMonthlyStats];

  const counterLines = counterEntries.length
    ? counterEntries.map(([action, count]) => `* ${markdownEscape(action)}: ${formatNumber(count)}`)
    : ['* No recorded Artemis actions yet.'];

  return [
    '* **Runtime**: Devvit Web scheduled jobs and triggers.',
    `* **Daily statistics last run**: ${
      dailyRun ? timeConvertToString(dailyRun) : 'Not recorded yet'
    }`,
    `* **Monthly statistics last run**: ${
      monthlyRun ? timeConvertToString(monthlyRun) : 'Not recorded yet'
    }`,
    '',
    '### Recorded Actions',
    '',
    ...counterLines,
  ].join('\n');
}

export async function collatePostsSection(): Promise<string> {
  const [snapshots, monthlyTopPosts] = await Promise.all([
    listStatsPostSnapshots({ limit: ARTEMIS_SETTINGS.statsPostListingLimit }),
    listMonthlyTopPosts(),
  ]);

  if (!snapshots.length) {
    return 'No post statistics have been recorded yet.';
  }

  const monthStats = aggregateMonthlyPostStats(snapshots);
  const tableLines = [...monthStats.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([month, stats]) => {
      const averageScore = stats.total ? Math.round(stats.totalScore / stats.total) : 0;
      const averageComments = stats.total ? Math.round(stats.totalComments / stats.total) : 0;
      return `| ${month} | ${formatNumber(stats.total)} | ${formatNumber(stats.noFlair)} | ${formatNumber(
        stats.removed
      )} | ${formatNumber(stats.nsfw)} | ${formatNumber(stats.spoiler)} | ${formatNumber(
        averageScore
      )} | ${formatNumber(averageComments)} | ${topFlairs(stats.flairCounts)} |`;
    });

  const topSections = Object.entries(monthlyTopPosts)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([month, posts]) => formatMonthlyTopPosts(month, posts))
    .join('');

  return [
    '| Month | Posts | No Flair | Removed | NSFW | Spoiler | Avg. Score | Avg. Comments | Top Flairs |',
    '|-------|------:|---------:|--------:|-----:|--------:|-----------:|--------------:|------------|',
    ...tableLines,
    topSections,
  ].join('\n');
}

export async function collateSubscribersSection(): Promise<string> {
  const snapshots = await listSubscriberSnapshots();
  if (!snapshots.length) {
    return 'No subscriber snapshots have been recorded yet.';
  }

  const lines = snapshots.slice(0, 90).map((snapshot, index) => {
    const previous = snapshots[index + 1];
    const change = previous ? snapshot.count - previous.count : 0;
    const formattedChange = previous ? `${change >= 0 ? '+' : ''}${formatNumber(change)}` : '---';
    return `| ${snapshot.date} | ${formatNumber(snapshot.count)} | ${formattedChange} |`;
  });

  return [
    '| Date | Subscribers | Change |',
    '|------|------------:|-------:|',
    ...lines,
  ].join('\n');
}

export function collateTrafficSection(): string {
  return [
    'Traffic statistics are not available in this Devvit port.',
    '',
    'The Python bot used PRAW subreddit traffic APIs that are no longer a reliable migration target, and Devvit does not expose an equivalent traffic endpoint for this app.',
  ].join('\n');
}
