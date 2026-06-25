import { reddit } from '@devvit/web/server';

export async function isUserModerator(subredditName: string, username: string): Promise<boolean> {
  try {
    const moderators = await reddit.getModerators({ subredditName, username }).all();
    return moderators.some((mod) => mod.username.toLowerCase() === username.toLowerCase());
  } catch (err) {
    console.error(
      `Artemis Moderation: could not check whether u/${username} mods r/${subredditName}.`,
      err
    );
    return false;
  }
}
