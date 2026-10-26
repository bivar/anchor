import { describe, expect, it } from 'vitest';
import { buildRemindersIcs } from '../platform/calendar';
import { hydrateState } from '../state/store';
import { initialState } from '../state/reducer';

describe('calendar reminders', () => {
  it('builds two daily floating-time events with escaped text', () => {
    const ics = buildRemindersIcs(
      '08:30',
      { startTime: '09:00', endTime: '17:30', days: [1, 2, 3, 4, 5] },
      { checkinTitle: 'Check-in', checkinBody: 'Hi, there; ok', focusTitle: 'Focus', focusBody: 'Go' },
      new Date(2026, 9, 24, 8, 0),
    );
    expect(ics).toContain('DTSTART:20261024T083000');
    expect(ics).toContain('DTSTART:20261024T180000');
    expect(ics.match(/RRULE:FREQ=DAILY/g)).toHaveLength(2);
    // Each comma and semicolon must be preceded by a literal backslash (RFC 5545 TEXT escaping).
    expect(ics).toContain(String.raw`DESCRIPTION:Hi\, there\; ok`);
    expect(ics.split('\r\n')[0]).toBe('BEGIN:VCALENDAR');
  });
});

describe('hydrateState', () => {
  it('survives corrupt storage', () => {
    expect(hydrateState('{not json').screen).toBe('setup');
    expect(hydrateState(null)).toMatchObject({ screen: initialState().screen, schemaVersion: 3 });
  });
});
