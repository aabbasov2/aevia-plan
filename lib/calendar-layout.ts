export const CALENDAR_HOUR_HEIGHT = 120;
export const CALENDAR_DROP_SLOT_MINUTES = 5;
export const CALENDAR_EVENT_GAP_PX = 2;
export const CALENDAR_MIN_EVENT_HEIGHT = 20;

export type CalendarView = "day" | "week" | "month";

export function calendarEventHeight(
  durationMinutes: number,
  hourHeight = CALENDAR_HOUR_HEIGHT
) {
  const durationHeight = (durationMinutes / 60) * hourHeight;
  return Math.max(
    CALENDAR_MIN_EVENT_HEIGHT,
    durationHeight - CALENDAR_EVENT_GAP_PX
  );
}

export function calendarVisualDurationMinutes(
  durationMinutes: number,
  hourHeight: number
) {
  const minimumVisualDuration =
    ((CALENDAR_MIN_EVENT_HEIGHT + CALENDAR_EVENT_GAP_PX) / hourHeight) * 60;
  return Math.max(durationMinutes, minimumVisualDuration);
}
