import { reddit } from '@devvit/web/server';
import type { T3 } from '@devvit/shared-types/tid.js';
import { checkFlairSchedule, convertWeekdayText } from './timekeeping';
import type { ArtemisSubredditConfig } from './artemisTypes';

export type PublicFlairTemplate = {
  id: string;
  text: string;
};

function markdownEscape(value: string): string {
  return value.replace(/([\\`*_{}[\]()#+\-.!|>])/g, '\\$1');
}

export async function getPublicPostFlairs(subredditName: string): Promise<PublicFlairTemplate[]> {
  const templates = await reddit.getPostFlairTemplates(subredditName);
  return templates
    .filter((template) => !template.modOnly && template.text.trim())
    .map((template) => ({ id: template.id, text: template.text.trim() }));
}

export async function collatePublicPostFlairs(subredditName: string): Promise<string> {
  const templates = await getPublicPostFlairs(subredditName);
  return templates.map((template) => `* ${markdownEscape(template.text)}`).join('\n');
}

export function postHasFlair(post: {
  linkFlair?: { templateId?: string; text?: string; cssClass?: string } | undefined;
}): boolean {
  return Boolean(post.linkFlair?.templateId || post.linkFlair?.text || post.linkFlair?.cssClass);
}

export function isFlairAllowedToday(
  flairTemplateId: string | undefined,
  config: ArtemisSubredditConfig
): { allowed: boolean; permittedDays: string[]; currentDayOfWeek: string } {
  if (!flairTemplateId) {
    return { allowed: true, permittedDays: [], currentDayOfWeek: '' };
  }

  const [allowed, permittedDays, currentDayOfWeek] = checkFlairSchedule(
    flairTemplateId,
    config.flair_schedule
  );

  return {
    allowed,
    permittedDays: permittedDays.map(convertWeekdayText),
    currentDayOfWeek: convertWeekdayText(currentDayOfWeek),
  };
}

export async function applyConfiguredFlairTags(
  postId: T3,
  flairTemplateId: string | undefined,
  config: ArtemisSubredditConfig
): Promise<void> {
  if (!flairTemplateId) {
    return;
  }

  const post = await reddit.getPostById(postId);
  if (config.flair_tags.nsfw?.includes(flairTemplateId) && !post.nsfw) {
    await post.markAsNsfw();
  }
  if (config.flair_tags.spoiler?.includes(flairTemplateId) && !post.spoiler) {
    await post.markAsSpoiler();
  }
}
