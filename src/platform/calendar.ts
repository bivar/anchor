import type { WorkConfig } from '../state/types';

export interface ReminderText {
  checkinTitle: string;
  checkinBody: string;
  focusTitle: string;
  focusBody: string;
}

function escapeIcs(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

function shift(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = (((h * 60 + m + minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}${String(total % 60).padStart(2, '0')}00`;
}

function stamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Two daily recurring events in floating local time (no time zone, so they follow the phone):
 * an energy check-in at the start of the day and the 5-minute focus block 30 min after work.
 */
export function buildRemindersIcs(dayStart: string, work: WorkConfig, text: ReminderText, now = new Date()): string {
  const day = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const event = (uid: string, start: string, title: string, body: string) => [
    'BEGIN:VEVENT',
    `UID:${uid}@anchor.app`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART:${day}T${start}`,
    'DURATION:PT10M',
    'RRULE:FREQ=DAILY',
    `SUMMARY:${escapeIcs(title)}`,
    `DESCRIPTION:${escapeIcs(body)}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeIcs(title)}`,
    'TRIGGER:PT0M',
    'END:VALARM',
    'END:VEVENT',
  ];
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Anchor//Reminders//EN',
    'CALSCALE:GREGORIAN',
    ...event('anchor-checkin', shift(dayStart, 0), text.checkinTitle, text.checkinBody),
    ...event('anchor-focus', shift(work.endTime, 30), text.focusTitle, text.focusBody),
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}
