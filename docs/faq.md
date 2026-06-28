# AssistantBOT Reborn FAQ

AssistantBOT Reborn is the Devvit version of Artemis, a Reddit moderation helper for post flair enforcement and subreddit statistics.

This FAQ describes the current Devvit app only. Old Python/PRAW workflows that are not part of the Devvit app are listed in [Deprecated Python behavior](deprecated.md).

## Installing Artemis

Install the app from the Devvit app page for your subreddit:

```text
https://developers.reddit.com/r/<subreddit>/apps/assistantbot-rb
```

After installation, Artemis initializes per-subreddit Redis state, creates the `assistantbot_statistics` wiki page when statistics updating is enabled and possible, sends an onboarding modmail notification, begins processing new post and flair-update triggers, and runs scheduled statistics jobs. Artemis also sends moderators a direct link after the statistics page is first successfully updated, warns during onboarding when no public post flairs are available, and sends a setup warning if it cannot create or update the statistics wiki page.

For best results, also enable Reddit's built-in post requirement for required post flair. Artemis is still useful as a backup for posts that reach the subreddit without flair.

## What Artemis Does

Artemis currently has two main functions:

- Enforce post flair rules on new submissions.
- Maintain a moderator-only subreddit statistics wiki page.

Implemented flair features:

- Checks new submissions when Reddit sends the Devvit post-submit trigger.
- Sends flair reminder private messages to submitters whose posts have no post flair.
- Removes unflaired posts when **Remove Unflaired Posts** is enabled.
- Approves removed posts after they receive an allowed flair when **Approve Flaired Posts** is enabled.
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

The current Devvit app processes new submissions as soon as Reddit sends the post-submit trigger. It does not use the old Python bot's five-minute grace period; see [Deprecated Python behavior](deprecated.md#main-flair-enforcement).

If a new post has no flair, Artemis can send a reminder message, remove the post, or both depending on installation settings. If the post later receives an allowed flair, Artemis can approve it automatically.

If a post already has flair, Artemis checks whether that flair is allowed on the current day and whether it should apply NSFW or spoiler tags.

Tracked unflaired posts are reconciled for up to 24 hours. After that, Artemis treats the post as abandoned for automatic tracking purposes.

## Settings

Current configuration lives in the Devvit app installation settings page:

```text
https://developers.reddit.com/r/<subreddit>/apps/assistantbot-rb
```

Active settings:

| Setting | What it controls |
|---|---|
| **Enable Flair Enforcement** | Turns flair enforcement on or off. |
| **Enable Statistics Updating** | Runs daily and monthly statistics updates plus the manual statistics page and user flair statistics refreshes. |
| **Enable Userflair Gathering** | Gathers user flair assignments during monthly statistics updates, manual statistics page refreshes, and manual user flair statistics refreshes. |
| **Discord Webhook URL** | Discord webhook URL for optional Artemis alerts. Visible to moderators who can manage app settings. |
| **Send Discord Statistics Alerts** | Sends a Discord alert after daily, monthly, or manual statistics updates finish. |
| **Send Discord Flair Action Alerts** | Sends a Discord alert after flair reminders, flair-rule removals, flaired-post approvals, or recent-post flair refreshes. |
| **Remove Unflaired Posts** | Removes posts that remain unflaired. If disabled, Artemis can still send reminders. |
| **Enforce Flair on Moderator Posts** | Applies flair enforcement to posts made by moderators. Disabled by default. |
| **Approve Flaired Posts** | Approves posts Artemis removed after they receive an allowed flair. |
| **Custom Flair Reminder Message** | Adds subreddit-specific text to flair reminder messages. Truncated at 500 characters. |
| **Custom Goodbye** | Sets a short sign-off phrase for reminder messages. Truncated at 20 characters. |
| **Flair Enforcement Username Whitelist** | Excludes listed usernames from flair enforcement. Do not include `u/`. |
| **NSFW Flair Template IDs** | Marks posts with matching flair template IDs as NSFW. |
| **Spoiler Flair Template IDs** | Marks posts with matching flair template IDs as spoilers. |
| **Flair Schedule 1-5: Template IDs** | Sets flair template IDs for up to five schedule rules. |
| **Flair Schedule 1-5: Allowed Days** | Sets the days when each schedule rule's flair IDs are allowed. |

For settings that ask for flair template IDs, use Reddit's post flair management page:

```text
https://www.reddit.com/mod/<subreddit>/postflair/
```

Use the flair template ID, not the display text. A template ID looks like this:

```text
fb75eb7a-2dc3-11ef-9565-4ae35dc51fa1
```

## Legacy Configuration

The Devvit app can read an existing legacy configuration page as a fallback:

```text
r/<subreddit>/wiki/assistantbot_config
```

Saved Devvit installation settings override matching wiki values. New installs and active configuration changes should use the Devvit settings page, not the legacy wiki page.

The legacy `flair_enforce_alert_list` setting is parsed for compatibility but is not acted on by the current Devvit handlers. Other deprecated config workflows are listed in [Deprecated Python behavior](deprecated.md#main-flair-enforcement).

## Statistics

Artemis updates statistics through scheduled Devvit jobs when **Enable Statistics Updating** is on:

| Job | Schedule |
|---|---|
| `artemis-record-daily-stats` | Daily at 00:05 UTC |
| `artemis-record-monthly-stats` | Monthly at 00:30 UTC on the first day of the month |
| `artemis-reconcile-filtered-posts` | Every 15 minutes |

The statistics page is:

```text
r/<subreddit>/wiki/assistantbot_statistics
```

The Devvit statistics page includes overall post activity, subscriber growth trends, bot status, post activity, monthly top posts by score/comments, subscriber snapshots, and user flair distribution when userflair gathering is enabled.

If the subreddit already has a Python-era `assistantbot_statistics` page, Artemis archives that page to:

```text
r/<subreddit>/wiki/assistantbot_statistics_legacy
```

Future Devvit jobs update only the current `assistantbot_statistics` page.

## Discord Alerts

Moderators can enter a Discord webhook URL in the Devvit app installation settings and enable either or both alert categories:

- **Statistics alerts**: sent after daily, monthly, or manual statistics updates finish and the statistics wiki page has been rewritten.
- **Flair action alerts**: sent after Artemis sends a flair reminder, removes a post for flair rules, approves a previously removed flaired post, or completes the recent-post flair refresh menu action.

The webhook URL is stored as a subreddit installation setting. Devvit does not treat per-subreddit installation settings as secret app settings, so moderators who can manage app settings may be able to view it.

## Data

Artemis stores Devvit-era state in Devvit Redis for the app installation. It does not use the old shared SQLite databases at runtime.

Stored data includes:

- Tracked unflaired posts.
- Whether Artemis removed a tracked post.
- Per-post operation history.
- Action counters.
- Compact post snapshots for statistics.
- Subscriber snapshots.
- Aggregated user flair assignment counts, when userflair gathering is enabled.
- Monthly top-post snapshots.

Most stored data comes from Reddit API objects already visible to moderators or publicly visible on Reddit. The Devvit app does not store post images or full post bodies for statistics.

Uninstalling the app stops future trigger and scheduler processing for that subreddit installation.

## Common Questions

### Who can use Artemis?

Any subreddit where a moderator can install the Devvit app can use this port.

### Does Artemis replace Reddit's required-post-flair setting?

No. The built-in Reddit post requirement should still be enabled when possible. Artemis is a moderation backup and statistics tool, not a replacement for Reddit's native submission UI checks.

### Does Artemis act on moderator posts?

Not by default. Enable **Enforce Flair on Moderator Posts** if the subreddit wants Artemis to enforce flair on moderator submissions.

### How do I disable flair enforcement?

Turn off **Enable Flair Enforcement** in the Devvit app installation settings. Removing the app from the subreddit stops all Artemis processing for that installation.

### Can users reply to Artemis with a flair name?

No. Submitters should select flair through Reddit's post flair interface. The old `Default+` and `Strict+` private-message reply workflow is listed in [Deprecated Python behavior](deprecated.md#main-flair-enforcement).

### Can Artemis enforce scheduled flairs?

Yes. Configure a schedule rule with post flair template IDs and allowed days. If a submitter uses one of those flairs on a disallowed day, Artemis removes the post and sends a message explaining the allowed days.

### Can Artemis mark posts as NSFW or spoiler based on flair?

Yes. Add matching post flair template IDs to **NSFW Flair Template IDs** or **Spoiler Flair Template IDs**.

### What happens if a post is flaired after Artemis removes it?

If **Approve Flaired Posts** is enabled, Artemis approves the post after it receives an allowed flair. If that setting is disabled, the user is told that moderators may restore the post manually.

### Does Artemis collect subreddit traffic data?

No. Devvit does not expose an equivalent subreddit traffic endpoint for this app, so the current statistics page does not include traffic tables or current-month traffic estimates. See [Deprecated Python behavior](deprecated.md#statistics).

### Does Artemis collect userflair statistics?

Yes, when **Enable Userflair Gathering** is on. Artemis records aggregate user flair assignment counts during the monthly statistics update, manual statistics page refresh, and manual user flair statistics refresh, then uses them for the user flair distribution table.

### Does Artemis use Pushshift or RedditMetrics?

No. The Devvit app records current Reddit API data from triggers, recent listings, subscriber snapshots, and monthly top listings. It does not backfill historical data from Pushshift or RedditMetrics. See [Deprecated Python behavior](deprecated.md#statistics).

### Can moderators request a Takeout export or Query report?

No. The old modmail `Takeout` and `Query` workflows are not implemented in the Devvit app. See [Deprecated Python behavior](deprecated.md).

### Where do moderators change settings?

Use the Devvit app installation settings page:

```text
https://developers.reddit.com/r/<subreddit>/apps/assistantbot-rb
```

The old `assistantbot_config` wiki page is only a compatibility fallback.
