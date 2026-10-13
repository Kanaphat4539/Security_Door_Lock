export interface CamPresence {
  present: boolean | null;
  reportedAt: string | null;
}

export interface PresenceNotification {
  title: string;
  reportedAt: string;
}

export function notificationForLivePresence(
  event: CamPresence,
  previousReportedAt: string | null,
): PresenceNotification | null {
  if (!event.present || !event.reportedAt || event.reportedAt === previousReportedAt) {
    return null;
  }
  return { title: 'มีคนเข้ามาใกล้ประตู', reportedAt: event.reportedAt };
}

export function formatPresenceReport(reportedAt: string | null): string {
  if (!reportedAt) return 'ยังไม่มีรายงานจากเซ็นเซอร์';
  const date = new Date(reportedAt);
  if (Number.isNaN(date.getTime())) return 'เวลารายงานไม่ถูกต้อง';
  return `รายงานล่าสุด ${date.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'medium' })}`;
}
