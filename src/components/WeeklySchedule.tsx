import React, { useState } from 'react';
import { Schedule, MemberId } from '../types/calendar';
import { FAMILY_MEMBERS } from '../utils/sampleData';
import { getWeekDays, formatKoreanShortDate, getTodayString, parseDate, toDateString } from '../utils/dateUtils';
import { Clock, Utensils, Bus, Footprints, Car, Plus, Trash2, Edit2, AlertCircle, Sparkles, LayoutGrid, CalendarRange } from 'lucide-react';

interface WeeklyScheduleProps {
  selectedDateStr: string;
  onSelectDate: (dateStr: string) => void;
  schedules: Schedule[];
  onOpenScheduleModal: (schedule?: Schedule, defaultDate?: string) => void;
  onDeleteSchedule: (id: string) => void;
  memberFilter: 'all' | MemberId;
}

export const WeeklySchedule: React.FC<WeeklyScheduleProps> = ({
  selectedDateStr,
  onSelectDate,
  schedules,
  onOpenScheduleModal,
  onDeleteSchedule,
  memberFilter,
}) => {
  const [viewMode, setViewMode] = useState<'timeline' | 'grid'>('timeline');
  const todayStr = getTodayString();
  const weekDays = getWeekDays(selectedDateStr);

  // "상세스케줄에서 지난 일정은 안보이게 해줘":
  // 지나간 날짜(day.dateStr < todayStr)는 목록에서 제외하고 오늘 및 남은 일정만 표시
  const upcomingDays = weekDays.filter((d) => d.dateStr >= todayStr);
  const targetDays = upcomingDays.length > 0 ? upcomingDays : weekDays;

  // 필터 적용
  const filteredSchedules = schedules.filter((s) => {
    if (memberFilter !== 'all' && s.memberId !== memberFilter) return false;
    return true;
  });

  const getSchedulesForDay = (dateStr: string) => {
    return filteredSchedules
      .filter((s) => s.date === dateStr)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const renderTransitIcon = (method: string) => {
    if (method.includes('셔틀') || method.includes('버스')) return <Bus className="w-3.5 h-3.5" />;
    if (method.includes('도보')) return <Footprints className="w-3.5 h-3.5" />;
    if (method.includes('픽업') || method.includes('차')) return <Car className="w-3.5 h-3.5" />;
    return <Clock className="w-3.5 h-3.5" />;
  };

  const renderDinnerBadge = (status: Schedule['dinnerStatus']) => {
    switch (status) {
      case 'required':
        return (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
            <Utensils className="w-3 h-3 text-amber-700" />
            🍚 저녁 필요
          </span>
        );
      case 'completed':
        return (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
            식사 완료
          </span>
        );
      case 'snack_only':
        return (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
            간식만
          </span>
        );
      case 'not_required':
      default:
        return null;
    }
  };

  // 은비/하율 및 구성원별 귀가 및 이동 상태 안내 계산
  // 규칙:
  // 1. 은비(동남보건대): 수업을 모두 듣고 마지막에만 귀가하므로, 해당 일의 마지막 수업에만 '귀가' 표기하고 앞선 수업은 '수업 종료 (교내 체류)' 표기
  // 2. 하율: 수학-태권도 연속 수강 시 수학은 '태권도 이동' 표기, 태권도 종료 시에만 '귀가' 표기
  const getScheduleStatus = (sch: Schedule, daySchedules: Schedule[]) => {
    // 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat
    const dayOfWeek = parseDate(sch.date).getDay();

    if (sch.memberId === 'first_child') {
      const eunbiClasses = daySchedules.filter((s) => s.memberId === 'first_child');
      if (eunbiClasses.length > 1) {
        const latestClass = [...eunbiClasses].sort((a, b) => b.returnTime.localeCompare(a.returnTime))[0];
        if (sch.id !== latestClass.id) {
          return {
            isReturnHome: false,
            label: '수업 종료 (교내 체류)',
            timeDisplay: `${sch.returnTime} 수업 종료`,
            gridTimeDisplay: `${sch.returnTime} 종료`,
            pillText: '🏫 캠퍼스 체류 (다음 강의)',
            pillClass: 'bg-slate-100 text-slate-700 border border-slate-200',
            dinnerStatus: 'not_required' as const,
          };
        }
      }
      return {
        isReturnHome: true,
        label: '목감 귀가 예정',
        timeDisplay: `${sch.returnTime} 귀가`,
        gridTimeDisplay: `${sch.returnTime} 귀가`,
        pillText: '🎓 동남보건대 ➔ 목감 귀가',
        pillClass: 'bg-blue-100 text-blue-800 border border-blue-200',
        dinnerStatus: 'required' as const,
      };
    }

    if (sch.memberId === 'second_child') {
      // 하율: 월·수는 영어에만, 화·목·금은 태권도에만 저녁 필요
      let isHayulDinnerCard = false;
      const title = sch.title.toLowerCase();
      if (dayOfWeek === 1 || dayOfWeek === 3) {
        isHayulDinnerCard = title.includes('영어');
      } else if (dayOfWeek === 2 || dayOfWeek === 4 || dayOfWeek === 5) {
        isHayulDinnerCard = title.includes('태권도');
      }

      const dinnerStatus = isHayulDinnerCard ? ('required' as const) : ('not_required' as const);

      if (sch.memo?.includes('귀가하지 않고') || sch.memo?.includes('바로 이동')) {
        return {
          isReturnHome: false,
          label: '다음 학원 이동',
          timeDisplay: `${sch.returnTime} 태권도 이동`,
          gridTimeDisplay: `${sch.returnTime} 이동`,
          pillText: '🥋 태권도로 바로 이동',
          pillClass: 'bg-purple-100 text-purple-800 border border-purple-200',
          dinnerStatus,
        };
      }
      if (sch.memo?.includes('연속 수강')) {
        return {
          isReturnHome: true,
          label: '최종 귀가 예정',
          timeDisplay: `${sch.returnTime} 귀가`,
          gridTimeDisplay: `${sch.returnTime} 귀가`,
          pillText: '🏠 태권도 후 최종 귀가',
          pillClass: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
          dinnerStatus,
        };
      }
      if (sch.title.includes('학교')) {
        return {
          isReturnHome: true,
          label: '하교 및 귀가',
          timeDisplay: `${sch.returnTime} 하교 귀가`,
          gridTimeDisplay: `${sch.returnTime} 하교`,
          pillText: '🏫 목감 학교 (도보 통학)',
          pillClass: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
          dinnerStatus,
        };
      }
      return {
        isReturnHome: true,
        label: '귀가 예정 시각',
        timeDisplay: `${sch.returnTime} 귀가`,
        gridTimeDisplay: `${sch.returnTime} 귀가`,
        pillText: '🏫 목감 학원 (도보 5분)',
        pillClass: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
        dinnerStatus,
      };
    }

    return {
      isReturnHome: true,
      label: '귀가 예정 시각',
      timeDisplay: `${sch.returnTime} 귀가`,
      gridTimeDisplay: `${sch.returnTime} 귀가`,
      pillText: null,
      pillClass: null,
      dinnerStatus: sch.dinnerStatus,
    };
  };

  return (
    <section className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-6 mb-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-black text-slate-900">
              📅 이번 주 상세 스케줄 (월~일)
            </h2>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
              {formatKoreanShortDate(targetDays[0].dateStr)} ~ {formatKoreanShortDate(targetDays[targetDays.length - 1].dateStr)}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            자녀별 출발/귀가 시간, 이동 방법, 저녁 식사 여부를 상세하게 확인하세요.
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="hidden lg:inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setViewMode('timeline')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors ${
                viewMode === 'timeline' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-600'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              세로 카드 뷰
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-600'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              7열 주간표
            </button>
          </div>
        </div>
      </div>

      {/* 7-Column Desktop Table View */}
      {viewMode === 'grid' && (
        <div className="hidden lg:grid gap-3" style={{ gridTemplateColumns: `repeat(${targetDays.length}, minmax(0, 1fr))` }}>
          {targetDays.map((day) => {
            const isToday = day.dateStr === todayStr;
            const isSelected = day.dateStr === selectedDateStr;
            const isPast = day.dateStr < todayStr;
            const daySchedules = getSchedulesForDay(day.dateStr);

            return (
              <div
                key={day.dateStr}
                onClick={() => onSelectDate(day.dateStr)}
                className={`rounded-2xl p-3 border transition-all flex flex-col justify-between cursor-pointer min-h-[360px] ${
                  isToday
                    ? 'bg-amber-50/40 border-amber-300 ring-2 ring-amber-300 shadow-sm'
                    : isSelected
                    ? 'bg-indigo-50/40 border-indigo-400 shadow-xs'
                    : isPast
                    ? 'bg-slate-50/60 border-slate-200 opacity-70'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                }`}
              >
                <div>
                  {/* Day Header */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                    <div>
                      <span className="text-xs font-bold text-slate-500">
                        {formatKoreanShortDate(day.dateStr)}
                      </span>
                      {isToday && (
                        <span className="ml-1 text-[10px] font-black bg-amber-500 text-white px-1.5 py-0.2 rounded-full">
                          오늘
                        </span>
                      )}
                    </div>
                    <button
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
                  <div className="space-y-2">
                    {daySchedules.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-8">일정 없음</p>
                    ) : (
                      daySchedules.map((sch) => {
                        const member = FAMILY_MEMBERS[sch.memberId];
                        const status = getScheduleStatus(sch, daySchedules);
                        return (
                          <div
                            key={sch.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenScheduleModal(sch);
                            }}
                            className={`p-2 rounded-xl text-xs border transition-transform hover:scale-[1.02] ${member.color.bgLight} ${member.color.border}`}
                          >
                            <div className="flex items-center justify-between font-bold">
                              <span className="flex items-center gap-1">
                                <span>{member.avatar}</span>
                                <span className="truncate">{sch.title}</span>
                              </span>
                            </div>

                            {status.pillText && (
                              <div className="mt-1">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${status.pillClass}`}>
                                  {status.pillText}
                                </span>
                              </div>
                            )}

                            <div className="mt-1 flex items-baseline justify-between">
                              <span className="text-slate-500 text-[10px] font-medium">
                                {sch.startTime} ~
                              </span>
                              <span className={`text-xs ${status.isReturnHome ? 'font-black text-slate-900' : 'font-semibold text-slate-600'}`}>
                                {status.gridTimeDisplay}
                              </span>
                            </div>

                            <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-600">
                              <span className="flex items-center gap-0.5">
                                {renderTransitIcon(sch.transitMethod)}
                                {sch.transitMethod}
                              </span>
                              <span>{sch.guardian}</span>
                            </div>

                            <div className="mt-1.5">
                              {renderDinnerBadge(status.dinnerStatus)}
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

      {/* Timeline / Mobile Card View (Default and for Mobile/Tablet) */}
      {(viewMode === 'timeline' || true) && (
        <div className={`space-y-3 ${viewMode === 'grid' ? 'lg:hidden' : ''}`}>
          {targetDays.map((day) => {
            const isToday = day.dateStr === todayStr;
            const isSelected = day.dateStr === selectedDateStr;
            const isPast = day.dateStr < todayStr;
            const daySchedules = getSchedulesForDay(day.dateStr);

            return (
              <div
                key={day.dateStr}
                className={`rounded-2xl p-3 sm:p-4 border transition-all ${
                  isToday
                    ? 'bg-amber-50/40 border-amber-300 ring-2 ring-amber-300/80 shadow-sm'
                    : isSelected
                    ? 'bg-indigo-50/30 border-indigo-400 shadow-2xs'
                    : isPast
                    ? 'bg-slate-50/60 border-slate-200/80 opacity-75'
                    : 'bg-white border-slate-200/90 shadow-2xs'
                }`}
              >
                {/* Day Bar */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                  <div
                    onClick={() => onSelectDate(day.dateStr)}
                    className="flex items-center gap-2 cursor-pointer group"
                  >
                    <span
                      className={`text-sm sm:text-base font-black ${
                        isToday ? 'text-amber-900' : 'text-slate-900 group-hover:text-indigo-600'
                      }`}
                    >
                      {formatKoreanShortDate(day.dateStr)}
                    </span>

                    {isToday && (
                      <span className="text-xs font-extrabold bg-amber-500 text-white px-2.5 py-0.5 rounded-full shadow-xs animate-pulse-subtle">
                        오늘 저녁
                      </span>
                    )}

                    {isSelected && !isToday && (
                      <span className="text-xs font-semibold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                        선택된 날짜
                      </span>
                    )}

                    {isPast && (
                      <span className="text-[11px] font-medium text-slate-400">
                        (지나간 일정)
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => onOpenScheduleModal(undefined, day.dateStr)}
                    className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-xl transition-all active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>일정 추가</span>
                  </button>
                </div>

                {/* Day Schedules Cards */}
                {daySchedules.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2 pl-1">
                    등록된 일정이 없습니다.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {daySchedules.map((sch) => {
                      const member = FAMILY_MEMBERS[sch.memberId];
                      const status = getScheduleStatus(sch, daySchedules);
                      return (
                        <div
                          key={sch.id}
                          className={`p-3.5 rounded-xl border transition-all hover:shadow-xs relative group ${member.color.bgLight} ${member.color.border}`}
                        >
                          {/* Top row: Member badge & Actions */}
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-base">{member.avatar}</span>
                              <span className={`text-xs font-extrabold px-2 py-0.5 rounded-md ${member.color.bgBadge}`}>
                                {member.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                              <button
                                onClick={() => onOpenScheduleModal(sch)}
                                className="p-1 rounded-lg hover:bg-white/80 text-slate-600 hover:text-slate-900 transition-colors"
                                title="수정"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onDeleteSchedule(sch.id)}
                                className="p-1 rounded-lg hover:bg-white/80 text-rose-500 hover:text-rose-700 transition-colors"
                                title="삭제"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Title & Route Pill */}
                          <div className="flex items-baseline justify-between gap-2">
                            <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">
                              {sch.title}
                            </h4>
                            {status.pillText && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${status.pillClass}`}>
                                {status.pillText}
                              </span>
                            )}
                          </div>

                          {/* Time Details */}
                          <div className="mt-2 p-2 bg-white/80 rounded-lg flex items-center justify-between border border-slate-100">
                            <div>
                              <span className="text-[10px] text-slate-400 block font-semibold">시작 시간</span>
                              <span className="text-xs font-bold text-slate-700">{sch.startTime}</span>
                            </div>
                            <div className="text-right">
                              <span className={`text-[10px] block font-bold ${status.isReturnHome ? 'text-indigo-600' : 'text-slate-500'}`}>
                                {status.label}
                              </span>
                              <span className={`text-sm sm:text-base font-black ${status.isReturnHome ? 'text-slate-900' : 'text-slate-700'}`}>
                                {status.timeDisplay}
                              </span>
                            </div>
                          </div>

                          {/* Transit & Guardian */}
                          <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                            <span className="flex items-center gap-1 font-semibold">
                              {renderTransitIcon(sch.transitMethod)}
                              {sch.transitMethod}
                            </span>
                            <span className="text-slate-500 font-medium">
                              보호자: <strong className="text-slate-800">{sch.guardian}</strong>
                            </span>
                          </div>

                          {/* Dinner Status & Memo */}
                          <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                            <div>{renderDinnerBadge(status.dinnerStatus)}</div>
                            {sch.isRecurring && (
                              <span className="text-[10px] text-slate-500 bg-white/60 px-1.5 py-0.5 rounded">
                                매주 반복
                              </span>
                            )}
                          </div>

                          {sch.memo && (
                            <p className="mt-1.5 text-xs text-slate-600 bg-white/70 p-1.5 rounded-md">
                              📝 {sch.memo}
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
      )}
    </section>
  );
};
