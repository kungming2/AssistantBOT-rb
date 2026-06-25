/**
 * The text module is a collection of responses and text used by
 * Artemis in its interactions with moderators, regular users, and
 * wiki pages.
 *
 * Ported from the Python `text.py` module. Each Python f-string /
 * `.format()` template with positional placeholders (`{0}`, `{1}`,
 * ...) has been converted into a function taking named parameters,
 * returning the formatted string.
 *
 * Multi-instance-only messages (`MSG_MOD_INIT_REDIRECT`,
 * `MSG_MOD_INIT_ALREADY_MONITORED`, `MSG_MOD_INSTANCE_MIGRATION`) have
 * been dropped, since this app no longer supports multiple bot
 * instances.
 */

/**
 * The standard disclaimer/footer appended to many of Artemis's
 * comments and messages.
 *
 * @param subredditName The subreddit's name (no `r/` prefix).
 */
export function botDisclaimer(subredditName: string): string {
  const s = subredditName;
  return (
    `\n\n---\n^Artemis: ^a ^moderation ^assistant ^for ^r/${s} ^| ` +
    `[^Contact ^r/${s} ^mods](https://www.reddit.com/message/compose?to=%2Fr%2F${s}) ` +
    `^| [^Bot ^Info/Support](https://www.reddit.com/r/AssistantBOT/)`
  );
}

/**
 * Sent when Artemis accepts a moderator invite to a subreddit.
 *
 * Original Python placeholders:
 *   {0} subreddit name
 *   {1} - {4}, {6} various pre-rendered message sections
 *   {5} flair enforcing mode
 */
export function msgModInitAccept(params: {
  subredditName: string;
  section1: string;
  section2: string;
  section3: string;
  section4: string;
  enforceMode: string;
  section6: string;
}): string {
  const { subredditName: s, section1, section2, section3, section4, enforceMode, section6 } =
    params;

  return `
Thanks for letting me assist the r/${s} \
[moderator team](https://www.reddit.com/r/${s}/about/moderators)! Flair \
enforcing is currently set to \`${enforceMode}\` [mode](https://www.reddit.com/r/\
AssistantBOT/wiki/faq#wiki_flair_enforcing).

${section4}

${section1}

${section3}

${section2}

${section6}

---

Moderator controls for this Devvit port live in the app installation settings page:

https://developers.reddit.com/r/${s}/apps/assistantbot-rb

Existing advanced YAML pages are read only as a legacy fallback when a matching
installation setting has not been saved:

https://www.reddit.com/r/${s}/wiki/assistantbot_config

The old modmail update/revert workflow is deprecated in this Devvit port.

---

* I update subreddit statistics daily after [midnight UTC](https://time.is/UTC).
* Feel free to check out r/AssistantBOT for updates, statistics, support, and more!

Have a good day!
`;
}

/** Sent if a moderation invite is for a user profile, not a subreddit. */
export const MSG_MOD_INIT_PROFILE = `
👤 This moderation invite appears to be for a redditor's user profile. Unfortunately user \
profiles *do not* have [post flairs](https://www.reddithelp.com/en/categories/using-reddit/\
profiles/profile-moderation-tools) and Artemis is therefore unusable on them.

If this is in error, please make a comment on r/AssistantBOT with this subreddit's name. Thanks!
`;

/** Sent if a moderation invite is for a quarantined subreddit. */
export const MSG_MOD_INIT_QUARANTINED = `
☣️ It appears that this subreddit may be a [quarantined community]\
(https://www.reddithelp.com/en/categories/rules-reporting/account-and-community-restrictions\
/quarantined-subreddits). Unfortunately, Reddit explicitly makes it difficult, if not impossible, \
to [access data about quarantined communities through its public API](https://redd.it/3fx3gt). \
Consequently, Artemis is unable to assist quarantined communities.

Sorry for any inconvenience!
`;

/**
 * Sent when a subreddit has fewer subscribers than the minimum
 * threshold for statistics gathering.
 *
 * @param minSubscribers The minimum subscriber threshold.
 * @param subscribersShort How many subscribers short of the threshold
 *                          the subreddit currently is.
 */
export function msgModInitMinimum(minSubscribers: number, subscribersShort: number): string {
  return `
⏸️ This subreddit currently has fewer than ${minSubscribers} subscribers, so I've paused statistics \
gathering for now. I will automatically resume statistics gathering once it reaches that \
milestone (it is currently ${subscribersShort} subscribers short).
`;
}

/**
 * Sent to inform moderators where daily statistics will be posted.
 *
 * @param subredditName The subreddit's name (no `r/` prefix).
 */
export function msgModInitNonMinimum(subredditName: string): string {
  return `
📊 I will post statistics for the community daily at **[this wiki page]\
(https://www.reddit.com/r/${subredditName}/wiki/assistantbot_statistics)**. \
(I recommend bookmarking this page for easy access.)
`;
}

/**
 * Sent when Artemis will remove unflaired posts.
 *
 * @param subredditName The subreddit's name (no `r/` prefix).
 */
export function msgModInitStrict(subredditName: string): string {
  const s = subredditName;
  return `
🔨 I will *remove* posts without any flair and automatically \
*restore and approve* them once a flair is selected. Unflaired posts older than 24 hours are \
considered abandoned by their submitter and will not be restored.

Please keep in mind that I do not act on moderators' posts by default, so please use a \
throwaway account if you are testing my functions out.

**I also recommend turning on the \`Require post flair\` setting in this subreddit's \
[post requirements](https://new.reddit.com/r/${s}/about/settings) for best results.**
`;
}

/**
 * Sent when describing the legacy private-message flair workflow.
 */
export const MSG_MOD_INIT_MESSAGING = `
📨 The old AssistantBOT workflow where submitters replied to a private message with a flair name \
is not available in this Devvit port. Submitters should flair their own posts through Reddit's \
post flair UI.
`;

/** Sent when a subreddit has no public post flairs at all. */
export const MSG_MOD_INIT_NO_FLAIRS = `
---

🈳 **It appears that there are no public post flairs associated with this subreddit.** \
If you'd like, please check out these Reddit Help articles ([New Reddit]\
(https://mods.reddithelp.com/hc/en-us/articles/360010513191-Post-Flair), \
[Old Reddit](https://mods.reddithelp.com/hc/en-us/articles/360002598912-Flair)) for guidance on \
how to set up and enable post flairs for your subreddit.

If you have already created post flairs, they may not be set to be \
*publicly* selectable. If this is the case, please make sure the option for submitters to assign \
their own post flair is selected ([New Reddit](https://i.imgur.com/86mVlzQ.png), [Old Reddit]\
(https://i.imgur.com/V2YqXQG.png)).

Artemis cannot usefully enforce post flair until submitters have at least one public post flair \
available.
`;

/**
 * Sent when Artemis cannot maintain the statistics wiki page.
 *
 * @param subredditName The subreddit's name (no `r/` prefix).
 */
export function msgModInitNeedWiki(subredditName: string): string {
  return `
😕 Artemis could not create or update r/${subredditName}'s statistics wiki page. Please check the \
Devvit app installation status and try again. Thanks!
`;
}

/**
 * Sent when a moderator enables flair enforcing.
 *
 * @param subredditName The subreddit's name (no `r/` prefix).
 */
export function msgModRespEnable(subredditName: string): string {
  return (
    `🔓 Flair enforcing is now **ENABLED** on r/${subredditName}. ` +
    `Artemis will send reminder messages to users ` +
    `who submit posts without selecting a post flair.`
  );
}

/**
 * Sent when a moderator disables flair enforcing.
 *
 * @param subredditName The subreddit's name (no `r/` prefix).
 */
export function msgModRespDisable(subredditName: string): string {
  return (
    `🔒 Flair enforcing is now **DISABLED** on r/${subredditName}. ` +
    `Artemis will *NOT* send reminder messages ` +
    `to users who submit posts without selecting a post flair.`
  );
}

/**
 * Sent when a moderator toggles userflair statistics gathering.
 *
 * @param status Either `"ENABLED"` or `"DISABLED"`.
 * @param subredditName The subreddit's name (no `r/` prefix).
 */
export function msgModRespUserflair(status: "ENABLED" | "DISABLED", subredditName: string): string {
  return `👥 Userflair statistics gathering is now **${status}** on r/${subredditName}.`;
}

/**
 * Sent when userflair statistics are unavailable.
 *
 * @param subredditName The subreddit's name (no `r/` prefix).
 */
export function msgModRespUserflairNeedFlair(subredditName: string): string {
  return `
😕 Userflair statistics are not available for r/${subredditName} in this Devvit port. Thanks!
`;
}

/**
 * One-time message sent to moderators when the statistics wiki page
 * is first set up.
 *
 * @param subredditName The subreddit's name (no `r/` prefix).
 */
export function msgModStatisticsFirst(subredditName: string): string {
  const s = subredditName;
  return `
Hey there moderators of r/${s}!

I wanted to give you a heads-up that your community statistics have just been posted at \
**[this wiki page](https://www.reddit.com/r/${s}/wiki/assistantbot_statistics)**. There's also a \
handy [guide here](https://www.reddit.com/r/AssistantBOT/wiki/guide) that explains each section \
of the page.

Please note that this is a *one-time message* to inform you that the statistics wiki page has \
been set up. \
Subsequent updates will be performed silently after [midnight UTC](https://time.is/UTC). \
This wiki page is by default only visible to moderators and is *not* listed on the subreddit's \
[general list of wiki pages](https://www.reddit.com/r/${s}/wiki/pages/).

Have a good day!
`;
}

/**
 * Message containing a link to a moderator's exported (takeout) data.
 *
 * @param subredditName The subreddit's name (no `r/` prefix).
 * @param takeoutUrl URL to the hosted JSON takeout data.
 */
export function msgModTakeout(subredditName: string, takeoutUrl: string): string {
  return `
🥡 Here's your takeout data from Artemis formatted in [JSON](https://en.wikipedia.org/wiki/JSON),\
 an open-standard file format that is easy for humans to read and write and easy for machines to \
parse and generate.

This link is hosted on my [Pastebin](https://pastebin.com/u/assistantbot) \
and is **only viewable for one hour** \
by those who have the link. The data will be automatically deleted after that, so please download \
it before deletion.

#### [Artemis Takeout Data for r/${subredditName}](${takeoutUrl})
`;
}

/**
 * Sent when a moderator requests takeout data but none exists.
 *
 * @param subredditName The subreddit's name (no `r/` prefix).
 */
export function msgModTakeoutNone(subredditName: string): string {
  return `
🍽️ Unfortunately, there doesn't appear to be any data from r/${subredditName} in my database to takeout.
`;
}

/** Sent when a moderator's query returns no valid data. */
export const MSG_MOD_QUERY_NONE = `
🤔 Unfortunately, there doesn't appear to be any valid data in my database from your query.
`;

/**
 * Sent when Artemis is removed from / leaves a subreddit.
 *
 * @param subredditName The subreddit's name (no `r/` prefix).
 */
export function msgModLeave(subredditName: string): string {
  return `
👋 Artemis will no longer be active on r/${subredditName}. Have a good day!
`;
}

/**
 * Subject line for the flair-reminder message sent to users.
 *
 * @param subredditName The subreddit's name (no `r/` prefix).
 */
export function msgUserFlairSubject(subredditName: string): string {
  return `[Notification] ⚠️ Your post on r/${subredditName} needs a post flair!`;
}

/**
 * The body of the flair-reminder message sent to users.
 *
 * Original Python positional placeholders:
 *   {0} username
 *   {1} subreddit name
 *   {2} list of available post flairs
 *   {3} post permalink
 *   {4} modmail link
 *   {5} removal notice (or empty string)
 *   {6} goodbye phrase
 *   {7} messaging instructions (or empty string)
 *   {8} post title
 *   {9} custom subreddit message (or empty string)
 */
export function msgUserFlairBody(params: {
  username: string;
  subredditName: string;
  availableFlairs: string;
  postPermalink: string;
  modmailLink: string;
  removalNotice: string;
  goodbye: string;
  messagingInstructions: string;
  postTitle: string;
  customMessage: string;
}): string {
  const {
    username,
    subredditName: s,
    availableFlairs,
    postPermalink,
    modmailLink,
    removalNotice,
    goodbye,
    messagingInstructions,
    postTitle,
    customMessage,
  } = params;

  return `
Hey there u/${username},

Thanks for submitting your post to r/${s}!

> **[${postTitle}](${postPermalink})**

This is a friendly reminder that this community's moderators have \
asked for all posts to have a *post flair* \
(a relevant tag or category).

${customMessage}

${removalNotice}

**You can select a post flair by**:

* ➡️️ Using Reddit's interface to pick the one you want. \
View a GIF below to show you how!
    * *[Mobile](https://i.imgur.com/qPJlLPH.gifv)* • \
*[Desktop (New)](https://i.imgur.com/1jzmEqK.gifv)* • \
*[Desktop (Old)](https://i.imgur.com/V8NYT6N.gifv)* • \
*[Mobile Web](https://i.imgur.com/Hna2rD7.gifv)*
    * Third-party apps: *[Apollo](https://i.imgur.com/X4EaiI1.gifv)*  \
• *[BaconReader](https://i.imgur.com/ZJnBmEk.gifv)* • \
*[Boost](https://i.imgur.com/8h4Zpw3.gifv)* • \
*[Relay](https://i.imgur.com/2g7s4jk.gifv)* • \
*[RIF](https://i.imgur.com/179de1o.gifv)*
${messagingInstructions}

**The following post flairs are available**:

${availableFlairs}

Post flairs help keep this community organized and allow subscribers to easily sort through the \
posts they want to see. [Please contact the mods of r/${s} if you have any questions.](${modmailLink}) \
Thank you very much, and ${goodbye}!
`;
}

/** Legacy private-message flair instructions, retained for migration text parity. */
export const MSG_USER_FLAIR_BODY_MESSAGING =
  "\n* ↩️ *or* replying to this message with just the text of a " +
  "flair listed below. Capitalization does not matter.";

/**
 * Builds the modmail compose link used in the flair-reminder message.
 *
 * @param subredditName The subreddit's name (no `r/` prefix).
 * @param postPermalink URL/permalink of the user's post.
 */
export function msgUserFlairModmailLink(subredditName: string, postPermalink: string): string {
  return (
    `https://www.reddit.com/message/compose?to=%2Fr%2F${subredditName}&subject=` +
    `About+My+Unflaired+Post&message=` +
    `About+my+post+%5Bhere%5D%28${postPermalink}%29...`
  );
}

/** Notice shown when a post has been removed and will be auto-restored. */
export const MSG_USER_FLAIR_REMOVAL =
  "**Your post has been removed but will be automatically restored if you " +
  "select a flair for it within 24 hours.** " +
  "We apologize for the inconvenience.\n\n";

/** Notice shown when a post has been removed but requires manual mod restoration. */
export const MSG_USER_FLAIR_REMOVAL_NO_APPROVE =
  "**Your post has been removed but may be restored by a " +
  "moderator as soon as possible if you select a flair for it" +
  ".**  We apologize for the inconvenience.\n\n";

/**
 * Sent to a user after they've successfully selected a flair for a
 * previously-unflaired post.
 *
 * Original Python positional placeholders:
 *   {0} username
 *   {1} approval verb/phrase (e.g. "Thanks for selecting")
 *   {2} post permalink
 *   {3} additional approval detail (e.g. strict-mode notice, or empty)
 *   {4} goodbye phrase
 */
export function msgUserFlairApproval(params: {
  username: string;
  approvalPhrase: string;
  postPermalink: string;
  approvalDetail: string;
  goodbye: string;
}): string {
  const { username, approvalPhrase, postPermalink, approvalDetail, goodbye } = params;
  return `
Hey there u/${username},

${approvalPhrase} a flair for [your post](${postPermalink})! ${approvalDetail}

${goodbye}!
`;
}

/**
 * Additional detail appended to the flair-approval message in strict
 * mode, noting the post is now fully visible.
 *
 * @param subredditName The subreddit's name (no `r/` prefix).
 */
export function msgUserFlairApprovalStrict(subredditName: string): string {
  return `It has been approved and is now fully visible on r/${subredditName}.`;
}

/**
 * Subject line for the message sent when an unscheduled-flair post is
 * removed.
 *
 * @param subredditName The subreddit's name (no `r/` prefix).
 */
export function msgScheduleRemovalSubject(subredditName: string): string {
  return `[Notification] 🗓️️ Your post on r/${subredditName} is not on a scheduled day.`;
}

/**
 * Body of the message sent when a post with a schedule-restricted
 * flair is removed for being posted on the wrong day.
 *
 * Original Python positional placeholders:
 *   {0} username
 *   {1} subreddit name
 *   {2} flair name
 *   {3} list of permitted weekdays
 *   {4} current weekday
 *   {5} post permalink
 */
export function msgScheduleRemoval(params: {
  username: string;
  subredditName: string;
  flairName: string;
  permittedDays: string;
  currentWeekday: string;
  postPermalink: string;
}): string {
  const { username, subredditName: s, flairName, permittedDays, currentWeekday, postPermalink } =
    params;

  return `
Hey there u/${username},

Thanks for submitting [your post](${postPermalink}) to r/${s}! This community asks \
that posts flaired as **${flairName}** only be submitted on the following \
weekdays:

* **${permittedDays}**

Your post has been removed as it is currently **${currentWeekday}**, and feel free \
to check out [r/${s}'s community rules]\
(https://www.reddit.com/r/${s}/about/rules) for more information. \
Please re-submit your ${flairName} post on a suitable scheduled weekday and \
thank you for stopping by!
`;
}

/**
 * Header shown on a blank (not-yet-populated) statistics wiki page.
 *
 * @param minSubscribers The minimum subscriber threshold for statistics gathering.
 */
export function wikipageBlank(minSubscribers: number): string {
  return `
# Statistics by Artemis (u/AssistantBOT)


📊 *This statistics page will be updated after [midnight UTC](https://time.is/UTC) if this \
subreddit has at least ${minSubscribers} subscribers.*
`;
}

/**
 * The main template for a subreddit's statistics wiki page.
 *
 * Original Python positional placeholders:
 *   {0} subreddit name
 *   {1} bot status section
 *   {2} posts section
 *   {3} subscribers section
 *   {4} traffic section
 *   {5} Artemis version number
 *   {6} compile time in seconds
 *   {7} last-updated timestamp (UTC)
 *   {8} announcement / extra section (or empty string)
 *   {9} navigation prefix section (or empty string)
 */
export function wikipageTemplate(params: {
  subredditName: string;
  botStatusSection: string;
  postsSection: string;
  subscribersSection: string;
  trafficSection: string;
  versionNumber: string;
  compileSeconds: number | string;
  updatedAtUtc: string;
  announcementSection: string;
  navigationPrefix: string;
}): string {
  const {
    subredditName: s,
    botStatusSection,
    postsSection,
    subscribersSection,
    trafficSection,
    versionNumber,
    compileSeconds,
    updatedAtUtc,
    announcementSection,
    navigationPrefix,
  } = params;

  return `

# Statistics by Artemis (u/AssistantBOT)

${navigationPrefix}[🏹 Info](https://www.reddit.com/r/AssistantBOT/) • \
[❓ FAQ](https://www.reddit.com/r/AssistantBOT/wiki/faq) • \
[🔎️ Guide](https://www.reddit.com/r/AssistantBOT/wiki/guide) • \
[📓 Change Log](https://www.reddit.com/r/AssistantBOT/wiki/changelog) • \
[📒 Mod Log](https://www.reddit.com/r/${s}/about/log/?mod=AssistantBOT) • \
[🏹 Bot Info/Support](https://www.reddit.com/r/AssistantBOT/)

${announcementSection}

---

*Compiled by Artemis v${versionNumber} in ${compileSeconds} seconds and updated on ${updatedAtUtc} UTC.*

---

## Bot Status

${botStatusSection}

## Posts

${postsSection}

## Subscribers

${subscribersSection}

## [Traffic](https://www.reddit.com/r/${s}/about/traffic/)

${trafficSection}
`;
}

/** Error notice shown when Pushshift data is unavailable for a query. */
export const WIKIPAGE_PS_ERROR = `
* Data cannot be accessed for this timeframe and query \
due to Pushshift aggregations being disabled \
(see [here](https://redd.it/jm8yyt) on r/Pushshift).
`;

/**
 * A list of goodbye phrases. Artemis chooses a random one when
 * sending a message.
 */
export const GOODBYE_PHRASES: readonly string[] = [
  "Adieu",
  "Adiós",
  "All the best",
  "Au revoir",
  "Best regards",
  "Cheers",
  "Ciao",
  "Farewell",
  "Goodbye",
  "Hasta la vista",
  "Have a fantastic day",
  "Have a good one",
  "Have a great day",
  "Have a nice day",
  "Keep it real",
  "Live long and prosper",
  "Mahalo",
  "May the odds be ever in your favor",
  "Namaste",
  "Peace",
  "Regards",
  "Sayonara",
  "See ya",
  "So long",
  "Stay awesome",
  "Stay classy",
  "Stay healthy",
  "Stay safe",
  "Stay well",
  "Take care",
  "Take it easy",
  "Thanks for stopping by",
  "To infinity and beyond",
  "Toodeloo",
  "Tschüss",
  "Until next time",
];

/**
 * Returns a random goodbye phrase from {@link GOODBYE_PHRASES}.
 */
export function randomGoodbye(): string {
  const index = Math.floor(Math.random() * GOODBYE_PHRASES.length);
  return GOODBYE_PHRASES[index] ?? "Goodbye";
}

/**
 * The default Artemis configuration, expressed as a YAML string.
 */
export const ADV_DEFAULT = `
    # -----------------------------------------------------------------
    # INSTRUCTIONS: https://www.reddit.com/r/AssistantBOT/wiki/advanced
    # -----------------------------------------------------------------
    # This is the legacy advanced YAML configuration page for Artemis.
    # Current controls live in the Devvit app's installation settings page:
    # https://developers.reddit.com/r/YOUR_SUBREDDIT/apps/assistantbot-rb
    #
    # The installation settings page overrides matching values below when a
    # moderator saves an app setting. This wiki page is only a legacy fallback
    # for older AssistantBOT configuration.
    #
    # The old modmail Update/Revert workflow is deprecated. Use the Devvit
    # installation settings page for current Artemis controls.
    #
    # Everything below must be written in valid YAML, which is the same syntax
    # that AutoModerator uses.
    # --------------------------
    # FLAIR ENFORCEMENT SETTINGS
    # --------------------------
    # A boolean determining whether Artemis also sends flair enforcement messages to moderators.
    # Prefer the Devvit installation setting for this value.
    # Default setting: False
    flair_enforce_moderators: False
    # A boolean determining whether Artemis removes posts that are missing post flair.
    # Prefer the Devvit installation setting for this value.
    # If False, Artemis sends flair reminder messages without removing those posts.
    # Default setting: True
    flair_enforce_remove_posts: True
    # A boolean determining whether Artemis approves removed posts once flaired by a user or a mod.
    # Prefer the Devvit installation setting for this value.
    # This only applies when flair_enforce_remove_posts is True.
    # Please do NOT change this unless you plan on reviewing/approving all removed posts manually!
    # Default setting: True
    flair_enforce_approve_posts: True
    # A string with a custom subreddit-specific message to include in flair enforcement messages.
    # Prefer the Devvit installation setting for this value.
    # Messages over 500 characters (including spaces) will be truncated.
    flair_enforce_custom_message: ""
    # A list of users that should NOT get flair enforcement messages. (no \`u/\`, please)
    # Prefer the Devvit installation setting for this value.
    flair_enforce_whitelist: []
    # A list of moderators to be notified whenever a post is removed. (no \`u/\`, please)
    # This legacy setting is parsed but not currently acted on by Devvit handlers.
    # This is most suitable for smaller subreddits with relatively few posts per week.
    flair_enforce_alert_list: []
    # --------------
    # OTHER SETTINGS
    # --------------
    # A dictionary with up to 2 keys: \`nsfw\` and \`spoiler\`.
    # Prefer the Devvit installation setting for these values.
    # Each key takes a *list* of post flair IDs.
    # If a submission is flaired with one, it will be tagged with the corresponding attribute.
    flair_tags: {}
    # A dictionary with up to 7 keys of weekday abbreviations: \`Sun\`, \`Mon\`, etc.
    # Prefer the Devvit installation setting for these values.
    # Each key takes a *list* of post flair IDs. Submissions with such flairs will be 
    # removed if they are posted on any day except the weekdays specified.
    flair_schedule: {}
    # A custom goodbye phrase for the bot to use in its flair enforcement messages to users.
    # Prefer the Devvit installation setting for this value.
    # By default, Artemis chooses a random phrase from a pre-existing list.
    # Please do not change this to something too long.
    # Phrases over 20 characters (including spaces) will be truncated.
    custom_goodbye: ""
`;

/**
 * Sent when a subreddit's legacy advanced configuration page is loaded.
 *
 * @param subredditName The subreddit's name (no `r/` prefix).
 */
export function configGood(subredditName: string): string {
  const s = subredditName;
  return `
👍 Artemis can read r/${s}'s **[legacy advanced configuration page]\
(https://www.reddit.com/r/${s}/wiki/assistantbot_config)** as a fallback for older settings.

* Use the Devvit app installation settings page for current Artemis controls.
* Saved Devvit installation settings override matching values from this wiki page.
* The old modmail update/revert workflow is deprecated in this Devvit port.
* Advanced wiki changes are read automatically the next time Artemis processes a relevant trigger \
or scheduled job.
`;
}

/**
 * Sent when a subreddit's advanced configuration page has an error.
 *
 * Original Python positional placeholders:
 *   {0} subreddit name
 *   {1} error message text
 */
export function configBad(subredditName: string, errorMessage: string): string {
  const s = subredditName;
  return `
👎 Artemis encountered an error with the legacy advanced configuration data for r/${s}. Please check \
the **[assistantbot_config wiki page](https://www.reddit.com/r/${s}/wiki/assistantbot_config)**'s \
YAML with this [online tool](https://onlineyamltools.com/validate-yaml).

For current Artemis controls, use the Devvit app installation settings page. This wiki page is only \
read as a legacy fallback, and the old modmail update/revert workflow is deprecated.

Once everything has been fixed, Artemis will read the corrected fallback configuration the next time \
it processes a relevant trigger or scheduled job.

---

*The following error message was generated by Artemis:*

---

${errorMessage}
`;
}

/**
 * Historical message for the deprecated legacy advanced configuration revert
 * workflow.
 *
 * @param subredditName The subreddit's name (no `r/` prefix).
 */
export function configRevert(subredditName: string): string {
  return `
🧹 The old modmail revert workflow is deprecated in this Devvit port. Use the Devvit app installation \
settings page for current Artemis controls. The **[assistantbot_config wiki page]\
(https://www.reddit.com/r/${subredditName}/wiki/assistantbot_config)** is read only as a legacy fallback \
when matching installation settings have not been saved.
`;
}
