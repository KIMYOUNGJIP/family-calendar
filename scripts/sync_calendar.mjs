import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const GOOGLE_CALENDAR_DEFAULT_URL =
  'https://calendar.google.com/calendar/ical/rd8us2ulpclcik4jgdnq8mqb4c%40group.calendar.google.com/private-ba959c81e63b8d564be9574e771695ff/basic.ics';

function padZero(n) {
  return String(n).padStart(2, '0');
}

function parseICSDateTime(dtStr) {
  if (!dtStr) return null;
  const val = dtStr.includes(':') ? dtStr.split(':').pop() : dtStr;
  if (val.length === 8) {
    return { date: `${val.slice(0, 4)}-${val.slice(4, 6)}-${val.slice(6, 8)}`, time: '09:00' };
  }
  const match = val.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?/);
  if (match) {
    const [, y, m, d, hh, mm, ss, isUtc] = match;
    if (isUtc) {
      const utcDate = new Date(Date.UTC(+y, +m - 1, +d, +hh, +mm, +ss));
      // Convert UTC to KST (+9 hours) explicitly so it works identically in UTC GitHub Actions runners and local KST
      const kstDate = new Date(utcDate.getTime() + 9 * 60 * 60 * 1000);
      return {
        date: `${kstDate.getUTCFullYear()}-${padZero(kstDate.getUTCMonth() + 1)}-${padZero(kstDate.getUTCDate())}`,
        time: `${padZero(kstDate.getUTCHours())}:${padZero(kstDate.getUTCMinutes())}`,
      };
    }
    return { date: `${y}-${m}-${d}`, time: `${hh}:${mm}` };
  }
  return null;
}

function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${padZero(dt.getUTCMonth() + 1)}-${padZero(dt.getUTCDate())}`;
}

function getDayName(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const map = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  return map[dt.getUTCDay()];
}

function getDayOfWeek(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function addMinutes(timeStr, mins) {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + mins;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${padZero(newH)}:${padZero(newM)}`;
}

function inferMemberId(title, description = '') {
  const text = `${title} ${description}`.toLowerCase();
  if (text.includes('처가') || text.includes('시댁') || text.includes('제사') || text.includes('생신')) {
    return 'family';
  }
  if (
    text.includes('은비') ||
    text.includes('첫째') ||
    text.includes('대학') ||
    text.includes('작업치료') ||
    text.includes('동남') ||
    text.includes('보건대') ||
    text.includes('[은비]')
  ) {
    return 'first_child';
  }
  if (
    text.includes('하율') ||
    text.includes('둘째') ||
    text.includes('태권도') ||
    text.includes('지필') ||
    text.includes('[하율]')
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
    text.includes('저녁식사') ||
    text.includes('저녁 식사') ||
    text.includes('외식') ||
    text.includes('여전도') ||
    text.includes('8여') ||
    text.includes('아빠') ||
    text.includes('엄마') ||
    text.includes('영집') ||
    text.includes('미선')
  ) {
    return 'parents';
  }
  return 'family';
}

const KOREAN_HOLIDAYS_2026 = new Set([
  '2026-09-24',
  '2026-09-25',
  '2026-09-26',
  '2026-10-03',
  '2026-10-05',
  '2026-10-09',
  '2026-12-25',
  '2027-01-01',
]);

async function main() {
  console.log('Fetching latest Google Calendar ICS...');
  const res = await fetch(`${GOOGLE_CALENDAR_DEFAULT_URL}?t=${Date.now()}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch ICS: HTTP ${res.status}`);
  }
  const icsText = await res.text();
  if (!icsText.includes('BEGIN:VCALENDAR')) {
    throw new Error('Fetched content is not a valid VCALENDAR');
  }

  fs.writeFileSync(path.join(rootDir, 'src/data/google_calendar.ics'), icsText, 'utf8');
  fs.writeFileSync(path.join(rootDir, 'public/google_calendar.ics'), icsText, 'utf8');

  const lines = icsText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const unfolded = [];
  for (const line of lines) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && unfolded.length > 0) {
      unfolded[unfolded.length - 1] += line.slice(1);
    } else {
      unfolded.push(line);
    }
  }

  let inEvent = false;
  let currentEvent = { exdates: [] };
  const rawEvents = [];

  for (const line of unfolded) {
    if (line.startsWith('BEGIN:VEVENT')) {
      inEvent = true;
      currentEvent = { exdates: [] };
      continue;
    }
    if (line.startsWith('END:VEVENT')) {
      inEvent = false;
      rawEvents.push(currentEvent);
      continue;
    }
    if (inEvent) {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        const keyPart = line.slice(0, colonIdx);
        const valPart = line.slice(colonIdx + 1);
        const key = keyPart.split(';')[0].trim().toUpperCase();
        if (key === 'EXDATE') {
          for (const p of valPart.split(',')) {
            const m = p.match(/(\d{4})(\d{2})(\d{2})/);
            if (m) currentEvent.exdates.push(`${m[1]}-${m[2]}-${m[3]}`);
          }
        } else {
          currentEvent[key] = line;
          currentEvent[key + '_VAL'] = valPart;
        }
      }
    }
  }

  const rawList = [];
  for (const ev of rawEvents) {
    const summary = ev['SUMMARY_VAL'] || (ev['SUMMARY'] ? ev['SUMMARY'].split(':').slice(1).join(':') : '구글 캘린더 일정');
    const dtStartRaw = ev['DTSTART'] || '';
    const dtEndRaw = ev['DTEND'] || '';
    const desc = ev['DESCRIPTION_VAL'] || '';
    const location = ev['LOCATION_VAL'] || '';
    const rrule = ev['RRULE_VAL'] || (ev['RRULE'] ? ev['RRULE'].split(':').slice(1).join(':') : '');
    const exdates = new Set(ev.exdates || []);

    const startParsed = parseICSDateTime(dtStartRaw);
    const endParsed = parseICSDateTime(dtEndRaw);
    if (!startParsed) continue;

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
        if (targetDays.includes(getDayName(curDate))) {
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
        curDate = addDays(curDate, 1);
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

  for (const s of rawList) {
    if (s.memberId === 'second_child' && s.date >= '2026-09-07') {
      const dow = getDayOfWeek(s.date);
      if (dow === 4 && s.title.includes('태권도')) {
        s.startTime = '20:00';
        s.endTime = '21:00';
      }
      if (dow === 5 && s.title.includes('수학') && s.startTime === '17:00') {
        s.startTime = '18:00';
        s.endTime = '19:00';
      }
    }
  }

  const seenKey = new Set();
  const deduped = [];
  for (const item of rawList) {
    const key = `${item.memberId}|${item.date}|${item.title}|${item.startTime}`;
    if (seenKey.has(key)) continue;
    seenKey.add(key);
    deduped.push(item);
  }

  const dateGroups = {};
  for (const s of deduped) {
    dateGroups[s.date] = dateGroups[s.date] || [];
    dateGroups[s.date].push(s);
  }

  const finalSchedules = [];
  let idCounter = 1;

  for (const date of Object.keys(dateGroups).sort()) {
    const dayItems = dateGroups[date];
    const dayOfWeek = getDayOfWeek(date);

    const eunbiClasses = dayItems
      .filter(
        (s) =>
          s.memberId === 'first_child' &&
          (s.title.includes('[은비]') || s.title.includes('보건') || s.title.includes('대학') || s.location) &&
          !s.title.includes('중간고사') &&
          !s.title.includes('기말고사') &&
          !s.title.includes('방학')
      )
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    const latestEunbiClass = eunbiClasses.length > 0 ? eunbiClasses[eunbiClasses.length - 1] : null;
    const eunbiFinalArrival = latestEunbiClass ? addMinutes(latestEunbiClass.endTime, 90) : '19:30';

    const hayulActivities = dayItems
      .filter((s) => s.memberId === 'second_child' && (s.title.includes('수학') || s.title.includes('태권도') || s.title.includes('영어') || s.title.includes('[하율]')))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    const hasMath = hayulActivities.some((s) => s.title.includes('수학'));
    const hasTaekwondo = hayulActivities.some((s) => s.title.includes('태권도'));
    const taekwondoItem = hayulActivities.find((s) => s.title.includes('태권도'));
    const isMathDinnerTaekwondo = hasMath && hasTaekwondo && (dayOfWeek === 4 || (taekwondoItem && taekwondoItem.startTime >= '20:00'));
    const isConsecutiveMathTaekwondo = hasMath && hasTaekwondo && !isMathDinnerTaekwondo;

    for (const item of dayItems) {
      let transitMethod = '도보';
      let dinnerStatus = 'required';
      let guardian = '스스로 귀가';
      let memo = item.location ? `장소: ${item.location}` : undefined;
      let returnTime = item.endTime;

      if (item.memberId === 'first_child') {
        if (item.title.includes('중간고사') || item.title.includes('기말고사') || item.title.includes('방학')) {
          transitMethod = '대중교통';
          guardian = '스스로 귀가';
          dinnerStatus = 'not_required';
          memo = '동남보건대 학사 일정';
        } else if (item.title.includes('[은비]') || item.title.includes('동남') || item.title.includes('보건') || item.location) {
          transitMethod = '대중교통';
          guardian = '스스로 귀가';
          const isLast = latestEunbiClass && item.title === latestEunbiClass.title && item.startTime === latestEunbiClass.startTime;
          if (isLast) {
            dinnerStatus = 'required';
            returnTime = eunbiFinalArrival;
            memo = item.location
              ? `수원 동남보건대(${item.location}) · 수업 모두 듣고 목감 귀가 (대중교통 약 1시간 30분)`
              : `수원 동남보건대 · 수업 모두 듣고 목감 귀가 (대중교통 약 1시간 30분)`;
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

          if ((dayOfWeek === 1 || dayOfWeek === 3) && item.title.includes('영어')) {
            dinnerStatus = 'required';
          } else if ((dayOfWeek === 4 || isMathDinnerTaekwondo) && item.title.includes('수학')) {
            dinnerStatus = 'required';
          } else if ((dayOfWeek === 2 || dayOfWeek === 5) && item.title.includes('태권도')) {
            dinnerStatus = 'required';
          } else {
            dinnerStatus = 'not_required';
          }

          if (item.title.includes('학교')) {
            returnTime = addMinutes(item.endTime, 5);
            memo = '목감 초/중학교 (도보 통학 · 수업 후 귀가)';
          } else if (isMathDinnerTaekwondo || dayOfWeek === 4) {
            returnTime = addMinutes(item.endTime, 5);
            if (item.title.includes('수학')) {
              memo = '수학 종료 후 19:05 귀가 (7시~8시 집에서 저녁 식사 후 20:00 태권도 8시부 출발)';
            } else if (item.title.includes('태권도')) {
              memo = '태권도(8시부) 종료 후 21:05 최종 귀가 (수학 종료 후 7시~8시에 저녁 식사 완료)';
            } else {
              memo = '목감 집 앞 학원 (도보 5분 거리 · 도보 귀가)';
            }
          } else if (isConsecutiveMathTaekwondo) {
            if (item.title.includes('영어') && dayOfWeek === 5) {
              returnTime = item.endTime;
              memo = '영어 종료 후 수학학원으로 바로 이동 (귀가하지 않고 직행)';
            } else if (item.title.includes('수학')) {
              returnTime = item.endTime;
              memo = '수학 종료 후 태권도로 바로 이동 (귀가하지 않고 태권도 직행)';
            } else if (item.title.includes('태권도')) {
              returnTime = addMinutes(item.endTime, 5);
              memo = '수학·태권도 연속 수강 후 20:05 최종 귀가 (태권도 후 저녁 식사)';
            } else {
              returnTime = addMinutes(item.endTime, 5);
              memo = '목감 집 앞 학원 (도보 5분 거리 · 도보 귀가)';
            }
          } else if (dayOfWeek === 1 || dayOfWeek === 3) {
            returnTime = addMinutes(item.endTime, 5);
            if (item.title.includes('영어')) {
              memo = '영어 종료 후 18:05 귀가 (집에서 저녁 식사 후 19:00 태권도 출발)';
            } else if (item.title.includes('태권도')) {
              memo = '태권도 종료 후 20:05 최종 귀가 (영어 종료 후 18:05에 저녁 식사 완료)';
            } else {
              memo = '목감 집 앞 학원 (도보 5분 거리 · 도보 귀가)';
            }
          } else {
            returnTime = addMinutes(item.endTime, 5);
            memo = '목감 집 앞 학원 (도보 5분 거리 · 도보 귀가)';
          }
        }
      } else if (item.memberId === 'parents') {
        const titleLower = item.title.toLowerCase();
        const isMom =
          titleLower.includes('엄마') ||
          titleLower.includes('아내') ||
          titleLower.includes('마누라') ||
          titleLower.includes('미선') ||
          titleLower.includes('여전도') ||
          titleLower.includes('8여');
        const isDad = titleLower.includes('아빠') || titleLower.includes('남편') || titleLower.includes('영집');
        guardian = isMom && isDad ? '아빠 & 엄마' : isMom ? '엄마' : '나(아빠)';

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

      finalSchedules.push({
        id: `gcal-${idCounter++}`,
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

  console.log(`Synced ${finalSchedules.length} schedules.`);
  const outContent = `import { Schedule } from '../types/calendar';

export const GOOGLE_CALENDAR_DEFAULT_URL = '${GOOGLE_CALENDAR_DEFAULT_URL}';

export const REAL_GOOGLE_SCHEDULES: Schedule[] = ${JSON.stringify(finalSchedules, null, 2)};
`;
  fs.writeFileSync(path.join(rootDir, 'src/data/realGoogleSchedules.ts'), outContent, 'utf8');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
