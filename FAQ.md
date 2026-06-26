# AssistantBOT Reborn FAQ

AssistantBOT Reborn is the Devvit version of Artemis, a Reddit moderation helper for post flair enforcement and subreddit statistics.

This FAQ describes the current Devvit app only. The old Python/PRAW bot used moderator invites, private-message commands, shared SQLite databases, Pushshift backfills, traffic tables, takeout exports, and query reports. Those workflows are not part of the current Devvit app.

## Installing Artemis

Install the app from the Devvit app page for your subreddit:

```text
https://developers.reddit.com/r/<subreddit>/apps/assistantbot-rb
```

After installation, Artemis initializes per-subreddit Redis state, creates the `assistantbot_statistics` wiki page when possible, sends an onboarding modmail notification, begins processing new post and flair-update triggers, and runs scheduled statistics jobs.

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
- Removes posts that use a schedule-restricted flair on the wrong weekday.

Implemented statistics features:

- Creates and updates `r/<subreddit>/wiki/assistantbot_statistics`.
- Keeps the statistics wiki page unlisted and moderator-only when wiki settings can be updated.
- Records compact post snapshots from post-submit and flair-update triggers.
- Refreshes recent post snapshots during the daily statistics job.
- Records daily subscriber snapshots.
- Records monthly top-post snapshots from Reddit's monthly top listing.
- Shows bot status, action counters, post totals, no-flair counts, removal counts, NSFW/spoiler counts, average score/comments, top flairs, subscriber snapshots, and top posts.
- Archives an existing Python-era `assistantbot_statistics` page to `assistantbot_statistics_legacy` before the first Devvit statistics write.

## Flair Enforcement

The current Devvit app processes new submissions as soon as Reddit sends the post-submit trigger. It does not use the old Python bot's five-minute grace period.

If a new post has no flair, Artemis can send a reminder message, remove the post, or both depending on installation settings. If the post later receives an allowed flair, Artemis can approve it automatically.

If a post already has flair, Artemis checks whether that flair is allowed on the current weekday and whether it should apply NSFW or spoiler tags.

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
| **Remove Unflaired Posts** | Removes posts that remain unflaired. If disabled, Artemis can still send reminders. |
| **Enforce Flair on Moderator Posts** | Applies flair enforcement to posts made by moderators. Disabled by default. |
| **Approve Flaired Posts** | Approves posts Artemis removed after they receive an allowed flair. |
| **Custom Flair Reminder Message** | Adds subreddit-specific text to flair reminder messages. Truncated at 500 characters. |
| **Custom Goodbye** | Sets a short sign-off phrase for reminder messages. Truncated at 20 characters. |
| **Flair Enforcement Username Whitelist** | Excludes listed usernames from flair enforcement. Do not include `u/`. |
| **NSFW Flair Template IDs** | Marks posts with matching flair template IDs as NSFW. |
| **Spoiler Flair Template IDs** | Marks posts with matching flair template IDs as spoilers. |
| **Flair Schedule 1-5: Template IDs** | Sets flair template IDs for up to five schedule rules. |
| **Flair Schedule 1-5: Allowed Days** | Sets the weekdays when each schedule rule's flair IDs are allowed. |

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

The legacy `flair_enforce_alert_list` setting is parsed for compatibility but is not acted on by the current Devvit handlers.

## Statistics

Artemis updates statistics through scheduled Devvit jobs:

| Job | Schedule |
|---|---|
| `artemis-record-daily-stats` | Daily at 00:05 UTC |
| `artemis-record-monthly-stats` | Monthly at 00:30 UTC on the first day of the month |
| `artemis-reconcile-filtered-posts` | Every 15 minutes |

The statistics page is:

```text
r/<subreddit>/wiki/assistantbot_statistics
```

The Devvit statistics page includes bot status, post activity, subscriber snapshots, and a traffic section explaining that traffic data is unavailable in this runtime.

If the subreddit already has a Python-era `assistantbot_statistics` page, Artemis archives that page to:

```text
r/<subreddit>/wiki/assistantbot_statistics_legacy
```

Future Devvit jobs update only the current `assistantbot_statistics` page.

## Data

Artemis stores Devvit-era state in Devvit Redis for the app installation. It does not use the old shared SQLite databases at runtime.

Stored data includes:

- Tracked unflaired posts.
- Whether Artemis removed a tracked post.
- Per-post operation history.
- Action counters.
- Compact post snapshots for statistics.
- Subscriber snapshots.
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

No. The old `Default+` and `Strict+` private-message reply workflow is not available in this Devvit app. Submitters should select flair through Reddit's post flair interface.

### Can Artemis enforce scheduled flairs?

Yes. Configure a schedule rule with post flair template IDs and allowed weekdays. If a submitter uses one of those flairs on a disallowed day, Artemis removes the post and sends a message explaining the allowed days.

### Can Artemis mark posts as NSFW or spoiler based on flair?

Yes. Add matching post flair template IDs to **NSFW Flair Template IDs** or **Spoiler Flair Template IDs**.

### What happens if a post is flaired after Artemis removes it?

If **Approve Flaired Posts** is enabled, Artemis approves the post after it receives an allowed flair. If that setting is disabled, the user is told that moderators may restore the post manually.

### Does Artemis collect subreddit traffic data?

No. Devvit does not expose an equivalent subreddit traffic endpoint for this app, so the current statistics page does not include traffic tables or current-month traffic estimates.

### Does Artemis collect userflair statistics?

No. Userflair enumeration and userflair statistics are not available in this Devvit port.

### Does Artemis use Pushshift or RedditMetrics?

No. The Devvit app records current Reddit API data from triggers, recent listings, subscriber snapshots, and monthly top listings. It does not backfill historical data from Pushshift or RedditMetrics.

### Can moderators request a Takeout export or Query report?

No. The old modmail `Takeout` and `Query` workflows are not implemented in the Devvit app.

### Where do moderators change settings?

Use the Devvit app installation settings page:

```text
https://developers.reddit.com/r/<subreddit>/apps/assistantbot-rb
```

The old `assistantbot_config` wiki page is only a compatibility fallback.
