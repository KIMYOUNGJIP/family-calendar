import React, { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, Plus, RefreshCw, HelpCircle } from 'lucide-react';
import { formatKoreanDate } from '../utils/dateUtils';

interface HeaderProps {
  currentDate: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onGoToToday: () => void;
  onOpenAddModal: () => void;
  onResetData: () => void;
  onOpenSyncGuide: () => void;
  onOpenGoogleImport: () => void;
  selectedDateStr: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentDate,
  onPrevMonth,
  onNextMonth,
  onGoToToday,
  onOpenAddModal,
  onResetData,
  onOpenSyncGuide,
  onOpenGoogleImport,
  selectedDateStr,
}) => {
  const [liveTime, setLiveTime] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      setLiveTime(`${hours}:${minutes}:${seconds}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3 gap-3">
          {/* Brand & Live Date/Time */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-linear-to-tr from-amber-500 to-orange-400 flex items-center justify-center text-white shadow-md shadow-orange-100 font-bold text-xl">
                🏠
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-800 flex items-center gap-2 flex-wrap">
                  우리 가족 저녁 스케줄
                  <span className="hidden sm:inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    저녁 5초 브리핑
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    🏡 시흥시 목감동
                  </span>
                </h1>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 font-medium">
                  <span>{formatKoreanDate(new Date())}</span>
                  <span className="inline-block w-1 h-1 rounded-full bg-slate-300"></span>
                  <span className="flex items-center gap-1 font-mono font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                    <Clock className="w-3.5 h-3.5" />
                    {liveTime || '00:00:00'}
                  </span>
                </div>
              </div>
            </div>

            {/* Mobile Actions */}
            <div className="flex items-center gap-1.5 md:hidden">
              <button
                onClick={onOpenAddModal}
                className="p-2 rounded-xl bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 active:scale-95 transition-all"
                aria-label="새 일정 추가"
                title="새 일정 추가"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Controls: Month Navigation & Primary Action Buttons */}
          <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap">
            {/* Month Navigator */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={onPrevMonth}
                className="p-1.5 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 transition-colors"
                title="이전 달"
                aria-label="이전 달"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-sm font-bold text-slate-800 min-w-24 text-center">
                {year}년 {month}월
              </span>
              <button
                onClick={onNextMonth}
                className="p-1.5 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 transition-colors"
                title="다음 달"
                aria-label="다음 달"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Jump to Today */}
            <button
              onClick={onGoToToday}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 active:scale-95 transition-all shadow-2xs"
            >
              <CalendarIcon className="w-4 h-4 text-indigo-600" />
              오늘로 이동
            </button>

            {/* Google Calendar Import Button */}
            <button
              onClick={onOpenGoogleImport}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 active:scale-95 transition-all shadow-2xs"
              title="내 Google 계정 캘린더 실제 일정 불러오기"
            >
              <span className="text-sm">📅</span>
              <span>구글 캘린더 불러오기</span>
            </button>

            {/* Secondary Tools: Sync Guide & Reset */}
            <div className="flex items-center gap-1">
              <button
                onClick={onOpenSyncGuide}
                className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition-colors text-xs font-medium flex items-center gap-1"
                title="캘린더 연동 및 백업 안내"
              >
                <HelpCircle className="w-4 h-4" />
                <span className="hidden xl:inline">연동 안내</span>
              </button>
              <button
                onClick={onResetData}
                className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors text-xs"
                title="샘플 데이터 초기화"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Desktop Add Schedule Button */}
            <button
              onClick={onOpenAddModal}
              className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-sm hover:shadow active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              + 일정 추가
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
