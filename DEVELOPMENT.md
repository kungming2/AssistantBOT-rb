# Development Notes

This file is for maintainers working on the Devvit/TypeScript app. The main `README.md` is kept focused on installing Artemis and understanding how this port differs from the old Python/PRAW bot.

## Requirements

- Node.js 22.2 or newer.
- Devvit CLI authentication through `npm run login`.

## Useful Commands

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

## Devvit Surface

Configured triggers:

- `onAppInstall`
- `onAppUpgrade`
- `onPostSubmit`
- `onPostFlairUpdate`

Configured scheduler tasks:

- `artemis-reconcile-filtered-posts`: cron reconciliation every 15 minutes.
- `artemis-record-daily-stats`: daily post/subscriber statistics refresh after midnight UTC.
- `artemis-record-monthly-stats`: monthly top-post statistics refresh after midnight UTC on the first day of the month.

Configured platform capabilities:

- Reddit API access for subreddit moderation workflows.
- Redis.
- Devvit installation settings.

## Project Structure

```text
src/
|-- index.ts                    # Hono server route setup
|-- core/
|   |-- artemisConfig.ts        # Install settings merge and legacy wiki fallback
|   |-- artemisFlair.ts         # Flair template, schedule, and tag helpers
|   |-- artemisIds.ts           # Reddit thing ID helpers
|   |-- artemisInstallSettings.ts # Devvit installation settings helpers
|   |-- artemisModeration.ts    # Moderator status helpers
|   |-- artemisPosts.ts         # Submission, flair-update, and reconciliation logic
|   |-- artemisSettings.ts      # Shared constants/job names
|   |-- artemisStatsCollator.ts # Markdown collation for statistics wiki sections
|   |-- artemisStatsRecorder.ts # Trigger/scheduler statistics snapshot recording
|   |-- artemisStatsStorage.ts  # Redis-backed statistics storage
|   |-- artemisStatsWiki.ts     # Statistics wiki page creation/update helpers
|   |-- artemisStorage.ts       # Redis-backed state, counters, and indexes
|   |-- artemisTypes.ts         # Artemis config/storage types
|   |-- text.ts                 # User/mod-facing message templates
|   `-- timekeeping.ts          # Flair schedule date helpers
`-- routes/
    |-- scheduler.ts            # Devvit scheduler endpoints
    `-- triggers.ts             # Devvit trigger endpoints
```
