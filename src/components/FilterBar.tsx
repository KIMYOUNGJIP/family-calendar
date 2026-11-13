import React from 'react';
import { MemberId, Schedule } from '../types/calendar';
import { FAMILY_MEMBERS } from '../utils/sampleData';
import { Filter, Calendar, CalendarRange, Utensils } from 'lucide-react';

export type MainTab = 'calendar' | 'weekly' | 'dinner';
export type TimeFilter = 'all' | 'today' | 'this_week';
export type MemberFilter = 'all' | MemberId | 'dad' | 'mom';

export function matchesMemberFilter(
  sch: { memberId: MemberId; title: string; guardian?: string },
  filter: MemberFilter
): boolean {
  if (filter === 'all') return true;
  const text = `${sch.title} ${sch.guardian || ''}`.toLowerCase();
  if (filter === 'dad') {
    return (
      text.includes('아빠') ||
      text.includes('남편') ||
      text.includes('영집') ||
      text.includes('자동차')
    );
  }
  if (filter === 'mom') {
    return (
      text.includes('엄마') ||
      text.includes('아내') ||
      text.includes('마누라') ||
      text.includes('미선') ||
      text.includes('여전도') ||
      text.includes('8여')
    );
  }
  return sch.memberId === filter;
}

/**
 * 공휴일 안내 일정 여부 판별
 */
export function isPublicHolidaySchedule(title: string): boolean {
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
}

/**
 * 매일/매주 반복되는 학교·대학·학원 정규 수업인지 판별
 * (병원, 모임, 약속, 여행, 생일, 제사, 시험, 자동차 점검 등은 특별 일정으로 분류하여 false 반환)
 */
export function isRegularClassSchedule(sch: Schedule): boolean {
  const t = sch.title;
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
    t.includes('식사') ||
    t.includes('봉사') ||
    t.includes('여행') ||
    t.includes('생일') ||
    t.includes('생신') ||
    t.includes('제사') ||
    t.includes('중간고사') ||
    t.includes('기말고사')
  ) {
    return false;
  }
  return sch.isRecurring || sch.memberId === 'first_child' || sch.memberId === 'second_child';
}

/**
 * 일정을 5인 역할(은비 / 하율 / 아빠 / 엄마 / 가족 공통) 배지 스타일로 변환
 */
export function getScheduleRoleStyle(sch: Schedule) {
  const t = `${sch.title} ${sch.guardian || ''}`.toLowerCase();
  if (
    t.includes('엄마') ||
    t.includes('아내') ||
    t.includes('마누라') ||
    t.includes('미선') ||
    t.includes('여전도') ||
    t.includes('8여')
  ) {
    return {
      roleId: 'mom' as const,
      name: '엄마',
      avatar: '👩',
      badgeClass: 'bg-rose-100 text-rose-800 border border-rose-200',
      cardBgClass: 'bg-rose-50/70 border-rose-200',
      dotClass: 'bg-rose-500',
    };
  }
  if (t.includes('아빠') || t.includes('남편') || t.includes('영집') || t.includes('자동차')) {
    return {
      roleId: 'dad' as const,
      name: '아빠',
      avatar: '👨',
      badgeClass: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
      cardBgClass: 'bg-indigo-50/70 border-indigo-200',
      dotClass: 'bg-indigo-600',
    };
  }
  const member = FAMILY_MEMBERS[sch.memberId];
  if (sch.memberId === 'first_child') {
    return {
      roleId: 'first_child' as const,
      name: '첫째 은비',
      avatar: member.avatar,
      badgeClass: 'bg-blue-100 text-blue-800 border border-blue-200',
      cardBgClass: 'bg-blue-50/60 border-blue-200',
      dotClass: 'bg-blue-600',
    };
  }
  if (sch.memberId === 'second_child') {
    return {
      roleId: 'second_child' as const,
      name: '둘째 하율',
      avatar: member.avatar,
      badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
      cardBgClass: 'bg-emerald-50/60 border-emerald-200',
      dotClass: 'bg-emerald-600',
    };
  }
  if (sch.memberId === 'parents') {
    return {
      roleId: 'parents' as const,
      name: '부모님',
      avatar: member.avatar,
      badgeClass: 'bg-purple-100 text-purple-800 border border-purple-200',
      cardBgClass: 'bg-purple-50/60 border-purple-200',
      dotClass: 'bg-purple-600',
    };
  }
  return {
    roleId: 'family' as const,
    name: '가족 공통',
    avatar: member.avatar,
    badgeClass: 'bg-amber-100 text-amber-900 border border-amber-200',
    cardBgClass: 'bg-amber-50/60 border-amber-200',
    dotClass: 'bg-orange-500',
  };
}

interface FilterBarProps {
  activeTab: MainTab;
  onSelectTab: (tab: MainTab) => void;
  memberFilter: MemberFilter;
  onSelectMember: (member: MemberFilter) => void;
  timeFilter: TimeFilter;
  onSelectTime: (time: TimeFilter) => void;
  totalScheduleCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  activeTab,
  onSelectTab,
  memberFilter,
  onSelectMember,
}) => {
  const mainTabs: { id: MainTab; label: string; subLabel: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: 'calendar',
      label: '가족 캘린더 홈',
      subLabel: '월간 달력 · 일자별 상세',
      icon: <Calendar className="w-4 h-4" />,
    },
    {
      id: 'weekly',
      label: '주간·일간 타임라인',
      subLabel: '한 주 시간표 모아보기',
      icon: <CalendarRange className="w-4 h-4" />,
    },
    {
      id: 'dinner',
      label: '저녁·귀가 챙기기',
      subLabel: '귀가 동선 · 집밥 브리핑',
      icon: <Utensils className="w-4 h-4" />,
      badge: '부가메뉴',
    },
  ];

  const members: { id: MemberFilter; label: string; avatar: string; color: string }[] = [
    { id: 'all', label: '전체 가족', avatar: '👨‍👩‍👧‍👦', color: 'bg-slate-800 text-white' },
    { id: 'first_child', label: '첫째 은비', avatar: FAMILY_MEMBERS.first_child.avatar, color: 'bg-blue-600 text-white' },
    { id: 'second_child', label: '둘째 하율', avatar: FAMILY_MEMBERS.second_child.avatar, color: 'bg-emerald-600 text-white' },
    { id: 'dad', label: '아빠', avatar: '👨', color: 'bg-indigo-600 text-white' },
    { id: 'mom', label: '엄마', avatar: '👩', color: 'bg-rose-600 text-white' },
    { id: 'family', label: '가족 공통', avatar: FAMILY_MEMBERS.family.avatar, color: 'bg-amber-600 text-white' },
  ];

  return (
    <section className="bg-white border-b border-slate-200 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-2.5 space-y-2.5">
        {/* 1. 메인 3탭 네비게이션 */}
        <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
          {mainTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const isDinner = tab.id === 'dinner';
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center justify-center sm:justify-start gap-2 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                  isActive
                    ? isDinner
                      ? 'bg-amber-500 text-white shadow-sm font-black'
                      : 'bg-indigo-600 text-white shadow-sm font-black'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-bold'
                }`}
              >
                <span
                  className={`p-1.5 rounded-lg shrink-0 ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : isDinner
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-200/70 text-slate-600'
                  }`}
                >
                  {tab.icon}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm truncate">{tab.label}</span>
                    {tab.badge && (
                      <span
                        className={`hidden md:inline-block text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                          isActive ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </div>
                  <p
                    className={`hidden sm:block text-[11px] truncate ${
                      isActive ? 'text-white/85 font-medium' : 'text-slate-400 font-normal'
                    }`}
                  >
                    {tab.subLabel}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* 2. 구성원 필터 칩 */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1 pr-1 shrink-0">
              <Filter className="w-3.5 h-3.5" />
              구성원 필터:
            </span>
            {members.map((m) => {
              const isSelected = memberFilter === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onSelectMember(m.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all active:scale-95 cursor-pointer ${
                    isSelected
                      ? `${m.color} shadow-xs ring-2 ring-offset-1 ring-slate-300`
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span className="text-sm">{m.avatar}</span>
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
