# AssistantBOT Reborn

## Overview

**AssistantBOT Reborn** is the Devvit version of Artemis, the Reddit moderation assistant formerly run as `u/AssistantBOT`. This Devvit version has been created to allow folks still using the Python version of the bot to easily transition to a native app equivalent for the Reddit platform, while retaining behavior they're already familiar with. This version is installed as a Devvit app on each subreddit.

Artemis is for subreddit moderators who want help keeping posts organized. It checks new posts for missing or disallowed post flair, can remind submitters to choose flair, can remove unflaired posts when configured, and can approve those posts again after an allowed flair is selected. It can also apply NSFW or spoiler tags based on selected flair template IDs.

Artemis also maintains a moderator-only statistics wiki page at `r/<subreddit>/wiki/assistantbot_statistics`. The statistics page summarizes post activity, subscriber snapshots, top posts, flair usage, bot actions, and optional user flair distribution data.

Complementary Features:

Reddit's built-in moderation tools have improved dramatically since AssistantBOT was first deployed in 2018. Artemis adds the following features beyond what Reddit provides natively:

- Flair scheduling - only allow memes on Monday? You can limit selected post flairs to specific days of the week.
- Flair-based NSFW and spoiler tagging - automatically mark posts NSFW or spoiler when users select configured flair template IDs.
- Persistent statistics over time - Reddit's Insights use rolling lookback windows, while Artemis keeps subreddit-local historical snapshots across scheduled updates.
- UTC posting activity - see which UTC time blocks have the most posting activity in your community.
- Post flair and user flair summaries - see which post flairs are most common, plus user flair distribution when user flair gathering is enabled.

Important operational notes:

- For best results, also enable Reddit's built-in **Require post flair** post requirement. Artemis is a backup and enforcement layer for posts that still reach the subreddit without flair, which is possible on some clients.
- The bot's current configuration lives in the Devvit app installation settings page.
- Older `assistantbot_config` wiki pages are read only as a compatibility fallback, though any saved Devvit settings will override matching configuration settings saved on the wiki.
- Existing Python-era `assistantbot_statistics` pages are archived to `assistantbot_statistics_legacy` before Artemis writes the current Devvit statistics page for the first time. The legacy page will be linked to from the current page.

## Install And Deploy

Install Artemis from this Devvit app page:

```text
https://developers.reddit.com/apps/assistantbot-rb
```

Settings for the bot can then be configured at:

```text
https://developers.reddit.com/r/<subreddit>/apps/assistantbot-rb
```

After installation, Artemis will:

- Send moderators an onboarding modmail notification.
- Check for legacy configuration information from the previous Python version of the bot.
- Begin checking new posts when Reddit sends post-submit triggers.
- Listen for post flair updates so removed posts can be approved after receiving allowed flair, when configured.
- Create or update `r/<subreddit>/wiki/assistantbot_statistics` when statistics updating is enabled.
- Send moderators a direct link after the statistics page is first successfully updated.
- Warn moderators if no public post flairs are available for users to select.

## Configuration

Open the Devvit app installation settings page for the subreddit:

```text
https://developers.reddit.com/r/<subreddit>/apps/assistantbot-rb
```

Current settings:

- **Enable Flair Enforcement** (`flair_enforcement_enabled`): turns flair enforcement on or off.
- **Enable Statistics Updating** (`statistics_updating_enabled`): turns scheduled statistics updates, manual statistics page refreshes, and manual user flair statistics refreshes on or off. This is enabled by default.
- **Enable Userflair Gathering** (`userflair_gathering_enabled`): gathers aggregate user flair assignment counts during monthly statistics updates and manual statistics refreshes. This only applies when statistics updating is enabled.
- **Discord Webhook URL** (`discord_webhook_url`): Discord webhook URL for optional Artemis alerts. This per-subreddit setting is visible to moderators who can manage app settings.
- **Send Discord Flair Action Alerts** (`discord_alert_flair_actions_enabled`): sends Discord alerts after flair reminders, flair-rule removals, flaired-post approvals, or recent-post flair refreshes. Requires a Discord webhook URL.
- **Send Discord Statistics Alerts** (`discord_alert_statistics_enabled`): sends Discord alerts after daily, monthly, or manual statistics updates finish. Requires a Discord webhook URL.
- **Remove Unflaired Posts** (`flair_enforce_remove_posts`): removes posts that remain unflaired. If disabled, Artemis can still send flair reminder messages.
- **Enforce Flair on Moderator Posts** (`flair_enforce_moderators`): applies flair enforcement to posts made by subreddit moderators.
- **Automatically Approve Flaired Posts** (`flair_enforce_approve_posts`): approves posts Artemis removed after they receive an allowed flair. This only applies when unflaired post removal is enabled. Posts removed for a disallowed-day scheduled flair are not automatically restored after later flair changes.
- **Custom Flair Reminder Message** (`flair_enforce_custom_message`): custom text included in flair reminder messages.
- **Custom Goodbye** (`custom_goodbye`): custom sign-off used in flair reminder messages.
- **Flair Enforcement Username Whitelist** (`flair_enforce_whitelist`): users who should not receive flair enforcement. Do not include `u/`.
- **Auto-NSFW Flair Template IDs** (`flair_tag_nsfw`): post flair template IDs that should mark matching posts as NSFW.
- **Auto-Spoiler Flair Template IDs** (`flair_tag_spoiler`): post flair template IDs that should mark matching posts as spoilers.
- **Flair Schedule 1-5: Template IDs** (`flair_schedule_rule_1_ids` through `flair_schedule_rule_5_ids`): optional post flair template IDs for up to five schedule rules.
- **Flair Schedule 1-5: Allowed Days** (`flair_schedule_rule_1_days` through `flair_schedule_rule_5_days`): days when each schedule rule's flair IDs are allowed.

For settings that ask for post flair template IDs, use the subreddit post flair management page:

```text
https://www.reddit.com/mod/<subreddit>/postflair/
```

Use the flair template ID, not the display text. A valid template ID looks like:

```text
fb75eb7a-2dc3-11ef-9565-4ae35dc51fa1
```

## Interacting With Artemis

Most Artemis work happens automatically:

- New posts are checked when Reddit sends the post-submit trigger.
- Flair changes are checked when Reddit sends the post-flair-update trigger.
- Tracked removed or reminded posts are reconciled every 15 minutes in case Reddit misses a flair-update trigger.
- Daily statistics run at 00:05 UTC when statistics updating is enabled.
- Monthly statistics run at 00:30 UTC on the first day of the month when statistics updating is enabled.

Moderators can also use these subreddit menu actions on mobile or desktop:

- **[Artemis] Check Recent Posts for Missing Flair**: checks up to 100 recent posts using the same missing-flair enforcement flow as new submissions.
- **[Artemis] Refresh Statistics Page**: records recent subreddit statistics and updates `r/<subreddit>/wiki/assistantbot_statistics`.
- **[Artemis] Refresh User Flair Statistics**: gathers current aggregate user flair assignments and updates the statistics wiki page.

Submitters interact with Artemis by choosing post flair through Reddit's normal post flair interface. The old Python bot's private-message flair reply workflow is not supported in this Devvit app.

## Migration Notes

Existing subreddits with this legacy config page can keep working while they move settings into Devvit:

```text
r/<subreddit>/wiki/assistantbot_config
```

If there are no Devvit settings, Artemis will read the matching settings on the config page and then falls back to the built-in default. Saved Devvit settings override matching wiki values. The wiki values are not copied into the native Devvit settings UI, so moderators should review and save the Devvit settings page when they can.

If `r/<subreddit>/wiki/assistantbot_statistics` already contains Python-era statistics, Artemis archives it unchanged to `r/<subreddit>/wiki/assistantbot_statistics_legacy` before the first Devvit statistics write. Future scheduled jobs will update only the current Devvit statistics page.

Please see [Deprecated Python behavior](docs/deprecated.md) for old workflows and statistics sections that are not part of the Devvit port.

## Fetch Domains

The following domain is requested for this app, and is already present on the Devvit [global fetch allowlist](https://developers.reddit.com/docs/capabilities/http-fetch#global-fetch-allowlist):

- `discord.com` - Used to send optional, moderator-configured Discord webhook alerts for bot actions.

If moderators configure a Discord webhook URL and enable Discord alerts, Artemis sends the alert content to Discord so it can be displayed in the moderators' Discord server.

## Data

Artemis stores Devvit-era subreddit state in Devvit Redis for the app installation.

Stored data includes tracked unflaired posts, whether Artemis removed a tracked post, per-post operation history, action counters, compact post snapshots for statistics, subscriber snapshots, aggregate user flair assignment counts when enabled, and monthly top-post snapshots.

Most recorded data comes from Reddit API objects already visible to moderators or publicly visible on Reddit. Removing and uninstalling the app from a subreddit immediately stops future trigger and scheduler processing for that installation.

## Documentation

Additional documentation can be found in [docs](docs/index.md):

- [FAQ](docs/faq.md) for moderator-facing setup and operations questions.
- [Privacy Policy](docs/privacy.md) for data collection, storage, sharing, and retention details.
- [Terms And Conditions](docs/terms.md) for app usage terms.
- [Deprecated Python behavior](docs/deprecated.md) for old workflows and statistics sections that are not part of the Devvit port.
- [Version History](docs/version_history.md) for the full historical changelog.

## License

AssistantBOT Reborn is licensed under the [MIT License](LICENSE).

## Changelog

This is an abbreviated changelog for Reddit app review.

- **1.0.0**: Rebuilt Artemis as an installable Devvit app with trigger-based flair enforcement, Devvit installation settings, scheduled statistics updates, moderator-only menu actions, optional Discord alerts, and legacy statistics archiving.
- **Legacy Python releases**: Earlier Python-bot releases are retained in [Version History](docs/version_history.md) for historical context, but many older workflows are not part of this Devvit port.
