'use client';

import { useWebSocket } from '@/providers/WebSocketProvider';
import { useSoundStore } from '@/store/useSoundStore';
import { formatPresenceReport } from '@/services/proximity';
import { AlertTriangle, BellRing, Volume2, VolumeX } from 'lucide-react';

export function ProximityNotice() {
  const { presence, latestPresenceAlert } = useWebSocket();
  const { soundEnabled, toggleSound } = useSoundStore();

  return (
    <section aria-label="การแจ้งเตือนเซ็นเซอร์ระยะใกล้" className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/30">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-amber-100 p-2 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
          {latestPresenceAlert ? <BellRing className="h-5 w-5" aria-hidden="true" /> : <AlertTriangle className="h-5 w-5" aria-hidden="true" />}
        </div>
        <div className="flex-1">
          <div aria-live="polite" role="status">
            <h2 className="font-bold text-slate-900 dark:text-white">
              {latestPresenceAlert?.title ?? 'การแจ้งเตือนบริเวณประตู'}
            </h2>
            {latestPresenceAlert && (
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                แจ้งเตือนครั้งล่าสุด · {formatPresenceReport(latestPresenceAlert.reportedAt)}
              </p>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
            {presence?.present === true ? 'รายงานว่ามีคนเข้าใกล้ · ' : presence?.present === false ? 'รายงานว่าไม่พบคนเข้าใกล้ · ' : ''}
            {presence?.reportedAt
              ? `${formatPresenceReport(presence.reportedAt)} · เป็นข้อมูลรายงานครั้งล่าสุด ไม่ใช่สถานะคนอยู่ปัจจุบัน`
              : 'ยังไม่มีรายงานจากเซ็นเซอร์'}
          </p>
        </div>
        <button
          onClick={toggleSound}
          type="button"
          className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300 cursor-pointer"
          aria-label={soundEnabled ? 'ปิดเสียงแจ้งเตือน' : 'เปิดเสียงแจ้งเตือน'}
          title={soundEnabled ? 'ปิดเสียงแจ้งเตือน' : 'เปิดเสียงแจ้งเตือน'}
        >
          {soundEnabled ? <Volume2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /> : <VolumeX className="h-5 w-5 text-slate-400" />}
        </button>
      </div>
    </section>
  );
}
