import React, { useState } from 'react';
import { Schedule, ChecklistItem } from '../types/calendar';
import { X, Download, Upload, Calendar, Database, Check, Copy, ExternalLink, Shield } from 'lucide-react';

interface SyncGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedules: Schedule[];
  checklists: ChecklistItem[];
  onImportData: (schedules: Schedule[], checklists: ChecklistItem[]) => void;
}

export const SyncGuideModal: React.FC<SyncGuideModalProps> = ({
  isOpen,
  onClose,
  schedules,
  checklists,
  onImportData,
}) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  if (!isOpen) return null;

  // JSON 내보내기
  const handleExportJSON = () => {
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      schedules,
      checklists,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `우리_가족_일정_백업_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // iCalendar (.ics) 내보내기 (구글 캘린더/애플 캘린더 호환)
  const handleExportICS = () => {
    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Family Schedule Dashboard//KR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:우리 가족 저녁 스케줄',
      'X-WR-TIMEZONE:Asia/Seoul',
    ];

    schedules.forEach((s) => {
      const dateNoHyphen = s.date.replace(/-/g, '');
      const startClean = s.startTime.replace(/:/g, '') + '00';
      const endClean = s.returnTime.replace(/:/g, '') + '00';

      icsContent.push('BEGIN:VEVENT');
      icsContent.push(`UID:family-sch-${s.id}@dashboard`);
      icsContent.push(`DTSTAMP:${dateNoHyphen}T000000Z`);
      icsContent.push(`DTSTART;TZID=Asia/Seoul:${dateNoHyphen}T${startClean}`);
      icsContent.push(`DTEND;TZID=Asia/Seoul:${dateNoHyphen}T${endClean}`);
      icsContent.push(`SUMMARY:[${s.guardian}] ${s.title} (귀가 ${s.returnTime})`);
      icsContent.push(
        `DESCRIPTION:이동방법: ${s.transitMethod}\\n저녁식사: ${s.dinnerStatus}\\n메모: ${s.memo || '없음'}`
      );
      icsContent.push('STATUS:CONFIRMED');
      icsContent.push('END:VEVENT');
    });

    icsContent.push('END:VCALENDAR');

    const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `가족_저녁_스케줄_${new Date().toISOString().slice(0, 10)}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // JSON 가져오기
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.schedules && json.checklists) {
          onImportData(json.schedules, json.checklists);
          alert('데이터를 성공적으로 불러왔습니다!');
          onClose();
        } else {
          alert('올바른 백업 파일 형식이 아닙니다.');
        }
      } catch (err) {
        alert('JSON 파싱 오류가 발생했습니다.');
      }
    };
    reader.readAsText(file);
  };

  const copySnippet = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur-xs z-10">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-indigo-50 text-indigo-600 font-bold">
              <Database className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-lg font-black text-slate-900">데이터 백업 및 연동 가이드</h3>
              <p className="text-xs text-slate-500">Google Calendar 및 Notion 연동 확장 방법</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-6 text-slate-800 text-xs">
          {/* 1. Quick Backup / Export / Import */}
          <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-3">
            <h4 className="font-extrabold text-indigo-950 text-sm flex items-center gap-1.5">
              <Download className="w-4 h-4 text-indigo-600" />
              1. 현재 일정 백업 및 캘린더 내보내기
            </h4>
            <p className="text-slate-600">
              현재 저장된 가족 일정과 체크리스트를 표준 파일로 내보내거나 백업할 수 있습니다.
            </p>
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <button
                onClick={handleExportICS}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-2xs"
              >
                <Calendar className="w-3.5 h-3.5" />
                Google 캘린더용 .ics 내보내기
              </button>

              <button
                onClick={handleExportJSON}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                전체 백업 (JSON)
              </button>

              <label className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold cursor-pointer transition-all">
                <Upload className="w-3.5 h-3.5" />
                백업 파일 복원
                <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
              </label>
            </div>
          </div>

          {/* 2. Google Calendar 연동 가이드 */}
          <div className="space-y-2 p-4 rounded-2xl border border-slate-200">
            <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              2. Google Calendar 양방향 연동 아키텍처
            </h4>
            <p className="text-slate-600 leading-relaxed">
              자녀의 학원 일정이나 가족 캘린더를 Google Calendar와 실시간으로 동기화하려면 다음 두 가지 방식 중 하나를 선택할 수 있습니다:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li>
                <strong>구독 URL 방식 (읽기 전용, 간편)</strong>: 본 앱의 일정을 iCal(ICS) 엔드포인트로 노출하고, 구글 캘린더의 'URL로 캘린더 추가'에 등록하여 자녀 일정을 구글 캘린더 앱에서 바로 조회.
              </li>
              <li>
                <strong>Google Calendar API OAuth 2.0 (양방향 동기화)</strong>: 구글 클라우드 콘솔에서 OAuth Client ID를 발급받은 뒤, `@googleapis/calendar` SDK를 사용하여 부모의 구글 캘린더에 일정 등록 시 본 앱에 자동 반영.
              </li>
            </ul>

            <div className="mt-3 bg-slate-900 text-slate-200 p-3 rounded-xl font-mono text-[11px] relative">
              <button
                onClick={() =>
                  copySnippet(
                    `// Google Calendar API Sync Example\nconst response = await gapi.client.calendar.events.insert({\n  calendarId: 'primary',\n  resource: {\n    summary: \`[\${member.name}] \${schedule.title}\`,\n    start: { dateTime: \`\${schedule.date}T\${schedule.startTime}:00+09:00\` },\n    end: { dateTime: \`\${schedule.date}T\${schedule.returnTime}:00+09:00\` },\n    description: \`귀가수단: \${schedule.transitMethod}, 저녁: \${schedule.dinnerStatus}\`,\n  }\n});`,
                    'gcal'
                  )
                }
                className="absolute top-2 right-2 p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400"
                title="코드 복사"
              >
                {copiedSection === 'gcal' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <pre className="overflow-x-auto">{`// Google Calendar API 연동 예시
const res = await gapi.client.calendar.events.insert({
  calendarId: 'primary',
  resource: {
    summary: \`[\${member.name}] \${schedule.title} (귀가 \${schedule.returnTime})\`,
    start: { dateTime: \`\${schedule.date}T\${schedule.startTime}:00+09:00\` },
    end: { dateTime: \`\${schedule.date}T\${schedule.returnTime}:00+09:00\` },
    description: \`귀가수단: \${schedule.transitMethod} | 저녁: \${schedule.dinnerStatus}\`,
  }
});`}</pre>
            </div>
          </div>

          {/* 3. Notion Database 연동 가이드 */}
          <div className="space-y-2 p-4 rounded-2xl border border-slate-200">
            <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              3. Notion 데이터베이스 연동 아키텍처
            </h4>
            <p className="text-slate-600 leading-relaxed">
              가족 노션 워크스페이스에 '가족 일정' 및 '자녀 체크리스트' 데이터베이스를 두고 Notion API (`@notionhq/client`)를 연동하여 PC나 태블릿에서도 실시간 동기화할 수 있습니다.
            </p>

            <div className="mt-3 bg-slate-900 text-slate-200 p-3 rounded-xl font-mono text-[11px] relative">
              <button
                onClick={() =>
                  copySnippet(
                    `// Notion API Page Creation\nawait notion.pages.create({\n  parent: { database_id: NOTION_DB_ID },\n  properties: {\n    '일정명': { title: [{ text: { content: schedule.title } }] },\n    '가족구성원': { select: { name: member.name } },\n    '귀가시간': { rich_text: [{ text: { content: schedule.returnTime } }] },\n    '날짜': { date: { start: schedule.date } },\n    '저녁식사': { select: { name: schedule.dinnerStatus } }\n  }\n});`,
                    'notion'
                  )
                }
                className="absolute top-2 right-2 p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400"
                title="코드 복사"
              >
                {copiedSection === 'notion' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <pre className="overflow-x-auto">{`// Notion Database API 연동 예시
await notion.pages.create({
  parent: { database_id: NOTION_SCHEDULE_DB_ID },
  properties: {
    '일정명': { title: [{ text: { content: schedule.title } }] },
    '구성원': { select: { name: member.name } },
    '귀가예정': { rich_text: [{ text: { content: schedule.returnTime } }] },
    '날짜': { date: { start: schedule.date } },
    '저녁식사': { select: { name: schedule.dinnerStatus } }
  }
});`}</pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-colors"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
