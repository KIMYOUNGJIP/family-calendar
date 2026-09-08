import React, { useState } from 'react';
import { ScheduleConflict } from '../types/calendar';
import { formatKoreanShortDate } from '../utils/dateUtils';
import { AlertTriangle, AlertCircle, X, Clock, ShieldAlert } from 'lucide-react';

interface ConflictAlertProps {
  conflicts: ScheduleConflict[];
}

export const ConflictAlert: React.FC<ConflictAlertProps> = ({ conflicts }) => {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const activeConflicts = conflicts.filter((c) => !dismissedIds.has(c.id));

  if (activeConflicts.length === 0) return null;

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
  };

  return (
    <div className="space-y-2 mb-4 animate-fadeIn">
      {activeConflicts.map((conflict) => {
        const isPickup = conflict.type === 'pickup_overlap';
        const isParent = conflict.type === 'parent_conflict';

        return (
          <div
            key={conflict.id}
            className={`p-3.5 sm:p-4 rounded-2xl border flex items-start justify-between gap-3 shadow-sm transition-all ${
              isPickup
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : isParent
                ? 'bg-rose-50 border-rose-300 text-rose-900'
                : 'bg-orange-50 border-orange-300 text-orange-900'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                  isPickup ? 'bg-amber-200 text-amber-800' : isParent ? 'bg-rose-200 text-rose-800' : 'bg-orange-200 text-orange-800'
                }`}
              >
                {isPickup ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : isParent ? (
                  <ShieldAlert className="w-5 h-5" />
                ) : (
                  <Clock className="w-5 h-5" />
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-xs font-black px-2 py-0.5 rounded-full ${
                      isPickup ? 'bg-amber-200 text-amber-900' : isParent ? 'bg-rose-200 text-rose-900' : 'bg-orange-200 text-orange-900'
                    }`}
                  >
                    {isPickup ? '동일 보호자 픽업 중복 주의' : isParent ? '보호자 일정 충돌' : '귀가 시간 집중'}
                  </span>
                  <span className="text-xs font-bold bg-white/80 text-slate-800 px-2 py-0.5 rounded-md border border-black/10">
                    📅 {formatKoreanShortDate(conflict.date || conflict.schedules[0]?.date || '')}
                  </span>
                  <span className="text-xs font-mono font-bold opacity-75">시간: {conflict.time}</span>
                </div>
                <p className="text-sm font-semibold leading-snug">{conflict.message}</p>
                <div className="flex items-center gap-2 text-xs opacity-80 pt-0.5">
                  <span>해당 일정:</span>
                  {conflict.schedules.map((s) => (
                    <span key={s.id} className="font-bold underline decoration-dotted">
                      {s.title} ({s.returnTime})
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => handleDismiss(conflict.id)}
              className="p-1.5 rounded-lg hover:bg-black/5 text-slate-500 hover:text-slate-800 transition-colors"
              title="알림 닫기"
              aria-label="알림 닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
