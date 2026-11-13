import React from 'react';
import { Schedule } from '../types/calendar';
import {
  formatKoreanShortDate,
  getTodayString,
  addDays,
  parseDate,
  DAY_NAMES_KO,
} from '../utils/dateUtils';
import {
  MemberFilter,
  matchesMemberFilter,
  isRegularClassSchedule,
  getScheduleRoleStyle,
} from './FilterBar';
import {
  Plus,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CalendarCheck,
  Sparkles,
  GraduationCap,
  Utensils,
} from 'lucide-react';

interface SelectedDayPanelProps {
  selectedDateStr: string;
  onSelectDate: (dateStr: string) => void;
  schedules: Schedule[];
  memberFilter: MemberFilter;
  showRegularClasses: boolean;
  onToggleRegularClasses: () => void;
  onOpenScheduleModal: (schedule?: Schedule, defaultDate?: string) => void;
  onDeleteSchedule: (id: string) => void;
  onGoToDinnerTab: () => void;
}

export const SelectedDayPanel: React.FC<SelectedDayPanelProps> = ({
  selectedDateStr,
  onSelectDate,
  schedules,
  memberFilter,
  showRegularClasses,
  onToggleRegularClasses,
  onOpenScheduleModal,
  onDeleteSchedule,
  onGoToDinnerTab,
}) => {
  const todayStr = getTodayString();
  const isToday = selectedDateStr === todayStr;
  const dateObj = parseDate(selectedDateStr);
  const dayOfWeek = dateObj.getDay();
  const dayName = DAY_NAMES_KO[dayOfWeek];
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

  const allDaySchedules = schedules
    .filter((s) => s.date === selectedDateStr && matchesMemberFilter(s, memberFilter))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const specialSchedules = allDaySchedules.filter((s) => !isRegularClassSchedule(s));
  const regularSchedules = allDaySchedules.filter((s) => isRegularClassSchedule(s));

  const displayedSchedules = showRegularClasses
    ? [...specialSchedules, ...regularSchedules]
    : specialSchedules;

  const renderScheduleCard = (sch: Schedule, isSpecial: boolean) => {
    const style = getScheduleRoleStyle(sch);
    return (
      <div
        key={sch.id}
        onClick={() => onOpenScheduleModal(sch)}
        className={`p-3 rounded-2xl border transition-all hover:shadow-xs cursor-pointer group ${
          isSpecial ? `${style.cardBgClass} ring-1 ring-black/5` : 'bg-slate-50/70 border-slate-200/80 hover:bg-white'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-md ${style.badgeClass}`}>
              <span>{style.avatar}</span>
              <span>{style.name}</span>
            </span>
            {isSpecial ? (
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                주요 일정
              </span>
            ) : (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-600">
                정규 일과
              </span>
            )}
          </div>

          {/* Edit / Delete Buttons */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenScheduleModal(sch);
              }}
              className="p-1 rounded-lg hover:bg-white text-slate-500 hover:text-indigo-600 transition-colors"
              title="일정 수정"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteSchedule(sch.id);
              }}
              className="p-1 rounded-lg hover:bg-white text-slate-400 hover:text-rose-600 transition-colors"
              title="일정 삭제"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Title & Time */}
        <div className="mt-2 flex items-baseline justify-between gap-2">
          <h4 className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug">
            {sch.title}
          </h4>
          <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-slate-700 bg-white/90 px-2 py-0.5 rounded-lg border border-slate-200/80 shrink-0">
            <Clock className="w-3 h-3 text-indigo-500" />
            {sch.startTime} ~ {sch.returnTime}
          </span>
        </div>

        {/* Clean Location/Memo (Only show if user entered a custom memo or place, excluding verbose auto dinner notes) */}
        {sch.memo &&
          !sch.memo.includes('저녁 식사') &&
          !sch.memo.includes('집밥 불필요') &&
          !sch.memo.includes('목감 귀가') &&
          !sch.memo.includes('도보 5분') && (
            <p className="mt-1.5 text-xs text-slate-600 bg-white/70 px-2 py-1 rounded-lg border border-slate-100">
              📍 {sch.memo}
            </p>
          )}
      </div>
    );
  };

  return (
    <aside className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-4 sm:p-5 flex flex-col justify-between h-full">
      <div>
        {/* Selected Date Header */}
        <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-indigo-50 text-indigo-600">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  {formatKoreanShortDate(selectedDateStr)} ({dayName})
                </h3>
                {isToday && (
                  <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500 text-white">
                    오늘
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                총 <strong className="text-indigo-600">{allDaySchedules.length}건</strong>의 가족 일정
                {specialSchedules.length > 0 && (
                  <span className="ml-1 text-amber-700 font-bold">
                    (특별 일정 {specialSchedules.length}건)
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Prev / Next Day Navigation + Add Schedule */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200">
              <button
                type="button"
                onClick={() => onSelectDate(addDays(selectedDateStr, -1))}
                className="p-1.5 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                title="이전 날짜"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onSelectDate(addDays(selectedDateStr, 1))}
                className="p-1.5 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                title="다음 날짜"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => onOpenScheduleModal(undefined, selectedDateStr)}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-2xs active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>일정 추가</span>
            </button>
          </div>
        </div>

        {/* Sub-filter bar inside Day Panel */}
        {regularSchedules.length > 0 && (
          <div className="flex items-center justify-between mb-3 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
            <span className="text-slate-600 font-medium flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
              학교·학원 정규 일과 ({regularSchedules.length}건)
            </span>
            <button
              type="button"
              onClick={onToggleRegularClasses}
              className="font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
            >
              {showRegularClasses ? '정규일과 숨기기' : '정규일과 펼치기'}
            </button>
          </div>
        )}

        {/* Schedules List */}
        {displayedSchedules.length === 0 ? (
          <div className="py-12 px-4 text-center rounded-2xl bg-slate-50/70 border border-dashed border-slate-200 my-2">
            <p className="text-sm font-bold text-slate-600">
              {!showRegularClasses && regularSchedules.length > 0
                ? '이 날에는 특별 일정이 없습니다.'
                : '등록된 가족 일정이 없습니다.'}
            </p>
            {!showRegularClasses && regularSchedules.length > 0 ? (
              <button
                type="button"
                onClick={onToggleRegularClasses}
                className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
              >
                <GraduationCap className="w-3.5 h-3.5" />
                학교·학원 정규 수업 {regularSchedules.length}건 보기
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onOpenScheduleModal(undefined, selectedDateStr)}
                className="mt-3 inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-white border border-slate-300 hover:border-indigo-400 text-xs font-bold text-slate-700 shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-600" />새 가족 일정 등록하기
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
            {specialSchedules.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1 text-xs font-extrabold text-amber-800 px-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>주요 · 특별 일정 ({specialSchedules.length})</span>
                </div>
                {specialSchedules.map((sch) => renderScheduleCard(sch, true))}
              </div>
            )}

            {showRegularClasses && regularSchedules.length > 0 && (
              <div className="space-y-2 pt-1">
                {specialSchedules.length > 0 && (
                  <div className="flex items-center gap-1 text-xs font-bold text-slate-500 px-1 pt-2 border-t border-slate-100">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                    <span>학교 · 학원 정규 일과 ({regularSchedules.length})</span>
                  </div>
                )}
                {regularSchedules.map((sch) => renderScheduleCard(sch, false))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Shortcut to Secondary Dinner Briefing Tab (Only for weekdays) */}
      {isWeekday && (
        <div className="mt-4 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onGoToDinnerTab}
            className="w-full py-2.5 px-3.5 rounded-2xl bg-amber-50 hover:bg-amber-100/80 border border-amber-200/80 flex items-center justify-between text-xs font-bold text-amber-900 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Utensils className="w-3.5 h-3.5 text-amber-600" />
              <span>{dayName}요일 저녁 식사 · 아이들 귀가 브리핑 확인</span>
            </span>
            <span className="text-[11px] text-amber-700 font-extrabold">바로가기 →</span>
          </button>
        </div>
      )}
    </aside>
  );
};
