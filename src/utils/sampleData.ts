import { FamilyMember, MemberId, Schedule, ChecklistItem } from '../types/calendar';
import { REAL_GOOGLE_SCHEDULES } from '../data/realGoogleSchedules';

export const FAMILY_MEMBERS: Record<MemberId, FamilyMember> = {
  first_child: {
    id: 'first_child',
    name: '첫째 은비',
    relation: '첫째 (김은비)',
    color: {
      primary: '#2563eb',
      bgLight: 'bg-blue-50',
      bgBadge: 'bg-blue-100 text-blue-800',
      text: 'text-blue-600',
      border: 'border-blue-200',
      ring: 'ring-blue-400',
      accent: 'blue',
    },
    avatar: '👧',
    roleDescription: '수원 동남보건대 재학 · 대중교통 통학 (모든 수업 종료 후 목감 귀가)',
    locationTag: '수원 동남보건대',
    commuteNote: '수업 모두 듣고 마지막에 대중교통으로 목감 귀가 (약 1시간 30분 소요)',
  },
  second_child: {
    id: 'second_child',
    name: '둘째 하율',
    relation: '둘째 (김하율)',
    color: {
      primary: '#059669',
      bgLight: 'bg-emerald-50',
      bgBadge: 'bg-emerald-100 text-emerald-800',
      text: 'text-emerald-600',
      border: 'border-emerald-200',
      ring: 'ring-emerald-400',
      accent: 'emerald',
    },
    avatar: '🧒',
    roleDescription: '목감 집 앞 학원 (도보 5분 거리 · 도보 귀가)',
    locationTag: '목감 집 앞 학원 (도보 5분)',
    commuteNote: '목감 집 앞 도보 5분 거리 학원 (수업 후 5분 내 귀가)',
  },
  parents: {
    id: 'parents',
    name: '나 & 아내 (부모)',
    relation: '아빠 & 엄마',
    color: {
      primary: '#7c3aed',
      bgLight: 'bg-purple-50',
      bgBadge: 'bg-purple-100 text-purple-800',
      text: 'text-purple-600',
      border: 'border-purple-200',
      ring: 'ring-purple-400',
      accent: 'purple',
    },
    avatar: '💼',
    roleDescription: '시흥시 목감동 부모 · 퇴근 및 저녁 식사 준비',
    locationTag: '시흥시 목감동 우리집',
    commuteNote: '아이들 귀가 맞이 및 저녁 식사 준비',
  },
  family: {
    id: 'family',
    name: '우리 가족 (4인)',
    relation: '시흥 목감 은비·하율이네',
    color: {
      primary: '#ea580c',
      bgLight: 'bg-orange-50',
      bgBadge: 'bg-orange-100 text-orange-800',
      text: 'text-orange-600',
      border: 'border-orange-200',
      ring: 'ring-orange-400',
      accent: 'orange',
    },
    avatar: '🏠',
    roleDescription: '시흥시 목감동 4인 가족 (은비·하율이네)',
    locationTag: '시흥시 목감동',
    commuteNote: '가족 전체 행사 및 주말 일정',
  },
};

export function generateInitialData(): { schedules: Schedule[]; checklists: ChecklistItem[] } {
  // 실제 구글 가족 캘린더에서 가져온 일정만 포함
  const schedules: Schedule[] = [...REAL_GOOGLE_SCHEDULES];
  const checklists: ChecklistItem[] = [];

  return { schedules, checklists };
}
