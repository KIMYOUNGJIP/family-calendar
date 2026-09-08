export const DAY_NAMES_KO = ['일', '월', '화', '수', '목', '금', '토'] as const;

export function padZero(num: number): string {
  return num < 10 ? `0${num}` : `${num}`;
}

export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = padZero(date.getMonth() + 1);
  const d = padZero(date.getDate());
  return `${y}-${m}-${d}`;
}

export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function getTodayString(): string {
  return toDateString(new Date());
}

export function formatKoreanDate(dateInput: Date | string): string {
  const date = typeof dateInput === 'string' ? parseDate(dateInput) : dateInput;
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const dayName = DAY_NAMES_KO[date.getDay()];
  return `${y}년 ${m}월 ${d}일 (${dayName})`;
}

export function formatKoreanShortDate(dateInput: Date | string): string {
  const date = typeof dateInput === 'string' ? parseDate(dateInput) : dateInput;
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const dayName = DAY_NAMES_KO[date.getDay()];
  return `${m}월 ${d}일 (${dayName})`;
}

export function formatTime12(timeStr: string): string {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const period = h < 12 ? '오전' : '오후';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${period} ${hour12}:${padZero(m)}`;
}

export function addDays(dateStr: string, days: number): string {
  const date = parseDate(dateStr);
  date.setDate(date.getDate() + days);
  return toDateString(date);
}

export function isSameDay(d1: string | Date, d2: string | Date): boolean {
  const str1 = typeof d1 === 'string' ? d1 : toDateString(d1);
  const str2 = typeof d2 === 'string' ? d2 : toDateString(d2);
  return str1 === str2;
}

// 월요일부터 일요일까지 7일 계산
export function getWeekDays(targetDateStr: string): { dateStr: string; date: Date; isToday: boolean; dayOfWeek: number }[] {
  const target = parseDate(targetDateStr);
  const currentDayOfWeek = target.getDay(); // 0(Sun) ~ 6(Sat)
  // Monday as index 0:
  const diffToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
  const monday = new Date(target);
  monday.setDate(target.getDate() + diffToMonday);

  const todayStr = getTodayString();
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = toDateString(d);
    days.push({
      dateStr,
      date: d,
      isToday: dateStr === todayStr,
      dayOfWeek: d.getDay(),
    });
  }
  return days;
}

export interface MonthCell {
  dateStr: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  dayOfWeek: number; // 0: Sun, 6: Sat
}

// 캘린더 그리드 (일요일 시작)
export function getMonthGrid(year: number, month: number): MonthCell[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startDayOfWeek = firstDay.getDay(); // 0(Sun) ~ 6(Sat)
  const totalDays = lastDay.getDate();
  const todayStr = getTodayString();

  const cells: MonthCell[] = [];

  // 이전 달의 끝 날짜들
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i;
    const d = new Date(year, month - 1, day);
    const dateStr = toDateString(d);
    cells.push({
      dateStr,
      dayNumber: day,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      dayOfWeek: d.getDay(),
    });
  }

  // 이번 달 날짜들
  for (let d = 1; d <= totalDays; d++) {
    const date = new Date(year, month, d);
    const dateStr = toDateString(date);
    cells.push({
      dateStr,
      dayNumber: d,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      dayOfWeek: date.getDay(),
    });
  }

  // 다음 달 시작 날짜들로 35 또는 42칸 맞추기
  const remainder = cells.length % 7;
  const paddingNeeded = remainder === 0 ? 0 : 7 - remainder;
  for (let i = 1; i <= paddingNeeded; i++) {
    const d = new Date(year, month + 1, i);
    const dateStr = toDateString(d);
    cells.push({
      dateStr,
      dayNumber: i,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      dayOfWeek: d.getDay(),
    });
  }

  return cells;
}

// 귀가 시간까지 남은 분 수 계산
export function getMinutesUntil(timeStr: string, dateStr: string, now: Date = new Date()): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const targetDate = parseDate(dateStr);
  targetDate.setHours(hours, minutes, 0, 0);

  const diffMs = targetDate.getTime() - now.getTime();
  return Math.round(diffMs / (1000 * 60));
}

// 30분 이내 귀가 여부
export function isReturnImminent(timeStr: string, dateStr: string, now: Date = new Date()): boolean {
  if (!isSameDay(dateStr, now)) return false;
  const minutes = getMinutesUntil(timeStr, dateStr, now);
  return minutes > 0 && minutes <= 30;
}
