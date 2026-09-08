export type MemberId = 'first_child' | 'second_child' | 'parents' | 'family';

export interface FamilyMember {
  id: MemberId;
  name: string;
  relation: string;
  color: {
    primary: string;       // e.g. '#2563eb'
    bgLight: string;       // e.g. 'bg-blue-50'
    bgBadge: string;       // e.g. 'bg-blue-100'
    text: string;          // e.g. 'text-blue-700'
    border: string;        // e.g. 'border-blue-200'
    ring: string;          // e.g. 'ring-blue-500'
    accent: string;        // e.g. 'blue'
  };
  avatar: string;          // Emoji or icon name
  roleDescription: string;
  locationTag?: string;    // e.g. '수원 동남보건대' | '목감 집 앞 학원'
  commuteNote?: string;    // e.g. '수업 모두 듣고 마지막에 대중교통으로 목감 귀가' | '도보 5분 거리'
}

export type ChecklistCategory =
  | 'supplies'      // 준비물
  | 'homework'      // 과제·학습
  | 'medication'    // 복약·건강
  | 'meal'          // 식사·간식
  | 'activity'      // 학원·활동
  | 'parent_check'; // 부모가 확인할 일

export interface ChecklistItem {
  id: string;
  scheduleId?: string;
  memberId: MemberId;
  date: string; // YYYY-MM-DD
  title: string;
  category: ChecklistCategory;
  completed: boolean;
  isImportant: boolean; // 별표 중요 표시
  memo?: string;
}

export type DinnerStatus =
  | 'required'      // 저녁 필요 (집밥)
  | 'not_required'  // 저녁 불필요 (학원/외부)
  | 'completed'     // 저녁 완료
  | 'snack_only';   // 간식만 필요

export type TransitMethod =
  | '학원 셔틀'
  | '도보'
  | '엄마 픽업'
  | '아빠 픽업'
  | '자차'
  | '자전거'
  | '대중교통'
  | '기타';

export interface Schedule {
  id: string;
  memberId: MemberId;
  date: string; // YYYY-MM-DD
  title: string;
  startTime: string; // HH:mm
  returnTime: string; // HH:mm (귀가 예정 시간)
  transitMethod: TransitMethod;
  dinnerStatus: DinnerStatus;
  guardian: string; // 담당 보호자 (엄마, 아빠, 스스로 등)
  isRecurring: boolean; // 주간 반복 여부
  memo?: string;
  isReturnTimeChanged?: boolean;
}

export interface ScheduleConflict {
  id: string;
  type: 'pickup_overlap' | 'parent_conflict' | 'return_rush';
  message: string;
  time: string;
  date?: string;
  schedules: Schedule[];
}
