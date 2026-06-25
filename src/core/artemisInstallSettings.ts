import { settings } from '@devvit/web/server';

export type ArtemisInstallSettings = {
  flair_enforcement_enabled?: boolean;
  flair_enforce_moderators?: boolean;
  flair_enforce_approve_posts?: boolean;
  flair_enforce_custom_message?: string;
  flair_enforce_whitelist?: string;
  flair_tag_nsfw?: string;
  flair_tag_spoiler?: string;
  flair_schedule_rule_1_ids?: string;
  flair_schedule_rule_1_days?: string[];
  flair_schedule_rule_2_ids?: string;
  flair_schedule_rule_2_days?: string[];
  flair_schedule_rule_3_ids?: string;
  flair_schedule_rule_3_days?: string[];
  flair_schedule_rule_4_ids?: string;
  flair_schedule_rule_4_days?: string[];
  flair_schedule_rule_5_ids?: string;
  flair_schedule_rule_5_days?: string[];
  custom_goodbye?: string;
};

export async function loadInstallSettings(): Promise<Partial<ArtemisInstallSettings>> {
  try {
    return await settings.getAll<ArtemisInstallSettings>();
  } catch (err) {
    console.warn('Artemis Settings: could not load Devvit installation settings.', err);
    return {};
  }
}

export function hasInstallSetting(
  installSettings: Partial<ArtemisInstallSettings>,
  key: keyof ArtemisInstallSettings
): boolean {
  return Object.prototype.hasOwnProperty.call(installSettings, key);
}
