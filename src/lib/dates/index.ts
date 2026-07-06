type DateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function partsInTimeZone(date: Date, timeZone: string): DateParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return values as DateParts;
}

function zonedMidnightToUtc(
  year: number,
  month: number,
  day: number,
  timeZone: string,
) {
  const guess = Date.UTC(year, month - 1, day);
  const firstParts = partsInTimeZone(new Date(guess), timeZone);
  const firstOffset =
    Date.UTC(
      firstParts.year,
      firstParts.month - 1,
      firstParts.day,
      firstParts.hour,
      firstParts.minute,
      firstParts.second,
    ) - guess;
  const firstResult = guess - firstOffset;
  const secondParts = partsInTimeZone(new Date(firstResult), timeZone);
  const secondOffset =
    Date.UTC(
      secondParts.year,
      secondParts.month - 1,
      secondParts.day,
      secondParts.hour,
      secondParts.minute,
      secondParts.second,
    ) - firstResult;

  return new Date(guess - secondOffset);
}

export function getUtcDayRange(timeZone: string, now = new Date()) {
  const local = partsInTimeZone(now, timeZone);
  const nextDay = new Date(
    Date.UTC(local.year, local.month - 1, local.day + 1),
  );

  return {
    start: zonedMidnightToUtc(local.year, local.month, local.day, timeZone),
    end: zonedMidnightToUtc(
      nextDay.getUTCFullYear(),
      nextDay.getUTCMonth() + 1,
      nextDay.getUTCDate(),
      timeZone,
    ),
  };
}

export function formatTimeInTz(date: Date | string, timeZone: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(typeof date === "string" ? new Date(date) : date);
}

export function formatShortDateInTz(date: Date | string, timeZone: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    day: "2-digit",
    month: "short",
  }).format(typeof date === "string" ? new Date(date) : date);
}

export function getLocalDateInputValue(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
