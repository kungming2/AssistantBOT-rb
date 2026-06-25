import { reddit } from '@devvit/web/server';
import yaml from 'js-yaml';
import { ADV_DEFAULT } from './text';
import { ARTEMIS_CONFIG_PAGE, ARTEMIS_SETTINGS } from './artemisSettings';
import {
  hasInstallSetting,
  loadInstallSettings,
  type ArtemisInstallSettings,
} from './artemisInstallSettings';
import type { ArtemisSubredditConfig, FlairScheduleConfig, FlairTagsConfig } from './artemisTypes';

const WEEKDAYS = new Set(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
const TAGS = new Set(['nsfw', 'spoiler']);

const INSTALL_SCHEDULE_RULES = [
  ['flair_schedule_rule_1_ids', 'flair_schedule_rule_1_days'],
  ['flair_schedule_rule_2_ids', 'flair_schedule_rule_2_days'],
  ['flair_schedule_rule_3_ids', 'flair_schedule_rule_3_days'],
  ['flair_schedule_rule_4_ids', 'flair_schedule_rule_4_days'],
  ['flair_schedule_rule_5_ids', 'flair_schedule_rule_5_days'],
] as const;

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.toLowerCase().trim())
    .filter(Boolean);
}

function textToStringList(value: unknown): string[] {
  if (typeof value !== 'string') {
    return [];
  }

  return value
    .split(/[\n,]/)
    .map((item) => item.trim().replace(/^u\//i, '').toLowerCase())
    .filter(Boolean);
}

function asWeekdayList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === 'string' && WEEKDAYS.has(item))
    .filter((item, index, items) => items.indexOf(item) === index);
}

function normalizeFlairTags(value: unknown): FlairTagsConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const tags: FlairTagsConfig = {};
  for (const [key, item] of Object.entries(value)) {
    if (TAGS.has(key)) {
      tags[key as keyof FlairTagsConfig] = asStringList(item);
    }
  }

  return tags;
}

function normalizeFlairSchedule(value: unknown): FlairScheduleConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const schedule: FlairScheduleConfig = {};
  for (const [key, item] of Object.entries(value)) {
    if (WEEKDAYS.has(key)) {
      schedule[key] = asStringList(item);
    }
  }

  return schedule;
}

function limitString(value: unknown, limit: number): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.slice(0, limit);
}

function parseConfig(content: string): ArtemisSubredditConfig {
  const loaded = yaml.load(content);
  if (!loaded || typeof loaded !== 'object' || Array.isArray(loaded)) {
    throw new Error('Configuration YAML must be a mapping.');
  }

  const data = loaded as Record<string, unknown>;
  return {
    flair_enforce_moderators: data.flair_enforce_moderators === true,
    flair_enforce_approve_posts: data.flair_enforce_approve_posts !== false,
    flair_enforce_custom_message: limitString(
      data.flair_enforce_custom_message,
      ARTEMIS_SETTINGS.advancedLimitMessage
    ),
    flair_enforce_whitelist: asStringList(data.flair_enforce_whitelist),
    flair_enforce_alert_list: asStringList(data.flair_enforce_alert_list),
    flair_tags: normalizeFlairTags(data.flair_tags),
    flair_schedule: normalizeFlairSchedule(data.flair_schedule),
    custom_goodbye: limitString(data.custom_goodbye, ARTEMIS_SETTINGS.advancedLimitName),
  };
}

function hasInstallScheduleSettings(installSettings: Partial<ArtemisInstallSettings>): boolean {
  return INSTALL_SCHEDULE_RULES.some(
    ([idsKey, daysKey]) =>
      hasInstallSetting(installSettings, idsKey) || hasInstallSetting(installSettings, daysKey)
  );
}

function buildInstallSchedule(
  installSettings: Partial<ArtemisInstallSettings>
): FlairScheduleConfig {
  const schedule: FlairScheduleConfig = {};

  for (const [idsKey, daysKey] of INSTALL_SCHEDULE_RULES) {
    const flairIds = textToStringList(installSettings[idsKey]);
    const weekdays = asWeekdayList(installSettings[daysKey]);
    if (flairIds.length === 0 || weekdays.length === 0) {
      continue;
    }

    for (const weekday of weekdays) {
      schedule[weekday] = Array.from(new Set([...(schedule[weekday] ?? []), ...flairIds]));
    }
  }

  return schedule;
}

async function applyInstallSettings(
  config: ArtemisSubredditConfig
): Promise<ArtemisSubredditConfig> {
  const installSettings = await loadInstallSettings();
  const merged = { ...config };

  if (hasInstallSetting(installSettings, 'flair_enforce_moderators')) {
    merged.flair_enforce_moderators = installSettings.flair_enforce_moderators === true;
  }
  if (hasInstallSetting(installSettings, 'flair_enforce_approve_posts')) {
    merged.flair_enforce_approve_posts = installSettings.flair_enforce_approve_posts === true;
  }
  if (hasInstallSetting(installSettings, 'flair_enforce_custom_message')) {
    merged.flair_enforce_custom_message = limitString(
      installSettings.flair_enforce_custom_message,
      ARTEMIS_SETTINGS.advancedLimitMessage
    );
  }
  if (hasInstallSetting(installSettings, 'flair_enforce_whitelist')) {
    merged.flair_enforce_whitelist = textToStringList(installSettings.flair_enforce_whitelist);
  }
  if (hasInstallSetting(installSettings, 'flair_tag_nsfw')) {
    merged.flair_tags = {
      ...merged.flair_tags,
      nsfw: textToStringList(installSettings.flair_tag_nsfw),
    };
  }
  if (hasInstallSetting(installSettings, 'flair_tag_spoiler')) {
    merged.flair_tags = {
      ...merged.flair_tags,
      spoiler: textToStringList(installSettings.flair_tag_spoiler),
    };
  }
  if (hasInstallScheduleSettings(installSettings)) {
    merged.flair_schedule = buildInstallSchedule(installSettings);
  }
  if (hasInstallSetting(installSettings, 'custom_goodbye')) {
    merged.custom_goodbye = limitString(
      installSettings.custom_goodbye,
      ARTEMIS_SETTINGS.advancedLimitName
    );
  }

  return merged;
}

export function defaultSubredditConfig(): ArtemisSubredditConfig {
  return parseConfig(ADV_DEFAULT);
}

export async function loadSubredditConfig(subredditName: string): Promise<ArtemisSubredditConfig> {
  let config: ArtemisSubredditConfig;
  try {
    const page = await reddit.getWikiPage(subredditName, ARTEMIS_CONFIG_PAGE);
    config = parseConfig(page.content);
  } catch (err) {
    console.info(
      `Artemis Config: using defaults for r/${subredditName}; wiki config unavailable.`,
      err
    );
    config = defaultSubredditConfig();
  }

  return applyInstallSettings(config);
}
