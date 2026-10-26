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

  // 새로고침 기준 선택된 날짜(또는 오늘)가 속한 주의 월~일 (7일)
  const isSelectedInCurrentWeek = getWeekDays(todayStr).some((d) => d.dateStr === selectedDateStr);
  const referenceWeekDate = isSelectedInCurrentWeek ? todayStr : selectedDateStr;
  const currentWeek = getWeekDays(referenceWeekDate);

  // 이번 주 전체 평일 (월~금)
  const allWeekdays = currentWeek.filter((d) => d.dayOfWeek >= 1 && d.dayOfWeek <= 5);

  // 오늘을 포함한 이번 주의 남은 평일 (월~금 중 dateStr >= todayStr)
  const remainingWeekdays = currentWeek.filter(
    (d) => d.dayOfWeek >= 1 && d.dayOfWeek <= 5 && d.dateStr >= todayStr
  );

  // 금요일(남은 평일 1개)이거나 주말일 경우, 목요일 등 다른 요일도 바로 클릭해 확인할 수 있도록 기본으로 월~금 전체 탭 표시 토글 제공
  const [showAllWeekdays, setShowAllWeekdays] = useState<boolean>(remainingWeekdays.length <= 1);

  const displayWeekdays =
    !isSelectedInCurrentWeek || showAllWeekdays || remainingWeekdays.length === 0
      ? allWeekdays
      : remainingWeekdays;

  // 현재 브리핑으로 선택된 날짜 (새로고침 시 기본값: 오늘 날짜)
  const [activeDateStr, setActiveDateStr] = useState<string>(
    allWeekdays.some((d) => d.dateStr === todayStr) ? todayStr : allWeekdays[0].dateStr
  );

  // 외부(주간/월간 캘린더)에서 평일 날짜를 클릭하면 브리핑 카드도 동기화
  React.useEffect(() => {
    const selDay = parseDate(selectedDateStr).getDay();
    if (selDay >= 1 && selDay <= 5) {
      setActiveDateStr(selectedDateStr);
      if (selectedDateStr < todayStr) {
        setShowAllWeekdays(true);
      }
    }
  }, [selectedDateStr, todayStr]);

  // 아빠/엄마 저녁 모임 판별 헬퍼
  const isParentMeeting = (s: Schedule) => {
    if (s.memberId === 'parents') {
      const t = s.title.toLowerCase();
      return (
        t.includes('모임') ||
        t.includes('회식') ||
        t.includes('약속') ||
        t.includes('식사') ||
        t.includes('외식') ||
        t.includes('동창') ||
        t.includes('동호회') ||
        t.includes('송년') ||
        t.includes('신년') ||
        s.dinnerStatus === 'not_required' ||
        s.startTime >= '17:00'
      );
    }
    const t = s.title.toLowerCase();
    return (
      (t.includes('아빠') || t.includes('엄마') || t.includes('마누라') || t.includes('남편')) &&
      (t.includes('모임') || t.includes('회식') || t.includes('약속') || t.includes('식사') || t.includes('외식') || t.includes('동창'))
    );
  };

  const getParentMeetingRole = (title: string, guardian?: string) => {
    const t = (title + ' ' + (guardian || '')).toLowerCase();
    if (
      t.includes('엄마') ||
      t.includes('아내') ||
      t.includes('마누라') ||
      t.includes('미선') ||
      t.includes('여전도') ||
      t.includes('8여')
    ) {
      return { name: '엄마', avatar: '👩', badgeClass: 'bg-rose-500/30 text-rose-200 border-rose-400/40' };
    }
    if (t.includes('아빠') || t.includes('남편') || t.includes('영집')) {
      return { name: '아빠', avatar: '👨', badgeClass: 'bg-indigo-500/30 text-indigo-200 border-indigo-400/40' };
    }
    return { name: '아빠 & 엄마', avatar: '💼', badgeClass: 'bg-purple-500/30 text-purple-200 border-purple-400/40' };
  };

  const isAcademicNoticeOnly = (s: Schedule) =>
    s.startTime === '09:00' &&
    (s.title.includes('중간고사') || s.title.includes('기말고사') || s.title.includes('방학'));

  // 각 평일별 은비 & 하율 및 부모 모임 간략 프리뷰 계산
  const getDayPreview = (dateStr: string) => {
    const daySchedules = schedules.filter((s: Schedule) => s.date === dateStr);
    const eunbiAll = daySchedules.filter((s: Schedule) => s.memberId === 'first_child');
    const eunbiLectures = eunbiAll.filter((s: Schedule) => !isAcademicNoticeOnly(s));
    const eunbiSchedules = eunbiLectures.length > 0 ? eunbiLectures : eunbiAll;

    const hayulAll = daySchedules.filter((s: Schedule) => s.memberId === 'second_child');
    const hayulAcademies = hayulAll.filter((s: Schedule) => !s.title.includes('학교'));
    const hayulSchedules = hayulAcademies.length > 0 ? hayulAcademies : hayulAll;

    const parentMeetings = daySchedules.filter(isParentMeeting);
    const dayOfWeek = parseDate(dateStr).getDay();

    let eunbiText = '휴식';
    if (eunbiSchedules.length > 0) {
      const latest = [...eunbiSchedules].sort((a, b) => b.returnTime.localeCompare(a.returnTime))[0];
      eunbiText = `${latest.returnTime} 귀가`;
    }

    let hayulText = '휴식';
    if (hayulSchedules.length > 0) {
      const hasEng = hayulSchedules.some((s: Schedule) => s.title.includes('영어'));
      const hasMath = hayulSchedules.some((s: Schedule) => s.title.includes('수학'));
      const tkdSch = hayulSchedules.find((s: Schedule) => s.title.includes('태권도'));
      const hasTkd = Boolean(tkdSch);

      if (hasMath && hasTkd && (dayOfWeek === 4 || (tkdSch && tkdSch.startTime >= '20:00'))) {
        hayulText = '19:05 저녁 / 21:05 귀가';
      } else if (hasEng && hasTkd && !hasMath) {
        hayulText = '18:05 저녁 / 20:05 귀가';
      } else {
        const latest = [...hayulSchedules].sort((a, b) => b.returnTime.localeCompare(a.returnTime))[0];
        hayulText = `${latest.returnTime} 귀가`;
      }
    }

    let parentText = '';
    if (parentMeetings.length > 0) {
      const p = parentMeetings[0];
      const role = getParentMeetingRole(p.title, p.guardian);
      parentText = `${role.avatar} ${role.name} 모임 (${p.returnTime})`;
    }

    return { eunbiText, hayulText, parentText, totalCount: daySchedules.length };
  };

  // 현재 선택된 평일의 일정
  const activeSchedules = schedules.filter((s: Schedule) => s.date === activeDateStr);
  const firstChildAll = activeSchedules.filter((s: Schedule) => s.memberId === 'first_child');
  const firstChildLectures = firstChildAll.filter((s: Schedule) => !isAcademicNoticeOnly(s));
  const firstChildSchedules = firstChildLectures.length > 0 ? firstChildLectures : firstChildAll;

  const secondChildAll = activeSchedules.filter((s: Schedule) => s.memberId === 'second_child');
  const secondChildAcademies = secondChildAll.filter((s: Schedule) => !s.title.includes('학교'));
  const secondChildSchedules = secondChildAcademies.length > 0 ? secondChildAcademies : secondChildAll;

  const activeParentMeetings = activeSchedules.filter(isParentMeeting);

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
    const childSchedules = (memberId === 'first_child' ? firstChildSchedules : secondChildSchedules)
      .slice()
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    const isEunbi = memberId === 'first_child';
    const isHayul = memberId === 'second_child';

    // 대표 일정 선정
    // 1. 은비: 수원 동남보건대에서 모든 수업을 듣고 마지막에 귀가하므로 가장 늦은 귀가 일정을 대표로 브리핑
    // 2. 하율: 마지막 학원 종료 시각 기준 대표 일정 선정
    const activeSchedule =
      (isEunbi || isHayul) && childSchedules.length > 1
        ? [...childSchedules].sort((a, b) => b.returnTime.localeCompare(a.returnTime))[0]
        : childSchedules[0];

    const hasMath = isHayul && childSchedules.some((s: Schedule) => s.title.includes('수학'));
    const hasEnglish = isHayul && childSchedules.some((s: Schedule) => s.title.includes('영어'));
    const taekwondoSch = isHayul ? childSchedules.find((s: Schedule) => s.title.includes('태권도')) : undefined;
    const hasTaekwondo = Boolean(taekwondoSch);

    // 목요일: 수학(17:00~19:00) ➔ 19:05 귀가 및 저녁 식사(7~8시) ➔ 태권도 8시부(20:00~21:00) ➔ 21:05 최종 귀가
    const isMathDinnerTaekwondo =
      hasMath &&
      hasTaekwondo &&
      (activeDateObj.getDay() === 4 || (taekwondoSch !== undefined && taekwondoSch.startTime >= '20:00'));

    // 월·수요일: 영어(17:00~18:00) ➔ 18:05 귀가 및 저녁 식사 ➔ 태권도(19:00~20:00) ➔ 20:05 최종 귀가
    const isEnglishAndTaekwondo = hasEnglish && hasTaekwondo && !hasMath;

    // 화·금요일: 수학 ➔ 태권도 연속 수강 후 20:05 귀가 및 저녁 식사
    const isConsecutiveMathTaekwondo = hasMath && hasTaekwondo && !isMathDinnerTaekwondo;

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
              <p className="text-xs text-slate-500 font-medium line-clamp-1">
                {isMathDinnerTaekwondo
                  ? '수학(17:00) ➔ 19:05 귀가(7~8시 저녁) ➔ 20:00 태권도(8시부) ➔ 21:05 최종 귀가'
                  : isEnglishAndTaekwondo
                  ? '영어(17:00) ➔ 18:05 귀가(저녁) ➔ 19:00 태권도 ➔ 20:05 최종 귀가'
                  : activeSchedule.title}
              </p>
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
              대중교통 약 1시간 30분 소요
            </span>
          </div>
        )}

        {isHayul && (
          <div className="mb-2.5 flex items-center gap-1.5 flex-wrap">
            {isMathDinnerTaekwondo ? (
              <>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                  🍚 수학 종료 후 집에서 저녁 식사 (19:05~20:00)
                </span>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                  태권도 8시부 종료 후 21:05 최종 귀가
                </span>
              </>
            ) : isEnglishAndTaekwondo ? (
              <>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                  🍚 영어 종료 후 집에서 저녁 식사 (18:05~19:00)
                </span>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                  태권도 종료 후 20:05 최종 귀가
                </span>
              </>
            ) : isConsecutiveMathTaekwondo ? (
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
              {isMathDinnerTaekwondo || isEnglishAndTaekwondo
                ? '목감 집 1차 귀가(저녁) 및 최종 귀가 예정 시각'
                : (isEunbi && childSchedules.length > 1) || isConsecutiveMathTaekwondo
                ? '목감 집 최종 귀가 예정 시각'
                : '귀가 예정 시각'}
            </span>
            {isMathDinnerTaekwondo ? (
              <div className="flex items-baseline gap-2 flex-wrap">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl sm:text-3xl font-black text-amber-900 tracking-tight">
                    19:05
                  </span>
                  <span className="text-xs font-black text-amber-700">1차(7~8시 저녁)</span>
                </div>
                <span className="text-slate-400 font-black">·</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    21:05
                  </span>
                  <span className="text-xs font-bold text-slate-500">최종(8시부)</span>
                </div>
              </div>
            ) : isEnglishAndTaekwondo ? (
              <div className="flex items-baseline gap-2 flex-wrap">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl sm:text-3xl font-black text-amber-900 tracking-tight">
                    18:05
                  </span>
                  <span className="text-xs font-black text-amber-700">1차(저녁)</span>
                </div>
                <span className="text-slate-400 font-black">·</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    20:05
                  </span>
                  <span className="text-xs font-bold text-slate-500">최종</span>
                </div>
              </div>
            ) : (
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
            )}
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
        {isEunbi && childSchedules.length >= 1 && (
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
                {isMathDinnerTaekwondo
                  ? '수학 후 7~8시 저녁 식사 ➔ 태권도 8시부'
                  : isEnglishAndTaekwondo
                  ? '영어 후 저녁 식사 ➔ 태권도'
                  : isConsecutiveMathTaekwondo
                  ? '태권도까지 끝나고 귀가'
                  : '도보 5분 거리'}
              </span>
            </div>
            {isMathDinnerTaekwondo ? (
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-white text-emerald-800 border border-emerald-200">
                    17:00~19:00 수학
                  </span>
                  <span className="text-amber-600 font-bold">➔</span>
                  <span className="px-2 py-0.5 rounded-md font-black text-[10px] bg-amber-500 text-white shadow-2xs">
                    19:05 귀가 및 저녁 식사 (7~8시) 🍚
                  </span>
                  <span className="text-amber-600 font-bold">➔</span>
                  <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-white text-emerald-800 border border-emerald-200">
                    20:00 태권도 (8시부)
                  </span>
                  <span className="text-emerald-600 font-bold">➔</span>
                  <span className="px-2 py-0.5 rounded-md font-black text-[10px] bg-emerald-600 text-white shadow-2xs">
                    21:05 최종 귀가 🏠
                  </span>
                </div>
                <p className="text-[10px] text-amber-900 font-medium bg-amber-50 p-2 rounded-lg border border-amber-200">
                  💡 <strong>목요일 저녁 안내 (8시부 변경 반영)</strong>: 목요일은 태권도가 8시부(20:00~21:00)로 운영되어, 19:00 수학 종료 후 <strong>19:05에 귀가하여 7시~8시 사이에 집에서 저녁 식사</strong>를 하고 20:00에 태권도로 출발합니다. (21:05 최종 귀가 시 식사 완료)
                </p>
              </div>
            ) : isEnglishAndTaekwondo ? (
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-white text-emerald-800 border border-emerald-200">
                    17:00 영어
                  </span>
                  <span className="text-amber-600 font-bold">➔</span>
                  <span className="px-2 py-0.5 rounded-md font-black text-[10px] bg-amber-500 text-white shadow-2xs">
                    18:05 귀가 및 저녁 식사 🍚
                  </span>
                  <span className="text-amber-600 font-bold">➔</span>
                  <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-white text-emerald-800 border border-emerald-200">
                    19:00 태권도
                  </span>
                  <span className="text-emerald-600 font-bold">➔</span>
                  <span className="px-2 py-0.5 rounded-md font-black text-[10px] bg-emerald-600 text-white shadow-2xs">
                    20:05 최종 귀가 🏠
                  </span>
                </div>
                <p className="text-[10px] text-amber-900 font-medium bg-amber-50 p-2 rounded-lg border border-amber-200">
                  💡 <strong>월·수요일 저녁 안내</strong>: 18:05에 영어 종료 후 집에 귀가하여 <strong>저녁 식사를 하고</strong>, 19:00에 태권도로 출발합니다. (태권도 종료 후 20:05 최종 귀가 시에는 식사 완료 상태)
                </p>
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>
        )}

        {/* Dinner Status */}
        <div className="flex items-center justify-between gap-2 pt-1">
          {isMathDinnerTaekwondo ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                <Utensils className="w-3.5 h-3.5 text-amber-700" />
                🍚 집밥 저녁 필요 (19:05~20:00 수학 후 식사)
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                (태권도 21:05 최종 귀가 후에는 식사 불필요)
              </span>
            </div>
          ) : isEnglishAndTaekwondo ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                <Utensils className="w-3.5 h-3.5 text-amber-700" />
                🍚 집밥 저녁 필요 (18:05 영어 후 식사)
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                (태권도 20:05 최종 귀가 후에는 식사 불필요)
              </span>
            </div>
          ) : (
            <div>{renderDinnerBadge(activeSchedule.dinnerStatus)}</div>
          )}
          <span className="text-xs text-slate-500 font-medium">
            {isEunbi ? '수업 종료 후 대중교통 목감 귀가' : '도보 5분 거리 학원'}
          </span>
        </div>

        {/* Memo note if exists */}
        {isMathDinnerTaekwondo ? (
          <p className="mt-2 text-xs text-amber-900 bg-amber-50/90 border border-amber-200 px-2.5 py-1.5 rounded-lg">
            💬 목요일은 19:05에 귀가하여 7시~8시 사이 저녁 식사 후 20:00 태권도(8시부)로 이동합니다. (21:05 최종 귀가)
          </p>
        ) : isEnglishAndTaekwondo ? (
          <p className="mt-2 text-xs text-amber-900 bg-amber-50/90 border border-amber-200 px-2.5 py-1.5 rounded-lg">
            💬 18:05에 귀가하여 집에서 저녁 식사 후 19:00에 태권도로 이동합니다. (20:05 최종 귀가)
          </p>
        ) : activeSchedule.memo ? (
          <p className="mt-2 text-xs text-slate-500 bg-slate-100/80 px-2.5 py-1.5 rounded-lg line-clamp-1">
            💬 {activeSchedule.memo}
          </p>
        ) : null}
      </div>
    );
  };

  // 3. 선택된 요일의 가족 저녁 식사 요약 계산
  const activeDayOfWeek = activeDateObj.getDay();
  const eunbiLatestReturn =
    firstChildSchedules.length > 0
      ? [...firstChildSchedules].sort((a, b) => b.returnTime.localeCompare(a.returnTime))[0].returnTime
      : null;

  const hayulHasMath = secondChildSchedules.some((s) => s.title.includes('수학'));
  const hayulHasEng = secondChildSchedules.some((s) => s.title.includes('영어'));
  const hayulTkd = secondChildSchedules.find((s) => s.title.includes('태권도'));
  const hayulDinnerInfo =
    hayulHasMath && hayulTkd && (activeDayOfWeek === 4 || hayulTkd.startTime >= '20:00')
      ? '19:05~20:00 (수학 후)'
      : hayulHasEng && hayulTkd && !hayulHasMath
      ? '18:05~19:00 (영어 후)'
      : secondChildSchedules.length > 0
      ? `${[...secondChildSchedules].sort((a, b) => b.returnTime.localeCompare(a.returnTime))[0].returnTime} 귀가 후`
      : '집 체류';

  const dadMeeting = activeParentMeetings.find((m) => {
    const role = getParentMeetingRole(m.title, m.guardian);
    return role.name === '아빠' || role.name === '아빠 & 엄마';
  });
  const momMeeting = activeParentMeetings.find((m) => {
    const role = getParentMeetingRole(m.title, m.guardian);
    return role.name === '엄마' || role.name === '아빠 & 엄마';
  });

  const dadEatsAtHome = !dadMeeting;
  const momEatsAtHome = !momMeeting;
  const homeDinnerCount = 2 + (dadEatsAtHome ? 1 : 0) + (momEatsAtHome ? 1 : 0);

  // 4. 오직 '이번 주(월~일)'에 해당하는 특별 일정만 추출 (다음 주 일정 제외)
  const specialWindowStart = currentWeek[0].dateStr;
  const specialWindowEnd = currentWeek[6].dateStr;

  const isPublicHolidayNotice = (title: string) => {
    const holidays = [
      '신정',
      '설날',
      '삼일절',
      '어린이날',
      '부처님오신날',
      '현충일',
      '광복절',
      '추석',
      '개천절',
      '한글날',
      '성탄절',
      '크리스마스',
      '대체공휴일',
      '선거',
    ];
    return holidays.some((h) => title.includes(h));
  };

  const isRoutineClass = (s: Schedule) => {
    const t = s.title;
    if (
      t.includes('진료') ||
      t.includes('안과') ||
      t.includes('치과') ||
      t.includes('병원') ||
      t.includes('검진') ||
      t.includes('수리') ||
      t.includes('자동차') ||
      t.includes('정비') ||
      t.includes('약속') ||
      t.includes('모임') ||
      t.includes('회식') ||
      t.includes('외식') ||
      t.includes('여행') ||
      t.includes('생일') ||
      t.includes('중간고사') ||
      t.includes('기말고사')
    ) {
      return false;
    }
    return s.isRecurring || s.memberId === 'first_child' || s.memberId === 'second_child';
  };

  const rawSpecialSchedules = schedules
    .filter(
      (s) =>
        s.date >= specialWindowStart &&
        s.date <= specialWindowEnd &&
        !isPublicHolidayNotice(s.title) &&
        !isRoutineClass(s)
    )
    .sort((a, b) => (a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date)));

  // 연속 시험 일정(중간고사 등)은 대표 1건으로 묶어서 깔끔하게 표시
  const specialEvents: { schedule: Schedule; dateLabel: string; titleLabel: string; icon: string }[] = [];
  const seenTitles = new Set<string>();
  for (const s of rawSpecialSchedules) {
    if (s.title.includes('중간고사') || s.title.includes('기말고사')) {
      if (seenTitles.has(s.title)) continue;
      seenTitles.add(s.title);
      const sameTitleDates = rawSpecialSchedules.filter((x) => x.title === s.title).map((x) => x.date);
      const firstD = formatKoreanShortDate(sameTitleDates[0]);
      const lastD = formatKoreanShortDate(sameTitleDates[sameTitleDates.length - 1]);
      specialEvents.push({
        schedule: s,
        icon: '📝',
        dateLabel: `${firstD} ~ ${lastD}`,
        titleLabel: s.title,
      });
    } else {
      const dObj = parseDate(s.date);
      const dayName = DAY_NAMES_KO[dObj.getDay()];
      const icon =
        s.title.includes('안과') || s.title.includes('병원') || s.title.includes('진료')
          ? '🏥'
          : s.title.includes('자동차') || s.title.includes('수리')
          ? '🚗'
          : s.title.includes('약속') || s.title.includes('모임')
          ? '🍷'
          : '📌';
      specialEvents.push({
        schedule: s,
        icon,
        dateLabel: `${formatKoreanShortDate(s.date)}(${dayName}) ${s.startTime}`,
        titleLabel: s.title,
      });
    }
  }

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
                  이번 주 평일 귀가시간 집중 안내
                </h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-slate-950">
                  {isActiveToday ? '오늘 브리핑' : `${activeDayName}요일 브리핑`}
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/40">
                  🏡 시흥시 목감동
                </span>
              </div>
              <p className="text-xs text-indigo-200 mt-0.5">
                이번 주 평일({displayWeekdays.map((d) => DAY_NAMES_KO[d.dayOfWeek]).join('·')})의 자녀별 귀가 시간, 저녁 식사 타이밍, 부모 저녁 약속을 집중 안내합니다.
              </p>
            </div>
          </div>
          {isSelectedInCurrentWeek && remainingWeekdays.length > 0 && remainingWeekdays.length < 5 && (
            <button
              type="button"
              onClick={() => setShowAllWeekdays((prev) => !prev)}
              className="self-start sm:self-auto text-xs font-bold px-3 py-1.5 rounded-xl bg-indigo-800/80 hover:bg-indigo-700 text-indigo-100 border border-indigo-600/80 cursor-pointer transition-all shrink-0"
            >
              {showAllWeekdays ? `남은 평일만 보기 (${remainingWeekdays.length}일)` : '월~금 전체 요일 보기 (5일)'}
            </button>
          )}
        </div>

        {/* 1.5 이번 주 특별 일정 체크 (해당 주간 일정만 깔끔하게 정렬) */}
        {specialEvents.length > 0 && (
          <div className="mb-4 p-3 rounded-2xl bg-indigo-950/70 border border-indigo-700/70 relative z-10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold text-amber-300 flex items-center gap-1.5">
                <span>📌 이번 주 특별 일정 ({specialEvents.length}건)</span>
              </span>
              <span className="text-[11px] text-indigo-300">클릭 시 상세 확인</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {specialEvents.map((item) => (
                <button
                  key={item.schedule.id}
                  type="button"
                  onClick={() => {
                    if (onSelectDate) onSelectDate(item.schedule.date);
                    onOpenScheduleModal(item.schedule);
                  }}
                  className={`px-3 py-2 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    item.schedule.date === activeDateStr
                      ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold shadow-xs'
                      : 'bg-indigo-900/70 hover:bg-indigo-800/90 text-white border-indigo-700/80'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm shrink-0">{item.icon}</span>
                    <span className="text-xs font-bold truncate">{item.titleLabel}</span>
                  </div>
                  <span
                    className={`text-[10px] font-semibold shrink-0 ${
                      item.schedule.date === activeDateStr ? 'text-slate-800' : 'text-indigo-200'
                    }`}
                  >
                    {item.dateLabel}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 2. 이번 주 평일 탭 바 */}
        <div className="mb-4 relative z-10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold text-indigo-200 flex items-center gap-1.5">
              <CalendarRange className="w-4 h-4 text-amber-400" />
              {showAllWeekdays || !isSelectedInCurrentWeek
                ? `주간 평일 전체 (${displayWeekdays.length}일)`
                : `이번 주 남은 평일 (${displayWeekdays.length}일)`}
            </span>
            <span className="text-[11px] text-indigo-300 font-medium">
              탭을 누르면 해당 평일(예: 목요일)의 귀가·저녁 동선으로 즉시 전환됩니다
            </span>
          </div>

          <div
            className={`grid grid-cols-2 ${
              displayWeekdays.length >= 5 ? 'sm:grid-cols-5' : 'sm:grid-cols-4'
            } gap-2`}
          >
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
                    {preview.parentText && (
                      <div
                        className={`mt-1 pt-1 border-t text-[10px] font-extrabold flex items-center justify-between ${
                          isSelected ? 'border-slate-200 text-purple-900' : 'border-indigo-800/80 text-amber-300'
                        }`}
                      >
                        <span className="truncate">🍷 {preview.parentText}</span>
                        <span className="text-[9px] px-1 py-0.2 rounded bg-amber-400/30 text-amber-200 shrink-0 ml-1">
                          외식
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2.2 선택된 평일의 우리 가족 저녁 식사 요약 (4열 정렬 그리드) */}
        <div className="mb-4 p-3 rounded-2xl bg-indigo-950/80 border border-indigo-700/70 relative z-10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-extrabold text-amber-300 flex items-center gap-1.5">
              <Utensils className="w-3.5 h-3.5 text-amber-400" />
              <span>🍚 {activeDayName}요일 가족 저녁 식사 안내</span>
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-400/30">
              {homeDinnerCount === 4 ? '가족 4명 모두 집밥' : `집밥 ${homeDinnerCount}명 · 외식 ${4 - homeDinnerCount}명`}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="px-3 py-2 rounded-xl bg-indigo-900/60 border border-indigo-700/60 flex items-center justify-between">
              <span className="font-bold text-blue-200">👧 은비</span>
              <span className="font-extrabold text-white text-[11px]">
                {eunbiLatestReturn ? `${eunbiLatestReturn} 후 집밥` : '집밥'}
              </span>
            </div>
            <div className="px-3 py-2 rounded-xl bg-indigo-900/60 border border-indigo-700/60 flex items-center justify-between">
              <span className="font-bold text-emerald-200">🧒 하율</span>
              <span className="font-extrabold text-white text-[11px]">{hayulDinnerInfo}</span>
            </div>
            <div
              className={`px-3 py-2 rounded-xl border flex items-center justify-between ${
                dadEatsAtHome
                  ? 'bg-indigo-900/60 border-indigo-700/60'
                  : 'bg-amber-500/20 border-amber-400/50'
              }`}
            >
              <span className="font-bold text-indigo-200">👨 아빠</span>
              <span className={`font-extrabold text-[11px] ${dadEatsAtHome ? 'text-white' : 'text-amber-300'}`}>
                {dadEatsAtHome ? '집밥' : `외식 (${dadMeeting?.returnTime} 귀가)`}
              </span>
            </div>
            <div
              className={`px-3 py-2 rounded-xl border flex items-center justify-between ${
                momEatsAtHome
                  ? 'bg-indigo-900/60 border-indigo-700/60'
                  : 'bg-amber-500/20 border-amber-400/50'
              }`}
            >
              <span className="font-bold text-rose-200">👩 엄마</span>
              <span className={`font-extrabold text-[11px] ${momEatsAtHome ? 'text-white' : 'text-amber-300'}`}>
                {momEatsAtHome ? '집밥' : `외식 (${momMeeting?.returnTime} 귀가)`}
              </span>
            </div>
          </div>
        </div>

        {/* 2.5 선택된 평일의 아빠/엄마 저녁 모임 카드 (존재할 경우 눈에 띄게 강조) */}
        {activeParentMeetings.length > 0 && (
          <div className="mb-4 relative z-10 space-y-2.5">
            {activeParentMeetings.map((meeting) => {
              const role = getParentMeetingRole(meeting.title, meeting.guardian);
              return (
                <div
                  key={meeting.id}
                  onClick={() => onOpenScheduleModal(meeting)}
                  className="p-3.5 sm:p-4 rounded-2xl bg-linear-to-r from-purple-950 via-indigo-950 to-slate-900 border-2 border-amber-400 shadow-lg cursor-pointer hover:border-amber-300 hover:scale-[1.005] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl sm:text-4xl p-2 rounded-2xl bg-amber-400/20 text-amber-300 border border-amber-400/40 shrink-0">
                      {role.avatar}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm sm:text-base font-black text-white">
                          {role.name} 저녁 약속 · 모임 안내
                        </span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${role.badgeClass}`}>
                          {meeting.startTime} 시작
                        </span>
                        <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 shadow-xs">
                          🍚 집밥 불필요 (외부 식사)
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-indigo-100 font-bold mt-1">
                        {meeting.title}
                      </p>
                      {meeting.memo && (
                        <p className="text-[11px] text-indigo-300 mt-0.5 line-clamp-1">
                          💬 {meeting.memo}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-indigo-800/80 shrink-0">
                    <div className="text-left sm:text-right">
                      <span className="text-[11px] text-indigo-300 font-bold block">예상 귀가 시각</span>
                      <div className="flex items-baseline gap-1 sm:justify-end">
                        <span className="text-2xl sm:text-3xl font-black text-amber-300 tracking-tight">
                          {meeting.returnTime}
                        </span>
                        <span className="text-xs font-bold text-indigo-200">귀가 예정</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenScheduleModal(meeting);
                      }}
                      className="text-xs font-bold px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-xs cursor-pointer transition-all"
                    >
                      상세 / 수정
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 3. 선택된 평일의 2-Column 자녀별 귀가 상세 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
          {renderChildSummary('first_child')}
          {renderChildSummary('second_child')}
        </div>

        {/* 4. 하단 안내 바 및 빠른 등록 */}
        <div className="mt-4 pt-3 border-t border-indigo-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-indigo-200 relative z-10">
          <div className="flex items-center gap-2">
            <span>🏠 시흥시 목감동 은비·하율이네 귀가 알림</span>
            <span className="text-indigo-400">·</span>
            <span className="text-amber-300 font-semibold">카드를 누르면 일정을 수정하거나 확인할 수 있습니다</span>
          </div>
          <button
            type="button"
            onClick={() => {
              onOpenScheduleModal({
                id: `parent-meeting-${Date.now()}`,
                memberId: 'parents',
                date: activeDateStr,
                title: '[아빠] 저녁 모임',
                startTime: '18:30',
                returnTime: '22:30',
                transitMethod: '대중교통',
                dinnerStatus: 'not_required',
                guardian: '나(아빠)',
                isRecurring: false,
                memo: '저녁 모임/회식 (외부 식사 · 집밥 불필요)',
              });
            }}
            className="self-end sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-800/90 hover:bg-indigo-700 text-amber-300 hover:text-white border border-indigo-600 font-bold transition-all cursor-pointer text-xs"
          >
            <span>➕ {activeDayName}요일 아빠/엄마 저녁 모임 등록</span>
          </button>
        </div>
      </div>
    </section>
  );
};
