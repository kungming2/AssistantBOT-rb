import { reddit, type Post } from '@devvit/web/server';
import type { PostV2, UserV2 } from '@devvit/web/shared';
import type { T3 } from '@devvit/shared-types/tid.js';
import {
  msgScheduleRemoval,
  msgScheduleRemovalSubject,
  msgUserFlairApproval,
  msgUserFlairApprovalStrict,
  msgUserFlairBody,
  msgUserFlairModmailLink,
  msgUserFlairSubject,
  MSG_USER_FLAIR_NO_PUBLIC_FLAIRS,
  MSG_USER_FLAIR_REMOVAL,
  MSG_USER_FLAIR_REMOVAL_NO_APPROVE,
  randomGoodbye,
} from './text';
import { ARTEMIS_SETTINGS } from './artemisSettings';
import { toT3 } from './artemisIds';
import { loadSubredditConfig } from './artemisConfig';
import { sendDiscordFlairActionAlert } from './artemisDiscord';
import type { ArtemisSubredditConfig } from './artemisTypes';
import { applyConfiguredFlairTags, collatePublicPostFlairs, isFlairAllowedToday, postHasFlair } from './artemisFlair';
import { isUserModerator } from './artemisModeration';
import { normalizeUnixSeconds } from './timekeeping';
import {
  deleteFilteredPost,
  getFilteredPost,
  hasPostOperation,
  hasProcessedPost,
  isFlairEnforcementEnabled,
  listFilteredPosts,
  markPostProcessed,
  recordAction,
  saveFilteredPost,
} from './artemisStorage';
import { markStatsPostRemoved } from './artemisStatsStorage';

type TriggerPost = PostV2 & { id: string };
type TriggerAuthor = UserV2 & { name: string };
type PrivateMessageOptions = Parameters<typeof reddit.sendPrivateMessage>[0];

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function permalinkUrl(permalink: string): string {
  if (permalink.startsWith('http')) {
    return permalink;
  }

  return `https://www.reddit.com${permalink}`;
}

function getAuthorName(author: UserV2 | undefined): string {
  return author?.name || '[deleted]';
}

function privateMessageRecipient(username: string): string {
  return username.replace(/^\/?u\//i, '');
}

async function sendPrivateMessageSafely(
  description: string,
  options: PrivateMessageOptions
): Promise<boolean> {
  try {
    await reddit.sendPrivateMessage(options);
    return true;
  } catch (err) {
    console.warn(`Artemis PM: could not send ${description} to u/${options.to}.`, err);
    return false;
  }
}

function shouldSkipBotAuthor(authorName: string, appUsername: string | undefined): boolean {
  const normalized = authorName.toLowerCase();
  return (
    normalized === 'automoderator' ||
    (!!appUsername && normalized === appUsername.toLowerCase())
  );
}

function postModelToPostV2(post: Post): PostV2 {
  return {
    id: post.id,
    title: post.title,
    selftext: post.body ?? '',
    nsfw: post.nsfw,
    authorId: post.authorId ?? '',
    crowdControlLevel: 0,
    numReports: post.numberOfReports,
    isGallery: false,
    isMeta: false,
    createdAt: Math.floor(post.createdAt.getTime() / 1000),
    isApproved: post.approved,
    isArchived: post.archived,
    distinguished: 0,
    ignoreReports: post.ignoringReports,
    isSelf: false,
    isVideo: false,
    isLocked: post.locked,
    isSpoiler: post.spoiler,
    subredditId: post.subredditId,
    upvotes: 0,
    downvotes: 0,
    url: post.url,
    isSticky: post.stickied,
    linkFlair: post.flair
      ? {
          text: post.flair.text ?? '',
          cssClass: post.flair.cssClass ?? '',
          backgroundColor: post.flair.backgroundColor ?? '',
          templateId: post.flair.templateId ?? '',
          textColor: post.flair.textColor ?? '',
        }
      : undefined,
    spam: post.spam,
    deleted: false,
    languageCode: '',
    updatedAt: 0,
    gildings: 0,
    score: post.score,
    numComments: post.numberOfComments,
    thumbnail: post.thumbnail?.url ?? '',
    crosspostParentId: post.crosspostParentId ?? '',
    permalink: post.permalink,
    isPoll: false,
    isPromoted: false,
    isMultiMedia: false,
    type: '',
    unlisted: false,
    galleryImages: [],
    isImage: false,
    mediaUrls: [],
    isClubContent: false,
  };
}

async function notifyAuthorAboutFlair(
  post: TriggerPost,
  authorName: string,
  subredditName: string,
  removalNotice: string,
  customMessage: string,
  goodbye: string
): Promise<boolean> {
  if (authorName === '[deleted]') {
    return false;
  }

  let availableFlairs = MSG_USER_FLAIR_NO_PUBLIC_FLAIRS;
  try {
    availableFlairs = (await collatePublicPostFlairs(subredditName)) || availableFlairs;
  } catch (err) {
    console.error(`Artemis PM: could not list public post flairs for r/${subredditName}.`, err);
  }

  return sendPrivateMessageSafely('flair reminder', {
    to: privateMessageRecipient(authorName),
    subject: msgUserFlairSubject(subredditName),
    text: msgUserFlairBody({
      username: authorName,
      subredditName,
      availableFlairs,
      postPermalink: permalinkUrl(post.permalink),
      modmailLink: msgUserFlairModmailLink(subredditName, permalinkUrl(post.permalink)),
      removalNotice,
      goodbye,
      messagingInstructions: '',
      postTitle: post.title,
      customMessage,
    }),
  });
}

async function sendApprovalNotice(
  postId: T3,
  authorName: string,
  subredditName: string,
  strictMode: boolean
): Promise<boolean> {
  if (authorName === '[deleted]') {
    return false;
  }

  const post = await reddit.getPostById(postId);
  return sendPrivateMessageSafely('flair approval notice', {
    to: privateMessageRecipient(authorName),
    subject: `Your post on r/${subredditName} has been flaired.`,
    text: msgUserFlairApproval({
      username: authorName,
      approvalPhrase: 'Thanks for selecting',
      postPermalink: permalinkUrl(post.permalink),
      approvalDetail: strictMode ? msgUserFlairApprovalStrict(subredditName) : '',
      goodbye: randomGoodbye(),
    }),
  });
}

async function sendScheduleRemovalNotice(
  post: { permalink: string },
  authorName: string,
  subredditName: string,
  flairName: string,
  permittedDays: string[],
  currentDayOfWeek: string
): Promise<boolean> {
  if (authorName === '[deleted]') {
    return false;
  }

  return sendPrivateMessageSafely('schedule removal notice', {
    to: privateMessageRecipient(authorName),
    subject: msgScheduleRemovalSubject(subredditName),
    text: msgScheduleRemoval({
      username: authorName,
      subredditName,
      flairName,
      permittedDays: permittedDays.join(', '),
      currentDayOfWeek,
      postPermalink: permalinkUrl(post.permalink),
    }),
  });
}

export async function handlePostSubmitted(params: {
  post: PostV2 | undefined;
  author: UserV2 | undefined;
  subredditName: string | undefined;
  config?: ArtemisSubredditConfig;
  ignoreProcessed?: boolean;
  ignoreAgeLimit?: boolean;
}): Promise<void> {
  const post = params.post as TriggerPost | undefined;
  const subredditName = params.subredditName?.toLowerCase();
  if (!post || !subredditName) {
    return;
  }

  const postId = toT3(post.id);
  const postCreatedAt = post.createdAt ? normalizeUnixSeconds(post.createdAt) : nowSeconds();
  if (!params.ignoreProcessed && (await hasProcessedPost(postId))) {
    return;
  }

  if (!params.ignoreProcessed) {
    await markPostProcessed(postId, postCreatedAt);
  }

  if (!(await isFlairEnforcementEnabled(subredditName))) {
    return;
  }

  const config = params.config ?? (await loadSubredditConfig(subredditName));
  const authorName = getAuthorName(params.author as TriggerAuthor | undefined);
  const appUser = await reddit.getAppUser();
  if (shouldSkipBotAuthor(authorName, appUser?.username)) {
    return;
  }

  const ageSeconds = nowSeconds() - postCreatedAt;
  if (!params.ignoreAgeLimit && ageSeconds > ARTEMIS_SETTINGS.maxMonitorSeconds / 4) {
    return;
  }

  if (postHasFlair(post)) {
    const flairTemplateId = post.linkFlair?.templateId;
    const schedule = isFlairAllowedToday(flairTemplateId, config);
    if (!schedule.allowed) {
      if (await hasPostOperation(postId, 'Removed unscheduled post')) {
        return;
      }

      await reddit.remove(postId, false);
      await markStatsPostRemoved(postId);
      await sendScheduleRemovalNotice(
        post,
        authorName,
        subredditName,
        post.linkFlair?.text || 'this flair',
        schedule.permittedDays,
        schedule.currentDayOfWeek
      );
      await recordAction('Removed unscheduled post', { postId });
      await sendDiscordFlairActionAlert(config, {
        subredditName,
        action: 'Removed post for scheduled flair rule',
        authorName,
        postTitle: post.title,
        postPermalink: permalinkUrl(post.permalink),
      });
    }
    await applyConfiguredFlairTags(postId, flairTemplateId, config);
    return;
  }

  if (
    !config.flair_enforce_moderators &&
    authorName !== '[deleted]' &&
    (await isUserModerator(subredditName, authorName))
  ) {
    await recordAction('Skipped mod post', { postId });
    return;
  }

  if (config.flair_enforce_whitelist.includes(authorName.toLowerCase())) {
    await recordAction('Skipped whitelist post', { postId });
    return;
  }

  if (await getFilteredPost(postId)) {
    return;
  }

  const shouldRemove = config.flair_enforce_remove_posts;
  const removalNotice = shouldRemove
    ? config.flair_enforce_approve_posts
      ? MSG_USER_FLAIR_REMOVAL
      : MSG_USER_FLAIR_REMOVAL_NO_APPROVE
    : '';

  await saveFilteredPost({
    postId,
    subredditName,
    authorName,
    title: post.title,
    permalink: post.permalink,
    createdAt: postCreatedAt,
    recordedAt: nowSeconds(),
    removed: shouldRemove,
  });
  if (shouldRemove) {
    await reddit.remove(postId, false);
    await markStatsPostRemoved(postId);
    await recordAction('Removed post', { postId });
    await sendDiscordFlairActionAlert(config, {
      subredditName,
      action: 'Removed post missing flair',
      authorName,
      postTitle: post.title,
      postPermalink: permalinkUrl(post.permalink),
    });
  }

  const customMessage = config.flair_enforce_custom_message
    ? config.flair_enforce_custom_message
    : '';

  const sentFlairReminder = await notifyAuthorAboutFlair(
    post,
    authorName,
    subredditName,
    removalNotice,
    customMessage,
    config.custom_goodbye || randomGoodbye()
  );
  if (sentFlairReminder) {
    await recordAction('Sent flair reminder', { postId });
    await sendDiscordFlairActionAlert(config, {
      subredditName,
      action: 'Sent flair reminder',
      authorName,
      postTitle: post.title,
      postPermalink: permalinkUrl(post.permalink),
    });
  }

}

export async function checkRecentPostsForMissingFlair(subredditName: string): Promise<{
  checked: number;
  unflaired: number;
}> {
  const posts = await reddit
    .getNewPosts({
      subredditName,
      limit: 100,
      pageSize: 100,
    })
    .all();
  let unflaired = 0;

  for (const post of posts) {
    const postV2 = postModelToPostV2(post);
    if (postHasFlair(postV2)) {
      continue;
    }

    unflaired += 1;
    await handlePostSubmitted({
      post: postV2,
      author: { id: post.authorId ?? '', name: post.authorName } as UserV2,
      subredditName,
      ignoreProcessed: true,
      ignoreAgeLimit: true,
    });
  }

  return { checked: posts.length, unflaired };
}

export async function handlePostFlairUpdated(params: {
  post: PostV2 | undefined;
  author: UserV2 | undefined;
  subredditName: string | undefined;
  config?: ArtemisSubredditConfig;
}): Promise<void> {
  const post = params.post as TriggerPost | undefined;
  const subredditName = params.subredditName?.toLowerCase();
  if (!post || !subredditName || !postHasFlair(post)) {
    return;
  }

  const postId = toT3(post.id);
  const record = await getFilteredPost(postId);
  if (!record) {
    const config = params.config ?? (await loadSubredditConfig(subredditName));
    await applyConfiguredFlairTags(postId, post.linkFlair?.templateId, config);
    return;
  }

  const config = params.config ?? (await loadSubredditConfig(subredditName));
  const flairTemplateId = post.linkFlair?.templateId;
  const schedule = isFlairAllowedToday(flairTemplateId, config);

  if (!schedule.allowed) {
    if (await hasPostOperation(postId, 'Removed unscheduled post')) {
      return;
    }

    await reddit.remove(postId, false);
    await markStatsPostRemoved(postId);
    await sendScheduleRemovalNotice(
      post,
      record.authorName,
      subredditName,
      post.linkFlair?.text || 'this flair',
      schedule.permittedDays,
      schedule.currentDayOfWeek
    );
    await deleteFilteredPost(postId);
    await recordAction('Removed unscheduled post', { postId });
    await sendDiscordFlairActionAlert(config, {
      subredditName,
      action: 'Removed post for scheduled flair rule',
      authorName: record.authorName,
      postTitle: post.title,
      postPermalink: permalinkUrl(post.permalink),
    });
    return;
  }

  if (record.removed && config.flair_enforce_approve_posts) {
    await reddit.approve(postId);
    await sendApprovalNotice(postId, record.authorName, subredditName, true);
    await recordAction('Approved flaired post', { postId });
    await sendDiscordFlairActionAlert(config, {
      subredditName,
      action: 'Approved flaired post',
      authorName: record.authorName,
      postTitle: record.title,
      postPermalink: permalinkUrl(record.permalink),
    });
  } else {
    await sendApprovalNotice(postId, record.authorName, subredditName, false);
  }

  await applyConfiguredFlairTags(postId, flairTemplateId, config);
  await deleteFilteredPost(postId);
}

export async function reconcileFilteredPosts(): Promise<void> {
  const records = await listFilteredPosts(ARTEMIS_SETTINGS.schedulerReconcileLimit);
  const expiryCutoff = nowSeconds() - ARTEMIS_SETTINGS.maxMonitorSeconds;

  for (const record of records) {
    if (record.createdAt < expiryCutoff) {
      await deleteFilteredPost(record.postId);
      await recordAction('Cleared post', { postId: record.postId });
      continue;
    }

    try {
      const post = await reddit.getPostById(record.postId);
      if (post.flair?.templateId || post.flair?.text || post.flair?.cssClass) {
        await handlePostFlairUpdated({
          post: postModelToPostV2(post),
          author: { id: post.authorId ?? '', name: record.authorName } as UserV2,
          subredditName: record.subredditName,
        });
      }
    } catch (err) {
      console.error(`Artemis Reconcile: failed to check ${record.postId}.`, err);
    }
  }
}
