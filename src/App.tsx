import React, { useState, useEffect, useMemo } from 'react';
import { Schedule, MemberId, ScheduleConflict } from './types/calendar';
import {
  loadSchedules,
  saveSchedules,
  resetAllData,
  detectConflicts,
} from './utils/storage';
import { getTodayString, addDays, parseDate, getWeekDays } from './utils/dateUtils';
import { Header } from './components/Header';
import { FilterBar, MemberFilter, TimeFilter } from './components/FilterBar';
import { ConflictAlert } from './components/ConflictAlert';
import { TodaySummaryCard } from './components/TodaySummaryCard';
import { WeeklySchedule } from './components/WeeklySchedule';
import { MonthlyCalendar } from './components/MonthlyCalendar';
import { ScheduleModal } from './components/ScheduleModal';
import { SyncGuideModal } from './components/SyncGuideModal';
import { GoogleCalendarImportModal } from './components/GoogleCalendarImportModal';
import { GOOGLE_CALENDAR_DEFAULT_URL } from './data/realGoogleSchedules';
import { parseICSContent } from './utils/icalParser';
import { Plus } from 'lucide-react';

export const App: React.FC = () => {
  const [todayStr, setTodayStr] = useState<string>(getTodayString());

  // 자정(00:00) 경과 감지: 매 30초마다 확인하여 날짜가 바뀌면 자동으로 오늘 날짜 갱신 (전날 일정 자동 숨김)
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
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // 필터 상태
  const [memberFilter, setMemberFilter] = useState<MemberFilter>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');

  // 모달 상태
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [scheduleModalDefaultDate, setScheduleModalDefaultDate] = useState<string | undefined>(undefined);
  const [isSyncGuideOpen, setIsSyncGuideOpen] = useState(false);
  const [isGoogleImportOpen, setIsGoogleImportOpen] = useState(false);

  // 초기 데이터 로드 및 백그라운드 구글 캘린더 최신 동기화 시도
  useEffect(() => {
    const loadedSchedules = loadSchedules();
    setSchedules(loadedSchedules);
    setIsLoaded(true);

    // 앱 시작 시 백그라운드에서 구글 캘린더 최신 일정을 조용히 동기화
    const autoSyncGoogle = async () => {
      try {
        const fetchUrl = GOOGLE_CALENDAR_DEFAULT_URL;
        let res: Response;
        try {
          res = await fetch(fetchUrl);
        } catch {
          res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(fetchUrl)}`);
        }
        if (res.ok) {
          const text = await res.text();
          const parsed = parseICSContent(text);
          if (parsed && parsed.length > 0) {
            setSchedules(parsed);
            saveSchedules(parsed);
          }
        }
      } catch {
        // 네트워크 장애 시 로컬 캐시 그대로 유지
      }
    };
    autoSyncGoogle();
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 날짜 선택 시 주간 일정도 해당 날짜로 동기화
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

    let updatedSchedules = [...schedules, newSchedule];

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

  // 구글 캘린더 가져오기 완료 시
  const handleImportGoogleSchedules = (importedSchedules: Schedule[]) => {
    setSchedules(importedSchedules);
    saveSchedules(importedSchedules);
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

  // 이번 주 범위 계산 (월~일)
  const currentWeekDays = useMemo(() => getWeekDays(todayStr), [todayStr]);
  const thisWeekEnd = currentWeekDays[6].dateStr;

  // "귀가시간집중 알림은 이번주것만 뜨게 해줘":
  // 과거 연도/과거 날짜를 제외하고, 새로고침 기준 이번 주(오늘 포함 남은 기간)의 일정만 대상으로 충돌 감지!
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
        selectedDateStr={selectedDateStr}
      />

      {/* 필터 바 */}
      <FilterBar
        memberFilter={memberFilter}
        onSelectMember={setMemberFilter}
        timeFilter={timeFilter}
        onSelectTime={setTimeFilter}
        totalScheduleCount={schedules.length}
      />

      {/* 메인 콘텐츠 영역: 1. 귀가시간 집중 안내 (맨 위) ➔ 2. 주간 상세 스케줄 (중간) ➔ 3. 월간 캘린더 (맨 아래) */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 flex-1 space-y-6">
        {/* 일정 및 픽업 충돌 경고 배너 */}
        <ConflictAlert conflicts={conflicts} />

        {/* 1. [맨 위] 이번 주 남은 평일 귀가시간 집중 안내 카드 */}
        <TodaySummaryCard
          schedules={schedules}
          selectedDateStr={selectedDateStr}
          onSelectDate={handleSelectDate}
          onOpenScheduleModal={(sch) => openAddScheduleModal(sch)}
        />

        {/* 2. [중간] 이번 주 상세 스케줄 (월~일 요일별 시간표) */}
        <WeeklySchedule
          selectedDateStr={selectedDateStr}
          onSelectDate={handleSelectDate}
          schedules={schedules}
          onOpenScheduleModal={openAddScheduleModal}
          onDeleteSchedule={handleDeleteSchedule}
          memberFilter={memberFilter}
        />

        {/* 3. [맨 아래] 가족달력 월간 뷰 */}
        <MonthlyCalendar
          currentDate={currentDate}
          selectedDateStr={selectedDateStr}
          onSelectDate={handleSelectDate}
          schedules={schedules}
          memberFilter={memberFilter}
        />
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
