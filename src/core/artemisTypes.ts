import type { T3 } from '@devvit/shared-types/tid.js';

export type FlairTagsConfig = Partial<Record<'nsfw' | 'spoiler', string[]>>;

export type FlairScheduleConfig = Record<string, string[]>;

export type ArtemisSubredditConfig = {
  flair_enforce_moderators: boolean;
  flair_enforce_approve_posts: boolean;
  flair_enforce_custom_message: string;
  flair_enforce_whitelist: string[];
  flair_enforce_alert_list: string[];
  flair_tags: FlairTagsConfig;
  flair_schedule: FlairScheduleConfig;
  custom_goodbye: string;
};

export type FilteredPostRecord = {
  postId: T3;
  subredditName: string;
  authorName: string;
  title: string;
  permalink: string;
  createdAt: number;
  recordedAt: number;
  removed: boolean;
};
