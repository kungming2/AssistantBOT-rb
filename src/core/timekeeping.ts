/**
 * The timekeeping module primarily deals with time conversion and
 * formatting. Ported from the Python `timekeeping.py` module.
 */

/** DATE/TIME CONVERSION FUNCTIONS */

/**
 * Converts a UNIX timestamp (seconds) into a time formatted according
 * to ISO 8601 for UTC time, truncated to the seconds place
 * (e.g. "2024-01-15T08:30:00Z").
 *
 * @param unixSeconds Any UNIX time number, in seconds.
 */
export function timeConvertToString(unixSeconds: number): string {
  const date = new Date(unixSeconds * 1000);
  // toISOString() => "2024-01-15T08:30:00.000Z"
  // Slice to "2024-01-15T08:30:00" and append "Z".
  return `${date.toISOString().slice(0, 19)}Z`;
}

/**
 * Converts a UNIX timestamp (seconds) into a date formatted as
 * YYYY-MM-DD, according to the UTC equivalent (not local time).
 *
 * @param unixSeconds Any UNIX time number, in seconds.
 * @return A string formatted with UTC time.
 */
export function convertToString(unixSeconds: number): string {
  const date = new Date(unixSeconds * 1000);
  return date.toISOString().slice(0, 10);
}

/**
 * Converts a date formatted as YYYY-MM-DD into a UNIX timestamp
 * (seconds) of its equivalent UTC time (midnight that day).
 *
 * @param dateString Any date formatted as YYYY-MM-DD.
 * @return The UNIX timestamp (seconds) of MIDNIGHT that day in UTC.
 */
export function convertToUnix(dateString: string): number {
  const [year, month, day] = dateString.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined) {
    throw new Error(`Invalid date string: ${dateString}`);
  }
  const utcMillis = Date.UTC(year, month - 1, day);
  return Math.floor(utcMillis / 1000);
}

/**
 * Converts a UNIX timestamp (seconds) into a date formatted as
 * YYYY-MM. This just retrieves the month string.
 *
 * @param unixSeconds Any UNIX time number, in seconds.
 * @return A month string formatted as YYYY-MM.
 */
export function monthConvertToString(unixSeconds: number): string {
  const date = new Date(unixSeconds * 1000);
  return date.toISOString().slice(0, 7);
}

const WEEKDAY_ABBREVIATIONS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_FULL_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/**
 * Converts a weekday abbreviation to its full English form, or
 * vice versa.
 *
 * @param dayString Either a 3-letter weekday abbreviation (e.g. "Mon")
 *                  or a full weekday name (e.g. "Monday").
 * @return The full name if given an abbreviation, or the abbreviation
 *         if given a full (or longer) name.
 */
export function convertWeekdayText(dayString: string): string {
  if (dayString.length === 3) {
    const index = WEEKDAY_ABBREVIATIONS.findIndex(
      (abbr) => abbr.toLowerCase() === dayString.toLowerCase(),
    );
    if (index === -1) {
      throw new Error(`Invalid weekday abbreviation: ${dayString}`);
    }
    return WEEKDAY_FULL_NAMES[index] ?? dayString;
  } else {
    return dayString.slice(0, 3);
  }
}

/**
 * Returns the number of days between two dates expressed as
 * YYYY-MM-DD strings.
 *
 * @param startDay The day we begin counting from.
 * @param endDay The day we end counting at.
 * @return An integer with the number of days.
 */
export function numDaysBetween(startDay: string, endDay: string): number {
  const start = convertToUnix(startDay);
  const end = convertToUnix(endDay);
  const diffSeconds = Math.abs(end - start);
  return Math.round(diffSeconds / 86400);
}

/**
 * Takes two date strings and returns a list of all days between
 * those two days (inclusive of both the start and end dates).
 *
 * For example, if passed "2018-11-01" and "2018-11-03", it will
 * return:
 *
 * ["2018-11-01", "2018-11-02", "2018-11-03"]
 *
 * @param startDay A YYYY-MM-DD string to start.
 * @param endDay A YYYY-MM-DD string to end.
 * @return A list of days in the YYYY-MM-DD format.
 */
export function getSeriesOfDays(startDay: string, endDay: string): string[] {
  const daysList: string[] = [];

  const startUnix = convertToUnix(startDay);
  const endUnix = convertToUnix(endDay);
  const deltaDays = Math.round((endUnix - startUnix) / 86400);

  for (let i = 0; i <= deltaDays; i++) {
    const dayUnix = startUnix + i * 86400;
    daysList.push(convertToString(dayUnix));
  }

  return daysList;
}

/**
 * Takes a list of days in YYYY-MM-DD format and returns another list.
 * If the original list is shorter than `histDaysLimit`, it just
 * returns the same list. Otherwise, it tries to truncate to the start
 * of a month (to avoid having to gather historical data across an
 * excessive number of days on relatively inactive subreddits).
 *
 * @param listOfDays A list of days in YYYY-MM-DD format.
 * @param histDaysLimit The max number of past days to get historical
 *                       data for (equivalent to `SETTINGS.hist_days_limit`).
 * @return Another list of days, the ones to get data for.
 */
export function getHistoricalSeriesDays(
  listOfDays: string[],
  histDaysLimit: number,
): string[] {
  if (listOfDays.length <= histDaysLimit) {
    return listOfDays;
  }

  // This is longer than our limit of days. Truncate it down.
  // If we can get an extra *full* month past this, get it.
  if (listOfDays.length > histDaysLimit + 31) {
    const firstDay = listOfDays.slice(-histDaysLimit)[0];
    if (firstDay === undefined) {
      return listOfDays;
    }
    const initialStart = `${firstDay.slice(0, -2)}01`;
    const startIndex = listOfDays.indexOf(initialStart);
    return listOfDays.slice(startIndex);
  } else {
    // Otherwise, just return the last `histDaysLimit` days.
    return listOfDays.slice(-histDaysLimit);
  }
}

/**
 * Checks a given flair template ID against a dictionary of what
 * flairs are allowed on what weekdays (stored in the advanced
 * configuration). If the dictionary is empty (or the flair ID isn't
 * in it at all), anything will be approved.
 *
 * @param flairTemplateId The flair template ID to check.
 * @param flairDaysDict A record mapping weekday abbreviations (e.g.
 *                       "Mon") to lists of flair template IDs allowed
 *                       on that day.
 * @return A tuple: `[isAllowed, permittedDays, currentWeekday]`.
 *         `isAllowed` is `true` if the user can post with this flair
 *         today, `false` otherwise. `permittedDays` is the list of
 *         weekday abbreviations on which this flair is allowed.
 *         `currentWeekday` is today's weekday abbreviation (UTC-based
 *         "now").
 */
export function checkFlairSchedule(
  flairTemplateId: string,
  flairDaysDict: Record<string, string[]>,
): [boolean, string[], string] {
  const WEST_TIMEZONE = "Pacific/Auckland";
  const EAST_TIMEZONE = "Pacific/Honolulu";

  const now = new Date();

  // Today's weekday, as used by the original Python (local/system time
  // via `datetime.date.today()`).
  const currentWeekday = WEEKDAY_ABBREVIATIONS[now.getDay()];

  // Get the weekday abbreviation in each bounding timezone.
  const westBound = getWeekdayAbbrInTimezone(now, WEST_TIMEZONE);
  const eastBound = getWeekdayAbbrInTimezone(now, EAST_TIMEZONE);

  // Get the permitted days from the flair dictionary.
  const permittedDays = Object.entries(flairDaysDict)
    .filter(([, flairIds]) => flairIds.includes(flairTemplateId))
    .map(([day]) => day);

  // Check the flair ID against the list of all flairs. If it's not in
  // any of them, just approve.
  const allFlairs = Object.values(flairDaysDict).flat();
  if (!allFlairs.includes(flairTemplateId)) {
    return [true, permittedDays, currentWeekday ?? ""];
  }

  // Check the two-day boundaries and see if there's an overlap. If
  // there is an overlap, then it is permitted to post this flair.
  const currentDays = Array.from(new Set([eastBound, westBound]));
  const overlapDays = currentDays.filter((day) => permittedDays.includes(day));

  if (overlapDays.length > 0) {
    return [true, permittedDays, currentWeekday ?? ""];
  } else {
    return [false, permittedDays, currentWeekday ?? ""];
  }
}

/**
 * Helper: returns the 3-letter weekday abbreviation for the given
 * instant, as observed in the given IANA timezone.
 */
function getWeekdayAbbrInTimezone(date: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  });
  // e.g. "Mon" (Intl may return "Mon" already, but normalize just in case)
  return formatter.format(date).slice(0, 3);
}

/**
 * Gets the previous month in YYYY-MM form, based on 30 days before
 * the current moment.
 */
export function previousMonth(): string {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400 * 1000);
  return thirtyDaysAgo.toISOString().slice(0, 7);
}
