import { reddit } from '@devvit/web/server';

export type PermissionName = 'all' | 'wiki' | 'posts' | 'flair';

export async function getAppModPermissions(subredditName: string): Promise<string[]> {
  const appUser = await reddit.getAppUser();
  if (!appUser) {
    return [];
  }

  try {
    return await appUser.getModPermissionsForSubreddit(subredditName);
  } catch (err) {
    console.error(`Artemis Moderation: could not get app permissions on r/${subredditName}.`, err);
    return [];
  }
}

export function hasPermission(permissions: string[], permission: PermissionName): boolean {
  return permissions.includes('all') || permissions.includes(permission);
}

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
