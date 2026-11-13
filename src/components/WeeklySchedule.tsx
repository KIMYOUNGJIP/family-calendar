import React, { useState } from 'react';
import { Schedule } from '../types/calendar';
import {
  getWeekDays,
  formatKoreanShortDate,
  getTodayString,
  addDays,
  DAY_NAMES_KO,
} from '../utils/dateUtils';
import {
  MemberFilter,
  matchesMemberFilter,
  isRegularClassSchedule,
  getScheduleRoleStyle,
} from './FilterBar';
import {
  Clock,
  Plus,
  Trash2,
  Edit2,
  LayoutGrid,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Eye,
  EyeOff,
} from 'lucide-react';

interface WeeklyScheduleProps {
  selectedDateStr: string;
  onSelectDate: (dateStr: string) => void;
  schedules: Schedule[];
  onOpenScheduleModal: (schedule?: Schedule, defaultDate?: string) => void;
  onDeleteSchedule: (id: string) => void;
  memberFilter: MemberFilter;
  showRegularClasses?: boolean;
  onToggleRegularClasses?: () => void;
}

export const WeeklySchedule: React.FC<WeeklyScheduleProps> = ({
  selectedDateStr,
  onSelectDate,
  schedules,
  onOpenScheduleModal,
  onDeleteSchedule,
  memberFilter,
  showRegularClasses = true,
  onToggleRegularClasses,
}) => {
  const [viewMode, setViewMode] = useState<'timeline' | 'grid'>('timeline');
  const todayStr = getTodayString();
  const weekDays = getWeekDays(selectedDateStr);
  const isViewingCurrentWeek = weekDays.some((d) => d.dateStr === todayStr);

  const handlePrevWeek = () => {
    onSelectDate(addDays(selectedDateStr, -7));
  };
  const handleNextWeek = () => {
    onSelectDate(addDays(selectedDateStr, 7));
  };

  // 필터 적용
  const filteredSchedules = schedules.filter((s) => {
    if (!matchesMemberFilter(s, memberFilter)) return false;
    if (!showRegularClasses && isRegularClassSchedule(s)) return false;
    return true;
  });

  const getSchedulesForDay = (dateStr: string) => {
    return filteredSchedules
      .filter((s) => s.date === dateStr)
      .sort((a, b) => {
        const aReg = isRegularClassSchedule(a) ? 1 : 0;
        const bReg = isRegularClassSchedule(b) ? 1 : 0;
        if (aReg !== bReg) return aReg - bReg;
        return a.startTime.localeCompare(b.startTime);
      });
  };

  const getCleanMemo = (memo?: string) => {
    if (!memo) return null;
    if (
      memo.includes('저녁 식사') ||
      memo.includes('집밥 불필요') ||
      memo.includes('목감 귀가') ||
      memo.includes('도보 5분') ||
      memo.includes('바로 이동') ||
      memo.includes('다음 강의 대기')
    ) {
      return null;
    }
    return memo;
  };

  return (
    <section className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-4 sm:p-6 mb-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg sm:text-xl font-black text-slate-900">
              📋 {isViewingCurrentWeek ? '이번 주' : '주간'} 가족 타임라인 (월~일)
            </h2>
            <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200">
              <button
                type="button"
                onClick={handlePrevWeek}
                className="p-1 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                title="이전 주"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-indigo-800 px-2.5 py-0.5">
                {formatKoreanShortDate(weekDays[0].dateStr)} ~ {formatKoreanShortDate(weekDays[6].dateStr)}
              </span>
              <button
                type="button"
                onClick={handleNextWeek}
                className="p-1 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                title="다음 주"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            요일별 가족 전체 일정과 시간을 한눈에 확인하고 관리할 수 있습니다.
          </p>
        </div>

        {/* Controls: Regular Classes Toggle & View Toggle */}
        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          {onToggleRegularClasses && (
            <button
              type="button"
              onClick={onToggleRegularClasses}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                showRegularClasses
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>정규수업 {showRegularClasses ? '포함' : '숨김'}</span>
              {showRegularClasses ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
          )}

          <div className="hidden lg:inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'timeline' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-600'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              요일별 카드 뷰
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-600'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              7열 주간 시간표
            </button>
          </div>
        </div>
      </div>

      {/* 7-Column Desktop Table View */}
      {viewMode === 'grid' && (
        <div className="hidden lg:grid grid-cols-7 gap-2.5">
          {weekDays.map((day) => {
            const isToday = day.dateStr === todayStr;
            const isSelected = day.dateStr === selectedDateStr;
            const daySchedules = getSchedulesForDay(day.dateStr);
            const dayName = DAY_NAMES_KO[day.dayOfWeek];

            return (
              <div
                key={day.dateStr}
                onClick={() => onSelectDate(day.dateStr)}
                className={`rounded-2xl p-2.5 border transition-all flex flex-col justify-between cursor-pointer min-h-[340px] ${
                  isToday
                    ? 'bg-amber-50/30 border-amber-300 ring-2 ring-amber-300 shadow-xs'
                    : isSelected
                    ? 'bg-indigo-50/30 border-indigo-400 shadow-2xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  {/* Day Header */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                    <div className="flex items-center gap-1">
                      <span
                        className={`text-xs font-extrabold ${
                          day.dayOfWeek === 0
                            ? 'text-rose-600'
                            : day.dayOfWeek === 6
                            ? 'text-blue-600'
                            : 'text-slate-800'
                        }`}
                      >
                        {formatKoreanShortDate(day.dateStr)}({dayName})
                      </span>
                      {isToday && (
                        <span className="text-[10px] font-black bg-amber-500 text-white px-1.5 py-0.2 rounded-full">
                          오늘
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenScheduleModal(undefined, day.dateStr);
                      }}
                      className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors"
                      title="이 날에 일정 추가"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Day Schedules */}
                  <div className="space-y-1.5">
                    {daySchedules.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-8">일정 없음</p>
                    ) : (
                      daySchedules.map((sch) => {
                        const style = getScheduleRoleStyle(sch);
                        const isSpecial = !isRegularClassSchedule(sch);
                        return (
                          <div
                            key={sch.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenScheduleModal(sch);
                            }}
                            className={`p-2 rounded-xl text-xs border transition-transform hover:scale-[1.01] ${style.cardBgClass} ${
                              isSpecial ? 'ring-1 ring-black/10' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${style.badgeClass}`}>
                                {style.avatar} {style.name}
                              </span>
                              <span className="text-[10px] font-mono font-bold text-slate-600">
                                {sch.startTime}~{sch.returnTime}
                              </span>
                            </div>
                            <div className="font-extrabold text-slate-900 truncate">
                              {sch.title}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Timeline / Day-by-Day Card View */}
      <div className={`space-y-3 ${viewMode === 'grid' ? 'lg:hidden' : ''}`}>
        {weekDays.map((day) => {
          const isToday = day.dateStr === todayStr;
          const isSelected = day.dateStr === selectedDateStr;
          const daySchedules = getSchedulesForDay(day.dateStr);
          const dayName = DAY_NAMES_KO[day.dayOfWeek];

          return (
            <div
              key={day.dateStr}
              className={`rounded-2xl p-3.5 sm:p-4 border transition-all ${
                isToday
                  ? 'bg-amber-50/30 border-amber-300 ring-2 ring-amber-300/70 shadow-xs'
                  : isSelected
                  ? 'bg-indigo-50/25 border-indigo-300 shadow-2xs'
                  : 'bg-white border-slate-200/90'
              }`}
            >
              {/* Day Bar */}
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
                <div
                  onClick={() => onSelectDate(day.dateStr)}
                  className="flex items-center gap-2 cursor-pointer group"
                >
                  <span
                    className={`text-sm sm:text-base font-black ${
                      isToday
                        ? 'text-amber-900'
                        : day.dayOfWeek === 0
                        ? 'text-rose-600'
                        : day.dayOfWeek === 6
                        ? 'text-blue-600'
                        : 'text-slate-900 group-hover:text-indigo-600'
                    }`}
                  >
                    {formatKoreanShortDate(day.dateStr)} ({dayName})
                  </span>

                  {isToday && (
                    <span className="text-xs font-extrabold bg-amber-500 text-white px-2.5 py-0.5 rounded-full shadow-2xs">
                      오늘
                    </span>
                  )}

                  <span className="text-xs text-slate-400 font-semibold">
                    {daySchedules.length}건
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenScheduleModal(undefined, day.dateStr)}
                  className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-xl transition-all active:scale-95 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>일정 추가</span>
                </button>
              </div>

              {/* Day Schedules Cards */}
              {daySchedules.length === 0 ? (
                <p className="text-xs text-slate-400 py-1.5 pl-1">등록된 일정이 없습니다.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                  {daySchedules.map((sch) => {
                    const style = getScheduleRoleStyle(sch);
                    const isSpecial = !isRegularClassSchedule(sch);
                    const cleanMemo = getCleanMemo(sch.memo);

                    return (
                      <div
                        key={sch.id}
                        onClick={() => onOpenScheduleModal(sch)}
                        className={`p-3 rounded-xl border transition-all hover:shadow-xs relative group cursor-pointer ${style.cardBgClass} ${
                          isSpecial ? 'ring-1 ring-black/5' : ''
                        }`}
                      >
                        {/* Top row: Role badge, Time, and Edit/Delete Actions */}
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`inline-flex items-center gap-1 text-xs font-extrabold px-2 py-0.5 rounded-md ${style.badgeClass}`}>
                              <span>{style.avatar}</span>
                              <span>{style.name}</span>
                            </span>
                            {isSpecial && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                주요 일정
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-slate-700 bg-white/85 px-2 py-0.5 rounded-md border border-slate-200/70">
                              <Clock className="w-3 h-3 text-indigo-500" />
                              {sch.startTime} ~ {sch.returnTime}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenScheduleModal(sch);
                              }}
                              className="p-1 rounded-lg hover:bg-white/90 text-slate-500 hover:text-indigo-600 transition-colors"
                              title="수정"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteSchedule(sch.id);
                              }}
                              className="p-1 rounded-lg hover:bg-white/90 text-slate-400 hover:text-rose-600 transition-colors"
                              title="삭제"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Title */}
                        <h4 className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug">
                          {sch.title}
                        </h4>

                        {cleanMemo && (
                          <p className="mt-1.5 text-xs text-slate-600 bg-white/75 px-2 py-1 rounded-md">
                            📍 {cleanMemo}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
