import { Schedule, ChecklistItem, ScheduleConflict } from '../types/calendar';
import { generateInitialData } from './sampleData';
import { addDays, parseDate, toDateString } from './dateUtils';

const STORAGE_KEY_SCHEDULES = 'family_calendar_schedules_v12';
const STORAGE_KEY_CHECKLISTS = 'family_calendar_checklists_v12';

export function loadSchedules(): Schedule[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SCHEDULES);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load schedules from localStorage', e);
  }
  const initial = generateInitialData();
  saveSchedules(initial.schedules);
  return initial.schedules;
}

export function saveSchedules(schedules: Schedule[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_SCHEDULES, JSON.stringify(schedules));
  } catch (e) {
    console.error('Failed to save schedules to localStorage', e);
  }
}

export function loadChecklists(): ChecklistItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CHECKLISTS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load checklists from localStorage', e);
  }
  const initial = generateInitialData();
  saveChecklists(initial.checklists);
  return initial.checklists;
}

export function saveChecklists(checklists: ChecklistItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CHECKLISTS, JSON.stringify(checklists));
  } catch (e) {
    console.error('Failed to save checklists to localStorage', e);
  }
}

export function resetAllData(): { schedules: Schedule[]; checklists: ChecklistItem[] } {
  localStorage.removeItem(STORAGE_KEY_SCHEDULES);
  localStorage.removeItem(STORAGE_KEY_CHECKLISTS);
  const fresh = generateInitialData();
  saveSchedules(fresh.schedules);
  saveChecklists(fresh.checklists);
  return fresh;
}

// 충돌 감지 로직
export function detectConflicts(schedules: Schedule[], targetDate?: string): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];

  // 특정 날짜만 보거나 전체 대상
  const groupedByDate: Record<string, Schedule[]> = {};
  for (const s of schedules) {
    if (targetDate && s.date !== targetDate) continue;
    if (!groupedByDate[s.date]) groupedByDate[s.date] = [];
    groupedByDate[s.date].push(s);
  }

  for (const [date, daySchedules] of Object.entries(groupedByDate)) {
    // 1. 픽업 및 귀가 시간 20분 이내 중복 체크
    for (let i = 0; i < daySchedules.length; i++) {
      for (let j = i + 1; j < daySchedules.length; j++) {
        const s1 = daySchedules[i];
        const s2 = daySchedules[j];

        // 자녀 일정끼리의 귀가 시간 근접 & 동일 픽업자 충돌
        // 단, 학원 간 바로 이동하는 일정이나 은비의 앞선 강의(교내 체류)는 실제 귀가 시간이 아니므로 제외
        const isS1Transit = s1.memo?.includes('귀가하지 않고') || s1.memo?.includes('바로 이동') || s1.memo?.includes('다음 강의 대기');
        const isS2Transit = s2.memo?.includes('귀가하지 않고') || s2.memo?.includes('바로 이동') || s2.memo?.includes('다음 강의 대기');

        if (
          (s1.memberId === 'first_child' || s1.memberId === 'second_child') &&
          (s2.memberId === 'first_child' || s2.memberId === 'second_child') &&
          s1.memberId !== s2.memberId &&
          !isS1Transit &&
          !isS2Transit
        ) {
          const [h1, m1] = s1.returnTime.split(':').map(Number);
          const [h2, m2] = s2.returnTime.split(':').map(Number);
          const time1 = h1 * 60 + m1;
          const time2 = h2 * 60 + m2;
          const diff = Math.abs(time1 - time2);

          if (diff <= 20) {
            const isSamePickup =
              (s1.transitMethod.includes('픽업') || s2.transitMethod.includes('픽업')) &&
              s1.guardian === s2.guardian &&
              s1.guardian !== '스스로 귀가';

            if (isSamePickup) {
              conflicts.push({
                id: `conflict-${s1.id}-${s2.id}`,
                type: 'pickup_overlap',
                message: `[픽업 충돌 주의] ${s1.guardian} 담당자가 ${s1.returnTime}(${s1.title})와 ${s2.returnTime}(${s2.title})의 픽업 시간이 ${diff}분 차이로 겹칩니다!`,
                time: `${s1.returnTime} / ${s2.returnTime}`,
                schedules: [s1, s2],
              });
            } else if (diff <= 10) {
              conflicts.push({
                id: `conflict-rush-${s1.id}-${s2.id}`,
                type: 'return_rush',
                message: `[귀가 집중 시간] 은비(${s1.returnTime})와 하율(${s2.returnTime})이가 거의 동시에 귀가합니다. (${diff}분 간격)`,
                time: `${s1.returnTime}`,
                schedules: [s1, s2],
              });
            }
          }
        }

        // 부모 일정과 자녀 픽업의 충돌
        if (
          (s1.memberId === 'parents' && (s2.memberId === 'first_child' || s2.memberId === 'second_child')) ||
          (s2.memberId === 'parents' && (s1.memberId === 'first_child' || s1.memberId === 'second_child'))
        ) {
          const parentSch = s1.memberId === 'parents' ? s1 : s2;
          const childSch = s1.memberId === 'parents' ? s2 : s1;

          const [phStart, pmStart] = parentSch.startTime.split(':').map(Number);
          const [phEnd, pmEnd] = parentSch.returnTime.split(':').map(Number);
          const [ch, cm] = childSch.returnTime.split(':').map(Number);

          const parentStart = phStart * 60 + pmStart;
          const parentEnd = phEnd * 60 + pmEnd;
          const childReturn = ch * 60 + cm;

          // 부모 야근이나 일정 시간 동안 자녀 픽업이 필요한 경우
          if (childReturn >= parentStart && childReturn <= parentEnd && childSch.transitMethod.includes('픽업')) {
            conflicts.push({
              id: `conflict-parent-${parentSch.id}-${childSch.id}`,
              type: 'parent_conflict',
              message: `[보호자 일정 충돌] '${parentSch.title}'(${parentSch.startTime}~${parentSch.returnTime}) 시간에 자녀 픽업(${childSch.returnTime})이 배정되어 있습니다.`,
              time: `${childSch.returnTime}`,
              schedules: [parentSch, childSch],
            });
          }
        }
      }
    }
  }

  return conflicts;
}

// 미완료 항목 다음 날로 넘기기
export function rolloverIncompleteTasks(currentDate: string, checklists: ChecklistItem[]): ChecklistItem[] {
  const nextDate = addDays(currentDate, 1);
  const updated = [...checklists];

  let rolledCount = 0;
  for (const item of updated) {
    if (item.date === currentDate && !item.completed) {
      item.date = nextDate;
      item.title = item.title.startsWith('[이월] ') ? item.title : `[이월] ${item.title}`;
      rolledCount++;
    }
  }

  if (rolledCount > 0) {
    saveChecklists(updated);
  }
  return updated;
}
