import React, { useState, useEffect, useMemo } from 'react';
import { Schedule, ScheduleConflict } from './types/calendar';
import {
  loadSchedules,
  saveSchedules,
  resetAllData,
  detectConflicts,
} from './utils/storage';
import {
  getTodayString,
  addDays,
  parseDate,
  getWeekDays,
  formatKoreanShortDate,
  DAY_NAMES_KO,
} from './utils/dateUtils';
import { Header } from './components/Header';
import {
  FilterBar,
  MainTab,
  MemberFilter,
  TimeFilter,
  matchesMemberFilter,
  isRegularClassSchedule,
  isPublicHolidaySchedule,
  getScheduleRoleStyle,
} from './components/FilterBar';
import { ConflictAlert } from './components/ConflictAlert';
import { TodaySummaryCard } from './components/TodaySummaryCard';
import { WeeklySchedule } from './components/WeeklySchedule';
import { MonthlyCalendar } from './components/MonthlyCalendar';
import { SelectedDayPanel } from './components/SelectedDayPanel';
import { ScheduleModal } from './components/ScheduleModal';
import { SyncGuideModal } from './components/SyncGuideModal';
import { GoogleCalendarImportModal } from './components/GoogleCalendarImportModal';
import { GOOGLE_CALENDAR_DEFAULT_URL } from './data/realGoogleSchedules';
import { parseICSContent } from './utils/icalParser';
import { Plus, Sparkles, Utensils, CalendarRange } from 'lucide-react';

export const App: React.FC = () => {
  const [todayStr, setTodayStr] = useState<string>(getTodayString());

  // 자정(00:00) 경과 감지: 매 30초마다 확인하여 날짜가 바뀌면 자동으로 오늘 날짜 갱신
  useEffect(() => {
    const timer = setInterval(() => {
      const current = getTodayString();
      if (current !== todayStr) {
        setTodayStr(current);
        setSelectedDateStr((prev) => (prev === todayStr ? current : prev));
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [todayStr]);

  // 상태 관리
  const [activeTab, setActiveTab] = useState<MainTab>('calendar');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // 필터 및 정규수업 표시 토글 상태
  const [memberFilter, setMemberFilter] = useState<MemberFilter>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [showRegularClasses, setShowRegularClasses] = useState<boolean>(true);

  // 모달 및 동기화 상태
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [scheduleModalDefaultDate, setScheduleModalDefaultDate] = useState<string | undefined>(undefined);
  const [isSyncGuideOpen, setIsSyncGuideOpen] = useState(false);
  const [isGoogleImportOpen, setIsGoogleImportOpen] = useState(false);
  const [isSyncingGoogle, setIsSyncingGoogle] = useState(false);
  const [lastSyncMessage, setLastSyncMessage] = useState<string | null>(null);

  // 구글 캘린더 실시간 동기화 공통 함수
  const syncFromGoogleCalendar = async (showFeedback = false) => {
    if (showFeedback) {
      setIsSyncingGoogle(true);
      setLastSyncMessage('구글 가족 캘린더에서 최신 일정을 불러오는 중...');
    }

    const mergeWithUserSchedules = (googleParsed: Schedule[]) => {
      setSchedules((prev) => {
        const customSchedules = prev.filter(
          (s) => s.id.startsWith('sch-') || s.id.startsWith('parent-meeting-')
        );
        const merged = [...googleParsed, ...customSchedules];
        saveSchedules(merged);
        return merged;
      });
    };

    try {
      const cacheBuster = `?t=${Date.now()}`;
      const fetchUrl = `${GOOGLE_CALENDAR_DEFAULT_URL}${cacheBuster}`;
      const fetchWithTimeout = async (url: string, ms = 3500) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), ms);
        try {
          return await fetch(url, { signal: controller.signal });
        } finally {
          clearTimeout(timer);
        }
      };

      let res: Response | null = null;
      try {
        res = await fetchWithTimeout(`https://api.allorigins.win/raw?url=${encodeURIComponent(fetchUrl)}`);
      } catch {
        try {
          res = await fetchWithTimeout(`https://corsproxy.io/?url=${encodeURIComponent(fetchUrl)}`);
        } catch {
          res = null;
        }
      }
      if (res && res.ok) {
        const text = await res.text();
        if (text.includes('BEGIN:VCALENDAR')) {
          const parsed = parseICSContent(text);
          if (parsed && parsed.length > 0) {
            mergeWithUserSchedules(parsed);
            if (showFeedback) {
              setLastSyncMessage(`✓ 실시간 동기화 완료 (${parsed.length.toLocaleString()}건 반영)`);
              setTimeout(() => setLastSyncMessage(null), 4000);
            }
            return;
          }
        }
      }

      // 2차: 자동 초기 로딩일 때만 서버 번들(.ics) 확인; 사용자가 직접 [실시간 동기화]를 눌렀을 때는 구버전 번들로 성공한 것처럼 오인시키지 않고 1초 파일 받기 모달 안내
      if (!showFeedback) {
        try {
          const localRes = await fetch(`./google_calendar.ics?t=${Date.now()}`);
          if (localRes.ok) {
            const text = await localRes.text();
            if (text.includes('BEGIN:VCALENDAR')) {
              const parsed = parseICSContent(text);
              if (parsed && parsed.length > 0) {
                mergeWithUserSchedules(parsed);
                return;
              }
            }
          }
        } catch {
          // fallback
        }
      } else {
        setLastSyncMessage('⚠️ 구글 파일 용량(1MB)으로 프록시 지연됨 → [1단계: basic.ics 바로 받기]를 이용해 주세요');
        setTimeout(() => setLastSyncMessage(null), 6000);
        setIsGoogleImportOpen(true);
      }
    } catch {
      if (showFeedback) {
        setLastSyncMessage('네트워크 상태를 확인해 주세요 (기존 일정 유지됨)');
        setTimeout(() => setLastSyncMessage(null), 4000);
      }
    } finally {
      if (showFeedback) {
        setIsSyncingGoogle(false);
      }
    }
  };

  // 초기 데이터 로드 및 백그라운드 구글 캘린더 최신 동기화 시도
  useEffect(() => {
    const loadedSchedules = loadSchedules();
    setSchedules(loadedSchedules);
    setIsLoaded(true);
    syncFromGoogleCalendar(false);
  }, []);

  // 월 이동
  const handlePrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // 오늘로 이동
  const handleGoToToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDateStr(todayStr);
    setTimeFilter('today');
  };

  // 시간 필터 선택
  const handleSelectTimeFilter = (tf: TimeFilter) => {
    setTimeFilter(tf);
    if (tf === 'today' || tf === 'this_week') {
      const now = new Date();
      setCurrentDate(now);
      setSelectedDateStr(todayStr);
    }
  };

  // 날짜 선택 시 월간 달력 연/월 동기화
  const handleSelectDate = (dateStr: string) => {
    setSelectedDateStr(dateStr);
    const targetDate = parseDate(dateStr);
    if (targetDate.getMonth() !== currentDate.getMonth() || targetDate.getFullYear() !== currentDate.getFullYear()) {
      setCurrentDate(new Date(targetDate.getFullYear(), targetDate.getMonth(), 1));
    }
  };

  // 일정 등록
  const handleSaveSchedule = (scheduleData: Omit<Schedule, 'id'>) => {
    const newId = `sch-${Date.now()}`;
    const newSchedule: Schedule = {
      ...scheduleData,
      id: newId,
    };

    const updatedSchedules = [...schedules, newSchedule];

    // 매주 반복일 경우 다음 3주간의 일정도 자동 등록
    if (newSchedule.isRecurring) {
      for (let w = 1; w <= 3; w++) {
        const recurringDate = addDays(newSchedule.date, w * 7);
        updatedSchedules.push({
          ...newSchedule,
          id: `sch-${Date.now()}-rec-${w}`,
          date: recurringDate,
        });
      }
    }

    setSchedules(updatedSchedules);
    saveSchedules(updatedSchedules);
  };

  // 일정 수정
  const handleUpdateSchedule = (id: string, scheduleData: Partial<Schedule>) => {
    const updatedSchedules = schedules.map((s) =>
      s.id === id ? { ...s, ...scheduleData } : s
    );
    setSchedules(updatedSchedules);
    saveSchedules(updatedSchedules);
  };

  // 일정 삭제
  const handleDeleteSchedule = (id: string) => {
    if (window.confirm('이 일정을 삭제하시겠습니까?')) {
      const updatedSchedules = schedules.filter((s) => s.id !== id);
      setSchedules(updatedSchedules);
      saveSchedules(updatedSchedules);
    }
  };

  // 전체 데이터 초기화
  const handleResetData = () => {
    if (window.confirm('구글 캘린더 실제 일정으로 전체 데이터를 재설정하시겠습니까?')) {
      const fresh = resetAllData();
      setSchedules(fresh.schedules);
      setSelectedDateStr(todayStr);
    }
  };

  // 백업 파일 가져오기
  const handleImportData = (newSchedules: Schedule[]) => {
    setSchedules(newSchedules);
    saveSchedules(newSchedules);
  };

  // 구글 캘린더 가져오기 완료 시 (사이트에서 직접 추가한 커스텀 일정은 보존)
  const handleImportGoogleSchedules = (importedSchedules: Schedule[]) => {
    setSchedules((prev) => {
      const customSchedules = prev.filter(
        (s) => s.id.startsWith('sch-') || s.id.startsWith('parent-meeting-')
      );
      const merged = [...importedSchedules, ...customSchedules];
      saveSchedules(merged);
      return merged;
    });
  };

  // 모달 열기
  const openAddScheduleModal = (schedule?: Schedule, defaultDate?: string) => {
    if (schedule) {
      setEditingSchedule(schedule);
      setScheduleModalDefaultDate(undefined);
    } else {
      setEditingSchedule(null);
      setScheduleModalDefaultDate(defaultDate || selectedDateStr);
    }
    setIsScheduleModalOpen(true);
  };

  // 현재 선택된 날짜가 속한 주 (월~일)
  const selectedWeekDays = useMemo(() => getWeekDays(selectedDateStr), [selectedDateStr]);
  const currentWeekDays = useMemo(() => getWeekDays(todayStr), [todayStr]);
  const thisWeekEnd = currentWeekDays[6].dateStr;

  // 선택된 주(월~일)의 주요 특별 일정 목록 (중간·기말고사 등 연속 일정은 1건으로 병합)
  const weeklySpecialHighlights = useMemo(() => {
    const weekStart = selectedWeekDays[0].dateStr;
    const weekEnd = selectedWeekDays[6].dateStr;

    const raw = schedules
      .filter(
        (s) =>
          s.date >= weekStart &&
          s.date <= weekEnd &&
          matchesMemberFilter(s, memberFilter) &&
          !isPublicHolidaySchedule(s.title) &&
          !isRegularClassSchedule(s)
      )
      .sort((a, b) => (a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date)));

    const list: { schedule: Schedule; dateLabel: string; titleLabel: string }[] = [];
    const seenExamTitles = new Set<string>();

    for (const s of raw) {
      if (s.title.includes('중간고사') || s.title.includes('기말고사')) {
        if (seenExamTitles.has(s.title)) continue;
        seenExamTitles.add(s.title);
        const sameDates = raw.filter((x) => x.title === s.title).map((x) => x.date);
        list.push({
          schedule: s,
          dateLabel: `${formatKoreanShortDate(sameDates[0])}~${formatKoreanShortDate(sameDates[sameDates.length - 1])}`,
          titleLabel: s.title,
        });
      } else {
        const dObj = parseDate(s.date);
        const dayName = DAY_NAMES_KO[dObj.getDay()];
        list.push({
          schedule: s,
          dateLabel: `${formatKoreanShortDate(s.date)}(${dayName}) ${s.startTime}`,
          titleLabel: s.title,
        });
      }
    }
    return list;
  }, [schedules, selectedWeekDays, memberFilter]);

  // 이번 주 충돌 감지 (저녁·귀가 브리핑 탭 전용)
  const conflicts: ScheduleConflict[] = useMemo(() => {
    const thisWeekSchedules = schedules.filter(
      (s) => s.date >= todayStr && s.date <= thisWeekEnd
    );
    return detectConflicts(
      thisWeekSchedules,
      timeFilter === 'today' ? todayStr : undefined
    );
  }, [schedules, timeFilter, todayStr, thisWeekEnd]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-sm font-semibold">
        가족 달력을 불러오는 중...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-24 md:pb-12 text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      {/* 1. 상단 헤더 */}
      <Header
        currentDate={currentDate}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onGoToToday={handleGoToToday}
        onOpenAddModal={() => openAddScheduleModal()}
        onResetData={handleResetData}
        onOpenSyncGuide={() => setIsSyncGuideOpen(true)}
        onOpenGoogleImport={() => setIsGoogleImportOpen(true)}
        onQuickSyncGoogle={() => syncFromGoogleCalendar(true)}
        isSyncingGoogle={isSyncingGoogle}
        lastSyncMessage={lastSyncMessage}
        selectedDateStr={selectedDateStr}
      />

      {/* 2. 메인 3탭 네비게이션 & 구성원 필터 바 */}
      <FilterBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        memberFilter={memberFilter}
        onSelectMember={setMemberFilter}
        timeFilter={timeFilter}
        onSelectTime={handleSelectTimeFilter}
        totalScheduleCount={schedules.length}
      />

      {/* 3. 탭별 메인 콘텐츠 영역 */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 flex-1 space-y-5">
        {/* ==================== [탭 1: 가족 캘린더 홈 (기본 화면)] ==================== */}
        {activeTab === 'calendar' && (
          <>
            {/* 상단: 선택된 주(이번 주) 주요 특별 일정 요약 바 */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3.5 sm:px-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900 font-extrabold text-xs shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  주간 주요 · 특별 일정 ({formatKoreanShortDate(selectedWeekDays[0].dateStr)} ~{' '}
                  {formatKoreanShortDate(selectedWeekDays[6].dateStr)})
                </span>

                {weeklySpecialHighlights.length === 0 ? (
                  <span className="text-xs text-slate-400 font-medium">
                    이 주간에 등록된 특별 일정(모임·병원·행사 등)이 없습니다.
                  </span>
                ) : (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {weeklySpecialHighlights.map((item) => {
                      const style = getScheduleRoleStyle(item.schedule);
                      const isSel = item.schedule.date === selectedDateStr;
                      return (
                        <button
                          key={item.schedule.id}
                          type="button"
                          onClick={() => handleSelectDate(item.schedule.date)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs border transition-all cursor-pointer ${
                            isSel
                              ? 'bg-indigo-600 text-white border-indigo-600 font-extrabold shadow-2xs'
                              : `${style.badgeClass} hover:opacity-85 font-bold`
                          }`}
                        >
                          <span>{style.avatar}</span>
                          <span>{item.titleLabel}</span>
                          <span
                            className={`text-[10px] font-mono ${
                              isSel ? 'text-indigo-100' : 'opacity-75'
                            }`}
                          >
                            ({item.dateLabel})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 우측 빠른 메뉴 전환 바로가기 */}
              <div className="flex items-center gap-1.5 shrink-0 self-end md:self-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('weekly')}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  <CalendarRange className="w-3.5 h-3.5 text-indigo-600" />
                  <span>주간 시간표</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('dinner')}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  <Utensils className="w-3.5 h-3.5 text-amber-600" />
                  <span>저녁·귀가 챙기기</span>
                </button>
              </div>
            </div>

            {/* 메인 2단 분할 레이아웃: 좌측 월간 달력 (7) + 우측 선택 날짜 상세 패널 (5) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              <div className="lg:col-span-7 xl:col-span-8">
                <MonthlyCalendar
                  currentDate={currentDate}
                  selectedDateStr={selectedDateStr}
                  onSelectDate={handleSelectDate}
                  schedules={schedules}
                  memberFilter={memberFilter}
                  showRegularClasses={showRegularClasses}
                  onToggleRegularClasses={() => setShowRegularClasses((prev) => !prev)}
                />
              </div>

              <div className="lg:col-span-5 xl:col-span-4">
                <SelectedDayPanel
                  selectedDateStr={selectedDateStr}
                  onSelectDate={handleSelectDate}
                  schedules={schedules}
                  memberFilter={memberFilter}
                  showRegularClasses={showRegularClasses}
                  onToggleRegularClasses={() => setShowRegularClasses((prev) => !prev)}
                  onOpenScheduleModal={openAddScheduleModal}
                  onDeleteSchedule={handleDeleteSchedule}
                  onGoToDinnerTab={() => setActiveTab('dinner')}
                />
              </div>
            </div>
          </>
        )}

        {/* ==================== [탭 2: 주간·일간 타임라인] ==================== */}
        {activeTab === 'weekly' && (
          <WeeklySchedule
            selectedDateStr={selectedDateStr}
            onSelectDate={handleSelectDate}
            schedules={schedules}
            onOpenScheduleModal={openAddScheduleModal}
            onDeleteSchedule={handleDeleteSchedule}
            memberFilter={memberFilter}
            showRegularClasses={showRegularClasses}
            onToggleRegularClasses={() => setShowRegularClasses((prev) => !prev)}
          />
        )}

        {/* ==================== [탭 3: 저녁·귀가 챙기기 (부가 메뉴)] ==================== */}
        {activeTab === 'dinner' && (
          <div className="space-y-5">
            <ConflictAlert conflicts={conflicts} />
            <TodaySummaryCard
              schedules={schedules}
              selectedDateStr={selectedDateStr}
              onSelectDate={handleSelectDate}
              onOpenScheduleModal={(sch) => openAddScheduleModal(sch)}
            />
          </div>
        )}
      </main>

      {/* 모바일 하단 플로팅 액션 버튼 (FAB) */}
      <div className="fixed bottom-6 right-6 z-40 md:hidden">
        <button
          onClick={() => openAddScheduleModal()}
          className="flex items-center justify-center w-14 h-14 rounded-full bg-indigo-600 text-white shadow-xl hover:bg-indigo-700 active:scale-90 transition-all border-2 border-white"
          aria-label="새 일정 등록"
          title="새 일정 등록"
        >
          <Plus className="w-7 h-7 stroke-[2.5]" />
        </button>
      </div>

      {/* 일정 추가 / 수정 모달 */}
      <ScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => {
          setIsScheduleModalOpen(false);
          setEditingSchedule(null);
        }}
        onSave={handleSaveSchedule}
        onUpdate={handleUpdateSchedule}
        initialSchedule={editingSchedule}
        defaultDate={scheduleModalDefaultDate}
        existingSchedules={schedules}
      />

      {/* 외부 연동 및 백업 가이드 모달 */}
      <SyncGuideModal
        isOpen={isSyncGuideOpen}
        onClose={() => setIsSyncGuideOpen(false)}
        schedules={schedules}
        checklists={[]}
        onImportData={(newSchedules) => handleImportData(newSchedules)}
      />

      {/* 구글 캘린더 실제 일정 불러오기 모달 */}
      <GoogleCalendarImportModal
        isOpen={isGoogleImportOpen}
        onClose={() => setIsGoogleImportOpen(false)}
        onImportSchedules={handleImportGoogleSchedules}
      />
    </div>
  );
};

export default App;

