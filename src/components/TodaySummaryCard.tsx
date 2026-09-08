import React, { useState } from 'react';
import { Schedule, FamilyMember, MemberId } from '../types/calendar';
import { FAMILY_MEMBERS } from '../utils/sampleData';
import {
  getMinutesUntil,
  getTodayString,
  getWeekDays,
  formatKoreanShortDate,
  DAY_NAMES_KO,
  parseDate,
} from '../utils/dateUtils';
import {
  Clock,
  Utensils,
  Bus,
  CheckCircle2,
  Sparkles,
  Footprints,
  Car,
  CalendarRange,
} from 'lucide-react';

interface TodaySummaryCardProps {
  schedules: Schedule[];
  selectedDateStr: string;
  onSelectDate?: (dateStr: string) => void;
  onOpenScheduleModal: (schedule?: Schedule) => void;
}

export const TodaySummaryCard: React.FC<TodaySummaryCardProps> = ({
  schedules,
  selectedDateStr,
  onSelectDate,
  onOpenScheduleModal,
}) => {
  const todayStr = getTodayString();
  const now = new Date();

  // 새로고침 기준 오늘이 속한 주의 월~일 (7일)
  const currentWeek = getWeekDays(todayStr);

  // "새로고침하는 해당일이 잇는 주 남은 평일 것만 해줘":
  // 오늘을 포함한 이번 주의 남은 평일 (월~금 중 dateStr >= todayStr)
  const remainingWeekdays = currentWeek.filter(
    (d) => d.dayOfWeek >= 1 && d.dayOfWeek <= 5 && d.dateStr >= todayStr
  );

  // 주말(토/일)일 경우 이번 주 전체 평일(월~금)을 보여주어 대비
  const displayWeekdays =
    remainingWeekdays.length > 0
      ? remainingWeekdays
      : currentWeek.filter((d) => d.dayOfWeek >= 1 && d.dayOfWeek <= 5);

  // 현재 브리핑으로 선택된 날짜 (새로고침 시 기본값: 오늘 날짜)
  const [activeDateStr, setActiveDateStr] = useState<string>(
    displayWeekdays.some((d) => d.dateStr === todayStr) ? todayStr : displayWeekdays[0].dateStr
  );

  // 각 평일별 은비 & 하율 간략 프리뷰 계산
  const getDayPreview = (dateStr: string) => {
    const daySchedules = schedules.filter((s: Schedule) => s.date === dateStr);
    const eunbiSchedules = daySchedules.filter((s: Schedule) => s.memberId === 'first_child');
    const hayulSchedules = daySchedules.filter((s: Schedule) => s.memberId === 'second_child');

    let eunbiText = '휴식';
    if (eunbiSchedules.length > 0) {
      const latest = [...eunbiSchedules].sort((a, b) => b.returnTime.localeCompare(a.returnTime))[0];
      eunbiText = `${latest.returnTime} 귀가`;
    }

    let hayulText = '휴식';
    if (hayulSchedules.length > 0) {
      const latest = [...hayulSchedules].sort((a, b) => b.returnTime.localeCompare(a.returnTime))[0];
      hayulText = `${latest.returnTime} 귀가`;
    }

    return { eunbiText, hayulText, totalCount: daySchedules.length };
  };

  // 현재 선택된 평일의 일정
  const activeSchedules = schedules.filter((s: Schedule) => s.date === activeDateStr);
  const firstChildSchedules = activeSchedules.filter((s: Schedule) => s.memberId === 'first_child');
  const secondChildSchedules = activeSchedules.filter((s: Schedule) => s.memberId === 'second_child');

  const isActiveToday = activeDateStr === todayStr;
  const activeDateObj = parseDate(activeDateStr);
  const activeDayName = DAY_NAMES_KO[activeDateObj.getDay()];

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
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <Utensils className="w-3.5 h-3.5 text-amber-700" />
            🍚 집밥 저녁 필요
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            식사 완료
          </span>
        );
      case 'snack_only':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200">
            🥪 간단 간식
          </span>
        );
      case 'not_required':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
            저녁 불필요(외부)
          </span>
        );
    }
  };

  const renderChildSummary = (memberId: 'first_child' | 'second_child') => {
    const member = FAMILY_MEMBERS[memberId];
    const childSchedules = memberId === 'first_child' ? firstChildSchedules : secondChildSchedules;
    const isEunbi = memberId === 'first_child';
    const isHayul = memberId === 'second_child';

    // 대표 일정 선정
    // 1. 은비: 수원 동남보건대에서 모든 수업을 듣고 마지막에 귀가하므로 가장 늦은 귀가 일정을 대표로 브리핑
    // 2. 하율: 수학학원과 태권도가 연속으로 있는 날은 태권도까지 끝나고 귀가하므로 가장 늦은 귀가 일정을 대표로 브리핑
    const activeSchedule =
      (isEunbi || isHayul) && childSchedules.length > 1
        ? [...childSchedules].sort((a, b) => b.returnTime.localeCompare(a.returnTime))[0]
        : childSchedules[0];

    const hasMath = isHayul && childSchedules.some((s: Schedule) => s.title.includes('수학'));
    const hasTaekwondo = isHayul && childSchedules.some((s: Schedule) => s.title.includes('태권도'));
    const isConsecutiveMathTaekwondo = hasMath && hasTaekwondo;

    if (!activeSchedule) {
      return (
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between min-h-[200px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-3xl">{member.avatar}</span>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-extrabold text-slate-800">{member.name}</span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${member.color.bgBadge}`}>
                    {member.relation}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {activeDayName}요일 등록된 학교·학원 일정 없음
                </p>
              </div>
            </div>
            <span className="text-xs text-slate-500 bg-slate-100 font-semibold px-2.5 py-1 rounded-lg">
              휴식 / 집에서 자율 시간
            </span>
          </div>

          <div className="my-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500">
            {isEunbi ? (
              <p>🎓 수원 동남보건대 수업이 없는 날입니다. 목감 집에서 휴식 및 복습을 진행합니다.</p>
            ) : (
              <p>🏫 등록된 학원 일정이 없는 날입니다. 목감 집에서 자유 시간 및 숙제를 진행합니다.</p>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>목감 집에서 편안한 저녁</span>
            <span className="text-emerald-600 font-semibold">일정 없음</span>
          </div>
        </div>
      );
    }

    const minutesLeft = isActiveToday ? getMinutesUntil(activeSchedule.returnTime, todayStr, now) : 999;
    const isImminent = isActiveToday && minutesLeft > 0 && minutesLeft <= 30;
    const isPast = isActiveToday && minutesLeft <= 0;

    return (
      <div
        key={activeSchedule.id}
        onClick={() => onOpenScheduleModal(activeSchedule)}
        className={`relative p-4 sm:p-5 rounded-2xl transition-all cursor-pointer hover:shadow-md border-2 ${
          isImminent
            ? 'bg-amber-50/70 border-amber-400 ring-2 ring-amber-300 ring-offset-2'
            : activeSchedule.isReturnTimeChanged
            ? 'bg-rose-50/50 border-rose-300'
            : 'bg-white border-slate-200/90 shadow-xs hover:border-indigo-200'
        }`}
      >
        {/* Child Header */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl drop-shadow-xs">{member.avatar}</span>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="font-extrabold text-slate-900 text-base sm:text-lg">{member.name}</h4>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${member.color.bgBadge}`}>
                  {member.relation}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium line-clamp-1">{activeSchedule.title}</p>
            </div>
          </div>

          {/* Imminent / Status Badge */}
          {isActiveToday && isImminent && (
            <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-500 text-white shadow-xs animate-bounce">
              ⚡ 30분 내 귀가 예정!
            </span>
          )}
          {isActiveToday && isPast && (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-200 text-slate-700">
              ✓ 귀가 완료 시간 경과
            </span>
          )}
          {!isActiveToday && (
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              {activeDayName}요일 예정
            </span>
          )}
        </div>

        {/* Location & Real Routine Badges */}
        {isEunbi && (
          <div className="mb-2.5 flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 border border-blue-200">
              🎓 수원 동남보건대 (모든 수업 종료 후 목감 귀가)
            </span>
            <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
              대중교통 약 50분 소요
            </span>
          </div>
        )}

        {isHayul && (
          <div className="mb-2.5 flex items-center gap-1.5 flex-wrap">
            {isConsecutiveMathTaekwondo ? (
              <>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-200">
                  🥋 수학 ➔ 태권도 연속 수강 (태권도까지 끝나고 귀가)
                </span>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                  수학 후 태권도 직행 ➔ {activeSchedule.returnTime} 최종 귀가
                </span>
              </>
            ) : (
              <>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-200">
                  🏫 목감 집 앞 학원 (도보 5분 거리)
                </span>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                  수업 종료 5분 후 귀가
                </span>
              </>
            )}
          </div>
        )}

        {/* Big Return Time Focus Area (5-second rule) */}
        <div className="my-2.5 p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold block">
              {(isEunbi && childSchedules.length > 1) || isConsecutiveMathTaekwondo
                ? '목감 집 최종 귀가 예정 시각'
                : '귀가 예정 시각'}
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {activeSchedule.returnTime}
              </span>
              <span className="text-xs font-bold text-slate-500">귀가</span>
              {activeSchedule.isReturnTimeChanged && (
                <span className="ml-1 text-[11px] font-bold text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-200">
                  시간 변경됨
                </span>
              )}
            </div>
          </div>

          <div className="text-right space-y-1">
            <div className="flex items-center gap-1 justify-end text-xs font-bold text-slate-700">
              {renderTransitIcon(activeSchedule.transitMethod)}
              <span>
                {isEunbi ? '대중교통 (통학)' : isHayul ? '도보 (도보 5분)' : activeSchedule.transitMethod}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              보호자: <span className="font-semibold text-slate-800">{activeSchedule.guardian}</span>
            </div>
          </div>
        </div>

        {/* Eunbi's Multi-Lecture Timeline */}
        {isEunbi && childSchedules.length > 1 && (
          <div className="mb-2.5 p-2.5 bg-blue-50/70 rounded-xl border border-blue-200/80 text-[11px] space-y-1.5">
            <div className="font-bold text-blue-900 flex items-center justify-between">
              <span>📚 {activeDayName}요일 동남보건대 수강 과목 ({childSchedules.length}과목)</span>
              <span className="text-[10px] text-blue-600 font-semibold">마지막 수업 후 목감 귀가</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {childSchedules.map((sch: Schedule) => {
                const isFinal = sch.id === activeSchedule.id;
                return (
                  <span
                    key={sch.id}
                    className={`px-2 py-0.5 rounded-md font-medium text-[10px] ${
                      isFinal
                        ? 'bg-blue-600 text-white font-bold shadow-2xs'
                        : 'bg-white text-slate-700 border border-blue-200'
                    }`}
                  >
                    {sch.startTime} {sch.title.replace('[은비] ', '')}
                    {isFinal ? ' ➔ 마지막 수업 (귀가)' : ' (수업 종료)'}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Hayul's Consecutive Activities Timeline */}
        {isHayul && childSchedules.length > 1 && (
          <div className="mb-2.5 p-2.5 bg-emerald-50/70 rounded-xl border border-emerald-200/80 text-[11px] space-y-1.5">
            <div className="font-bold text-emerald-900 flex items-center justify-between">
              <span>🏃 {activeDayName}요일 하율이 학원 동선 ({childSchedules.length}개)</span>
              <span className="text-[10px] text-emerald-700 font-semibold">
                {isConsecutiveMathTaekwondo ? '태권도까지 끝나고 귀가' : '도보 5분 거리'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {childSchedules.map((sch: Schedule, idx: number) => {
                const isFinal = sch.id === activeSchedule.id;
                return (
                  <React.Fragment key={sch.id}>
                    {idx > 0 && <span className="text-emerald-500 font-bold">➔</span>}
                    <span
                      className={`px-2 py-0.5 rounded-md font-medium text-[10px] ${
                        isFinal
                          ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                          : 'bg-white text-slate-700 border border-emerald-200'
                      }`}
                    >
                      {sch.startTime} {sch.title.replace('[하율] ', '')}
                      {isFinal ? ' ➔ 최종 귀가' : ' (바로 이동)'}
                    </span>
                  </React.Fragment>
                );
              })}
            </div>
            {isConsecutiveMathTaekwondo && (
              <p className="text-[10px] text-emerald-800 font-medium pt-0.5">
                💡 수학학원 종료(19:00) 후 집에 들르지 않고 바로 태권도로 이동하여, 태권도가 끝난 후(20:00) 도보 5분 내 귀가합니다.
              </p>
            )}
          </div>
        )}

        {/* Dinner Status */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div>{renderDinnerBadge(activeSchedule.dinnerStatus)}</div>
          <span className="text-xs text-slate-500 font-medium">
            {isEunbi ? '수업 종료 후 대중교통 목감 귀가' : '도보 5분 거리 학원'}
          </span>
        </div>

        {/* Memo note if exists */}
        {activeSchedule.memo && (
          <p className="mt-2 text-xs text-slate-500 bg-slate-100/80 px-2.5 py-1.5 rounded-lg line-clamp-1">
            💬 {activeSchedule.memo}
          </p>
        )}
      </div>
    );
  };

  return (
    <section className="mb-6">
      <div className="bg-linear-to-br from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-4 sm:p-6 text-white shadow-xl relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 -mb-16 w-48 h-48 rounded-full bg-amber-500/10 blur-xl pointer-events-none"></div>

        {/* 1. Top Title & Badges */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-indigo-700/50 relative z-10">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-amber-400/20 text-amber-300 border border-amber-400/30">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  이번 주 남은 평일 귀가시간 집중 안내
                </h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-slate-950">
                  {isActiveToday ? '오늘 브리핑' : `${activeDayName}요일 브리핑`}
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/40">
                  🏡 시흥시 목감동
                </span>
              </div>
              <p className="text-xs text-indigo-200 mt-0.5">
                새로고침 기준 이번 주 남은 평일(${displayWeekdays.map((d) => DAY_NAMES_KO[d.dayOfWeek]).join('·')})의 자녀별 귀가 시간과 이동 동선만 집중 안내합니다.
              </p>
            </div>
          </div>
        </div>

        {/* 2. 이번 주 남은 평일 탭 바 */}
        <div className="mb-4 relative z-10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold text-indigo-200 flex items-center gap-1.5">
              <CalendarRange className="w-4 h-4 text-amber-400" />
              이번 주 남은 평일 ({displayWeekdays.length}일)
            </span>
            <span className="text-[11px] text-indigo-300 font-medium">
              탭을 누르면 해당 평일의 귀가 동선으로 즉시 전환됩니다
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {displayWeekdays.map((d) => {
              const isSelected = d.dateStr === activeDateStr;
              const isToday = d.dateStr === todayStr;
              const preview = getDayPreview(d.dateStr);
              const dayLabel = DAY_NAMES_KO[d.dayOfWeek];

              return (
                <button
                  key={d.dateStr}
                  type="button"
                  onClick={() => {
                    setActiveDateStr(d.dateStr);
                    if (onSelectDate) onSelectDate(d.dateStr);
                  }}
                  className={`p-2.5 rounded-2xl text-left transition-all relative border flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-white text-slate-900 border-amber-400 ring-2 ring-amber-400 shadow-lg font-bold scale-[1.02]'
                      : 'bg-indigo-950/60 hover:bg-indigo-900/80 text-white border-indigo-700/60 hover:border-indigo-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black flex items-center gap-1">
                      <span>{dayLabel}요일</span>
                      <span
                        className={`text-[10px] ${
                          isSelected ? 'text-slate-500 font-normal' : 'text-indigo-300 font-normal'
                        }`}
                      >
                        ({formatKoreanShortDate(d.dateStr)})
                      </span>
                    </span>
                    {isToday ? (
                      <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950">
                        오늘
                      </span>
                    ) : isSelected ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-800">
                        선택됨
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-2 space-y-0.5 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className={isSelected ? 'text-blue-700 font-bold' : 'text-blue-300 font-medium'}>
                        👧 은비
                      </span>
                      <span className={isSelected ? 'text-blue-950 font-extrabold' : 'text-blue-200'}>
                        {preview.eunbiText}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={isSelected ? 'text-emerald-700 font-bold' : 'text-emerald-300 font-medium'}>
                        🧒 하율
                      </span>
                      <span className={isSelected ? 'text-emerald-950 font-extrabold' : 'text-emerald-200'}>
                        {preview.hayulText}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. 선택된 평일의 2-Column 자녀별 귀가 상세 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
          {renderChildSummary('first_child')}
          {renderChildSummary('second_child')}
        </div>

        {/* 4. 하단 안내 바 */}
        <div className="mt-4 pt-3 border-t border-indigo-700/50 flex items-center justify-between text-xs text-indigo-200 relative z-10">
          <span>🏠 시흥시 목감동 은비·하율이네 귀가 알림</span>
          <span className="text-amber-300 font-semibold">카드를 누르면 일정을 수정하거나 확인할 수 있습니다</span>
        </div>
      </div>
    </section>
  );
};
