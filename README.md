# AssistantBOT Reborn

AssistantBOT Reborn is a work-in-progress Devvit/TypeScript port of [Artemis](https://github.com/kungming2/AssistantBOT), the Reddit moderator assistant formerly run as `u/AssistantBOT`.

Artemis helps subreddit moderators keep posts organized with post flair enforcement and gives communities a moderator-only statistics wiki page with post and subscriber activity summaries.

The old Python bot handled several concerns from one long-running process and a shared SQLite database. This app is being rebuilt as a subreddit-installed Devvit app, so state is stored in Devvit Redis per installation and work is driven by Reddit triggers plus scheduled jobs.

## What Artemis Does

Artemis currently focuses on two core functions:

- Enforces post flair rules by reminding submitters about unflaired posts and removing them until they select a flair. Includes flair enforcement, schedule rules, and NSFW/spoiler tagging.
- Records subreddit statistics and updates `r/<subreddit>/wiki/assistantbot_statistics`.

Implemented moderation features include:

- Immediate checks for newly submitted posts when Reddit sends the post-submit trigger.
- Optional subreddit menu check for up to 100 recent posts, using the same missing-flair enforcement flow as new submissions.
- Reminder messages for submitters whose posts are submitted without flair.
- Strict-mode removal of unflaired posts.
- Automatic approval of previously removed unflaired posts after an allowed flair is selected, when configured.
- Reconciliation of tracked posts in case Reddit misses a flair-update trigger.
- Schedule-restricted post flairs, where selected flair template IDs are only allowed on configured days.
- NSFW and spoiler tagging from configured flair template IDs.
- Per-post operation history and action counters to make repeated trigger/scheduler runs idempotent.

Implemented statistics features include:

- Creation and update of the `assistantbot_statistics` wiki page.
- Daily post and subscriber snapshots after midnight UTC.
- Monthly top-post snapshots by score from Reddit's monthly `top` listing and by comments from stored Artemis snapshots.
- Overall post activity by UTC time block and recent subscriber growth trends.
- Post totals grouped by month, no-flair counts, removal counts, NSFW/spoiler counts, average score/comments, and top flairs.
- User flair assignment snapshots with a top user-flair distribution table.
- Recent subscriber snapshots with daily change values.
- Bot-status/action-counter summaries.

## Current Status

Implemented:

- Reads Artemis configuration from the Devvit installation settings page.
- Falls back to existing legacy configuration from `r/<subreddit>/wiki/assistantbot_config` when matching installation settings have not been saved.
- Handles `onPostSubmit` by checking flair immediately.
- Adds a moderator-only subreddit menu item, **Check Recent Posts' Flair**, that checks up to 100 recent posts for missing flair.
- Adds a moderator-only subreddit menu item, **Refresh Statistics Page**, that records recent subreddit statistics and updates `assistantbot_statistics`.
- Removes or reminds users about posts submitted without flair.
- Tracks removed/reminded posts in Redis so flair updates can be reconciled later.
- Handles `onPostFlairUpdate` for previously tracked posts.
- Approves previously removed unflaired posts after they receive an allowed flair, when configured.
- Removes posts using schedule-restricted flairs on a disallowed day.
- Applies configured NSFW and spoiler tags for matching flair template IDs.
- Runs a periodic reconciliation job for filtered posts in case a flair update trigger is missed.
- Uses Redis counters and per-post operation history for basic action tracking and idempotency.
- Creates the `assistantbot_statistics` wiki page.
- Archives existing legacy `assistantbot_statistics` content to `assistantbot_statistics_legacy` before the first Devvit statistics write.
- Records lightweight post statistics from `onPostSubmit` and `onPostFlairUpdate`.
- Runs daily Devvit statistics jobs that refresh recent post snapshots, record subscriber counts, and update the statistics wiki page.
- Runs a monthly Devvit statistics job that records top posts from Reddit's monthly listing and refreshes the statistics wiki page.
- Sends optional Discord alerts for completed statistics updates and flair actions when configured.

Planned:

- Public menu/form UI for moderators.

Not being ported:

- Devvit platform limits: subreddit traffic tables, OC flair tagging, and reply-to-PM flair selection.
- Installation-scoped storage: takeout/export hosting, central all-subreddit dashboards, sidebar widgets, global Redis/database workflows, and direct imports from `_data_main.db` or `_data_stats.db`.
- Deprecated Python-bot workflows: legacy moderator PM commands (`enable`, `disable`, `example`, `update`, `revert`, `takeout`, `query`), Pushshift/RedditMetrics backfills, and central maintainer alerts.

## Documentation

Additional Devvit-era docs live in [docs](docs/):

- [FAQ](docs/faq.md) for moderator-facing setup and operations questions.
- [Development notes](docs/development.md) for maintainer commands and source layout.

## Installing Artemis

In the original bot, moderators invited a bot account. In the Devvit port, Artemis is installed as a Devvit app on each subreddit:

```text
https://developers.reddit.com/r/<subreddit>/apps/assistantbot-rb
```

After installation, Artemis will:

- Initialize per-subreddit Redis state.
- Create `r/<subreddit>/wiki/assistantbot_statistics` when possible.
- Begin enforcing flair on new posts through Reddit triggers.
- Refresh statistics through scheduled jobs after midnight UTC when enabled, with an optional moderator menu refresh for on-demand updates.

For best results, subreddits should also enable Reddit's built-in "Require post flair" post requirement. Artemis is still useful as a backup because it can catch posts that pass through Reddit's native requirement checks or are affected by client/platform inconsistencies.

## Flair Enforcement Mode

The Devvit port runs Artemis in strict flair-enforcement mode: it sends flair reminder messages and removes unflaired posts until a flair is selected. The old `Default+` and `Strict+` modes depended on users replying to the bot's private messages with a flair name. That workflow is not supported in this Devvit port because the app does not receive private-message reply triggers. Artemis can still send one-way moderator notifications through modmail, such as its install notice.

Automatic approval only applies to posts Artemis removed because they were missing flair. Posts removed because they used a schedule-restricted flair on a disallowed day are not automatically restored after a later flair change, because the original submission was still made on a disallowed day.

Moderators can also use the subreddit-level **Check Recent Posts' Flair** menu item to ask Artemis to check up to 100 recent posts for missing flair. This is optional: Artemis is intended to work automatically from Reddit triggers, and the menu item acts only as a refresh button for current posts. Posts found without flair go through the same missing-flair flow as new submissions, including subreddit settings for moderator posts, removal, reminders, approvals after flairing, and the username whitelist.

Moderators can use **Refresh Statistics Page** to run the daily statistics collection for the current subreddit and rewrite `assistantbot_statistics` immediately. This is optional; the scheduled daily and monthly statistics jobs remain the normal update path when statistics updating is enabled.

## Advanced Configuration

Artemis is designed to work with minimal setup. Common per-subreddit settings live in the Devvit app installation settings page:

```text
https://developers.reddit.com/r/<subreddit>/apps/assistantbot-rb
```

The following fields are currently available on the Devvit installation settings page:

- **Enable Flair Enforcement** (`flair_enforcement_enabled`): whether Artemis should enforce missing post flair at all.
- **Enable Statistics Updating** (`statistics_updating_enabled`): whether Artemis should run daily and monthly statistics updates and the manual statistics page refresh.
- **Enable Userflair Gathering** (`userflair_gathering_enabled`): whether Artemis should gather user flair assignments during monthly statistics updates and manual statistics page refreshes. This only applies when statistics updating is enabled.
- **Discord Webhook URL** (`discord_webhook_url`): Discord webhook URL for optional Artemis alerts. This per-subreddit installation setting is visible to moderators who can manage app settings.
- **Send Discord Statistics Alerts** (`discord_alert_statistics_enabled`): whether Artemis should send a Discord alert after daily, monthly, or manual statistics updates finish. Requires a Discord webhook URL.
- **Send Discord Flair Action Alerts** (`discord_alert_flair_actions_enabled`): whether Artemis should send a Discord alert after flair reminders, flair-rule removals, or flaired-post approvals. Requires a Discord webhook URL.
- **Remove Unflaired Posts** (`flair_enforce_remove_posts`): whether Artemis should remove posts that remain unflaired. This only applies when flair enforcement is enabled; when disabled, Artemis can still send reminder messages.
- **Enforce Flair on Moderator Posts** (`flair_enforce_moderators`): whether moderators' own posts should receive flair enforcement.
- **Approve Flaired Posts** (`flair_enforce_approve_posts`): whether Artemis should approve removed unflaired posts after they receive an allowed flair. This only applies when unflaired post removal is enabled; posts removed for a disallowed-day scheduled flair are not automatically restored after later flair changes.
- **Custom Flair Reminder Message** (`flair_enforce_custom_message`): custom text included in flair reminder messages.
- **Custom Goodbye** (`custom_goodbye`): custom sign-off used in flair reminder messages.
- **Flair Enforcement Username Whitelist** (`flair_enforce_whitelist`): users who should not receive flair enforcement.
- **NSFW Flair Template IDs** (`flair_tag_nsfw`): post flair template IDs that should mark matching posts as NSFW.
- **Spoiler Flair Template IDs** (`flair_tag_spoiler`): post flair template IDs that should mark matching posts as spoilers.
- **Flair Schedule 1-5: Template IDs** (`flair_schedule_rule_1_ids` through `flair_schedule_rule_5_ids`): optional post flair template IDs for each schedule rule. Artemis allows up to five groups of flairs to only be allowed on certain days.
- **Flair Schedule 1-5: Allowed Days** (`flair_schedule_rule_1_days` through `flair_schedule_rule_5_days`): days when each schedule rule's flair IDs are allowed.

For settings that ask for post flair template IDs, moderators can find those IDs at `https://www.reddit.com/mod/<subreddit>/postflair/`. Hover over a flair you have created, then click **Copy ID**. A valid post flair template ID looks like `fb75eb7a-2dc3-11ef-9565-4ae35dc51fa1`; this is the ID format Artemis expects, not the flair display text.

The app does not set hardcoded Devvit defaults for these fields. If an installation setting has not been saved, Artemis falls back to a matching value from an existing legacy wiki page, then to the built-in default.

Existing legacy config pages are still read as a compatibility fallback only:

```text
r/<subreddit>/wiki/assistantbot_config
```

Existing subreddits with this wiki page can keep working without manually copying every value immediately. Artemis reads the wiki page at runtime, then lets any saved Devvit installation setting override the matching wiki value. This is compatibility behavior only: the wiki values are not copied into the native Devvit settings UI, so moderators are strongly encouraged to update and save the native installation settings when they can.

The wiki page may still contain the install-setting fields listed above, plus the older YAML `flair_tags` and `flair_schedule` mappings. New installs and active configuration changes should use the Devvit installation settings page instead. The old message-command `update` and `revert` workflow is deprecated in this Devvit port.

The following legacy settings are parsed for compatibility with the old config shape but are not currently acted on by the Devvit handlers:

- `flair_enforce_alert_list`

## Data

Artemis stores Devvit-era subreddit state in Devvit Redis for the app installation. The port does not use the old shared SQLite databases as runtime dependencies.

The app records:

- Tracked unflaired posts and whether Artemis removed them.
- Per-post operation history used for idempotency.
- Action counters.
- Post snapshots from submit/flair-update triggers and recent-listing recovery scans.
- Subscriber snapshots.
- User flair assignment snapshots, when userflair gathering is enabled.
- Monthly top-post snapshots.

Most recorded data comes from Reddit API objects that are already visible to moderators or publicly visible on Reddit. Traffic data is not collected in this port because Devvit does not expose an equivalent subreddit traffic endpoint.

Removing the app from a subreddit stops future trigger and scheduler processing for that installation.

## Statistics Porting Notes

The original `artemis_stats.py` runtime was a single daily Python process that iterated every monitored subreddit from a shared SQLite database. In Devvit, the statistics component is installation-scoped and event-driven:

- `onPostSubmit` and `onPostFlairUpdate` write compact post snapshots to Redis.
- `artemis-record-daily-stats` samples recent posts, records the current subscriber count, and updates `r/<subreddit>/wiki/assistantbot_statistics` when statistics updating is enabled.
- `artemis-record-monthly-stats` records monthly top-post summaries by score from Reddit's listing API, archives top-commented posts from stored Artemis snapshots for the same month, optionally records current user flair assignments, and updates the same wiki page when statistics updating is enabled.
- Optional Discord statistics alerts are sent only after the statistics wiki update finishes.
- The stats page keeps Devvit-supported sections for overall activity, bot status, posts, and subscribers.

Existing `assistantbot_statistics` pages can contain years of Python-era history. The Devvit updater does not silently overwrite that history on first run. The migration behavior for existing subreddits is:

- Read the current `r/<subreddit>/wiki/assistantbot_statistics` page before the first Devvit statistics write.
- If the page exists and does not look like a Devvit-generated page, copy it unchanged to `r/<subreddit>/wiki/assistantbot_statistics_legacy`.
- Replace `assistantbot_statistics` with the current Devvit summary only after the legacy archive has been created.
- Link from the current Devvit page to the legacy archive so moderators can find the preserved Python-era statistics.
- Treat the legacy archive as read-only after creation; future scheduled jobs should update only the Devvit current page.

Portable from the Python stats runtime:

- Subscriber snapshots from the Reddit API.
- Post/flair counts from post events and recent listing scans.
- User flair assignment counts from Reddit's user flair listing API.
- Top post summaries using Reddit listing APIs.
- Statistics wiki page creation, hidden/mod-only page settings, and periodic wiki updates.
- Artemis action counters already collected by the Devvit moderation flow.

Not portable or intentionally omitted:

- Historical traffic tables and current-month traffic estimates.
- Pushshift and RedditMetrics historical backfills.
- Cross-subreddit dashboard pages and public sidebar widget updates.
- Local backup, cleanup, threading, and `main_timer` process-control code.
- Private-message command workflows and takeout/export hosting.
