# AssistantBOT Reborn

AssistantBOT Reborn is a work-in-progress Devvit/TypeScript port of Artemis, the Reddit moderator assistant formerly run as `u/AssistantBOT`.

Artemis helps subreddit moderators keep posts organized with post flair enforcement and gives communities a moderator-only statistics wiki page with post and subscriber activity summaries.

The old Python bot handled several concerns from one long-running process and a shared SQLite database. This app is being rebuilt as a subreddit-installed Devvit app, so state is stored in Devvit Redis per installation and work is driven by Reddit triggers plus scheduled jobs.

## What Artemis Does

Artemis currently focuses on two core functions:

- Records subreddit statistics and updates `r/<subreddit>/wiki/assistantbot_statistics`.
- Provides Devvit installation settings for flair enforcement, schedule rules, and NSFW/spoiler tagging.
- Enforces post flair rules by reminding submitters about unflaired posts, or removing them until they select a flair when the app has post moderation permission.

Implemented moderation features include:

- Delayed checks for newly submitted posts so users have time to select a flair.
- Reminder messages for submitters whose posts remain unflaired.
- Strict-mode removal of unflaired posts when the app has post moderation permission.
- Automatic approval of previously removed posts after an allowed flair is selected, when configured.
- Reconciliation of tracked posts in case Reddit misses a flair-update trigger.
- Schedule-restricted post flairs, where selected flair template IDs are only allowed on configured weekdays.
- NSFW and spoiler tagging from configured flair template IDs.
- Per-post operation history and action counters to make repeated trigger/scheduler runs idempotent.

Implemented statistics features include:

- Creation and update of the `assistantbot_statistics` wiki page.
- Daily post and subscriber snapshots after midnight UTC.
- Monthly top-post snapshots from Reddit's monthly `top` listing.
- Post totals grouped by month, no-flair counts, removal counts, NSFW/spoiler counts, average score/comments, and top flairs.
- Recent subscriber snapshots with daily change values.
- Bot-status/action-counter summaries.

## Current Status

Implemented:

- Reads Artemis configuration from the Devvit installation settings page.
- Falls back to existing legacy configuration from `r/<subreddit>/wiki/assistantbot_config` when matching installation settings have not been saved.
- Handles `onPostSubmit` by scheduling a delayed flair check.
- Removes or reminds users about posts that remain unflaired after the 5-minute grace period.
- Tracks removed/reminded posts in Redis so flair updates can be reconciled later.
- Handles `onPostFlairUpdate` for previously tracked posts.
- Approves previously removed posts after they receive an allowed flair, when configured and when the app has post moderation permission.
- Removes posts using schedule-restricted flairs on the wrong weekday.
- Applies configured NSFW and spoiler tags for matching flair template IDs.
- Runs a periodic reconciliation job for filtered posts in case a flair update trigger is missed.
- Uses Redis counters and per-post operation history for basic action tracking and idempotency.
- Creates the `assistantbot_statistics` wiki page when installed with wiki permission.
- Records lightweight post statistics from `onPostSubmit` and `onPostFlairUpdate`.
- Runs daily Devvit statistics jobs that refresh recent post snapshots, record subscriber counts, and update the statistics wiki page.
- Runs a monthly Devvit statistics job that records top posts from Reddit's monthly listing and refreshes the statistics wiki page.

Planned:

- Public menu/form UI for moderators.

Not being ported:

- Devvit platform limits: user flair statistics, subreddit traffic tables, OC flair tagging, and reply-to-PM flair selection.
- Installation-scoped storage: takeout/export hosting, central all-subreddit dashboards, sidebar widgets, global Redis/database workflows, and direct imports from `_data_main.db` or `_data_stats.db`.
- Deprecated Python-bot workflows: legacy moderator PM commands (`enable`, `disable`, `example`, `update`, `revert`, `takeout`, `query`), Pushshift/RedditMetrics backfills, and central maintainer alerts.

## Installing Artemis

In the original bot, moderators invited a bot account with selected moderator permissions. In the Devvit port, Artemis is installed as a Devvit app on each subreddit.

After installation, Artemis will:

- Initialize per-subreddit Redis state.
- Create `r/<subreddit>/wiki/assistantbot_statistics` when possible.
- Begin enforcing flair on new posts through Reddit triggers and scheduled checks.
- Refresh statistics through scheduled jobs after midnight UTC.

For best results, subreddits should also enable Reddit's built-in "Require post flair" post requirement. Artemis is still useful as a backup because it can catch posts that pass through Reddit's native requirement checks or are affected by client/platform inconsistencies.

## Flair Enforcement Modes

Artemis behavior is determined by the moderator permissions available to the app:

| Moderator Permissions                            | Flair Enforcement Actions                                                                                   | Mode Name |
|--------------------------------------------------|-------------------------------------------------------------------------------------------------------------|-----------|
| `Manage Wiki Pages`                              | Creates and updates Artemis wiki pages. Flair reminder behavior can run without post removal.               | `Default` |
| `Manage Wiki Pages`, `Manage Posts and Comments` | Sends flair reminder messages and removes unflaired posts until a flair is selected.                        | `Strict`  |
| `Everything`                                     | Equivalent to granting the required wiki and posts permissions, plus any future supported app capabilities. | `Strict`  |

The old `Default+` and `Strict+` modes depended on users replying to the bot's private messages with a flair name. That workflow is not supported in this Devvit port because the app does not receive private-message reply triggers.

## Advanced Configuration

Artemis is designed to work with minimal setup. Common per-subreddit settings live in the Devvit app installation settings page:

```text
https://developers.reddit.com/r/<subreddit>/apps/assistantbot-rb
```

The following Devvit installation settings are currently active:

- **Enable Flair Enforcement** (`flair_enforcement_enabled`): whether Artemis should enforce missing post flair at all.
- **Enforce Flair on Moderator Posts** (`flair_enforce_moderators`): whether moderators' own posts should receive flair enforcement.
- **Approve Flaired Posts** (`flair_enforce_approve_posts`): whether Artemis should approve removed posts after they receive an allowed flair.
- **Custom Flair Reminder Message** (`flair_enforce_custom_message`): custom text included in flair reminder messages.
- **Flair Enforcement Whitelist** (`flair_enforce_whitelist`): users who should not receive flair enforcement.
- **NSFW Flair Template IDs** (`flair_tag_nsfw`): post flair template IDs that should mark matching posts as NSFW.
- **Spoiler Flair Template IDs** (`flair_tag_spoiler`): post flair template IDs that should mark matching posts as spoilers.
- **Scheduled Flair Rule 1-5 IDs** (`flair_schedule_rule_1_ids` through `flair_schedule_rule_5_ids`): post flair template IDs for each schedule rule.
- **Scheduled Flair Rule 1-5 Days** (`flair_schedule_rule_1_days` through `flair_schedule_rule_5_days`): weekdays when each schedule rule's flair IDs are allowed.
- **Custom Goodbye** (`custom_goodbye`): custom sign-off used in messages.

The app does not set hardcoded Devvit defaults for these fields. If an installation setting has not been saved, Artemis falls back to a matching value from an existing legacy wiki page, then to the built-in default.

Existing legacy config pages are still read as a compatibility fallback:

```text
r/<subreddit>/wiki/assistantbot_config
```

The wiki page may still contain the install-setting fields listed above, plus the older YAML `flair_tags` and `flair_schedule` mappings. New installs should use the Devvit installation settings page instead.

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
- Monthly top-post snapshots.

Most recorded data comes from Reddit API objects that are already visible to moderators or publicly visible on Reddit. Traffic data is not collected in this port because Devvit does not expose an equivalent subreddit traffic endpoint.

Removing the app from a subreddit stops future trigger and scheduler processing for that installation.

## Devvit Surface

Configured triggers:

- `onAppInstall`
- `onAppUpgrade`
- `onPostSubmit`
- `onPostFlairUpdate`

Configured scheduler tasks:

- `artemis-check-submitted-post`: one-off delayed check for a submitted post.
- `artemis-reconcile-filtered-posts`: cron reconciliation every 15 minutes.
- `artemis-record-daily-stats`: daily post/subscriber statistics refresh after midnight UTC.
- `artemis-record-monthly-stats`: monthly top-post statistics refresh after midnight UTC on the first day of the month.

Permissions:

- Reddit API with moderator scope.
- Redis.
- Devvit installation settings.

## Project Structure

```text
src/
├── index.ts                    # Hono server route setup
├── core/
│   ├── artemisConfig.ts        # Install settings merge and legacy wiki fallback
│   ├── artemisFlair.ts         # Flair template, schedule, and tag helpers
│   ├── artemisIds.ts           # Reddit thing ID helpers
│   ├── artemisInstallSettings.ts # Devvit installation settings helpers
│   ├── artemisModeration.ts    # App/mod permission helpers
│   ├── artemisPosts.ts         # Submission, flair-update, and reconciliation logic
│   ├── artemisSettings.ts      # Shared constants/job names
│   ├── artemisStatsCollator.ts # Markdown collation for statistics wiki sections
│   ├── artemisStatsRecorder.ts # Trigger/scheduler statistics snapshot recording
│   ├── artemisStatsStorage.ts  # Redis-backed statistics storage
│   ├── artemisStatsWiki.ts     # Statistics wiki page creation/update helpers
│   ├── artemisStorage.ts       # Redis-backed state, counters, and indexes
│   ├── artemisTypes.ts         # Artemis config/storage types
│   ├── text.ts                 # User/mod-facing message templates
│   └── timekeeping.ts          # Flair schedule date helpers
└── routes/
    ├── scheduler.ts            # Devvit scheduler endpoints
    └── triggers.ts             # Devvit trigger endpoints
```

## Development

Requirements:

- Node.js 22.2 or newer.
- Devvit CLI authentication through `npm run login`.

Useful commands:

```bash
npm install
npm run type-check
npm run lint
npm run build
npm run dev
```

Deployment commands:

```bash
npm run deploy
npm run launch
```

## Statistics Porting Notes

The original `artemis_stats.py` runtime was a single daily Python process that iterated every monitored subreddit from a shared SQLite database. In Devvit, the statistics component is installation-scoped and event-driven:

- `onPostSubmit` and `onPostFlairUpdate` write compact post snapshots to Redis.
- `artemis-record-daily-stats` samples recent posts, records the current subscriber count, and updates `r/<subreddit>/wiki/assistantbot_statistics`.
- `artemis-record-monthly-stats` records monthly top-post summaries from Reddit's listing API and updates the same wiki page.
- The stats page keeps the old high-level sections: bot status, posts, subscribers, and traffic. The traffic section now explicitly says it is unavailable in Devvit.

Portable from the Python stats runtime:

- Subscriber snapshots from the Reddit API.
- Post/flair counts from post events and recent listing scans.
- Top post summaries using Reddit listing APIs.
- Statistics wiki page creation, hidden/mod-only page settings, and periodic wiki updates.
- Artemis action counters already collected by the Devvit moderation flow.

Not portable or intentionally omitted:

- Historical traffic tables and current-month traffic estimates.
- Pushshift and RedditMetrics historical backfills.
- Userflair enumeration/statistics.
- Cross-subreddit dashboard pages and public sidebar widget updates.
- Local backup, cleanup, threading, and `main_timer` process-control code.
- Private-message command workflows and takeout/export hosting.
