export const CURRENT_STUDENT_ID = "S001";

export function formatSlot(time: string): string {
  const [hourText, minuteText] = time.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const period = hour >= 12 ? "pm" : "am";

  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${period}`;
}