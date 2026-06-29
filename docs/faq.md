# AssistantBOT Reborn FAQ

AssistantBOT Reborn is the Devvit version of Artemis, a Reddit moderation assistant for post flair enforcement and subreddit statistics.

This FAQ describes the current Devvit app only. A version history of the old Python version of the bot can be found in [Deprecated](deprecated.md).

## Installing Artemis

Install the app from the Devvit app page for your subreddit (click 'Add to community'):

```text
https://developers.reddit.com/apps/assistantbot-rb
```

After installation, Artemis will initialize its databases, create the `assistantbot_statistics` wiki page (when statistics updating is enabled), and send an onboarding modmail notification. It will also begin processing new post and flair-update triggers.

Artemis also sends moderators a direct link after the statistics page is first successfully updated (around midnight UTC), warns during onboarding when no public post flairs are available, and sends a setup warning if it cannot create or update the statistics wiki page.

For best results, also enable Reddit's built-in post requirement for required post flair. Artemis is still useful as a backup for posts that reach the subreddit without flair, which is still possible on some Reddit clients.

## What Artemis Does

Artemis was first released in 2018 as a one-stop shop for some common moderation features and continues to serve in this capacity. It has two primary functions:

- Enforce post flair rule and guideliness on new submissions.
- Maintain a subreddit statistics wiki page.

Implemented flair features:

- Checks new submissions when Reddit sends the Devvit post-submit trigger.
- Sends flair reminder private messages to submitters whose posts have no post flair.
- Removes unflaired posts when **Remove Unflaired Posts** is enabled.
- Approves removed posts after they receive an allowed flair when **Automatically Approve Flaired Posts** is enabled.
- Rechecks tracked removed/reminded posts every 15 minutes in case Reddit misses a flair-update trigger.
- Stops tracking a post after 24 hours.
- Skips moderator posts by default.
- Skips usernames listed in the flair-enforcement whitelist.
- Skips `u/AutoModerator` and the app's own account.
- Applies configured NSFW or spoiler tags when a matching post flair template ID is used.
- Removes posts that use a schedule-restricted flair on a disallowed day.

Implemented statistics features:

- Creates and updates `r/<subreddit>/wiki/assistantbot_statistics`.
- Keeps the statistics wiki page unlisted and moderator-only when wiki settings can be updated.
- Records compact post snapshots from post-submit and flair-update triggers.
- Refreshes recent post snapshots during the daily statistics job.
- Records daily subscriber snapshots.
- Records monthly top-post snapshots by score from Reddit's monthly top listing and by comments from stored Artemis snapshots.
- Shows overall post activity, subscriber growth trends, bot status, action counters, post totals, no-flair counts, removal counts, NSFW/spoiler counts, average score/comments, top flairs, subscriber snapshots, and top posts by score/comments.
- Archives an existing Python-era `assistantbot_statistics` page to `assistantbot_statistics_legacy` before the first Devvit statistics write.

## Flair Enforcement

The current Devvit app processes new submissions as soon as Reddit sends the post-submit trigger. It does not use the old Python bot's five-minute grace period; see [Deprecated Python behavior](deprecated.md).

If a new post has no flair, Artemis can send a reminder message, remove the post, or both depending on installation settings. If the post later receives an allowed flair, Artemis can approve it automatically.

For flair scheduling, certain post flairs can be set to only be allowed to post on certain days (e.g. 'Meme Mondays'). Artemis checks whether that flair is allowed on the current day.

Other post flairs can be set to automatically be linked to NSFW or spoiler tags.

Tracked unflaired posts are reconciled for up to 24 hours. After that, Artemis treats the post as abandoned for automatic tracking purposes, though moderators or users may still choose to flair them manually.

## Settings

Current configuration lives in the Devvit app installation settings page:

```text
https://developers.reddit.com/r/<subreddit>/apps/assistantbot-rb
```

If the bot detects a previous legacy configuration page `https://www.reddit.com/r/<subreddit>/wiki/assistantbot_config`, it will apply the settings from that page upon installation. Unfortunately, the limitations of Devvit don't allow for the bot to auto-populate the new Devvit settings page, so users will have to fill that page out manually. Properly configured settings on Devvit will override a legacy configuration page.

Active settings:

| Setting                                  | What it controls                                                                                                                                |
|------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------|
| **Enable Flair Enforcement**             | Turns flair enforcement on or off.                                                                                                              |
| **Enable Statistics Updating**           | Turns statistics updates on or off.                                                                                                             |
| **Enable Userflair Gathering**           | Gathers user flair assignments during monthly statistics updates, manual statistics page refreshes, and manual user flair statistics refreshes. |
| **Discord Webhook URL**                  | Discord webhook URL for optional Artemis alerts. Visible to moderators who can manage app settings.                                             |
| **Send Discord Flair Action Alerts**     | Sends a Discord alert after flair reminders, flair-rule removals, flaired-post approvals, or recent-post flair refreshes.                       |
| **Send Discord Statistics Alerts**       | Sends a Discord alert after daily, monthly, or manual statistics updates finish.                                                                |
| **Remove Unflaired Posts**               | Removes posts that remain unflaired. If disabled, Artemis can still send reminders.                                                             |
| **Enforce Flair on Moderator Posts**     | Applies flair enforcement to posts made by moderators. Disabled by default.                                                                     |
| **Automatically Approve Flaired Posts**  | Approves posts Artemis removed after they receive an allowed flair.                                                                             |
| **Custom Flair Reminder Message**        | Adds subreddit-specific text to flair reminder messages. Truncated at 500 characters.                                                           |
| **Custom Goodbye**                       | Sets a short sign-off phrase for reminder messages. Truncated at 20 characters.                                                                 |
| **Flair Enforcement Username Whitelist** | Excludes listed usernames from flair enforcement. Do not include `u/`.                                                                          |
| **Auto-NSFW Flair Template IDs**         | Marks posts with matching flair template IDs as NSFW.                                                                                           |
| **Auto-Spoiler Flair Template IDs**      | Marks posts with matching flair template IDs as spoilers.                                                                                       |
| **Flair Schedule 1: Template IDs**       | Sets flair template IDs for the first schedule rule.                                                                                            |
| **Flair Schedule 1: Allowed Days**       | Sets the days when the first schedule rule's flair IDs are allowed.                                                                             |
| **Flair Schedule 2: Template IDs**       | Sets flair template IDs for the second schedule rule.                                                                                           |
| **Flair Schedule 2: Allowed Days**       | Sets the days when the second schedule rule's flair IDs are allowed.                                                                            |
| **Flair Schedule 3: Template IDs**       | Sets flair template IDs for the third schedule rule.                                                                                            |
| **Flair Schedule 3: Allowed Days**       | Sets the days when the third schedule rule's flair IDs are allowed.                                                                             |
| **Flair Schedule 4: Template IDs**       | Sets flair template IDs for the fourth schedule rule.                                                                                           |
| **Flair Schedule 4: Allowed Days**       | Sets the days when the fourth schedule rule's flair IDs are allowed.                                                                            |
| **Flair Schedule 5: Template IDs**       | Sets flair template IDs for the fifth schedule rule.                                                                                            |
| **Flair Schedule 5: Allowed Days**       | Sets the days when the fifth schedule rule's flair IDs are allowed.                                                                             |

For settings that ask for flair template IDs, use your subreddit's post flair management page:

```text
https://www.reddit.com/mod/<subreddit>/postflair/
```

Use the flair template ID, not the display text. A template ID looks like this:

```text
fb75eb7a-2dc3-11ef-9565-4ae35dc91fa1
```

## Legacy Configuration

The Devvit app will read an existing legacy configuration page as a fallback:

```text
r/<subreddit>/wiki/assistantbot_config
```

Saved Devvit installation settings override matching wiki values. New installs and active configuration changes should use the Devvit settings page, not the legacy wiki page.

The legacy `flair_enforce_alert_list` setting is parsed for compatibility but is not acted on by the current Devvit handlers. Other deprecated config workflows are listed in [Deprecated Python behavior](deprecated.md).

## Statistics

Artemis updates statistics through scheduled Devvit jobs when **Enable Statistics Updating** is on:

| Job                                | Schedule                                           |
|------------------------------------|----------------------------------------------------|
| `artemis-record-daily-stats`       | Daily at 00:05 UTC                                 |
| `artemis-record-monthly-stats`     | Monthly at 00:30 UTC on the first day of the month |

The statistics page is at:

```text
r/<subreddit>/wiki/assistantbot_statistics
```

The Devvit statistics page includes overall post activity, subscriber growth trends, bot status, post activity, monthly top posts by score/comments, subscriber snapshots, and user flair distribution when userflair gathering is enabled.

If the subreddit already has a previous non-Devvit `assistantbot_statistics` page, Artemis archives that page to:

```text
r/<subreddit>/wiki/assistantbot_statistics_legacy
```

Future Devvit jobs update only the current `assistantbot_statistics` page.

## Discord Alerts

Moderators can enter a Discord webhook URL in the Devvit app installation settings and enable either or both alert categories:

- **Statistics alerts**: sent after daily, monthly, or manual statistics updates finish and the statistics wiki page has been rewritten.
- **Flair action alerts**: sent after Artemis sends a flair reminder, removes a post for flair rules, approves a previously removed flaired post, or completes the refresh menu action.

The webhook URL is stored as a subreddit installation setting. Devvit does not treat per-subreddit installation settings as secret app settings, so other moderators who can manage app settings will be able to view the webhook URL, too.

## Data

Artemis stores Devvit-era state in [Devvit Redis](https://developers.reddit.com/docs/capabilities/server/redis) for the app installation.

Stored data includes:

- Tracked unflaired posts.
- Whether Artemis removed a tracked post.
- Per-post operation history.
- Action counters.
- Compact post snapshots for statistics.
- Subscriber snapshots.
- Aggregated user flair assignment counts, when userflair gathering is enabled. (note: username-userflair associations are _not_ saved)
- Monthly top-post snapshots.

Most stored data comes from Reddit API objects already visible to moderators or publicly visible on Reddit. The app does not store post images or full post bodies for statistics.

Uninstalling the app stops future trigger and scheduler processing for that subreddit installation immediately.

## Common Questions

### Who can use Artemis?

Any subreddit where a moderator can install the Devvit app can use this port.

### Does Artemis replace Reddit's required-post-flair setting?

No. The built-in Reddit post requirement should still be enabled when possible. Artemis can help when certain clients ignore that setting, or when flairs need to be associated with certain days or community tags.

### Does Artemis act on moderator posts?

Not by default. Enable **Enforce Flair on Moderator Posts** if the subreddit wants Artemis to enforce flair on moderator submissions.

### How do I disable flair enforcement?

Turn off **Enable Flair Enforcement** in the Devvit app installation settings.

### Can users reply to Artemis with a flair name?

No. Submitters should select flair through Reddit's post flair interface. Users used to be able to reply to a flair enforcement message with a PM selecting that flair, but that behavior isn't supported on Devvit. The old `Default+` and `Strict+` private-message reply workflow is listed in [Deprecated Python behavior](deprecated.md).

### Can Artemis enforce scheduled flairs?

Yes. Configure a schedule rule with post flair template IDs and allowed days. If a submitter uses one of those flairs on a disallowed day, Artemis removes the post and sends a message explaining the allowed days. Note that the timeframe for a "day of the week" is determined by a large spam of timezones - from [New Zealand](https://en.wikipedia.org/wiki/Time_in_New_Zealand) to [Hawaii](https://en.wikipedia.org/wiki/Time_in_Hawaii).

### Can Artemis mark posts as NSFW or spoiler based on flair?

Yes. Add matching post flair template IDs to **Auto-NSFW Flair Template IDs** or **Auto-Spoiler Flair Template IDs**.

### What happens if a post is flaired after Artemis removes it?

If **Automatically Approve Flaired Posts** is enabled, Artemis approves the post after it receives an allowed flair. If that setting is disabled, the user is told that moderators may restore the post manually. If this setting is disabled, moderators may need to check their spam queue once in a while.

### Does Artemis collect subreddit traffic data?

No. Devvit does not expose an equivalent subreddit traffic endpoint for this app, so the current statistics page does not include traffic tables or current-month traffic estimates. Reddit has also [deprecated](https://www.reddit.com/r/modnews/comments/1h7hcun/say_goodbye_to_newreddit_on_dec_11_2024/) "traffic" statistics in general. See [Deprecated Python behavior](deprecated.md). Moderators should use the native insights feature instead at `https://www.reddit.com/mod/<subreddit>/insights`.

### Does Artemis collect userflair statistics?

Yes, when **Enable Userflair Gathering** is on. Artemis records aggregate user flair assignment counts during the monthly statistics update, manual statistics page refresh, and manual user flair statistics refresh, then uses them for the user flair distribution table.

### Does Artemis use Pushshift or RedditMetrics?

No. Both sites are no longer publicly available, and so the Devvit app only records current Reddit API data from triggers, recent listings, subscriber snapshots, and monthly top listings. It does not backfill historical data from Pushshift or RedditMetrics. See [Deprecated Python behavior](deprecated.md).

### Can moderators request a Takeout export or Query report?

No. The old modmail `Takeout` and `Query` workflows are not implemented in the Devvit app. See [Deprecated Python behavior](deprecated.md).

### Where do moderators change settings?

Use the Devvit app installation settings page:

```text
https://developers.reddit.com/r/<subreddit>/apps/assistantbot-rb
```

The old `assistantbot_config` wiki page is only a compatibility fallback.
