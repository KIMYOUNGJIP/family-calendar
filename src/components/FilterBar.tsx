import React from 'react';
import { MemberId } from '../types/calendar';
import { FAMILY_MEMBERS } from '../utils/sampleData';
import { Filter } from 'lucide-react';

export type TimeFilter = 'all' | 'today' | 'this_week';
export type MemberFilter = 'all' | MemberId;

interface FilterBarProps {
  memberFilter: MemberFilter;
  onSelectMember: (member: MemberFilter) => void;
  timeFilter: TimeFilter;
  onSelectTime: (time: TimeFilter) => void;
  totalScheduleCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  memberFilter,
  onSelectMember,
  timeFilter,
  onSelectTime,
  totalScheduleCount,
}) => {
  const members: { id: MemberFilter; label: string; avatar: string; color: string }[] = [
    { id: 'all', label: '전체 가족 (4인)', avatar: '👨‍👩‍👧‍👦', color: 'bg-slate-800 text-white' },
    { id: 'first_child', label: '첫째 은비 (파랑)', avatar: FAMILY_MEMBERS.first_child.avatar, color: 'bg-blue-600 text-white' },
    { id: 'second_child', label: '둘째 하율 (초록)', avatar: FAMILY_MEMBERS.second_child.avatar, color: 'bg-emerald-600 text-white' },
    { id: 'parents', label: '나 & 아내 (보라)', avatar: FAMILY_MEMBERS.parents.avatar, color: 'bg-purple-600 text-white' },
    { id: 'family', label: '가족 공통 (주황)', avatar: FAMILY_MEMBERS.family.avatar, color: 'bg-amber-600 text-white' },
  ];

  return (
    <section className="bg-white border-b border-slate-200 py-3 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Member Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1 pr-1 shrink-0">
              <Filter className="w-3.5 h-3.5" />
              구성원:
            </span>
            {members.map((m) => {
              const isSelected = memberFilter === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => onSelectMember(m.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all active:scale-95 ${
                    isSelected
                      ? `${m.color} shadow-xs ring-2 ring-offset-1 ring-slate-400`
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span className="text-sm">{m.avatar}</span>
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Time View Buttons */}
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 flex-wrap">
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-semibold">
              <button
                onClick={() => onSelectTime('today')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  timeFilter === 'today' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                오늘
              </button>
              <button
                onClick={() => onSelectTime('this_week')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  timeFilter === 'this_week' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                이번 주
              </button>
              <button
                onClick={() => onSelectTime('all')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  timeFilter === 'all' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                전체
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
