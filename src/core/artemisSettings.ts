export const ARTEMIS_CONFIG_PAGE = 'assistantbot_config';

export const ARTEMIS_SETTINGS = {
  minMonitorSeconds: 300,
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
} as const;

export const ARTEMIS_JOBS = {
  checkSubmittedPost: 'artemis-check-submitted-post',
  reconcileFilteredPosts: 'artemis-reconcile-filtered-posts',
  recordDailyStats: 'artemis-record-daily-stats',
  recordMonthlyStats: 'artemis-record-monthly-stats',
} as const;
