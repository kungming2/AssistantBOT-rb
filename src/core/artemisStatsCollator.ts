import { ARTEMIS_JOBS, ARTEMIS_SETTINGS } from './artemisSettings';
import { getActionCounters } from './artemisStorage';
import {
  listLegacyMonthlyPostStats,
  listMonthlyPostAggregates,
  listMonthlyTopCommentedPosts,
  listMonthlyTopPosts,
  listStatsPostSnapshots,
  listStatsRuns,
  listSubscriberSnapshots,
  listUserFlairAggregates,
  type LegacyMonthlyPostStats,
  type MonthlyPostAggregate,
  type MonthlyTopPost,
  type StatsPostSnapshot,
  type SubscriberSnapshot,
  type UserFlairAggregate,
} from './artemisStatsStorage';
import { monthConvertToString, timeConvertToString } from './timekeeping';

type MonthlyPostStats = {
  total: number;
  noFlair: number;
  removed: number;
  self: number;
  nsfw: number;
  spoiler: number;
  totalScore: number;
  totalComments: number;
  flairCounts: Map<string, number>;
};

type MonthlyPostSummary = {
  total: number;
  flairCounts: Map<string, number>;
};

type StatisticsCoverage = {
  devvitStartDate: string | undefined;
  latestSnapshotDate: string | undefined;
  legacyThroughDate: string | undefined;
};

type SubscriberTrend = {
  days: number;
  baselineDate: string;
  latestDate: string;
  change: number;
  percent: number | undefined;
  averageDaily: number;
};

type SubscriberChange = {
  date: string;
  previousDate: string;
  change: number;
};

type SubscriberAverage = {
  sampleSize: number;
  averageDailyChange: number;
};

type SubscriberMilestoneEstimate = {
  milestone: number;
  daysUntil: number;
  estimatedDate: string;
};

const UTC_ACTIVITY_BUCKETS = [
  '00:00-03:59',
  '04:00-07:59',
  '08:00-11:59',
  '12:00-15:59',
  '16:00-19:59',
  '20:00-23:59',
] as const;

function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}

function formatDecimal(value: number): string {
  return value.toLocaleString('en-US', {
    maximumFractionDigits: 2,
  });
}

function formatSignedDecimal(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatSignedNumber(value: number): string {
  return `${value >= 0 ? '+' : ''}${formatNumber(value)}`;
}

function markdownEscape(value: string): string {
  return value.replace(/([\\`*_{}[\]()#+\-.!|>])/g, '\\$1');
}

function formatPostFlairLabel(flair: string): string {
  return flair === 'None' ? 'No flair' : markdownEscape(flair);
}

function unixDate(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString().slice(0, 10);
}

function currentUtcMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function monthStartUnix(month: string): number {
  return Math.floor(Date.parse(`${month}-01T00:00:00Z`) / 1000);
}

function nextMonthStartUnix(month: string): number {
  const [year, monthNumber] = month.split('-').map(Number);
  if (year === undefined || monthNumber === undefined) {
    throw new Error(`Invalid month string: ${month}`);
  }
  return Math.floor(Date.UTC(year, monthNumber, 1) / 1000);
}

function monthRange(startMonth: string, endMonth: string): string[] {
  const [startYear, startMonthNumber] = startMonth.split('-').map(Number);
  const [endYear, endMonthNumber] = endMonth.split('-').map(Number);
  if (
    startYear === undefined ||
    startMonthNumber === undefined ||
    endYear === undefined ||
    endMonthNumber === undefined
  ) {
    return [];
  }

  const months: string[] = [];
  const cursor = new Date(Date.UTC(startYear, startMonthNumber - 1, 1));
  const end = new Date(Date.UTC(endYear, endMonthNumber - 1, 1));
  while (cursor <= end) {
    months.push(cursor.toISOString().slice(0, 7));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return months;
}

function earliestSubscriberSnapshotDate(
  snapshots: SubscriberSnapshot[]
): string | undefined {
  return [...snapshots].sort((a, b) => a.date.localeCompare(b.date))[0]?.date;
}

function latestSubscriberSnapshotDate(
  snapshots: SubscriberSnapshot[]
): string | undefined {
  return [...snapshots].sort((a, b) => b.date.localeCompare(a.date))[0]?.date;
}

function increment(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function addCount(map: Map<string, number>, key: string, count: number): void {
  map.set(key, (map.get(key) ?? 0) + count);
}

function formatPercentage(count: number, total: number): string {
  return total ? `${((count / total) * 100).toFixed(2)}%` : 'N/A';
}

function formatSignedPercentage(value: number | undefined): string {
  if (value === undefined) {
    return 'N/A';
  }
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function utcDayNumber(date: string): number {
  return Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
}

function topFlairs(flairCounts: Map<string, number>): string {
  const flairs = [...flairCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(
      ([flair, count]) =>
        `${formatPostFlairLabel(flair)} (${formatNumber(count)})`
    );

  return flairs.length ? flairs.join(', ') : 'None';
}

function formatUtcActivityTable(snapshots: StatsPostSnapshot[]): string {
  if (!snapshots.length) {
    return 'No post activity has been recorded yet.';
  }

  const counts = UTC_ACTIVITY_BUCKETS.map(() => 0);
  for (const snapshot of snapshots) {
    const hour = new Date(snapshot.createdAt * 1000).getUTCHours();
    const bucketIndex = Math.floor(hour / 4);
    counts[bucketIndex] = (counts[bucketIndex] ?? 0) + 1;
  }

  const rows = UTC_ACTIVITY_BUCKETS.map((bucket, index) => {
    const count = counts[index] ?? 0;
    return `| ${bucket} | ${formatNumber(count)} | ${formatPercentage(
      count,
      snapshots.length
    )} |`;
  });

  return [
    '| UTC Time Block | Posts | Percentage |',
    '|----------------|------:|-----------:|',
    ...rows,
    `| **Total** | ${formatNumber(snapshots.length)} | 100% |`,
  ].join('\n');
}

function aggregateMonthlyPostStats(
  snapshots: StatsPostSnapshot[]
): Map<string, MonthlyPostStats> {
  const months = new Map<string, MonthlyPostStats>();

  for (const snapshot of snapshots) {
    const month = monthConvertToString(snapshot.createdAt);
    const stats =
      months.get(month) ??
      ({
        total: 0,
        noFlair: 0,
        removed: 0,
        self: 0,
        nsfw: 0,
        spoiler: 0,
        totalScore: 0,
        totalComments: 0,
        flairCounts: new Map<string, number>(),
      } satisfies MonthlyPostStats);

    stats.total += 1;
    stats.noFlair += snapshot.flairText || snapshot.flairTemplateId ? 0 : 1;
    stats.removed += snapshot.removed ? 1 : 0;
    stats.self += snapshot.isSelf ? 1 : 0;
    stats.nsfw += snapshot.nsfw ? 1 : 0;
    stats.spoiler += snapshot.spoiler ? 1 : 0;
    stats.totalScore += snapshot.score;
    stats.totalComments += snapshot.commentCount;
    increment(stats.flairCounts, snapshot.flairText || 'None');

    months.set(month, stats);
  }

  return months;
}

function monthlyPostStatsFromAggregate(
  aggregate: MonthlyPostAggregate
): MonthlyPostStats {
  return {
    total: aggregate.total,
    noFlair: aggregate.noFlair,
    removed: aggregate.removed,
    self: aggregate.self,
    nsfw: aggregate.nsfw,
    spoiler: aggregate.spoiler,
    totalScore: aggregate.totalScore,
    totalComments: aggregate.totalComments,
    flairCounts: new Map(Object.entries(aggregate.flairCounts)),
  };
}

function coverageLabel(
  month: string,
  coverage: StatisticsCoverage,
  hasLegacy: boolean
): string {
  if (hasLegacy) {
    if (coverage.legacyThroughDate?.startsWith(month)) {
      return `Legacy through ${coverage.legacyThroughDate}`;
    }
    return 'Legacy archive';
  }

  const coverageStartMonth = coverage.devvitStartDate?.slice(0, 7);
  if (
    coverageStartMonth === month &&
    !coverage.devvitStartDate?.endsWith('-01')
  ) {
    return `Devvit partial from ${coverage.devvitStartDate}`;
  }
  if (month === currentUtcMonth()) {
    return coverage.latestSnapshotDate
      ? `Devvit month-to-date through ${coverage.latestSnapshotDate}`
      : 'Devvit month-to-date';
  }
  return 'Devvit recorded month';
}

function addMonthlySummary(
  summaries: Map<string, MonthlyPostSummary>,
  month: string,
  total: number,
  flairCounts: Map<string, number>
): void {
  const summary =
    summaries.get(month) ??
    ({
      total: 0,
      flairCounts: new Map<string, number>(),
    } satisfies MonthlyPostSummary);

  summary.total += total;
  for (const [flair, count] of flairCounts.entries()) {
    addCount(summary.flairCounts, flair, count);
  }
  summaries.set(month, summary);
}

function aggregateLegacyMonthlyPostStats(
  legacyStats: Record<string, LegacyMonthlyPostStats>
): Map<string, MonthlyPostSummary> {
  const summaries = new Map<string, MonthlyPostSummary>();
  for (const stats of Object.values(legacyStats)) {
    addMonthlySummary(
      summaries,
      stats.month,
      stats.total,
      new Map(Object.entries(stats.flairCounts))
    );
  }
  return summaries;
}

function formatMonthlySummaryTable(
  summaries: Map<string, MonthlyPostSummary>,
  coverageLabels: Map<string, string>
): string {
  if (!summaries.size) {
    return '';
  }

  const rows = [...summaries.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(
      ([month, summary]) =>
        `| ${month} | ${formatNumber(summary.total)} | ${topFlairs(
          summary.flairCounts
        )} | ${coverageLabels.get(month) ?? 'Unknown'} |`
    );

  return [
    '### General Monthly Summary',
    '',
    '| Month | Recorded Posts | Top Flairs | Coverage |',
    '|-------|---------------:|------------|----------|',
    ...rows,
  ].join('\n');
}

function formatPostTypeLine(
  label: string,
  count: number,
  total: number
): string {
  return `* ${label} posts: ${formatNumber(count)}/${formatNumber(total)} (${formatPercentage(
    count,
    total
  )})`;
}

function formatFlairTable(stats: MonthlyPostStats): string {
  const flairLines = [...stats.flairCounts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(
      ([flair, count]) =>
        `| ${formatPostFlairLabel(flair)} | ${formatNumber(count)} | ${formatPercentage(
          count,
          stats.total
        )} |`
    );

  return [
    '| Post Flair | Recorded Submissions | Percentage |',
    '|------------|---------------------:|-----------:|',
    ...flairLines,
    `| **Total** | ${formatNumber(stats.total)} | 100% |`,
  ].join('\n');
}

function formatMonthlyTopPosts(
  heading: string,
  posts: MonthlyTopPost[],
  sortBy: 'score' | 'comments'
): string {
  if (!posts.length) {
    return '';
  }

  const sortedPosts = [...posts].sort((a, b) =>
    sortBy === 'score'
      ? b.score - a.score ||
        b.commentCount - a.commentCount ||
        a.title.localeCompare(b.title)
      : b.commentCount - a.commentCount ||
        b.score - a.score ||
        a.title.localeCompare(b.title)
  );
  const lines = sortedPosts
    .slice(0, ARTEMIS_SETTINGS.statsMonthlyTopLimit)
    .map((post, index) => {
      const flair = post.flairText
        ? ` | ${markdownEscape(post.flairText)}`
        : '';
      return `${index + 1}. [${markdownEscape(post.title)}](${post.permalink}) - ${formatNumber(
        post.score
      )} points, ${formatNumber(post.commentCount)} comments${flair}`;
    });

  return `\n\n#### ${heading}\n\n${lines.join('\n')}`;
}

function formatMonthlyPostStats(
  month: string,
  stats: MonthlyPostStats | undefined,
  topScorePosts: MonthlyTopPost[],
  topCommentedPosts: MonthlyTopPost[],
  coverage: StatisticsCoverage
): string {
  const sections = [`### ${month}`];
  const coverageStartMonth = coverage.devvitStartDate?.slice(0, 7);
  if (
    coverageStartMonth === month &&
    !coverage.devvitStartDate?.endsWith('-01')
  ) {
    sections.push(
      '',
      `*Partial Devvit coverage. Collection began on ${coverage.devvitStartDate}; recorded counts may include a limited recent-post backfill and do not represent the full month.*`
    );
  } else if (month === currentUtcMonth()) {
    sections.push(
      '',
      coverage.latestSnapshotDate
        ? `*Month-to-date through ${coverage.latestSnapshotDate} UTC.*`
        : '*Current month-to-date.*'
    );
  }

  if (stats) {
    const averageScore = stats.total
      ? Math.round(stats.totalScore / stats.total)
      : 0;
    const averageComments = stats.total
      ? Math.round(stats.totalComments / stats.total)
      : 0;

    sections.push(
      '#### Summary',
      '',
      `* Recorded submissions: ${formatNumber(stats.total)}`,
      `* Average recorded score: ${formatNumber(averageScore)}`,
      `* Average recorded comments: ${formatNumber(averageComments)}`,
      '',
      '#### Post Types',
      '',
      formatPostTypeLine('Text/self', stats.self, stats.total),
      formatPostTypeLine('NSFW', stats.nsfw, stats.total),
      formatPostTypeLine('Spoiler-tagged', stats.spoiler, stats.total),
      '',
      '#### Moderation',
      '',
      `* Posts removed by Artemis: ${formatNumber(stats.removed)}/${formatNumber(stats.total)} (${formatPercentage(
        stats.removed,
        stats.total
      )})`,
      `* Recorded no-flair posts: ${formatNumber(stats.noFlair)}/${formatNumber(stats.total)} (${formatPercentage(
        stats.noFlair,
        stats.total
      )})`,
      '',
      '#### Submissions by Flair',
      '',
      formatFlairTable(stats)
    );
  }

  const topScoreSection = formatMonthlyTopPosts(
    'Top Posts by Score',
    topScorePosts,
    'score'
  );
  if (topScoreSection) {
    sections.push(topScoreSection);
  }

  const topCommentedSection = formatMonthlyTopPosts(
    'Top Recorded Posts by Comments',
    topCommentedPosts,
    'comments'
  );
  if (topCommentedSection) {
    sections.push(topCommentedSection);
  }

  return sections.join('\n');
}

function subscriberTrend(
  snapshots: Awaited<ReturnType<typeof listSubscriberSnapshots>>,
  days: number
): SubscriberTrend | undefined {
  const sorted = [...snapshots].sort((a, b) => b.date.localeCompare(a.date));
  const latest = sorted[0];
  if (!latest) {
    return undefined;
  }

  const targetDay = utcDayNumber(latest.date) - days;
  const baseline = sorted.find(
    (snapshot) => utcDayNumber(snapshot.date) <= targetDay
  );
  if (!baseline) {
    return undefined;
  }

  const actualDays = utcDayNumber(latest.date) - utcDayNumber(baseline.date);
  if (actualDays <= 0) {
    return undefined;
  }

  const change = latest.count - baseline.count;
  return {
    days: actualDays,
    baselineDate: baseline.date,
    latestDate: latest.date,
    change,
    percent: baseline.count ? (change / baseline.count) * 100 : undefined,
    averageDaily: change / actualDays,
  };
}

function subscriberChanges(
  snapshots: Awaited<ReturnType<typeof listSubscriberSnapshots>>
): SubscriberChange[] {
  const sorted = [...snapshots].sort((a, b) => b.date.localeCompare(a.date));
  return sorted.flatMap((snapshot, index) => {
    const previous = sorted[index + 1];
    if (!previous) {
      return [];
    }
    return [
      {
        date: snapshot.date,
        previousDate: previous.date,
        change: snapshot.count - previous.count,
      },
    ];
  });
}

function recentAverageDailySubscriberChange(
  snapshots: SubscriberSnapshot[]
): SubscriberAverage | undefined {
  const recent = [...snapshots]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, ARTEMIS_SETTINGS.statsSubscriberSampleSize);
  const latest = recent[0];
  const oldest = recent[recent.length - 1];
  if (
    !latest ||
    !oldest ||
    recent.length < ARTEMIS_SETTINGS.statsSubscriberProjectionMinSnapshots
  ) {
    return undefined;
  }

  const days = utcDayNumber(latest.date) - utcDayNumber(oldest.date);
  if (days <= 0) {
    return undefined;
  }

  return {
    sampleSize: recent.length,
    averageDailyChange: (latest.count - oldest.count) / days,
  };
}

function nextSubscriberMilestoneEstimate(
  snapshots: SubscriberSnapshot[],
  average: SubscriberAverage
): SubscriberMilestoneEstimate | undefined {
  if (average.averageDailyChange <= 0) {
    return undefined;
  }

  const latest = [...snapshots].sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!latest) {
    return undefined;
  }

  const milestone = ARTEMIS_SETTINGS.statsSubscriberMilestones.find(
    (candidate) => candidate > latest.count
  );
  if (milestone === undefined) {
    return undefined;
  }

  const daysUntil = Math.ceil(
    (milestone - latest.count) / average.averageDailyChange
  );
  if (
    daysUntil < 0 ||
    daysUntil > ARTEMIS_SETTINGS.statsSubscriberMilestoneUpperDays
  ) {
    return undefined;
  }

  return {
    milestone,
    daysUntil,
    estimatedDate: new Date(
      Date.parse(`${latest.date}T00:00:00Z`) + daysUntil * 86_400_000
    )
      .toISOString()
      .slice(0, 10),
  };
}

function formatSubscriberMilestoneProjection(
  snapshots: SubscriberSnapshot[]
): string {
  const average = recentAverageDailySubscriberChange(snapshots);
  if (!average) {
    return '';
  }

  const lines = [
    `*Average Daily Change (last ${average.sampleSize} snapshots)*: ${formatSignedDecimal(
      average.averageDailyChange
    )} subscribers`,
  ];

  const estimate = nextSubscriberMilestoneEstimate(snapshots, average);
  if (estimate) {
    const estimatedMonth = new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${estimate.estimatedDate}T00:00:00Z`));
    lines.push(
      '',
      `*Next Subscriber Milestone (estimated)*: ${formatNumber(
        estimate.milestone
      )} subscribers around ${estimatedMonth} at the recent ${average.sampleSize}-snapshot pace`
    );
  }

  return lines.join('\n');
}

function formatSubscriberTrendTable(
  snapshots: Awaited<ReturnType<typeof listSubscriberSnapshots>>
): string {
  if (snapshots.length < 2) {
    return 'Not enough subscriber snapshots have been recorded yet.';
  }

  const trendRows = [7, 30].map((days) => {
    const trend = subscriberTrend(snapshots, days);
    if (!trend) {
      return `| ${days} days | N/A | N/A | N/A | Not enough snapshots |`;
    }

    return `| ${trend.days} days | ${formatSignedNumber(trend.change)} | ${formatSignedPercentage(
      trend.percent
    )} | ${formatDecimal(trend.averageDaily)} | ${trend.baselineDate} to ${
      trend.latestDate
    } |`;
  });

  const changes = subscriberChanges(snapshots);
  const best = changes.length
    ? changes.reduce((current, candidate) =>
        candidate.change > current.change ? candidate : current
      )
    : undefined;
  const worst = changes.length
    ? changes.reduce((current, candidate) =>
        candidate.change < current.change ? candidate : current
      )
    : undefined;

  return [
    '| Period | Change | Percent Growth | Average/Day | Snapshot Range |',
    '|--------|-------:|---------------:|------------:|----------------|',
    ...trendRows,
    '',
    `* Best growth day: ${
      best
        ? `${best.date} (${formatSignedNumber(best.change)} since ${best.previousDate})`
        : 'N/A'
    }`,
    `* Worst growth day: ${
      worst
        ? `${worst.date} (${formatSignedNumber(worst.change)} since ${worst.previousDate})`
        : 'N/A'
    }`,
  ].join('\n');
}

function formatUserFlairDistributionTable(
  aggregates: UserFlairAggregate[]
): string {
  if (!aggregates.length) {
    return 'No user flair assignments have been recorded yet.';
  }

  const total = aggregates.reduce((sum, aggregate) => sum + aggregate.count, 0);
  const sortedAggregates = [...aggregates].sort(
    (a, b) => b.count - a.count || a.flairLabel.localeCompare(b.flairLabel)
  );
  const displayedAggregates = sortedAggregates.slice(
    0,
    ARTEMIS_SETTINGS.statsUserFlairDisplayLimit
  );
  const hasEmojiLabels =
    displayedAggregates.length > 0 &&
    displayedAggregates.every((aggregate) =>
      isEmojiFlairLabel(aggregate.flairLabel)
    );
  const labelHeader = hasEmojiLabels ? 'User Flair Emoji' : 'User Flair';
  const displayedTotal = displayedAggregates.reduce(
    (sum, aggregate) => sum + aggregate.count,
    0
  );
  const otherTotal = total - displayedTotal;
  const updatedAt = Math.max(
    ...aggregates.map((aggregate) => aggregate.updatedAt)
  );

  const rows = displayedAggregates.map(
    (aggregate) =>
      `| ${markdownEscape(aggregate.flairLabel)} | ${formatNumber(
        aggregate.count
      )} | ${formatPercentage(aggregate.count, total)} |`
  );
  if (otherTotal > 0) {
    rows.push(
      `| Other flair assignments | ${formatNumber(otherTotal)} | ${formatPercentage(
        otherTotal,
        total
      )} |`
    );
  }

  return [
    `*Assignment snapshot collected ${timeConvertToString(updatedAt)}.*`,
    '',
    `| ${labelHeader} | Users with Flair | Share of Flair Assignments |`,
    '|------------|-----------------:|---------------------------:|',
    ...rows,
    `| **Total flair assignments** | ${formatNumber(total)} | 100% |`,
  ].join('\n');
}

function isEmojiFlairLabel(flairLabel: string): boolean {
  return /^(?::[A-Za-z0-9_-]+:)+$/.test(flairLabel);
}

export async function collateOverallSection(): Promise<string> {
  const [subscriberSnapshots, userFlairAggregates] = await Promise.all([
    listSubscriberSnapshots(),
    listUserFlairAggregates(),
  ]);
  const devvitStartDate = earliestSubscriberSnapshotDate(subscriberSnapshots);
  const snapshots = await listStatsPostSnapshots({
    ...(devvitStartDate
      ? { start: monthStartUnix(devvitStartDate.slice(0, 7)) }
      : {}),
    end: Math.floor(Date.now() / 1000),
    limit: ARTEMIS_SETTINGS.statsPostListingLimit,
  });
  const snapshotDates = snapshots
    .map((snapshot) => unixDate(snapshot.createdAt))
    .sort();
  const snapshotCoverage = snapshotDates.length
    ? `*Based on ${formatNumber(snapshots.length)} recent recorded Devvit post snapshots from ${
        snapshotDates[0]
      } through ${snapshotDates[snapshotDates.length - 1]} UTC.*`
    : '';

  return [
    '### Recorded Devvit Post Activity by UTC Time',
    '',
    formatUtcActivityTable(snapshots),
    ...(snapshotCoverage ? ['', snapshotCoverage] : []),
    '',
    '### Subscriber Trends',
    '',
    formatSubscriberTrendTable(subscriberSnapshots),
    '',
    '### User Flair Distribution',
    '',
    formatUserFlairDistributionTable(userFlairAggregates),
  ].join('\n');
}

export async function collateBotStatusSection(): Promise<string> {
  const [counters, runs] = await Promise.all([
    getActionCounters(),
    listStatsRuns(),
  ]);
  const counterEntries = Object.entries(counters).sort((a, b) =>
    a[0].localeCompare(b[0])
  );
  const dailyRun = runs[ARTEMIS_JOBS.recordDailyStats];
  const monthlyRun = runs[ARTEMIS_JOBS.recordMonthlyStats];

  const counterLines = counterEntries.length
    ? counterEntries.map(
        ([action, count]) =>
          `* ${markdownEscape(action)}: ${formatNumber(count)}`
      )
    : ['* No recorded Artemis actions yet.'];

  return [
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

export async function collatePostsSection(
  options: {
    legacyThroughDate?: string;
  } = {}
): Promise<string> {
  const [
    subscriberSnapshots,
    storedMonthlyPostAggregates,
    monthlyTopPosts,
    monthlyTopCommentedPosts,
    legacyMonthlyStats,
  ] = await Promise.all([
    listSubscriberSnapshots(),
    listMonthlyPostAggregates(),
    listMonthlyTopPosts(),
    listMonthlyTopCommentedPosts(),
    listLegacyMonthlyPostStats(),
  ]);

  const coverage: StatisticsCoverage = {
    devvitStartDate: earliestSubscriberSnapshotDate(subscriberSnapshots),
    latestSnapshotDate: latestSubscriberSnapshotDate(subscriberSnapshots),
    legacyThroughDate: options.legacyThroughDate,
  };
  const coverageStartMonth = coverage.devvitStartDate?.slice(0, 7);
  const currentMonth = currentUtcMonth();
  const missingMonths = coverageStartMonth
    ? monthRange(coverageStartMonth, currentMonth).filter(
        (month) =>
          !storedMonthlyPostAggregates[month] && !legacyMonthlyStats[month]
      )
    : [currentMonth];
  const queryStartMonth = missingMonths.sort()[0] ?? currentMonth;
  const snapshots = await listStatsPostSnapshots({
    start: monthStartUnix(queryStartMonth),
    end: nextMonthStartUnix(currentMonth) - 1,
    limit: ARTEMIS_SETTINGS.statsPostRetention,
  });

  if (
    !snapshots.length &&
    !Object.keys(storedMonthlyPostAggregates).length &&
    !Object.keys(monthlyTopPosts).length &&
    !Object.keys(monthlyTopCommentedPosts).length &&
    !Object.keys(legacyMonthlyStats).length
  ) {
    return 'No post statistics have been recorded yet.';
  }

  const liveMonthStats = aggregateMonthlyPostStats(snapshots);
  const monthStats = new Map<string, MonthlyPostStats>();
  for (const [month, aggregate] of Object.entries(
    storedMonthlyPostAggregates
  )) {
    if (
      coverageStartMonth &&
      month >= coverageStartMonth &&
      month <= currentMonth &&
      !legacyMonthlyStats[month]
    ) {
      monthStats.set(month, monthlyPostStatsFromAggregate(aggregate));
    }
  }
  for (const [month, stats] of liveMonthStats.entries()) {
    if (
      (!coverageStartMonth || month >= coverageStartMonth) &&
      !legacyMonthlyStats[month] &&
      (!monthStats.has(month) || month === currentMonth)
    ) {
      monthStats.set(month, stats);
    }
  }

  const monthlySummaries = aggregateLegacyMonthlyPostStats(legacyMonthlyStats);
  const coverageLabels = new Map<string, string>();
  for (const month of Object.keys(legacyMonthlyStats)) {
    coverageLabels.set(month, coverageLabel(month, coverage, true));
  }
  for (const [month, stats] of monthStats.entries()) {
    addMonthlySummary(monthlySummaries, month, stats.total, stats.flairCounts);
    coverageLabels.set(month, coverageLabel(month, coverage, false));
  }

  const months = [
    ...new Set([
      ...monthStats.keys(),
      ...Object.keys(monthlyTopPosts),
      ...Object.keys(monthlyTopCommentedPosts),
    ]),
  ]
    .filter(
      (month) =>
        (!coverageStartMonth || month >= coverageStartMonth) &&
        !legacyMonthlyStats[month]
    )
    .sort((a, b) => b.localeCompare(a));
  const sections = [
    coverage.devvitStartDate
      ? `*Coverage note: legacy rows use archived statistics${
          coverage.legacyThroughDate
            ? ` through ${coverage.legacyThroughDate}`
            : ''
        }. Devvit collection begins ${coverage.devvitStartDate}; unrecorded intervening months are intentionally omitted.*`
      : '',
    formatMonthlySummaryTable(monthlySummaries, coverageLabels),
  ].filter(Boolean);

  sections.push(
    ...months.map((month) =>
      formatMonthlyPostStats(
        month,
        monthStats.get(month),
        monthlyTopPosts[month] ?? [],
        monthlyTopCommentedPosts[month] ?? [],
        coverage
      )
    )
  );

  return sections.join('\n\n');
}

export async function collateSubscribersSection(): Promise<string> {
  const snapshots = await listSubscriberSnapshots();
  if (!snapshots.length) {
    return 'No subscriber snapshots have been recorded yet.';
  }

  const milestoneProjection = formatSubscriberMilestoneProjection(snapshots);
  const lines = snapshots.slice(0, 90).map((snapshot, index) => {
    const previous = snapshots[index + 1];
    const change = previous ? snapshot.count - previous.count : 0;
    const formattedChange = previous
      ? `${change >= 0 ? '+' : ''}${formatNumber(change)}`
      : '---';
    return `| ${snapshot.date} | ${formatNumber(snapshot.count)} | ${formattedChange} |`;
  });

  return [
    ...(milestoneProjection ? [milestoneProjection, ''] : []),
    '### Log',
    '',
    '| Date | Subscribers | Change |',
    '|------|------------:|-------:|',
    ...lines,
  ].join('\n');
}
