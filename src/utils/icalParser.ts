import { Schedule, MemberId, DinnerStatus, TransitMethod } from '../types/calendar';
import { padZero } from './dateUtils';

export function parseICSDateTime(dtStr: string): { date: string; time: string } | null {
  if (!dtStr) return null;

  // Clean value (e.g. TZID=Asia/Seoul:20260908T170000 or 20260908T080000Z or 20260908)
  const val = dtStr.includes(':') ? dtStr.split(':').pop()! : dtStr;

  if (val.length === 8) {
    // YYYYMMDD (All day)
    const y = val.slice(0, 4);
    const m = val.slice(4, 6);
    const d = val.slice(6, 8);
    return { date: `${y}-${m}-${d}`, time: '09:00' };
  }

  // YYYYMMDDTHHMMSS...
  const match = val.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?/);
  if (match) {
    const [_, y, m, d, hh, mm, ss, isUtc] = match;
    if (isUtc) {
      // Convert UTC to KST (+9 hours)
      const utcDate = new Date(Date.UTC(+y, +m - 1, +d, +hh, +mm, +ss));
      const kstYear = utcDate.getFullYear();
      const kstMonth = padZero(utcDate.getMonth() + 1);
      const kstDay = padZero(utcDate.getDate());
      const kstHour = padZero(utcDate.getHours());
      const kstMin = padZero(utcDate.getMinutes());
      return {
        date: `${kstYear}-${kstMonth}-${kstDay}`,
        time: `${kstHour}:${kstMin}`,
      };
    } else {
      return {
        date: `${y}-${m}-${d}`,
        time: `${hh}:${mm}`,
      };
    }
  }

  return null;
}

export function inferMemberId(title: string, description: string = ''): MemberId {
  const text = `${title} ${description}`.toLowerCase();

  if (
    text.includes('은비') ||
    text.includes('[은비]') ||
    text.includes('첫째') ||
    text.includes('대학') ||
    text.includes('동남') ||
    text.includes('보건대') ||
    text.includes('작업치료')
  ) {
    return 'first_child';
  }
  if (
    text.includes('하율') ||
    text.includes('[하율]') ||
    text.includes('둘째') ||
    text.includes('태권도') ||
    text.includes('지필')
  ) {
    return 'second_child';
  }
  if (
    text.includes('수업') ||
    text.includes('학교') ||
    text.includes('업무') ||
    text.includes('장학') ||
    text.includes('연수') ||
    text.includes('아내') ||
    text.includes('마누라') ||
    text.includes('남편') ||
    text.includes('출근') ||
    text.includes('퇴근') ||
    text.includes('야근') ||
    text.includes('회식') ||
    text.includes('모임') ||
    text.includes('약속') ||
    text.includes('동창') ||
    text.includes('동호회') ||
    text.includes('송년') ||
    text.includes('신년') ||
    text.includes('저녁식사') ||
    text.includes('저녁 식사') ||
    text.includes('외식') ||
    text.includes('아빠') ||
    text.includes('엄마') ||
    text.includes('영집') ||
    text.includes('미선')
  ) {
    return 'parents';
  }
  return 'family';
}

function addMinutes(timeStr: string, mins: number): string {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + mins;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${padZero(newH)}:${padZero(newM)}`;
}

function getDayName(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const map = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  return map[dt.getDay()];
}

function addDateDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${padZero(dt.getMonth() + 1)}-${padZero(dt.getDate())}`;
}

// 2026 공휴일 및 명절 (수업·학원 없는 날)
const KOREAN_HOLIDAYS_2026 = new Set([
  '2026-09-24', // 추석 연휴
  '2026-09-25', // 추석
  '2026-09-26', // 추석 연휴
  '2026-10-03', // 개천절
  '2026-10-05', // 개천절 대체공휴일
  '2026-10-09', // 한글날
  '2026-12-25', // 크리스마스 / 성탄절
  '2027-01-01', // 신정
]);

export function parseICSContent(icsText: string): Schedule[] {
  const lines = icsText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  // Unfold folded lines (lines starting with space or tab)
  const unfolded: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if ((line.startsWith(' ') || line.startsWith('\t')) && unfolded.length > 0) {
      unfolded[unfolded.length - 1] += line.slice(1);
    } else {
      unfolded.push(line);
    }
  }

  let inEvent = false;
  let currentEvent: Record<string, any> = { exdates: [] };
  const rawList: Array<{
    memberId: MemberId;
    date: string;
    title: string;
    startTime: string;
    endTime: string;
    location: string;
    desc: string;
  }> = [];

  for (const line of unfolded) {
    if (line.startsWith('BEGIN:VEVENT')) {
      inEvent = true;
      currentEvent = { exdates: [] };
      continue;
    }

    if (line.startsWith('END:VEVENT')) {
      inEvent = false;

      const summary = currentEvent['SUMMARY_VAL'] || (currentEvent['SUMMARY'] ? currentEvent['SUMMARY'].split(':').slice(1).join(':') : '구글 캘린더 일정');
      const dtStartRaw = currentEvent['DTSTART'] || '';
      const dtEndRaw = currentEvent['DTEND'] || '';
      const desc = currentEvent['DESCRIPTION_VAL'] || '';
      const location = currentEvent['LOCATION_VAL'] || '';
      const rrule = currentEvent['RRULE_VAL'] || (currentEvent['RRULE'] ? currentEvent['RRULE'].split(':').slice(1).join(':') : '');
      const exdates = new Set<string>(currentEvent.exdates || []);

      const startParsed = parseICSDateTime(dtStartRaw);
      const endParsed = parseICSDateTime(dtEndRaw);

      if (startParsed) {
        const memberId = inferMemberId(summary, desc);
        const startTime = startParsed.time || '14:00';
        const endTime = endParsed ? endParsed.time : '18:00';

        const isWeekly = rrule.includes('FREQ=WEEKLY');
        const byDayMatch = rrule.match(/BYDAY=([A-Z,]+)/);
        const untilMatch = rrule.match(/UNTIL=(\d{8})/);

        const isClassOrAcademy =
          summary.includes('수업') ||
          summary.includes('학교') ||
          summary.includes('학원') ||
          summary.includes('영어') ||
          summary.includes('수학') ||
          summary.includes('태권도') ||
          summary.includes('강의') ||
          summary.includes('보조공학') ||
          summary.includes('해부학') ||
          summary.includes('생리학') ||
          summary.includes('심리학') ||
          summary.includes('재활의학') ||
          summary.includes('[은비]') ||
          summary.includes('[하율]');

        if (isWeekly && startParsed.date >= '2026-03-01') {
          const targetDays = byDayMatch ? byDayMatch[1].split(',') : [getDayName(startParsed.date)];
          const untilDate = untilMatch
            ? `${untilMatch[1].slice(0, 4)}-${untilMatch[1].slice(4, 6)}-${untilMatch[1].slice(6, 8)}`
            : '2026-12-31';

          let curDate = startParsed.date;
          while (curDate <= untilDate && curDate <= '2026-12-31') {
            const dayName = getDayName(curDate);
            if (targetDays.includes(dayName)) {
              const isExcluded = exdates.has(curDate) || (isClassOrAcademy && KOREAN_HOLIDAYS_2026.has(curDate));
              if (!isExcluded) {
                rawList.push({
                  memberId,
                  date: curDate,
                  title: summary.replace(/\\,/g, ',').replace(/\\n/g, ' ').trim(),
                  startTime,
                  endTime,
                  location: location.replace(/\\,/g, ',').replace(/\\n/g, ' ').trim(),
                  desc: desc.replace(/\\,/g, ',').replace(/\\n/g, ' ').trim(),
                });
              }
            }
            curDate = addDateDays(curDate, 1);
          }
        } else {
          const isExcluded = exdates.has(startParsed.date) || (isClassOrAcademy && KOREAN_HOLIDAYS_2026.has(startParsed.date));
          if (!isExcluded) {
            rawList.push({
              memberId,
              date: startParsed.date,
              title: summary.replace(/\\,/g, ',').replace(/\\n/g, ' ').trim(),
              startTime,
              endTime,
              location: location.replace(/\\,/g, ',').replace(/\\n/g, ' ').trim(),
              desc: desc.replace(/\\,/g, ',').replace(/\\n/g, ' ').trim(),
            });
          }
        }
      }
      continue;
    }

    if (inEvent) {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        const keyPart = line.slice(0, colonIdx);
        const valPart = line.slice(colonIdx + 1);
        const key = keyPart.split(';')[0].trim().toUpperCase();

        if (key === 'EXDATE') {
          const parts = valPart.split(',');
          for (const p of parts) {
            const m = p.match(/(\d{4})(\d{2})(\d{2})/);
            if (m) {
              currentEvent.exdates = currentEvent.exdates || [];
              currentEvent.exdates.push(`${m[1]}-${m[2]}-${m[3]}`);
            }
          }
        } else {
          currentEvent[key] = line;
          if (!currentEvent[key + '_VAL']) {
            currentEvent[key + '_VAL'] = valPart;
          }
        }
      }
    }
  }

  // Deduplicate
  const seen = new Set<string>();
  const deduped: typeof rawList = [];
  for (const item of rawList) {
    const key = `${item.memberId}|${item.date}|${item.title}|${item.startTime}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(item);
    }
  }

  // Group by date to compute last class return for Eunbi & 5-min walk for Hayul
  const dateGroups: Record<string, typeof deduped> = {};
  for (const s of deduped) {
    dateGroups[s.date] = dateGroups[s.date] || [];
    dateGroups[s.date].push(s);
  }

  const schedules: Schedule[] = [];

  for (const date of Object.keys(dateGroups).sort()) {
    const dayItems = dateGroups[date];

    // Eunbi classes
    const eunbiClasses = dayItems
      .filter(s => s.memberId === 'first_child' && (s.title.includes('[은비]') || s.title.includes('보건') || s.title.includes('대학') || s.location))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    const latestEunbiClass = eunbiClasses.length > 0 ? eunbiClasses[eunbiClasses.length - 1] : null;
    const eunbiFinalArrival = latestEunbiClass ? addMinutes(latestEunbiClass.endTime, 60) : '19:00';

    // Hayul activities
    const hayulActivities = dayItems
      .filter(s => s.memberId === 'second_child' && (s.title.includes('수학') || s.title.includes('태권도') || s.title.includes('영어') || s.title.includes('[하율]')))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    const hasMath = hayulActivities.some(s => s.title.includes('수학'));
    const hasTaekwondo = hayulActivities.some(s => s.title.includes('태권도'));
    const isConsecutiveMathTaekwondo = hasMath && hasTaekwondo;

    for (const item of dayItems) {
      let transitMethod: TransitMethod = '도보';
      let dinnerStatus: DinnerStatus = 'required';
      let guardian = '스스로 귀가';
      let memo = item.location ? `장소: ${item.location}` : undefined;
      let returnTime = item.endTime;

      if (item.memberId === 'first_child') {
        if (item.title.includes('[은비]') || item.title.includes('동남') || item.title.includes('보건') || item.location) {
          transitMethod = '대중교통';
          guardian = '스스로 귀가';
          const isLast = latestEunbiClass && item.title === latestEunbiClass.title && item.startTime === latestEunbiClass.startTime;
          if (isLast) {
            dinnerStatus = 'required';
            returnTime = eunbiFinalArrival;
            memo = item.location
              ? `수원 동남보건대(${item.location}) · 수업 모두 듣고 목감 귀가 (대중교통 약 50분)`
              : `수원 동남보건대 · 수업 모두 듣고 목감 귀가 (대중교통 약 50분)`;
          } else {
            dinnerStatus = 'not_required';
            memo = item.location ? `수원 동남보건대(${item.location}) · 다음 강의 대기` : `수원 동남보건대`;
          }
        } else if (item.title.includes('필라')) {
          transitMethod = '도보';
          guardian = '스스로 귀가';
          returnTime = addMinutes(item.endTime, 10);
          dinnerStatus = 'not_required';
        }
      } else if (item.memberId === 'second_child') {
        if (item.title.includes('수학') || item.title.includes('태권도') || item.title.includes('영어') || item.title.includes('[하율]')) {
          transitMethod = '도보';
          guardian = '스스로 귀가';

          // 하율: 월·수는 영어에만, 화·목·금은 태권도에만 저녁 필요
          const [y, m, d] = item.date.split('-').map(Number);
          const dayOfWeek = new Date(y, m - 1, d).getDay();
          if ((dayOfWeek === 1 || dayOfWeek === 3) && item.title.includes('영어')) {
            dinnerStatus = 'required';
          } else if ((dayOfWeek === 2 || dayOfWeek === 4 || dayOfWeek === 5) && item.title.includes('태권도')) {
            dinnerStatus = 'required';
          } else {
            dinnerStatus = 'not_required';
          }

          if (item.title.includes('학교')) {
            returnTime = addMinutes(item.endTime, 5);
            memo = '목감 초/중학교 (도보 통학 · 수업 후 귀가)';
          } else if (isConsecutiveMathTaekwondo) {
            if (item.title.includes('수학')) {
              // 수학 끝난 후 바로 태권도 이동 (집에 오지 않음)
              returnTime = item.endTime;
              memo = '수학 종료 후 태권도로 바로 이동 (귀가하지 않고 태권도 직행)';
            } else if (item.title.includes('태권도')) {
              // 태권도까지 끝나고 5분 후 귀가
              returnTime = addMinutes(item.endTime, 5);
              memo = '수학·태권도 연속 수강 후 도보 5분 최종 귀가';
            } else {
              returnTime = addMinutes(item.endTime, 5);
              memo = '목감 집 앞 학원 (도보 5분 거리 · 도보 귀가)';
            }
          } else {
            returnTime = addMinutes(item.endTime, 5); // 5-minute walk home!
            memo = '목감 집 앞 학원 (도보 5분 거리 · 도보 귀가)';
          }
        }
      } else if (item.memberId === 'parents') {
        const titleLower = item.title.toLowerCase();
        const isMom = titleLower.includes('엄마') || titleLower.includes('아내') || titleLower.includes('마누라') || titleLower.includes('미선');
        guardian = isMom ? '엄마' : '나(아빠)';
        
        const isMeeting =
          titleLower.includes('모임') ||
          titleLower.includes('회식') ||
          titleLower.includes('약속') ||
          titleLower.includes('식사') ||
          titleLower.includes('외식') ||
          titleLower.includes('동창') ||
          titleLower.includes('동호회') ||
          titleLower.includes('야근');

        if (isMeeting) {
          dinnerStatus = 'not_required';
          transitMethod = titleLower.includes('회식') ? '대중교통' : '자차';
          returnTime = item.endTime && item.endTime > item.startTime ? item.endTime : '22:00';
          memo = memo || `${guardian} 저녁 모임 · 외식 (집밥 불필요)`;
        } else {
          transitMethod = '자차';
          dinnerStatus = 'required';
          returnTime = item.endTime || '19:00';
        }
      } else {
        transitMethod = '자차';
        guardian = '온 가족';
        if (item.title.includes('생신') || item.title.includes('제사') || item.title.includes('명절')) {
          dinnerStatus = 'not_required';
        }
      }

      schedules.push({
        id: `gcal-${Date.now()}-${Math.random().toString(36).substr(2, 7)}`,
        memberId: item.memberId,
        date: item.date,
        title: item.title,
        startTime: item.startTime,
        returnTime,
        transitMethod,
        dinnerStatus,
        guardian,
        isRecurring: false,
        memo,
      });
    }
  }

  return schedules;
}
