// Meaningful state colors, independent of rank material and screen identity.
export const statusColors = {
  success: "#55D998",
  successSurface: "#15382A",
  successText: "#A2F0C6",
  failure: "#FF7581",
  failureSurface: "#421C25",
  neutralSurface: "#191919",
};

export function dayTone(day: {
  active: boolean;
  pending: boolean;
  successful: boolean;
  failed: boolean;
}) {
  if (!day.active) return "empty";
  if (day.failed) return "failure";
  if (day.pending) return "pending";
  return day.successful ? "success" : "empty";
}

export function calendarColor(day: {
  active: boolean;
  pending: boolean;
  successful: boolean;
  resets: unknown[];
}) {
  const tone = dayTone({ ...day, failed: day.resets.length > 0 });
  return tone === "success"
    ? {
        fill: statusColors.success,
        surface: statusColors.successSurface,
        text: statusColors.successText,
      }
    : tone === "failure"
      ? {
          fill: statusColors.failureSurface,
          surface: statusColors.failureSurface,
          text: statusColors.failure,
        }
      : {
          fill: statusColors.neutralSurface,
          surface: statusColors.neutralSurface,
          text: day.active ? "#DDDDDD" : "#777777",
        };
}
