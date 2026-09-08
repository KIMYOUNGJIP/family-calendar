import React, { useState } from 'react';
import { ChecklistItem, ChecklistCategory, MemberId } from '../types/calendar';
import { FAMILY_MEMBERS } from '../utils/sampleData';
import { formatKoreanShortDate, getTodayString } from '../utils/dateUtils';
import confetti from 'canvas-confetti';
import {
  CheckSquare,
  Square,
  Star,
  Plus,
  Trash2,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Package,
  BookOpen,
  Pill,
  Utensils,
  Award,
  ShieldCheck,
  Calendar,
  Filter,
} from 'lucide-react';

interface ChecklistSectionProps {
  checklists: ChecklistItem[];
  selectedDateStr: string;
  onToggleComplete: (id: string) => void;
  onToggleImportant: (id: string) => void;
  onAddItem: (item: Omit<ChecklistItem, 'id'>) => void;
  onDeleteItem: (id: string) => void;
  onRolloverIncomplete: (dateStr: string) => void;
  memberFilter: 'all' | MemberId;
  incompleteOnly: boolean;
  onToggleIncompleteOnly: () => void;
}

const CATEGORY_MAP: Record<ChecklistCategory, { label: string; icon: React.ReactNode; color: string }> = {
  supplies: { label: '준비물', icon: <Package className="w-3.5 h-3.5" />, color: 'bg-blue-50 text-blue-700 border-blue-200' },
  homework: { label: '과제·학습', icon: <BookOpen className="w-3.5 h-3.5" />, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  medication: { label: '복약·건강', icon: <Pill className="w-3.5 h-3.5" />, color: 'bg-rose-50 text-rose-700 border-rose-200' },
  meal: { label: '식사·간식', icon: <Utensils className="w-3.5 h-3.5" />, color: 'bg-amber-50 text-amber-700 border-amber-200' },
  activity: { label: '학원·활동', icon: <Award className="w-3.5 h-3.5" />, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  parent_check: { label: '부모 확인', icon: <ShieldCheck className="w-3.5 h-3.5" />, color: 'bg-purple-50 text-purple-700 border-purple-200' },
};

export const ChecklistSection: React.FC<ChecklistSectionProps> = ({
  checklists,
  selectedDateStr,
  onToggleComplete,
  onToggleImportant,
  onAddItem,
  onDeleteItem,
  onRolloverIncomplete,
  memberFilter,
  incompleteOnly,
  onToggleIncompleteOnly,
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | ChecklistCategory>('all');
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<ChecklistCategory>('supplies');
  const [newMemberId, setNewMemberId] = useState<MemberId>('first_child');
  const [newIsImportant, setNewIsImportant] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const todayStr = getTodayString();
  const isSelectedToday = selectedDateStr === todayStr;

  // 선택된 날짜의 체크리스트
  const dateChecklists = checklists.filter((item) => item.date === selectedDateStr);

  // 구성원 & 카테고리 & 미완료 필터링
  const filteredItems = dateChecklists.filter((item) => {
    if (memberFilter !== 'all' && item.memberId !== memberFilter) return false;
    if (activeCategory !== 'all' && item.category !== activeCategory) return false;
    if (incompleteOnly && item.completed) return false;
    return true;
  });

  // 완료율 통계 (선택된 날짜 전체 기준)
  const totalCount = dateChecklists.length;
  const completedCount = dateChecklists.filter((i) => i.completed).length;
  const completionRate = totalCount === 0 ? 100 : Math.round((completedCount / totalCount) * 100);
  const isAllDone = totalCount > 0 && completedCount === totalCount;

  // 전체 완료 시 축하 폭죽 효과
  const triggerConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  const handleToggle = (id: string, currentlyCompleted: boolean) => {
    onToggleComplete(id);
    if (!currentlyCompleted && completedCount + 1 === totalCount) {
      triggerConfetti();
    }
  };

  const handleAddNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    onAddItem({
      memberId: newMemberId,
      date: selectedDateStr,
      title: newTitle.trim(),
      category: newCategory,
      completed: false,
      isImportant: newIsImportant,
    });

    setNewTitle('');
    setNewIsImportant(false);
    setIsAdding(false);
  };

  return (
    <section id="checklist-section" className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-6 mb-8 scroll-mt-20">
      {/* Section Top Title & Rollover Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-black text-slate-900">
              ✅ 자녀별 챙길 일 체크리스트
            </h2>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
              {formatKoreanShortDate(selectedDateStr)} 기준
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            준비물, 과제, 복약 등 자녀별 필수 점검 사항을 체크하고 관리합니다.
          </p>
        </div>

        {/* Rollover to tomorrow button */}
        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          {totalCount - completedCount > 0 && (
            <button
              onClick={() => onRolloverIncomplete(selectedDateStr)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all active:scale-95"
              title="오늘 미완료된 항목들을 내일 일정으로 자동 이월합니다"
            >
              <span>미완료 항목 내일로 넘기기</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all active:scale-95 shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>챙길 일 추가</span>
          </button>
        </div>
      </div>

      {/* Progress & Celebration Banner */}
      <div className="mb-5 p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            오늘의 챙길 일 달성률: {completedCount} / {totalCount} 완료
          </span>
          <span className="text-sm font-black text-indigo-600">{completionRate}%</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-linear-to-r from-indigo-500 via-purple-500 to-emerald-500 h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${completionRate}%` }}
          ></div>
        </div>

        {/* All Done Celebration Message */}
        {isAllDone && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center justify-between gap-2 animate-bounce-short">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="text-xs sm:text-sm font-extrabold">
                🎉 축하합니다! {formatKoreanShortDate(selectedDateStr)} 챙길 일을 모두 완료했습니다!
              </span>
            </div>
            <button
              onClick={triggerConfetti}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded-lg shrink-0"
            >
              폭죽 터뜨리기 🎊
            </button>
          </div>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-4 no-scrollbar">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
            activeCategory === 'all'
              ? 'bg-slate-800 text-white shadow-2xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          전체 보기 ({dateChecklists.length})
        </button>

        {(Object.keys(CATEGORY_MAP) as ChecklistCategory[]).map((cat) => {
          const info = CATEGORY_MAP[cat];
          const count = dateChecklists.filter((i) => i.category === cat).length;
          const isSelected = activeCategory === cat;

          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 border transition-all ${
                isSelected
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>{info.icon}</span>
              <span>{info.label}</span>
              <span className="opacity-70 text-[11px]">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Inline Add Item Form */}
      {isAdding && (
        <form onSubmit={handleAddNewItem} className="mb-4 p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-3 animate-fadeIn">
          <h4 className="text-xs font-extrabold text-indigo-900">새 챙길 일 등록</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Member */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">대상 가족</label>
              <select
                value={newMemberId}
                onChange={(e) => setNewMemberId(e.target.value as MemberId)}
                className="w-full text-xs font-semibold p-2 rounded-xl bg-white border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="first_child">{FAMILY_MEMBERS.first_child.name}</option>
                <option value="second_child">{FAMILY_MEMBERS.second_child.name}</option>
                <option value="parents">{FAMILY_MEMBERS.parents.name}</option>
                <option value="family">{FAMILY_MEMBERS.family.name}</option>
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">카테고리</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as ChecklistCategory)}
                className="w-full text-xs font-semibold p-2 rounded-xl bg-white border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              >
                <option value="supplies">준비물</option>
                <option value="homework">과제·학습</option>
                <option value="medication">복약·건강</option>
                <option value="meal">식사·간식</option>
                <option value="activity">학원·활동</option>
                <option value="parent_check">부모 확인</option>
              </select>
            </div>

            {/* Title & Important */}
            <div className="sm:col-span-1 flex items-end pb-1">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newIsImportant}
                  onChange={(e) => setNewIsImportant(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <Star className={`w-3.5 h-3.5 ${newIsImportant ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
                중요 항목 표시
              </label>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="예: 학교 준비물 가방에 넣기, 저녁 비염 약 먹기"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="flex-1 text-xs p-2.5 rounded-xl bg-white border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              autoFocus
            />
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-2xs"
            >
              저장
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-xl"
            >
              취소
            </button>
          </div>
        </form>
      )}

      {/* Checklist Items List */}
      <div className="space-y-2">
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
            {incompleteOnly ? '미완료된 항목이 없습니다. 모두 완료했습니다! 🎉' : '등록된 챙길 일이 없습니다.'}
          </div>
        ) : (
          filteredItems.map((item) => {
            const member = FAMILY_MEMBERS[item.memberId];
            const catInfo = CATEGORY_MAP[item.category];

            return (
              <div
                key={item.id}
                className={`p-3 sm:p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  item.completed
                    ? 'bg-slate-50/80 border-slate-200/80 text-slate-400 opacity-65'
                    : item.isImportant
                    ? 'bg-amber-50/40 border-amber-300 text-slate-900 shadow-2xs ring-1 ring-amber-200'
                    : 'bg-white border-slate-200/90 text-slate-800 shadow-2xs hover:border-slate-300'
                }`}
              >
                {/* Checkbox and Title */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => handleToggle(item.id, item.completed)}
                    className="p-0.5 text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
                    aria-label={item.completed ? '미완료로 변경' : '완료로 표시'}
                  >
                    {item.completed ? (
                      <CheckSquare className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <Square className="w-5 h-5 hover:text-indigo-600" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${member.color.bgBadge}`}>
                        {member.avatar} {member.name}
                      </span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-md border flex items-center gap-0.5 ${catInfo.color}`}>
                        {catInfo.icon}
                        {catInfo.label}
                      </span>
                      {item.isImportant && (
                        <span className="text-[10px] font-extrabold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded-md">
                          ★ 필수
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-xs sm:text-sm font-semibold mt-1 break-words ${
                        item.completed ? 'line-through text-slate-400 font-normal' : 'text-slate-800'
                      }`}
                    >
                      {item.title}
                    </p>
                  </div>
                </div>

                {/* Star & Delete */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onToggleImportant(item.id)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      item.isImportant
                        ? 'text-amber-500 hover:bg-amber-100'
                        : 'text-slate-300 hover:text-amber-400 hover:bg-slate-100'
                    }`}
                    title={item.isImportant ? '중요 해제' : '중요 표시'}
                  >
                    <Star className={`w-4 h-4 ${item.isImportant ? 'fill-amber-400' : ''}`} />
                  </button>

                  <button
                    onClick={() => onDeleteItem(item.id)}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};
