import React, { useState } from 'react';
import { Schedule, MemberId } from '../types/calendar';
import { parseICSContent } from '../utils/icalParser';
import { FAMILY_MEMBERS } from '../utils/sampleData';
import { GOOGLE_CALENDAR_DEFAULT_URL } from '../data/realGoogleSchedules';
import { X, Calendar, Upload, FileText, CheckCircle2, AlertCircle, Sparkles, ExternalLink, ArrowRight } from 'lucide-react';

interface GoogleCalendarImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSchedules: (newSchedules: Schedule[]) => void;
}

export const GoogleCalendarImportModal: React.FC<GoogleCalendarImportModalProps> = ({
  isOpen,
  onClose,
  onImportSchedules,
}) => {
  const [activeTab, setActiveTab] = useState<'url' | 'file' | 'text'>('url');
  const [parsedList, setParsedList] = useState<Schedule[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [icalUrl, setIcalUrl] = useState(GOOGLE_CALENDAR_DEFAULT_URL);
  const [pastedText, setPastedText] = useState('');
  const [fileName, setFileName] = useState('');

  if (!isOpen) return null;

  // 1. 파일 업로드 처리 (.ics)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsParsing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const schedules = parseICSContent(text);
        setParsedList(schedules);
      } catch (err) {
        alert('ICS 파일 파싱 중 오류가 발생했습니다.');
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsText(file);
  };

  // 2. URL 처리
  const handleFetchUrl = async () => {
    if (!icalUrl.trim()) return;
    setIsParsing(true);

    try {
      // CORS 프록시 또는 직접 fetch 시도
      let fetchUrl = icalUrl.trim();
      if (!fetchUrl.startsWith('http')) {
        alert('올바른 URL 형식(https://...)을 입력해주세요.');
        setIsParsing(false);
        return;
      }

      // try direct or with cors proxy
      let res: Response;
      try {
        res = await fetch(fetchUrl);
      } catch (corsErr) {
        // Fallback through public cors proxy if blocked
        res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(fetchUrl)}`);
      }

      const text = await res.text();
      const schedules = parseICSContent(text);
      if (schedules.length === 0) {
        alert('일정을 찾지 못했습니다. 올바른 iCal 비공개 주소인지 확인해주세요.');
      } else {
        setParsedList(schedules);
      }
    } catch (err) {
      alert('iCal 주소에서 일정을 불러오지 못했습니다. Google Calendar 설정에서 .ics 파일을 직접 다운로드하여 업로드해주세요.');
    } finally {
      setIsParsing(false);
    }
  };

  // 3. 텍스트 파싱 처리
  const handleParseText = () => {
    if (!pastedText.trim()) return;
    // 간단한 줄 단위 파싱
    const lines = pastedText.split('\n').filter((l) => l.trim().length > 0);
    const newItems: Schedule[] = [];
    const today = new Date().toISOString().slice(0, 10);

    lines.forEach((line, idx) => {
      let memberId: MemberId = 'family';
      if (line.includes('은비') || line.includes('첫째')) memberId = 'first_child';
      else if (line.includes('하율') || line.includes('둘째')) memberId = 'second_child';
      else if (line.includes('아내') || line.includes('학교') || line.includes('수업') || line.includes('나')) memberId = 'parents';

      // 시간 추출 (예: 17:00, 17시, 5시)
      const timeMatch = line.match(/(\d{1,2}):(\d{2})/);
      const startTime = timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}` : '17:00';
      const returnTime = '19:00';

      newItems.push({
        id: `text-sch-${Date.now()}-${idx}`,
        memberId,
        date: today,
        title: line.trim(),
        startTime,
        returnTime,
        transitMethod: '학원 셔틀',
        dinnerStatus: 'required',
        guardian: memberId === 'second_child' ? '나 픽업' : '스스로 귀가',
        isRecurring: false,
      });
    });

    setParsedList(newItems);
  };

  // 최종 반영
  const handleApply = () => {
    if (parsedList.length === 0) return;
    onImportSchedules(parsedList);
    alert(`${parsedList.length}개의 일정을 가족 캘린더에 성공적으로 반영했습니다!`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur-xs z-10">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-blue-50 text-blue-600 font-bold">
              <Calendar className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                구글 캘린더 실제 일정 불러오기
                <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                  자동 매핑
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                내 구글 계정 캘린더의 일정을 가져와 은비, 하율, 부모 일정으로 자동 분류합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-100 px-5 pt-3 gap-2 bg-slate-50/50">
          <button
            onClick={() => setActiveTab('file')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'file'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            구글 캘린더 파일 (.ics) 선택
          </button>
          <button
            onClick={() => setActiveTab('url')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'url'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            iCal 비공개 URL 동기화
          </button>
          <button
            onClick={() => setActiveTab('text')}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'text'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            일정 텍스트 복사 붙여넣기
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 space-y-4">
          {activeTab === 'file' && (
            <div className="space-y-3">
              {/* How to export guide */}
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  구글 캘린더에서 파일 10초 만에 내보내는 방법
                </div>
                <ol className="list-decimal pl-4 space-y-0.5 text-amber-800">
                  <li>
                    브라우저에서{' '}
                    <a
                      href="https://calendar.google.com/calendar/r/settings/export"
                      target="_blank"
                      rel="noreferrer"
                      className="underline font-bold text-amber-900"
                    >
                      Google Calendar 설정(가져오기/내보내기)
                    </a>{' '}
                    접속
                  </li>
                  <li><strong>[내보내기]</strong> 버튼 클릭하여 다운로드된 압축파일 속 <code>.ics</code> 파일 선택</li>
                  <li>아래 상자에 파일을 끌어다 놓거나 [파일 선택] 클릭</li>
                </ol>
              </div>

              {/* Upload Dropzone */}
              <label className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-indigo-50/20">
                <Upload className="w-8 h-8 text-indigo-600 mb-2" />
                <span className="text-sm font-bold text-slate-700">
                  {fileName ? fileName : 'Google 캘린더 .ics 파일을 여기에 끌어다 놓으세요'}
                </span>
                <span className="text-xs text-slate-400 mt-1">또는 클릭하여 컴퓨터에서 파일 선택</span>
                <input type="file" accept=".ics" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          )}

          {activeTab === 'url' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs space-y-1">
                <div className="font-bold">Google Calendar iCal 비공개 주소 찾는 법</div>
                <p className="text-blue-800">
                  Google Calendar 설정 &gt; 좌측 '내 캘린더의 설정' &gt; <strong>'iCal 형식의 비공개 주소'</strong>를 복사해 아래에 붙여넣으세요.
                </p>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
                  value={icalUrl}
                  onChange={(e) => setIcalUrl(e.target.value)}
                  className="flex-1 text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleFetchUrl}
                  disabled={isParsing}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-2xs shrink-0"
                >
                  {isParsing ? '불러오는 중...' : '가져오기'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'text' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                구글 캘린더 화면에서 오늘/이번 주 일정 텍스트를 복사해서 그대로 붙여넣으세요:
              </p>
              <textarea
                rows={4}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="예:&#13;&#10;17:00 은비 작업치료 전공 강의 귀가&#13;&#10;18:30 하율 태권도 심사 및 픽업&#13;&#10;19:00 나(아빠) 퇴근"
                className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              ></textarea>
              <button
                type="button"
                onClick={handleParseText}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl"
              >
                텍스트 파싱하여 목록 생성
              </button>
            </div>
          )}

          {/* Parsed Preview Area */}
          {parsedList.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  파싱 완료된 일정 ({parsedList.length}개)
                </span>
                <span className="text-[11px] text-slate-500">
                  은비/하율/부모/가족으로 자동 분류됨
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-slate-50 rounded-2xl border border-slate-100">
                {parsedList.map((sch, i) => {
                  const member = FAMILY_MEMBERS[sch.memberId];
                  return (
                    <div
                      key={i}
                      className="p-2 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs gap-2"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${member.color.bgBadge} shrink-0`}>
                          {member.avatar} {member.name}
                        </span>
                        <span className="font-bold text-slate-800 truncate">{sch.title}</span>
                      </div>
                      <div className="text-right shrink-0 text-slate-500 font-mono text-[11px]">
                        <span>{sch.date}</span> | <strong className="text-slate-800">{sch.startTime} ~ {sch.returnTime}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <span className="text-xs text-slate-500">
            {parsedList.length > 0 ? `총 ${parsedList.length}개의 일정이 추가됩니다.` : ''}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleApply}
              disabled={parsedList.length === 0}
              className={`flex items-center gap-1.5 px-5 py-2 rounded-xl font-black text-xs transition-all shadow-md ${
                parsedList.length > 0
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100 active:scale-95'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              <span>가족 캘린더에 전체 반영</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
