import React from 'react';
import { Schedule } from '../types/calendar';
import { getMonthGrid, getTodayString } from '../utils/dateUtils';
import {
  MemberFilter,
  matchesMemberFilter,
  isRegularClassSchedule,
  getScheduleRoleStyle,
} from './FilterBar';
import { GraduationCap, Eye, EyeOff } from 'lucide-react';

interface MonthlyCalendarProps {
  currentDate: Date;
  selectedDateStr: string;
  onSelectDate: (dateStr: string) => void;
  schedules: Schedule[];
  memberFilter: MemberFilter;
  showRegularClasses: boolean;
  onToggleRegularClasses: () => void;
}

export const MonthlyCalendar: React.FC<MonthlyCalendarProps> = ({
  currentDate,
  selectedDateStr,
  onSelectDate,
  schedules,
  memberFilter,
  showRegularClasses,
  onToggleRegularClasses,
}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const todayStr = getTodayString();

  const cells = getMonthGrid(year, month);

  // 날짜별 일정 그룹핑 (특별 일정을 항상 최상단에 우선 정렬)
  const schedulesByDate: Record<string, Schedule[]> = {};
  const hiddenRegularCountByDate: Record<string, number> = {};

  for (const s of schedules) {
    if (!matchesMemberFilter(s, memberFilter)) continue;
    const isRegular = isRegularClassSchedule(s);
    if (!showRegularClasses && isRegular) {
      hiddenRegularCountByDate[s.date] = (hiddenRegularCountByDate[s.date] || 0) + 1;
      continue;
    }
    if (!schedulesByDate[s.date]) schedulesByDate[s.date] = [];
    schedulesByDate[s.date].push(s);
  }

  for (const dateKey of Object.keys(schedulesByDate)) {
    schedulesByDate[dateKey].sort((a, b) => {
      const aReg = isRegularClassSchedule(a) ? 1 : 0;
      const bReg = isRegularClassSchedule(b) ? 1 : 0;
      if (aReg !== bReg) return aReg - bReg; // 특별 일정(0)이 정규 수업(1)보다 항상 먼저 표시됨
      return a.startTime.localeCompare(b.startTime);
    });
  }

  return (
    <section className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-4 sm:p-5">
      {/* Calendar Top Info & Regular Classes Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2 flex-wrap">
            <span>📅 {year}년 {month + 1}월 가족 달력</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              특별 일정 최우선 표시
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            날짜를 클릭하면 우측 상세 패널에서 해당 일자의 전체 일정을 확인하고 바로 등록할 수 있습니다.
          </p>
        </div>

        {/* Regular Class Visibility Toggle */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={onToggleRegularClasses}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              showRegularClasses
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
            }`}
            title="은비·하율이의 반복 학교/학원 정규수업을 달력 칸에 함께 표시할지 선택합니다"
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>정규수업 {showRegularClasses ? '표시 중' : '숨김'}</span>
            {showRegularClasses ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Color Legend */}
      <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-semibold mb-3">
        <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
          <span className="w-2 h-2 rounded-full bg-blue-600"></span> 은비
        </span>
        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-600"></span> 하율
        </span>
        <span className="inline-flex items-center gap-1 text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
          <span className="w-2 h-2 rounded-full bg-indigo-600"></span> 아빠
        </span>
        <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
          <span className="w-2 h-2 rounded-full bg-rose-500"></span> 엄마
        </span>
        <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
          <span className="w-2 h-2 rounded-full bg-orange-500"></span> 가족 공통
        </span>
      </div>

      {/* Weekday Header */}
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-1.5 text-center text-xs font-black">
        <div className="py-1 text-rose-500">일</div>
        <div className="py-1 text-slate-700">월</div>
        <div className="py-1 text-slate-700">화</div>
        <div className="py-1 text-slate-700">수</div>
        <div className="py-1 text-slate-700">목</div>
        <div className="py-1 text-slate-700">금</div>
        <div className="py-1 text-blue-500">토</div>
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {cells.map((cell) => {
          const isSelected = cell.dateStr === selectedDateStr;
          const isToday = cell.dateStr === todayStr;
          const daySchedules = schedulesByDate[cell.dateStr] || [];
          const hiddenRegularCount = hiddenRegularCountByDate[cell.dateStr] || 0;

          return (
            <button
              key={cell.dateStr}
              type="button"
              onClick={() => onSelectDate(cell.dateStr)}
              className={`min-h-[82px] sm:min-h-[104px] p-1.5 sm:p-2 rounded-2xl flex flex-col justify-start text-left transition-all relative border cursor-pointer ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-50/40 shadow-xs ring-2 ring-indigo-500 ring-offset-1 z-10'
                  : isToday
                  ? 'border-amber-400 bg-amber-50/30'
                  : cell.isCurrentMonth
                  ? 'border-slate-100 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                  : 'border-slate-100/50 bg-slate-50/40 text-slate-300 opacity-55'
              }`}
            >
              {/* Day Number and Today Badge */}
              <div className="flex items-center justify-between w-full mb-1">
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
                  <span className="text-[9px] sm:text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded-full">
                    오늘
                  </span>
                )}
              </div>

              {/* Schedules Preview (Up to 3 items, Special events prioritized first) */}
              <div className="space-y-1 w-full overflow-hidden flex-1">
                {daySchedules.slice(0, 3).map((sch) => {
                  const style = getScheduleRoleStyle(sch);
                  const isSpecial = !isRegularClassSchedule(sch);
                  const cleanTitle = sch.title.replace(/^\[(은비|하율)\]\s*/, '');
                  return (
                    <div
                      key={sch.id}
                      className={`text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded-md truncate flex items-center gap-1 ${
                        style.badgeClass
                      } ${isSpecial ? 'font-extrabold ring-1 ring-inset ring-black/10' : 'font-semibold opacity-90'}`}
                    >
                      <span className="shrink-0 text-[10px]">{style.avatar}</span>
                      <span className="truncate">{cleanTitle}</span>
                    </div>
                  );
                })}

                {daySchedules.length > 3 && (
                  <div className="text-[9px] font-bold text-slate-500 pl-1">
                    +{daySchedules.length - 3}개 더보기
                  </div>
                )}

                {!showRegularClasses && daySchedules.length === 0 && hiddenRegularCount > 0 && (
                  <div className="text-[9px] font-medium text-slate-400 pl-0.5 pt-1">
                    정규수업 {hiddenRegularCount}건
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
