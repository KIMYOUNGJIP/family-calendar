import React from 'react';
import { Schedule, MemberId } from '../types/calendar';
import { FAMILY_MEMBERS } from '../utils/sampleData';
import { getMonthGrid, getTodayString, parseDate, DAY_NAMES_KO } from '../utils/dateUtils';
import { Clock, Sparkles } from 'lucide-react';

interface MonthlyCalendarProps {
  currentDate: Date;
  selectedDateStr: string;
  onSelectDate: (dateStr: string) => void;
  schedules: Schedule[];
    memberFilter: 'all' | MemberId;
}

export const MonthlyCalendar: React.FC<MonthlyCalendarProps> = ({
  currentDate,
  selectedDateStr,
  onSelectDate,
  schedules,
    memberFilter,
}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const todayStr = getTodayString();

  const cells = getMonthGrid(year, month);

  // 날짜별 일정 그룹핑
  const schedulesByDate: Record<string, Schedule[]> = {};
  for (const s of schedules) {
    if (memberFilter !== 'all' && s.memberId !== memberFilter) continue;
    if (!schedulesByDate[s.date]) schedulesByDate[s.date] = [];
    schedulesByDate[s.date].push(s);
  }

  

  return (
    <section className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-6 mb-6">
      {/* Calendar Top Info & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
            <span>📅 {year}년 {month + 1}월 가족 달력</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              날짜 클릭 시 아래 주간 일정 이동
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            온 가족 일정과 자녀별 귀가 시간을 한눈에 파악할 수 있습니다.
          </p>
        </div>

        {/* Color Legend for Accessibility */}
        <div className="flex items-center gap-2 flex-wrap text-xs font-semibold">
          <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span> 은비(파랑)
          </span>
          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-600"></span> 하율(초록)
          </span>
          <span className="inline-flex items-center gap-1 text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
            <span className="w-2 h-2 rounded-full bg-purple-600"></span> 나&아내(보라)
          </span>
          <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-orange-600"></span> 우리 가족(주황)
          </span>
        </div>
      </div>

      {/* Weekday Header */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-xs font-black">
        <div className="py-1 text-rose-500">일</div>
        <div className="py-1 text-slate-700">월</div>
        <div className="py-1 text-slate-700">화</div>
        <div className="py-1 text-slate-700">수</div>
        <div className="py-1 text-slate-700">목</div>
        <div className="py-1 text-slate-700">금</div>
        <div className="py-1 text-blue-500">토</div>
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {cells.map((cell) => {
          const isSelected = cell.dateStr === selectedDateStr;
          const isToday = cell.dateStr === todayStr;
          const daySchedules = schedulesByDate[cell.dateStr] || [];
                    // 귀가 시간 목록 (첫째/둘째 위주)
          const childSchedules = daySchedules.filter(
            (s) => s.memberId === 'first_child' || s.memberId === 'second_child'
          );
          const latestReturnTime =
            childSchedules.length > 0
              ? childSchedules.reduce((prev, curr) => (curr.returnTime > prev.returnTime ? curr : prev)).returnTime
              : null;

          return (
            <button
              key={cell.dateStr}
              onClick={() => onSelectDate(cell.dateStr)}
              className={`min-h-[76px] sm:min-h-[96px] p-1.5 sm:p-2 rounded-2xl flex flex-col justify-between text-left transition-all relative border ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-50/50 shadow-sm ring-2 ring-indigo-500 ring-offset-1 z-10'
                  : isToday
                  ? 'border-amber-400 bg-amber-50/30'
                  : cell.isCurrentMonth
                  ? 'border-slate-100 bg-white hover:border-slate-300 hover:bg-slate-50/80'
                  : 'border-slate-100/50 bg-slate-50/40 text-slate-300 opacity-60'
              }`}
            >
              {/* Day Number and Today / Selected Badges */}
              <div className="flex items-center justify-between w-full">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                    isToday
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : isSelected
                      ? 'bg-indigo-600 text-white'
                      : cell.dayOfWeek === 0
                      ? 'text-rose-500'
                      : cell.dayOfWeek === 6
                      ? 'text-blue-500'
                      : 'text-slate-800'
                  }`}
                >
                  {cell.dayNumber}
                </span>

                {isToday && (
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.2 rounded-full">
                    오늘
                  </span>
                )}

                
              </div>

              {/* Schedules Overview Preview */}
              <div className="mt-1 space-y-1 w-full overflow-hidden">
                {daySchedules.slice(0, 2).map((sch) => {
                  const member = FAMILY_MEMBERS[sch.memberId];
                  return (
                    <div
                      key={sch.id}
                      className={`text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 rounded-md truncate flex items-center gap-1 ${member.color.bgBadge}`}
                    >
                      <span className="shrink-0">{member.avatar}</span>
                      <span className="truncate">{sch.title}</span>
                    </div>
                  );
                })}

                {daySchedules.length > 2 && (
                  <div className="text-[9px] font-bold text-slate-500 pl-1">
                    +{daySchedules.length - 2}개 더보기
                  </div>
                )}
              </div>

              {/* Bottom Return Time Highlight */}
              {latestReturnTime ? (
                <div className="mt-1 pt-1 border-t border-slate-100 text-[10px] sm:text-[11px] font-bold text-slate-700 flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5 text-slate-400" />
                  <span>귀가 {latestReturnTime}</span>
                </div>
              ) : (
                <div className="h-3 sm:h-4"></div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
};
