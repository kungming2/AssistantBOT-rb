# Version History

[<- Back to Home](./index.md) • [🕯️ Deprecated](./deprecated.md) • [🛠️ Development](./development.md) • [❓ FAQ](./faq.md) • [🔎️ Guide](./guide.md) • [📓 Version History](./version_history.md)

*This wiki page serves as a non-exhaustive list of changes and tweaks made to improve the operations of Artemis (u/AssistantBOT).*

*Note: All important .X updates are named after tree types, as [Artemis](https://en.wikipedia.org/wiki/Artemis) is a goddess of the forest.*

## Version Names

| Tree Name    | Version No. | Released   |
|--------------|-------------|------------|
| Aspen        | 1.0         | 2018-11-04 |
| Birch        | 1.1         | 2019-01-07 |
| Cedar        | 1.2         | 2019-01-23 |
| Dawn Redwood | 1.3         | 2019-02-25 |
| Eucalyptus   | 1.4         | 2019-04-17 |
| Fir          | 1.5         | 2019-09-22 |
| Ginkgo       | 1.6         | 2019-10-25 |
| Hazel        | 1.7         | 2019-12-01 |
| Icaco        | 1.8         | 2020-01-16 |
| Juniper      | 2.0         | 2020-04-28 |
| Katsura      | 2.1         | 2021-01-08 |
| Laurel       | 2.2         | 2021-04-22 |
| Maple        | 2.3         | 2021-06-22 |
| Neem         | Devvit 1.0  | 2026-07-01 |

## Change Log

| Change Log Tag  | Description                                                                                        |
|-----------------|----------------------------------------------------------------------------------------------------|
| 🆕 **Feature**  | A key new feature or change of the bot, one that usually merits a version change.                  |
| ➕ **Addition**  | Refinements to existing features of the bot to improve usability, usually noticeable by redditors. |
| 🔧 **Change**   | Changes to how the bot operates, usually not noticeable by redditors.                              |
| 🐞 **Bug Fix**  | Bug fixes for issues.                                                                              |
| 🕯️ **Removed** | Features or code handling that was removed.                                                        |

### Devvit v1.0 [Neem](https://en.wikipedia.org/wiki/Azadirachta_indica) (Current, 2026-07-01)

* 🆕 **Feature**: Artemis has been rebuilt as a Devvit app that moderators install directly on each subreddit, rather than as a single externally hosted Python bot account.
* 🆕 **Feature**: Flair enforcement is now handled by Reddit triggers. New submissions are checked as soon as the post-submit trigger is received, and flair changes can approve previously removed unflaired posts when configured.
* 🆕 **Feature**: The statistics routine has been ported to Devvit, with subreddit-local post, subscriber, userflair, and action-counter snapshots updating `assistantbot_statistics`.
* ➕ **Addition**: Added Devvit installation settings for current Artemis controls, including flair enforcement, statistics updating, userflair gathering, NSFW/spoiler tagging, weekday flair schedules, and optional Discord alerts.
* ➕ **Addition**: Added moderator-only menu items to check up to 100 recent posts for missing flair and to manually refresh the statistics wiki page.
* ➕ **Addition**: Added optional Discord webhook alerts for completed statistics updates, recent-post flair refreshes, and flair actions.
* ➕ **Addition**: Existing Python-era `assistantbot_statistics` pages are archived to `assistantbot_statistics_legacy` before the first Devvit statistics write.
* 🔧 **Change**: Artemis now stores runtime state in per-installation Devvit Redis instead of the old shared SQLite databases.
* 🔧 **Change**: Existing `assistantbot_config` wiki pages are read as compatibility fallbacks, but saved Devvit installation settings are now the active configuration surface.
* 🔧 **Change**: Missing-flair enforcement now has a bounded recent-post refresh path and a periodic reconciliation job for posts that were already tracked.
* 🕯️ **Removed**: Installing Artemis by inviting a bot account is no longer supported; communities install the Devvit app instead.
* 🕯️ **Removed**: Legacy moderator private-message commands such as `enable`, `disable`, `example`, `update`, `revert`, `takeout`, and `query` are not part of this port.
* 🕯️ **Removed**: The old `Default+` and `Strict+` private-message reply modes have been removed. Submitters now choose flair through Reddit's post flair interface.
* 🕯️ **Removed**: The old five-minute grace-period check for new posts has been replaced by immediate post-submit trigger handling.
* 🕯️ **Removed**: Pushshift, RedditMetrics, traffic tables, cross-subreddit dashboards, hosted takeout exports, and query reports are not part of the Devvit statistics port.
* 🕯️ **Removed**: OC flair tagging and the active use of `flair_enforce_alert_list` are not part of the current Devvit handlers.

*Historical note: The entries below describe the legacy Python version of Artemis. They are retained for historical context and may not apply to the current Devvit app.*


### v2.3 [Maple](https://en.wikipedia.org/wiki/Maple) (2021-06-22)

* 🆕 **Feature**: Stream, a local and more sustainable replacement for certain Pushshift aggregations.
* 🔧 **Change**: Moved out bot comparative functions.
* 🔧 **Change**: Artemis will no longer send a "new message" to subreddits that are merely porting across instances.
* 🔧 **Change**: All configuration sources were moved to this subreddit (r/AssistantBOT) from r/translatorBOT.
* 🔧 **Change**: Main scripts formatted according to [Black](https://black.readthedocs.io/en/stable/).
* 🔧 **Change**: Deprecated the statistics status widget.
* 🔧 **Change**: Stream only saves the last sixty days of posts information in its database.
*  🐞 **Bug Fix**: Fixed a start-of-the-month bug when there aren't any Stream posts yet.
*  🐞 **Bug Fix**: Fixed a bug in generating Post Types data.
*  🐞 **Bug Fix**: Fixed a (Reddit-side?) bug where sometimes traffic data was "not found" instead of "forbidden."


### v2.2 [Laurel](https://en.wikipedia.org/wiki/Laurus_nobilis) (2021-04-22)

* 🆕 **Feature**: New scheduling feature to limit posts with certain flairs to specific weekdays.
* 🔧 **Change**: Can now exclude certain subreddits from mention messages to the creator.
* ➕ **Addition**: Added link to the r/Pushshift subreddit for moment when it's unable to access aggs.
* 🐞 **Bug Fix**: Fixed a bug where rapidfuzz returned a similarity of `None`.
* 🐞 **Bug Fix**: Fixed a bug where the first instance wasn't recording actions in an `all` entry.

### v2.1 [Katsura](https://en.wikipedia.org/wiki/Cercidiphyllum) (2021-01-08)

* 🆕 **Feature**: Support for multiple instances. u/AssistantBOT1 is the first alternate instance available.
* ➕ **Addition**: Artemis will automatically port data over between instances.
* ➕ **Addition**: Added GIF instructions to the flair enforcement message for selected popular third-party Reddit apps, as well as for Mobile Web.
* 🔧 **Change**: Artemis will automatically save the configuration data for subreddits that get banned by the admins (same behavior as when it's demodded from a subreddit).
* 🔧 **Change**: Artemis now will automatically check if Pushshift's aggregations are disabled or down. If they are, calls which use aggregations will be skipped.
* 🔧 **Change**: Moved out the backup routine to an external `cron` job.
* 🔧 **Change**: Artemis will properly escape Markdown characters in top posts lists - like asterisks (`*`).
* 🐞 **Bug Fix**: Fixed the dashboard becoming too large to store on a wiki page.
* 🐞 **Bug Fix**: Fixed RedditMetrics now becoming [FrontPageMetrics](https://frontpagemetrics.com/).

### v2.0 [Juniper](https://www.youtube.com/watch?v=xDFZflAfhy0&t=113) (2020-04-28)

* 🆕 **Feature**: Comprehensive rewrite of the bot, separating the flair enforcing and statistics routines.
* ➕ **Addition**: Cumulative posts and comments count from Pushshift are integrated into the traffic table, alongside uniques and pageviews.
* ➕ **Addition**: Artemis will include a warning if asked to `Enable` flair enforcing on a subreddit with 0 public post flairs.
* 🔧 **Change**: Fetching new submissions by the statistics routine is now primarily done by the helper account, in order to spread out API usage.
* 🔧 **Change**: Faster retrieval of historical subscriber numbers from relatively inactive subreddits during initialization.
* 🔧 **Change**: Added a way to manually run userflair statistics updates for subreddits.
* 🔧 **Change**: The monitor routine that checks for the bot's uptime is now integrated into `external.py`.
* 🔧 **Change**: Added a reply if Artemis is added to an unsupported quarantined subreddit.
* 🐞 **Bug Fix**: Fixed an averaging error in displaying averages for submissions/comments per day in the current month.
* 🐞 **Bug Fix**: Fixed a bug that would prematurely cache Pushshift data for the current month.
* 🐞 **Bug Fix**: Fixed a bug in updating the subreddit dashboard at the end of a statistics run.
* 🐞 **Bug Fix**: Fixed a bug in parsing incorrectly indented YAML pages.

### v1.8 [Icaco](https://en.wikipedia.org/wiki/Chrysobalanus_icaco) (2020-01-16)

* 🆕 **Feature**: Artemis Query: A new way for moderators to see the actions Artemis has conducted on posts in their subreddit.
    * Query uses an "operations" log that is organized per post ID rather than per subreddit; it's integrated with the existing actions counter. The log is limited to 5 times that of the "processed" database (thus, 60,000 entries currently) which at current rates means that it lasts for about five days.
* 🔧 **Change**: [Improved matching for flair selection via messaging.](https://www.reddit.com/r/AssistantBOT/comments/epoub0/improved_matching_for_selecting_flairs_via/)
* 🔧 **Change**: Number of posts fetched is more dynamic and updated every 50 isochronisms (cycles) rather than once daily.
* 🔧 **Change**: Artemis will also add itself as a general wiki contributor.
* 🔧 **Change**: Credit to u/justcool393 for helping me hunt down a memory leak issue that resulted in the bot using way too much memory after an extended period of runtime.
* 🔧 **Change**: Compatibility with r/Layer7's [Dev Replied Bot](https://bitbucket.org/layer7solutions/bungie-replied/src/master/) in tables organized by post flair. (Suggestion from u/boobyashank)
* 🔧 **Change**: Added a section for newly added subreddits in `Strict` mode linking them to turning on post flair requirements.
* 🔧 **Change**: Switched to the MIT-licensed [rapidfuzz](https://github.com/maxbachmann/rapidfuzz) module (P.R. from maxbachmann).
* 🔧 **Change**: Cleaned up the presentation of the monthly "Activity" section to allow for cleaner wiki indices.
* 🐞 **Bug Fix**: Fixed a bug in logging for the [advanced setting](https://www.reddit.com/r/AssistantBOT/wiki/advanced#wiki_flair_enforce_alert_list) `flair_enforce_alert_list`.

### v1.7 [Hazel](https://en.wikipedia.org/wiki/Hazel) (2019-12-01)

* 🆕 **Feature**: Artemis Takeout, a way for mods to easily obtain a copy of their subreddit's Artemis data in JSON. [More details here](https://www.reddit.com/r/AssistantBOT/wiki/faq#wiki_takeout).
* ➕ **Addition**: Also added an "Operational Status" widget that is updated every 30 minutes outside the statistics cycle. This will serve as a useful way to check for the bot's operational status.
* ➕ **Addition**: Incorporated an action counter indexed by day into the pre-existing one, which will allow for aggregate data by day for actions conducted by the bot.
* ➕ **Addition**: Added text to the "no flair" message upon initialization that indicates that the lack of post flairs may be due to the disabling of user-selectable post flairs.
* ➕ **Addition**: An example flair enforcement message is now automatically sent after a mod invite if there are flairs to enforce, eliminating a need to send another modmail with `Example` in the subject.
* ➕ **Addition**: Deployed a separate routine to monitor Artemis's activity and send an alert if it has an extended unexpected downtime.
* 🔧 **Change**: Traffic is now both retrieved on the first and fourth days of the month - this eliminates the previous situation where the most recent month would be missing from the traffic table for the first few days. If there is missing data from Reddit that comes in later, that will be automatically integrated into the stored statistics.
* 🔧 **Change**: Added code to properly handle being invited to moderate a user profile, which is not something Artemis can do effectively.
* 🔧 **Change**: Added code to handle any remote possibility that a monitored subreddit could send a fake de-mod message for another monitored subreddit.
* 🔧 **Change**: Artemis now records any de-modding of a subreddit to a "history" wikipage.
* 🔧 **Change**: Added code for manual monthly updates of all actions.
* 🔧 **Change**: Processed post IDs are now inserted into the database all at once after retrieving submissions, rather than one at a time.
* 🔧 **Change**: Reduced the number of global variables by consolidating them into `AUTH`, `CONFIG`, and `SETTINGS` variables.
* 🔧 **Change**: Artemis will now by default do an exhaustive 1000-submission fetch when launched for the first time, as insurance against extended downtime.
* 🔧 **Change**: Changed the emoji in the subject line for flair approval messages from 😊 to ✅ for better disambiguation.
* 🔧 **Change**: Reworked the placement of the statistics updater dictionary to reduce memory usage.
* 🐞 **Bug Fix**: Fixed a bug when Artemis would try to get moderator permissions from a private subreddit from which it was just de-modded.
* 🐞 **Bug Fix**: Fixed a bug when converting a date string back into Unix UTC time.
* 🐞 **Bug Fix**: Fixed a display-only bug when retrieving statistics on the second day of a month, the current month's statistics would not be displayed.
* 🐞 **Bug Fix**: Comparative bot statistics now omit moderated user profiles.

### v1.6 [Ginkgo](https://en.wikipedia.org/wiki/Ginkgo_biloba) (2019-10-25)

* 🆕 **Feature**: Moderators can now optionally make use of [several advanced configuration settings](https://www.reddit.com/r/AssistantBOT/wiki/advanced) to customize aspects of Artemis's operations on their subreddit.
    * Advanced settings are written in [YAML](https://yaml.org), which is the same syntax that u/AutoModerator uses.
* ➕ **Addition**: Artemis now includes the *Subreddit Index* number of a subreddit in the initial part of the statistics page. This number indicates what place a subreddit is in the overall update cycle (subreddits that added Artemis earlier have lower index numbers).
* ➕ **Addition**: Artemis will now include a short overview of newly-added public subreddits as a stickied comment on their addition posts.
* ➕ **Addition**: If a message to select a flair is not an exact match, Artemis will use [FuzzyWuzzy](https://chairnerd.seatgeek.com/fuzzywuzzy-fuzzy-string-matching-in-python/) to try and get the closest flair template *if* the match is extremely close (ratio of 95 or above). For example, this means that the response `question answer` in reply to "Question/Answer" will now match.
    * This behavior is based off of [Ziwen's](https://www.reddit.com/r/translatorBOT/wiki/ziwen#wiki_misspellings) language name matching for r/translator.
* ➕ **Addition**: There is now an optional `freeze` attribute in extended data for subreddits, which can be turned on by the creator (u/kungming2).
    * The purpose of this attribute is to allow Artemis to stop updating statistics for subreddits which have been shut down/abandoned by their moderators or no longer have moderators other than Artemis on the mod team.
* ➕ **Addition**: Artemis will now update a specific "Statistics Status" widget on r/AssistantBOT that is viewable in the redesign or on mobile. The widget displays:
    * If Artemis has completed a statistics cycle, it will display the UTC date of the most recent completed cycle and the number of assisted subreddits.
    * If Artemis is in the middle of a statistics cycle, it will display Artemis's progress through the cycle.
* ➕ **Addition**: Artemis will also update a widget on r/AssistantBOT that details the aggregate amount of all its actions done, and also update a widget on r/Bot with comparative data for several dead and active moderation bots.
    * Both of these tables were previously included on a private dashboard for Artemis but have now been made public.
* ➕ **Addition**: Artemis will now automatically find statistics pages that have been made public and include them in a widget on r/AssistantBOT.
* ➕ **Addition**: Artemis will add a link to the subreddit-specific advanced configuration file to the statistics page header if it exists.
* 🔧 **Change**: The entire script has been formatted to follow [PEP8](https://www.python.org/dev/peps/pep-0008/) fairly strictly, except for a [99-character line length](https://www.python.org/dev/peps/pep-0008/#maximum-line-length).
* 🔧 **Change**: ~~Artemis will now process modmail commands even if it's in the middle of tabulating statistics.~~
    * ~~New moderator invites are still deferred until after statistics cycles are completed.~~
* 🔧 **Change**: The flair enforcement subject line symbols should now properly show up as an emoji (⚠️) instead of a generic black-and-white symbol.
* 🔧 **Change**: Slightly shortened the statistics cycle frequency to 450 seconds (from 600 seconds).
* 🔧 **Change**: Made the advanced configuration page more permissive - data will be updated clearly even if there are *fewer* variables than the default specification.
* 🔧 **Change**: RES (r/Enhancement) has fixed table sorting, so commas as thousands separators are now included in tables.
* 🔧 **Change**: The new short overview comment of an added subreddit now uses its `title` instead of its `display_name`.
* 🔧 **Change**:  Userflair statistics updates now run on the first *and* the fifteenth of each month; so they are updated bimonthly.
    * The userflair statistics section also includes the date the statistics were last run on.
* 🔧 **Change**: Responses to `Enable` modmail commands now include a copy of the example flair enforcement message so moderators don't need to send another `Example` message afterward.
* 🔧 **Change**: Post approval after flairing has been unified - previously there were two separate runtimes: One checked posts in the filtered database, while the other checked posts as part of the flairing via messaging function.
* 🐞 **Bug Fix**: Fixed a DST bug with retrieving data that shifted monthly data ahead by one.
* 🐞 **Bug Fix**: Fixed a bug in displaying custom names and goodbyes that consisted of empty strings. Artemis will now revert to defaults if those strings are empty.
* 🐞 **Bug Fix**: Fixed the wording of a flair enforcement message sent to submitters on subreddits which have `flair_enforce_approve_posts` set to `False` to indicate that their post will be *manually approved* by a moderator.
* 🐞 **Bug Fix**: Fixed a bug when Artemis tries to update the userflairs for a subreddit that has not given it the `wiki` mod permission.

### v1.5 [Fir](https://en.wikipedia.org/wiki/Fir) (2019-09-22)

* 🆕 **Feature**: Artemis can tabulate userflair statistics for subreddits with more than 50,000 subscribers if they have userflair enabled on their community and if Artemis has the `flair` mod permission.
    * Subreddits with fewer than 50,000 subscribers *can* enable userflair statistics by choosing the appropriate setting in [advanced configuration](https://www.reddit.com/r/AssistantBOT/wiki/advanced).
    * Results may vary for your subreddit, depending on how userflair is set up. Subreddits making extensive use of CSS classes (Old Reddit) or Reddit Emoji (New Reddit) will benefit most from these statistics.
    * Userflair statistics are updated twice every month.
* ➕ **Addition**: ~~Artemis will respond with a message if it's holding the acceptance of the mod invite until the statistics update is done.~~
* 🔧 **Change**: Improvements to the reliability of the daily statistics routine.
* 🔧 **Change**: Update to avoid the [deprecation of](https://github.com/yaml/pyyaml/wiki/PyYAML-yaml.load(input\)-Deprecation) `yaml.load()`.
* 🔧 **Change**: Added code to fail gracefully if Artemis gets accidentally shadowbanned by Reddit's automated systems. More specifically, when shadowbanned, Artemis attempting to approve a post throws a `403 Forbidden` error.
    * u/ArtemisHelper should automatically post an alert to r/AssistantBOT if the main routine is shadowbanned.
* 🔧 **Change**: Newly invited NSFW subreddits will have their entries properly marked as NSFW on the profile page log.
* 🔧 **Change**: Modified the flair sanitizer to also remove [Unicode 12 emoji](https://emojipedia.org/emoji-12.0/).
* 🔧 **Change**: Switched to a new and more consistent method of retrieving new posts from moderated subreddits. [More information here](https://www.reddit.com/r/AssistantBOT/comments/e443qp/accounting_for_variations_in_getting_new_posts/).
* 🐞 **Bug Fix**: Fixed a rare bug where Artemis would encounter an error editing a wikipage if the generated content was too long.
* 🐞 **Bug Fix**: Fixed a local memory error when attempting to truncate a too-large log file.
* 🐞 **Bug Fix**: Fixed a rare bug where the [invisible character](https://codepoints.net/U+FE0F?lang=en) `U+FE0F` denoting emoji was not being removed by the flair sanitizer.

### v1.4 [Eucalyptus](https://en.wikipedia.org/wiki/Eucalyptus) (2019-04-17)

* 🆕 **Feature**: Not immediately visible on the user-facing end, but how Artemis stores some data internally has been reworked to be faster and more comprehensive.
    * Subscriber database migration is complete.
    * Daily statistics database migration is complete.
* ➕ **Addition**: Example flair enforcement messages now properly include the action options that users have.
* ➕ **Addition**: Artemis will now display multiple subscriber milestones if they were reached on the same day.
* ➕ **Addition**: Artemis is now also recording how many flair reminder messages it sends for subreddits on `Default` mode. This appears on the statistics page as the *Sent flair reminder* action.
* ➕ **Addition**: Artemis now checks the last few entries of `editflair` in modlog when approving a removed post to see if a flair was given to it by a mod. If so, it'll change the notification message to reflect that.
* 🔧 **Change**: For the subscribers log, Artemis will display the last 180 daily entries (half-year) in the table, and then each entry will be monthly after that. This is to keep the subscribers log table at a reasonable length.
    * Note that Artemis is still storing the daily subscriber data as far back as November 2012 in its database - it's just not displaying every single entry for brevity's sake. Use [Artemis Takeout](https://www.reddit.com/r/AssistantBOT/wiki/faq#wiki_takeout) to obtain a full copy of the subscriber data in JSON.
* 🔧 **Change**: Flair enforcement messages now consistently use the capitalization of the subreddit in the text. Previously some parts were in lower-case and others were in the original capitalization.
* 🔧 **Change**: Artemis will not make a new entry for a subreddit addition on its user profile if said subreddit had already added the bot before.
* 🔧 **Change**: Artemis will display `(today!)` instead of `(0 days from now)` if a subreddit will soon hit its estimated subscriber milestone.
* 🔧 **Change**: Artemis's configuration log-in data file now uses YAML instead of JSON.
* 🐞 **Bug Fix**: Fixed a bug that occasionally surfaced during connections to Pushshift. Artemis will now automatically try to refetch the data if there is a connection error.
* 🐞 **Bug Fix**: Fixed an extremely rare bug that would trigger if Artemis received a moderation invite and a de-mod message from the same subreddit within a few seconds of each other. This bug would leave Artemis on the moderators list but the bot would _not_ have the subreddit in its monitored list.
* 🐞 **Bug Fix**: Fixed a couple of bugs that were encountered when retrieving and writing daily routine data.
* 🐞 **Bug Fix**: Fixed a new bug that is encountered if the RedditMetrics site is completely down.
* 🐞 **Bug Fix**: Fixed a rare bug in updating statistics wiki pages that is encountered if Artemis is de-modded from a subreddit while it has an extended downtime.
* 🐞 **Bug Fix**: Fixed a rare bug where the bot would not remove an unflaired post if the user deleted their account between submitting the post and Artemis processing it.

### v1.3 [Dawn Redwood](https://en.wikipedia.org/wiki/Metasequoia_glyptostroboides) (2019-02-25)

* 🆕 **Feature**: Artemis will now include a table of the actions it has conducted for a subreddit in the "Bot Status" section of the statistics page.
    * If a subreddit has the `Strict` enforcing mode enabled, Artemis will also include the calculated percentage of removed posts that were subsequently flaired and restored.
* ➕ **Addition**: Artemis now includes the comma `,` as a thousands separator for numbers that are not in tables. I would have preferred to use a standards-neutral space instead (per [ISO 31-0](https://en.wikipedia.org/wiki/ISO_31-0#Numbers)) but since the site itself already uses the comma for its traffic pages the comma will have to do.
    * ~~Numbers in tables do *not* have a thousands separator as that will affect sorting columns via RES (r/Enhancement).~~
* ➕ **Addition**: The display of post flairs in messages and on the statistics page now use a case-sensitive version of the [flair sanitization process](https://www.reddit.com/user/AssistantBOT/comments/ad9xih/new_feature_flair_selection_via_messaging_now/).
* ➕ **Addition**: Artemis now includes the title of a user's post in the flair enforcement message. The wording has also been simplified a bit.
* ➕ **Addition**: Updated the flairing instructions GIFs to be more consistent with each other. Removed the "Tablet" one, as it was largely identical to the "Mobile" one.
* ➕ **Addition**: Added arrows to the traffic chart to indicate the relative movement of uniques/pageviews from the preceding month.
    * 🔹 indicates almost no month-over-month change, 🔻 indicates negative change, while ➕ indicates positive change.
* ➕ **Addition**: If the flair table data for a month is incomplete, there will be a disclaimer at the top of its table. (This is for months that preceded the addition of Artemis to a subreddit)
* 🔧 **Change**: Artemis no longer has a subscriber minimum, but will pause statistics gathering for subreddits with fewer than 25 subscribers and automatically resume it once they've reached that threshold.
* 🔧 **Change**: Artemis will no longer include post flairs that are classified as "moderator-only" as selectable options in its enforcement messages (this only happens if the bot has the `flair` moderator permission).
    * The way I did this was a bit unorthodox, since Reddit does *not* include an attribute with post flair templates that identifies a post flair as "moderator-only." So what Artemis does is it fetches the post flairs through a separate regular user account (u/ArtemisHelper) that can only see the options available to regular users.
* 🔧 **Change**: Artemis will now save the Pushshift activity data from previous months locally in JSON format within its database so that statistics can be collated faster (about 2-3x faster in most cases) and use fewer API calls to the service.

### v1.2 [Cedar](https://en.wikipedia.org/wiki/Cedrus) (2019-01-23)

* 🆕 **Feature**: Artemis compiles all the content for statistics pages first, and then writes that content to the wiki pages in a separate thread. Multi-threading should speed up the daily statistics update process at midnight UTC.
* 🔧 **Change**: Artemis will no longer monitor posts that are *deleted* by their submitters for flair updates. Note that this has no effect on the bot's user-facing operations, as there is no way for someone to assign a flair to a post they deleted.
* 🔧 **Change**: Artemis excludes both Unicode and Reddit emoji from matching flairs assigned via message. (e.g., a message with `Discussion` will match a post flair that's `:discussion: Discussion`).
* 🔧 **Change**: Artemis also will not display Reddit emoji (e.g. `:discussion:`) in the tables sorted by flair on a subreddit's statistics page, since only text shows up and not the image (this is a Reddit limitation).
* 🔧 **Change**: Artemis will check for unflaired posts at set intervals while gathering statistics, accelerating the processing response for unflaired posts made around midnight UTC.
* 🔧 **Change**: If the next subscriber milestone is more than 120 days away, Artemis will format its estimated date as `XX months from now` instead of in days.
* 🐞 **Bug Fix**: Fixed an occasional bug that would result in an unattained *future* milestone showing up in the subscriber milestone table.
* 🐞 **Bug Fix**: Fixed a small bug that would affect the average submissions/day calculations if there wasn't a submission on every single day of a given month.

### v1.1 [Birch](https://en.wikipedia.org/wiki/Birch) (2019-01-07)

* 🆕 **Feature**: Flair selection via messaging (the `+` enhancement). Submitters can simply reply to its flair enforcement messages with the text of the flair they want to select, and Artemis will automatically assign that flair to and approve their post.
* ➕ **Addition**: Added a header link to a guide with explanations about each part of the statistics page.
* ➕ **Addition**: Artemis now identifies the top months for uniques and pageviews in the traffic section.
* 🔧 **Change**: Flair selection replies will match even if the flair text contains brackets (`[` / `]`), indents (`>`), or Reddit emoji (`:emoji:`).
* 🔧 **Change**: The flair checker now uses PRAW's `.info()`, a [much faster method](https://praw.readthedocs.io/en/latest/code_overview/reddit_instance.html?highlight=info#praw.Reddit.info) (about 40x faster) of retrieving bulk submission information.
* 🔧 **Change**: Pipes (`|`) in flair text will be converted to bullets when in rendered in a statistics table, as having an extra pipe breaks formatting for a table row.
* 🔧 **Change**: Artemis will not attempt to write statistics data to a subreddit if it does not have the required `wiki` moderator permission.
* 🔧 **Change**: Artemis will now omit months from the traffic table if there were zero uniques and zero pageviews.
* 🐞 **Bug Fix**: Bug fix for average subscriber growth - Artemis now properly includes negative growth when calculating the average.

### v1.0 [Aspen](https://en.wikipedia.org/wiki/Aspen) (2018-11-04)

* 🆕 **Feature**: Initial release of Artemis ([code available here](https://github.com/kungming2/AssistantBOT/tree/1c3797cb835e8a1313238043fd1d6ea759df4955)).
