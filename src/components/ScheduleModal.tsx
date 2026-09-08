import React, { useState, useEffect } from 'react';
import { Schedule, MemberId, DinnerStatus, TransitMethod, ChecklistCategory } from '../types/calendar';
import { FAMILY_MEMBERS } from '../utils/sampleData';
import { getTodayString } from '../utils/dateUtils';
import { X, Plus, Clock, Utensils, AlertTriangle, Calendar, User, Bus, CheckSquare } from 'lucide-react';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (scheduleData: Omit<Schedule, 'id'>, newChecklistTitle?: string) => void;
  onUpdate?: (id: string, scheduleData: Partial<Schedule>) => void;
  initialSchedule?: Schedule | null;
  defaultDate?: string;
  existingSchedules: Schedule[];
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onUpdate,
  initialSchedule,
  defaultDate,
  existingSchedules,
}) => {
  const [memberId, setMemberId] = useState<MemberId>('first_child');
  const [date, setDate] = useState<string>(defaultDate || getTodayString());
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('16:00');
  const [returnTime, setReturnTime] = useState('18:30');
  const [transitMethod, setTransitMethod] = useState<TransitMethod>('학원 셔틀');
  const [dinnerStatus, setDinnerStatus] = useState<DinnerStatus>('required');
  const [guardian, setGuardian] = useState('엄마');
  const [isRecurring, setIsRecurring] = useState(false);
  const [memo, setMemo] = useState('');
  const [initialChecklist, setInitialChecklist] = useState('');
  const [isReturnTimeChanged, setIsReturnTimeChanged] = useState(false);

  useEffect(() => {
    if (initialSchedule) {
      setMemberId(initialSchedule.memberId);
      setDate(initialSchedule.date);
      setTitle(initialSchedule.title);
      setStartTime(initialSchedule.startTime);
      setReturnTime(initialSchedule.returnTime);
      setTransitMethod(initialSchedule.transitMethod);
      setDinnerStatus(initialSchedule.dinnerStatus);
      setGuardian(initialSchedule.guardian);
      setIsRecurring(initialSchedule.isRecurring);
      setMemo(initialSchedule.memo || '');
      setIsReturnTimeChanged(initialSchedule.isReturnTimeChanged || false);
      setInitialChecklist('');
    } else {
      setMemberId('first_child');
      setDate(defaultDate || getTodayString());
      setTitle('');
      setStartTime('14:00');
      setReturnTime('19:00');
      setTransitMethod('대중교통');
      setDinnerStatus('required');
      setGuardian('스스로 귀가');
      setIsRecurring(false);
      setMemo('');
      setIsReturnTimeChanged(false);
      setInitialChecklist('');
    }
  }, [initialSchedule, defaultDate, isOpen]);

  const handleSelectMember = (mId: MemberId) => {
    setMemberId(mId);
    if (!initialSchedule) {
      if (mId === 'first_child') {
        setTransitMethod('대중교통');
        setGuardian('스스로 귀가');
      } else if (mId === 'second_child') {
        setTransitMethod('도보');
        setGuardian('스스로 귀가');
      } else if (mId === 'parents') {
        setTransitMethod('자차');
        setGuardian('나');
      }
    }
  };

  if (!isOpen) return null;

  // 동일 날짜 충돌 여부 실시간 확인
  const potentialConflict = existingSchedules.find((s) => {
    if (initialSchedule && s.id === initialSchedule.id) return false;
    if (s.date !== date) return false;
    // 자녀 픽업 시간 겹침 검사
    const [h1, m1] = returnTime.split(':').map(Number);
    const [h2, m2] = s.returnTime.split(':').map(Number);
    const diff = Math.abs(h1 * 60 + m1 - (h2 * 60 + m2));
    return diff <= 20 && s.guardian === guardian && guardian !== '스스로 귀가';
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (initialSchedule && onUpdate) {
      onUpdate(initialSchedule.id, {
        memberId,
        date,
        title: title.trim(),
        startTime,
        returnTime,
        transitMethod,
        dinnerStatus,
        guardian,
        isRecurring,
        memo: memo.trim(),
        isReturnTimeChanged,
      });
    } else {
      onSave(
        {
          memberId,
          date,
          title: title.trim(),
          startTime,
          returnTime,
          transitMethod,
          dinnerStatus,
          guardian,
          isRecurring,
          memo: memo.trim(),
          isReturnTimeChanged,
        },
        initialChecklist.trim() || undefined
      );
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur-xs z-10">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-indigo-50 text-indigo-600 font-bold">
              <Calendar className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                {initialSchedule ? '일정 상세 수정' : '새 저녁 스케줄 등록'}
              </h3>
              <p className="text-xs text-slate-400">자녀의 귀가 시간과 챙길 일을 등록하세요.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Conflict Warning Preview */}
          {potentialConflict && (
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2 animate-fadeIn">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">보호자 픽업 시간 중복 주의</strong>
                {potentialConflict.guardian} 보호자의 '{potentialConflict.title}' 귀가 시간({potentialConflict.returnTime})과 20분 이내로 근접합니다.
              </div>
            </div>
          )}

          {/* 1. Member Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              대상 가족 구성원 <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['first_child', 'second_child', 'parents', 'family'] as MemberId[]).map((mId) => {
                const member = FAMILY_MEMBERS[mId];
                const isSelected = memberId === mId;
                return (
                  <button
                    type="button"
                    key={mId}
                    onClick={() => handleSelectMember(mId)}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                      isSelected
                        ? `${member.color.bgLight} ${member.color.border} ring-2 ${member.color.ring} font-bold shadow-2xs`
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-lg">{member.avatar}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate">{member.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{member.relation}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Member Location & Commute Hints */}
            {memberId === 'first_child' && (
              <div className="mt-2.5 p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center gap-2">
                <span className="text-base shrink-0">🎓</span>
                <div>
                  <strong className="block font-bold text-blue-900">수원 동남보건대 ➔ 시흥 목감동 통학</strong>
                  수업을 모두 마친 후 대중교통 통학시간(약 1시간 30분)을 반영해 목감 최종 도착 시간을 설정하세요.
                </div>
              </div>
            )}

            {memberId === 'second_child' && (
              <div className="mt-2.5 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                <span className="text-base shrink-0">🏫</span>
                <div>
                  <strong className="block font-bold text-emerald-900">목감 집 앞 학원 (도보 5분 거리)</strong>
                  학원 종료 5분 후 목감 집에 도착합니다 (도보 귀가 권장).
                </div>
              </div>
            )}
          </div>

          {/* 2. Title & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                날짜 <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                일정명 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 심화 수학 학원, 태권도"
                required
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-semibold"
              />
            </div>
          </div>

          {/* 3. Times: Start Time & Return Time */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                시작 시간
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full text-xs font-bold p-2 rounded-xl bg-white border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-indigo-700 mb-1 flex items-center justify-between">
                <span>귀가 예정 시간 *</span>
                <span className="text-[10px] text-indigo-500 font-normal">핵심</span>
              </label>
              <input
                type="time"
                value={returnTime}
                onChange={(e) => setReturnTime(e.target.value)}
                required
                className="w-full text-xs font-black p-2 rounded-xl bg-white border-2 border-indigo-400 text-indigo-950 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden shadow-2xs"
              />
            </div>
          </div>

          {/* 4. Transit Method & Guardian */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                이동 및 귀가 방법
              </label>
              <select
                value={transitMethod}
                onChange={(e) => setTransitMethod(e.target.value as TransitMethod)}
                className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white"
              >
                <option value="학원 셔틀">🚌 학원 셔틀</option>
                <option value="도보">🚶 도보 귀가</option>
                <option value="엄마 픽업">🚗 엄마 픽업</option>
                <option value="아빠 픽업">🚗 아빠 픽업</option>
                <option value="자전거">🚲 자전거</option>
                <option value="대중교통">🚇 대중교통(지하철/버스)</option>
                <option value="기타">기타</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                담당 보호자 / 인솔자
              </label>
              <input
                type="text"
                value={guardian}
                onChange={(e) => setGuardian(e.target.value)}
                placeholder="예: 엄마, 아빠, 스스로 귀가"
                className="w-full text-xs font-semibold p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white"
              />
            </div>
          </div>

          {/* 5. Dinner Status */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              저녁 식사 여부
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-semibold">
              {[
                { id: 'required', label: '🍚 집밥 필요', color: 'border-amber-400 bg-amber-50 text-amber-900' },
                { id: 'not_required', label: '외부 식사', color: 'border-slate-300 bg-slate-50 text-slate-700' },
                { id: 'snack_only', label: '🥪 간단 간식', color: 'border-orange-300 bg-orange-50 text-orange-900' },
                { id: 'completed', label: '✅ 식사 완료', color: 'border-emerald-300 bg-emerald-50 text-emerald-900' },
              ].map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setDinnerStatus(item.id as DinnerStatus)}
                  className={`p-2 rounded-xl border transition-all text-center ${
                    dinnerStatus === item.id
                      ? `${item.color} font-bold ring-2 ring-indigo-400 shadow-2xs`
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 6. Initial Checklist item (Only for new schedules) */}
          {!initialSchedule && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                  연결할 챙길 일 (선택)
                </span>
                <span className="text-[10px] text-slate-400">체크리스트에 자동 등록</span>
              </label>
              <input
                type="text"
                value={initialChecklist}
                onChange={(e) => setInitialChecklist(e.target.value)}
                placeholder="예: 학원비 카드 챙기기, 도복 가방 준비"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          )}

          {/* 7. Memo & Flags */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              메모 및 특이사항
            </label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={2}
              placeholder="예: 셔틀 2호차 아파트 정문 하차, 축구화 신발장 정리"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden resize-none"
            ></textarea>
          </div>

          {/* Recurring & Return time changed toggles */}
          <div className="flex flex-wrap gap-4 pt-1">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              매주 반복 일정으로 설정
            </label>

            <label className="flex items-center gap-2 text-xs font-bold text-rose-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isReturnTimeChanged}
                onChange={(e) => setIsReturnTimeChanged(e.target.checked)}
                className="rounded text-rose-600 focus:ring-rose-500"
              />
              귀가 시간 변경 강조 표시 (강조 배지)
            </label>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md shadow-indigo-100 transition-all active:scale-95"
            >
              {initialSchedule ? '수정 사항 저장' : '일정 등록 완료'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
