# Deprecated Python Behavior

This page centralizes behavior from the old Python/[PRAW](https://github.com/praw-dev/praw) Artemis routines that is not part of the current Devvit app. Current install and operating instructions live in the [FAQ](faq.md).

## Artemis Main: Flair Enforcement

The old `artemis_main.py` routine ran as a long-lived Python process over a shared SQLite database. The Devvit port is installed per subreddit, stores runtime state in Devvit Redis, and is driven by Reddit triggers plus scheduled jobs.

No longer supported or intentionally deprecated:

- Inviting a bot account to a subreddit as the installation path. Moderators install the Devvit app instead.
- Legacy moderator private-message commands: `enable`, `disable`, `example`, `update`, `revert`, `takeout`, and `query`. Everything is in the bot's settings page now.
- The old `Default+` and `Strict+` flair modes where users replied to the bot's private message with a flair name. Devvit does not provide the app with private-message reply triggers, so submitters must choose flair through Reddit's post flair interface.
- The old five-minute grace-period check for new posts. The Devvit app checks new submissions as soon as a user submits a post.
- Updating active configuration through the old message-command `update` and `revert` workflow. Existing `assistantbot_config` wiki pages are read only as a compatibility fallback; active changes should use the bot's settings page.
- Acting on the legacy `flair_enforce_alert_list` setting. In Python `artemis_main.py`, this was an opt-in list of moderator usernames without `u/`; entries were trimmed and lowercased, then strict flair removals PMed only listed users who were subreddit moderators. The PM used the subject `[Notification] Post on r/{subreddit} removed.`, linked to the removed post, and included an NSFW warning when applicable. It did not control removals, restorations, or approvals, and the current Discord alert system functionally replaces it.
- OC flair tagging from the old Python `flair_tags` behavior, which has been deprecated by Reddit. The current Devvit app supports NSFW and spoiler tags from configured flair template IDs.

## Artemis Statistics

The old `artemis_stats.py` routine was a single daily Python process that iterated every monitored subreddit from a shared SQLite state. The Devvit port records statistics per installation from Reddit triggers, scheduled jobs, Reddit API listing calls, and Redis snapshots.

No longer supported or intentionally deprecated:

- Pushshift and RedditMetrics backfills and derived data. Both sites have long been gone from public access - Pushshift is now a moderator-only tool and does not expose any APIs.
- Historical subreddit traffic tables and current-month traffic estimates. Devvit does not expose an equivalent traffic endpoint for this app, as old-school traffic data has been deprecated.
- Public sidebar widget updates.
- Takeout/export hosting and query reports.
- The legacy `Statistics Recorded Since` field that came from old retrieved-history state.
- The legacy `Subreddit Created` field on the active statistics page.
- Top submitter and top commenter tables.
- The standalone legacy userflair section, including New Reddit emoji rendering and separate subscriber-with-flair lines. The current app can still gather user flair assignments when enabled, but renders them as a top user-flair distribution table.
