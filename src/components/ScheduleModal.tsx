import React, { useState, useEffect } from 'react';
import { Schedule, MemberId, DinnerStatus, TransitMethod } from '../types/calendar';
import { getTodayString } from '../utils/dateUtils';
import { X, Calendar, AlertTriangle, ChevronDown, ChevronUp, Settings2 } from 'lucide-react';

type SelectableRole = 'first_child' | 'second_child' | 'dad' | 'mom' | 'family';

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
  const [selectedRole, setSelectedRole] = useState<SelectableRole>('family');
  const [memberId, setMemberId] = useState<MemberId>('family');
  const [date, setDate] = useState<string>(defaultDate || getTodayString());
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('14:00');
  const [returnTime, setReturnTime] = useState('16:00');
  const [transitMethod, setTransitMethod] = useState<TransitMethod>('자차');
  const [dinnerStatus, setDinnerStatus] = useState<DinnerStatus>('not_required');
  const [guardian, setGuardian] = useState('온 가족');
  const [isRecurring, setIsRecurring] = useState(false);
  const [memo, setMemo] = useState('');
  const [isReturnTimeChanged, setIsReturnTimeChanged] = useState(false);
  const [showAdvancedDinnerOptions, setShowAdvancedDinnerOptions] = useState(false);

  const inferRoleFromSchedule = (sch: Schedule): SelectableRole => {
    if (sch.memberId === 'first_child') return 'first_child';
    if (sch.memberId === 'second_child') return 'second_child';
    if (sch.memberId === 'parents') {
      const t = `${sch.title} ${sch.guardian || ''}`.toLowerCase();
      if (
        t.includes('엄마') ||
        t.includes('아내') ||
        t.includes('마누라') ||
        t.includes('미선') ||
        t.includes('여전도') ||
        t.includes('8여')
      ) {
        return 'mom';
      }
      return 'dad';
    }
    return 'family';
  };

  useEffect(() => {
    if (initialSchedule) {
      const role = inferRoleFromSchedule(initialSchedule);
      setSelectedRole(role);
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
      setShowAdvancedDinnerOptions(false);
    } else {
      setSelectedRole('family');
      setMemberId('family');
      setDate(defaultDate || getTodayString());
      setTitle('');
      setStartTime('14:00');
      setReturnTime('16:00');
      setTransitMethod('자차');
      setDinnerStatus('not_required');
      setGuardian('온 가족');
      setIsRecurring(false);
      setMemo('');
      setIsReturnTimeChanged(false);
      setShowAdvancedDinnerOptions(false);
    }
  }, [initialSchedule, defaultDate, isOpen]);

  const handleSelectRole = (role: SelectableRole) => {
    setSelectedRole(role);
    if (role === 'first_child') {
      setMemberId('first_child');
      if (!initialSchedule) {
        setTransitMethod('대중교통');
        setGuardian('스스로 귀가');
        setDinnerStatus('required');
      }
    } else if (role === 'second_child') {
      setMemberId('second_child');
      if (!initialSchedule) {
        setTransitMethod('도보');
        setGuardian('스스로 귀가');
        setDinnerStatus('required');
      }
    } else if (role === 'dad') {
      setMemberId('parents');
      setGuardian('나(아빠)');
      if (!initialSchedule) {
        setTransitMethod('자차');
        setDinnerStatus('not_required');
      }
    } else if (role === 'mom') {
      setMemberId('parents');
      setGuardian('엄마');
      if (!initialSchedule) {
        setTransitMethod('자차');
        setDinnerStatus('not_required');
      }
    } else {
      setMemberId('family');
      setGuardian('온 가족');
      if (!initialSchedule) {
        setTransitMethod('자차');
        setDinnerStatus('not_required');
      }
    }
  };

  if (!isOpen) return null;

  // 동일 날짜 충돌 여부 실시간 확인
  const potentialConflict = existingSchedules.find((s) => {
    if (initialSchedule && s.id === initialSchedule.id) return false;
    if (s.date !== date) return false;
    const [h1, m1] = returnTime.split(':').map(Number);
    const [h2, m2] = s.returnTime.split(':').map(Number);
    const diff = Math.abs(h1 * 60 + m1 - (h2 * 60 + m2));
    return diff <= 20 && s.guardian === guardian && guardian !== '스스로 귀가' && guardian !== '온 가족';
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const payload = {
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
    };

    if (initialSchedule && onUpdate) {
      onUpdate(initialSchedule.id, payload);
    } else {
      onSave(payload);
    }
    onClose();
  };

  const roleButtons: {
    role: SelectableRole;
    label: string;
    subLabel: string;
    avatar: string;
    activeClass: string;
  }[] = [
    {
      role: 'first_child',
      label: '첫째 은비',
      subLabel: '동남보건대',
      avatar: '👧',
      activeClass: 'bg-blue-50 border-blue-400 ring-2 ring-blue-300 text-blue-900',
    },
    {
      role: 'second_child',
      label: '둘째 하율',
      subLabel: '학교·학원',
      avatar: '🧒',
      activeClass: 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-300 text-emerald-900',
    },
    {
      role: 'dad',
      label: '아빠',
      subLabel: '나(남편)',
      avatar: '👨',
      activeClass: 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-300 text-indigo-900',
    },
    {
      role: 'mom',
      label: '엄마',
      subLabel: '아내',
      avatar: '👩',
      activeClass: 'bg-rose-50 border-rose-400 ring-2 ring-rose-300 text-rose-900',
    },
    {
      role: 'family',
      label: '가족 공통',
      subLabel: '온 가족 행사',
      avatar: '🏠',
      activeClass: 'bg-amber-50 border-amber-400 ring-2 ring-amber-300 text-amber-900',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur-xs z-10">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-indigo-50 text-indigo-600 font-bold">
              <Calendar className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                {initialSchedule ? '가족 일정 수정' : '새 가족 일정 등록'}
              </h3>
              <p className="text-xs text-slate-400">
                구성원과 시간, 일정 이름을 입력해 간편하게 등록하세요.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
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
                <strong className="block font-bold">동일 시간대 일정 근접 안내</strong>
                {potentialConflict.guardian}의 &apos;{potentialConflict.title}&apos; 시간({potentialConflict.returnTime})과 20분 이내로 겹칩니다.
              </div>
            </div>
          )}

          {/* 1. 5-Member Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              대상 가족 구성원 <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {roleButtons.map((btn) => {
                const isSelected = selectedRole === btn.role;
                return (
                  <button
                    type="button"
                    key={btn.role}
                    onClick={() => handleSelectRole(btn.role)}
                    className={`p-2 rounded-xl border text-center flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      isSelected
                        ? `${btn.activeClass} font-extrabold shadow-2xs`
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold'
                    }`}
                  >
                    <span className="text-lg">{btn.avatar}</span>
                    <span className="text-xs truncate w-full">{btn.label}</span>
                    <span className="text-[10px] text-slate-400 truncate w-full">{btn.subLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Date & Title */}
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
                일정 이름 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 아빠 저녁약속, 여전도회 모임, 안과 진료"
                required
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-semibold"
              />
            </div>
          </div>

          {/* 3. Start Time & End/Return Time */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
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
              <label className="block text-[11px] font-bold text-indigo-700 mb-1">
                종료(또는 귀가) 시간
              </label>
              <input
                type="time"
                value={returnTime}
                onChange={(e) => setReturnTime(e.target.value)}
                required
                className="w-full text-xs font-bold p-2 rounded-xl bg-white border border-indigo-300 text-indigo-950 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* 4. Place / Memo */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              장소 / 메모 (선택)
            </label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={2}
              placeholder="예: 목감 중심상가 식당, 준비물 챙기기 등"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden resize-none"
            ></textarea>
          </div>

          {/* 5. Recurring Toggle */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              매주 같은 요일에 반복 등록 (4주간)
            </label>

            <button
              type="button"
              onClick={() => setShowAdvancedDinnerOptions((prev) => !prev)}
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-indigo-600 cursor-pointer"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>저녁·귀가 브리핑 옵션</span>
              {showAdvancedDinnerOptions ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* 6. Collapsible Dinner & Return Briefing Options */}
          {showAdvancedDinnerOptions && (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3 animate-fadeIn">
              <div className="text-[11px] font-bold text-slate-500">
                🍚 부가 메뉴(저녁·귀가 챙기기 탭)에 표시될 세부 정보입니다.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  저녁 식사 여부
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs font-semibold">
                  {[
                    { id: 'required', label: '🍚 집밥 필요', color: 'border-amber-400 bg-amber-50 text-amber-900' },
                    { id: 'not_required', label: '외부 식사/불필요', color: 'border-slate-300 bg-white text-slate-700' },
                    { id: 'snack_only', label: '🥪 간단 간식', color: 'border-orange-300 bg-orange-50 text-orange-900' },
                    { id: 'completed', label: '✅ 식사 완료', color: 'border-emerald-300 bg-emerald-50 text-emerald-900' },
                  ].map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => setDinnerStatus(item.id as DinnerStatus)}
                      className={`p-2 rounded-xl border transition-all text-center cursor-pointer ${
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    이동 방법
                  </label>
                  <select
                    value={transitMethod}
                    onChange={(e) => setTransitMethod(e.target.value as TransitMethod)}
                    className="w-full text-xs font-semibold p-2 rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="자차">🚗 자차</option>
                    <option value="도보">🚶 도보</option>
                    <option value="대중교통">🚇 대중교통(지하철/버스)</option>
                    <option value="학원 셔틀">🚌 학원 셔틀</option>
                    <option value="엄마 픽업">🚗 엄마 픽업</option>
                    <option value="아빠 픽업">🚗 아빠 픽업</option>
                    <option value="기타">기타</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    담당자 / 구분
                  </label>
                  <input
                    type="text"
                    value={guardian}
                    onChange={(e) => setGuardian(e.target.value)}
                    placeholder="예: 나(아빠), 엄마, 스스로 귀가"
                    className="w-full text-xs font-semibold p-2 rounded-xl border border-slate-300 bg-white"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs font-bold text-rose-700 cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  checked={isReturnTimeChanged}
                  onChange={(e) => setIsReturnTimeChanged(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                귀가 시간 변경 강조 표시
              </label>
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md shadow-indigo-100 transition-all active:scale-95 cursor-pointer"
            >
              {initialSchedule ? '수정 사항 저장' : '일정 등록 완료'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
