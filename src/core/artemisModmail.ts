import { reddit } from '@devvit/web/server';
import type { T5 } from '@devvit/shared-types/tid.js';
import { botDisclaimer } from './text';

type ModeratorNotification = {
  subredditName: string;
  subredditId?: string;
  subject: string;
  bodyMarkdown: string;
  logContext: string;
};

async function subredditIdForName(subredditName: string): Promise<T5 | undefined> {
  try {
    const subredditInfo = await reddit.getSubredditInfoByName(subredditName);
    return subredditInfo.id;
  } catch (err) {
    console.warn(`Artemis Modmail: could not load subreddit ID for r/${subredditName}.`, err);
    return undefined;
  }
}

export async function sendModeratorNotification(
  notification: ModeratorNotification
): Promise<boolean> {
  const subredditId =
    (notification.subredditId as T5 | undefined) ??
    (await subredditIdForName(notification.subredditName));
  if (!subredditId) {
    return false;
  }

  try {
    await reddit.modMail.createModNotification({
      subredditId,
      subject: notification.subject,
      bodyMarkdown: `${notification.bodyMarkdown.trimEnd()}${botDisclaimer(notification.subredditName)}`,
    });
    return true;
  } catch (err) {
    console.warn(
      `Artemis Modmail: could not send ${notification.logContext} notification for r/${notification.subredditName}.`,
      err
    );
    return false;
  }
}
