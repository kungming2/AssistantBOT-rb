# Deprecated Python Behavior

This page centralizes behavior from the old Python/PRAW Artemis routines that is not part of the current Devvit app. Current install and operating instructions live in the [FAQ](faq.md).

## Artemis Main: Flair Enforcement

The old `artemis_main.py` routine ran as a long-lived Python process over a shared SQLite database. The Devvit port is installed per subreddit, stores runtime state in Devvit Redis, and is driven by Reddit triggers plus scheduled jobs.

No longer supported or intentionally deprecated:

- Inviting a bot account to a subreddit as the installation path. Moderators install the Devvit app instead.
- Legacy moderator private-message commands: `enable`, `disable`, `example`, `update`, `revert`, `takeout`, and `query`.
- The old `Default+` and `Strict+` flair modes where users replied to the bot's private message with a flair name. Devvit does not provide the app with private-message reply triggers, so submitters must choose flair through Reddit's post flair interface.
- The old five-minute grace-period check for new posts. The Devvit app checks new submissions as soon as Reddit sends the post-submit trigger.
- Updating active configuration through the old message-command `update` and `revert` workflow. Existing `assistantbot_config` wiki pages are read only as a compatibility fallback; active changes should use Devvit installation settings.
- Acting on the legacy `flair_enforce_alert_list` setting. It may still be parsed from legacy config for compatibility, but current Devvit handlers do not use it.
- OC flair tagging from the old Python `flair_tags` behavior. The current Devvit app supports NSFW and spoiler tags from configured flair template IDs.
- Central maintainer alerts, global Redis/database workflows, and direct runtime imports from `_data_main.db`.

Current replacement behavior:

- New submissions are checked by the `onPostSubmit` trigger.
- Flair changes are handled by `onPostFlairUpdate`.
- Already tracked removed or reminded posts are reconciled by `artemis-reconcile-filtered-posts`.
- One-way moderator notifications can still be sent through modmail, such as the installation notice.
- Devvit installation settings are the active configuration surface.

## Artemis Statistics

The old `artemis_stats.py` routine was a single daily Python process that iterated every monitored subreddit from shared SQLite state. The Devvit port records statistics per installation from Reddit triggers, scheduled jobs, Reddit API listing calls, and Redis snapshots.

No longer supported or intentionally deprecated:

- Direct runtime imports from `_data_stats.db`.
- Pushshift and RedditMetrics backfills.
- Historical subreddit traffic tables and current-month traffic estimates. Devvit does not expose an equivalent traffic endpoint for this app.
- Cross-subreddit dashboard pages and public sidebar widget updates.
- Takeout/export hosting and query reports.
- Local backup, cleanup, threading, and `main_timer` process-control behavior from the old Python routine.
- The legacy `Statistics Recorded Since` field that came from old retrieved-history state.
- The legacy `Subreddit Created` field on the active statistics page.
- Pushshift-derived daily most-active submission and comment lists.
- Top submitter and top commenter tables.
- Oldest-subreddit-submission backfills.
- Legacy subscriber milestone history reconstructed from Pushshift, RedditMetrics, or Python-era archives. The Devvit page only projects forward from snapshots collected by the current installation.
- The standalone legacy userflair section, including New Reddit emoji rendering and separate subscriber-with-flair lines. The current app can still gather user flair assignments when enabled, but renders them as a top user-flair distribution table.

Current replacement behavior:

- `onPostSubmit` and `onPostFlairUpdate` write compact post snapshots.
- `artemis-record-daily-stats` records recent post snapshots, subscriber snapshots, and the current statistics wiki page.
- `artemis-record-monthly-stats` records monthly top-post summaries and optional aggregate user flair assignment counts.
- The active page is `r/<subreddit>/wiki/assistantbot_statistics`.
- Existing Python-era statistics content is archived once to `r/<subreddit>/wiki/assistantbot_statistics_legacy` before the first Devvit statistics write, when a legacy page exists.
- Future scheduled jobs update only the active Devvit statistics page.
