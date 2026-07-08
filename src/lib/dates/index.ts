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

export function getUtcWeekRange(timeZone: string, now = new Date()) {
  const local = partsInTimeZone(now, timeZone);
  const dow = new Date(
    Date.UTC(local.year, local.month - 1, local.day),
  ).getUTCDay();
  // Semana começa na segunda-feira (dow 1). Domingo (0) recua 6 dias.
  const offsetToMonday = (dow + 6) % 7;
  const startDate = new Date(
    Date.UTC(local.year, local.month - 1, local.day - offsetToMonday),
  );
  const endDate = new Date(
    Date.UTC(
      startDate.getUTCFullYear(),
      startDate.getUTCMonth(),
      startDate.getUTCDate() + 7,
    ),
  );
  return {
    start: zonedMidnightToUtc(
      startDate.getUTCFullYear(),
      startDate.getUTCMonth() + 1,
      startDate.getUTCDate(),
      timeZone,
    ),
    end: zonedMidnightToUtc(
      endDate.getUTCFullYear(),
      endDate.getUTCMonth() + 1,
      endDate.getUTCDate(),
      timeZone,
    ),
  };
}

export function getUtcMonthRange(
  timeZone: string,
  yearMonth?: string,
  now = new Date(),
) {
  const match = yearMonth?.match(/^(\d{4})-(\d{2})$/);
  let year: number;
  let month: number;
  if (match && Number(match[2]) >= 1 && Number(match[2]) <= 12) {
    year = Number(match[1]);
    month = Number(match[2]);
  } else {
    const local = partsInTimeZone(now, timeZone);
    year = local.year;
    month = local.month;
  }
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return {
    start: zonedMidnightToUtc(year, month, 1, timeZone),
    end: zonedMidnightToUtc(nextYear, nextMonth, 1, timeZone),
    year,
    month,
  };
}

export function getDateInTz(timeZone: string, now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
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
