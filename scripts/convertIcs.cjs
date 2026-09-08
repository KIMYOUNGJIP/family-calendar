const fs = require('fs');
const path = require('path');

const icsPath = path.join(__dirname, '../src/data/google_calendar.ics');
const outPath = path.join(__dirname, '../src/data/realGoogleSchedules.ts');

const ics = fs.readFileSync(icsPath, 'utf8');

function padZero(num) {
  return num < 10 ? '0' + num : '' + num;
}

function parseICSDateTime(dtStr) {
  if (!dtStr) return null;
  const val = dtStr.includes(':') ? dtStr.split(':').pop() : dtStr;
  if (val.length === 8) {
    const y = val.slice(0, 4);
    const m = val.slice(4, 6);
    const d = val.slice(6, 8);
    return { date: `${y}-${m}-${d}`, time: '09:00', allDay: true };
  }
  const match = val.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?/);
  if (match) {
    const [_, y, m, d, hh, mm, ss, isUtc] = match;
    if (isUtc) {
      const utcDate = new Date(Date.UTC(+y, +m - 1, +d, +hh, +mm, +ss));
      return {
        date: `${utcDate.getFullYear()}-${padZero(utcDate.getMonth() + 1)}-${padZero(utcDate.getDate())}`,
        time: `${padZero(utcDate.getHours())}:${padZero(utcDate.getMinutes())}`,
        allDay: false,
      };
    } else {
      return { date: `${y}-${m}-${d}`, time: `${hh}:${mm}`, allDay: false };
    }
  }
  return null;
}

function inferMemberId(title, desc = '') {
  const text = (title + ' ' + desc).toLowerCase();
  if (text.includes('은비') || text.includes('첫째') || text.includes('필라') || text.includes('대학') || text.includes('작업치료')) {
    return 'first_child';
  }
  if (text.includes('하율') || text.includes('둘째') || text.includes('태권도') || text.includes('안과') || text.includes('체스')) {
    return 'second_child';
  }
  if (
    text.includes('학교') ||
    text.includes('수업') ||
    text.includes('업무') ||
    text.includes('장학') ||
    text.includes('아내') ||
    text.includes('찬양') ||
    text.includes('세미나') ||
    text.includes('출근') ||
    text.includes('퇴근')
  ) {
    return 'parents';
  }
  return 'family';
}

const lines = ics.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
const unfolded = [];
for (let line of lines) {
  if ((line.startsWith(' ') || line.startsWith('\t')) && unfolded.length > 0) {
    unfolded[unfolded.length - 1] += line.slice(1);
  } else {
    unfolded.push(line);
  }
}

let inEvent = false;
let current = {};
const schedules = [];
let idCounter = 1;

for (let line of unfolded) {
  if (line.startsWith('BEGIN:VEVENT')) {
    inEvent = true;
    current = {};
    continue;
  }
  if (line.startsWith('END:VEVENT')) {
    inEvent = false;
    const summary = (current['SUMMARY'] || '가족 일정').replace(/\\,/g, ',').replace(/\\n/g, ' ').trim();
    const dtstart = current['DTSTART'] || '';
    const dtend = current['DTEND'] || '';
    const desc = (current['DESCRIPTION'] || '').replace(/\\,/g, ',').replace(/\\n/g, ' ').trim();
    const location = (current['LOCATION'] || '').replace(/\\,/g, ',').replace(/\\n/g, ' ').trim();

    const startParsed = parseICSDateTime(dtstart);
    const endParsed = parseICSDateTime(dtend);

    if (startParsed && (startParsed.date.startsWith('2025') || startParsed.date.startsWith('2026') || startParsed.date.startsWith('2027'))) {
      const memberId = inferMemberId(summary, desc);
      const startTime = startParsed.allDay ? '09:00' : startParsed.time;
      let returnTime = endParsed ? (endParsed.allDay ? '19:00' : endParsed.time) : '18:30';

      if (returnTime <= startTime) {
        const [sh, sm] = startTime.split(':').map(Number);
        const rh = Math.min(23, sh + 2);
        returnTime = `${padZero(rh)}:${padZero(sm)}`;
      }

      let transitMethod = '도보';
      if (summary.includes('필라') || summary.includes('셔틀')) transitMethod = '학원 셔틀';
      else if (summary.includes('안과') || summary.includes('체험학습') || summary.includes('제사') || summary.includes('생신') || summary.includes('생일')) {
        transitMethod = '자차';
      }

      const dinnerStatus =
        summary.includes('생신') || summary.includes('생일') || summary.includes('외식') || summary.includes('제사')
          ? 'not_required'
          : 'required';

      let guardian = '온 가족';
      if (memberId === 'second_child') guardian = '나(아빠)';
      else if (memberId === 'first_child') guardian = '스스로';
      else if (memberId === 'parents') guardian = '나 & 아내';

      schedules.push({
        id: `gcal-${idCounter++}`,
        memberId,
        date: startParsed.date,
        title: summary,
        startTime,
        returnTime,
        transitMethod,
        dinnerStatus,
        guardian,
        isRecurring: false,
        memo: location ? `장소: ${location}` : desc ? desc.slice(0, 80) : undefined,
      });
    }
    continue;
  }
  if (inEvent) {
    const colon = line.indexOf(':');
    if (colon > 0) {
      const key = line.slice(0, colon).split(';')[0].trim().toUpperCase();
      current[key] = line.slice(colon + 1);
    }
  }
}

const fileContent = `import { Schedule } from '../types/calendar';

export const GOOGLE_CALENDAR_DEFAULT_URL = 'https://calendar.google.com/calendar/ical/rd8us2ulpclcik4jgdnq8mqb4c%40group.calendar.google.com/private-ba959c81e63b8d564be9574e771695ff/basic.ics';

export const REAL_GOOGLE_SCHEDULES: Schedule[] = ${JSON.stringify(schedules, null, 2)};
`;

fs.writeFileSync(outPath, fileContent, 'utf8');
console.log(`Successfully parsed ${schedules.length} real schedules into realGoogleSchedules.ts!`);
