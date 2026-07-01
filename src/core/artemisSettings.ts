export const ARTEMIS_CONFIG_PAGE = 'assistantbot_config';

export const ARTEMIS_SETTINGS = {
  maxMonitorSeconds: 86_400,
  advancedLimitMessage: 500,
  advancedLimitName: 20,
  processedPostRetention: 5_000,
  operationsRetention: 60_000,
  schedulerReconcileLimit: 100,
  statsPostRetention: 10_000,
  statsPostListingLimit: 1_000,
  statsRecentPostLimit: 100,
  statsMonthlyTopLimit: 10,
  statsUserFlairDisplayLimit: 20,
  statsUserFlairPageLimit: 1_000,
  statsSubscriberSampleSize: 14,
  statsSubscriberMilestoneUpperDays: 730,
  statsSubscriberMilestoneFormatDays: 120,
  statsSubscriberMilestones: [
    10, 20, 25, 50, 100, 250, 500, 750, 1_000, 2_000, 2_500, 3_000, 4_000, 5_000,
    6_000, 7_000, 7_500, 8_000, 9_000, 10_000, 15_000, 20_000, 25_000, 30_000,
    40_000, 50_000, 60_000, 70_000, 75_000, 80_000, 90_000, 100_000, 150_000,
    200_000, 250_000, 300_000, 400_000, 500_000, 600_000, 700_000, 750_000,
    800_000, 900_000, 1_000_000, 1_250_000, 1_500_000, 1_750_000, 2_000_000,
    2_500_000, 3_000_000, 4_000_000, 5_000_000, 6_000_000, 7_000_000, 7_500_000,
    8_000_000, 9_000_000, 10_000_000, 15_000_000, 20_000_000, 25_000_000, 30_000_000,
  ],
} as const;

export const ARTEMIS_JOBS = {
  reconcileFilteredPosts: 'artemis-reconcile-filtered-posts',
  recordRecentPosts: 'artemis-record-recent-posts',
  recordDailyStats: 'artemis-record-daily-stats',
  recordMonthlyStats: 'artemis-record-monthly-stats',
} as const;
