import { h } from '../utils/dom';
import type { TimeEntry } from '../models/types';
import { openModal } from './modal';
import { dayHistory, formatMinutes } from '../domain/timeTracking';
import { formatDateDisplay, todayISODate } from '../utils/dates';

// Modal for adding/editing the optional note on today's logged time.
export function openDayNoteModal(entry: TimeEntry, onSave: (note: string) => void): void {
  const today = todayISODate();
  const existingNote = entry.dailyNotes[today] ?? '';

  const noteInput = h('textarea', {
    name: 'note',
    rows: 4,
    placeholder: 'What did you work on today?',
    value: existingNote,
  }) as HTMLTextAreaElement;

  const form = h('form', { class: 'modal-form' }, [
    h('h2', {}, [existingNote ? 'Edit note for today' : 'Add note for today']),
    h('p', {}, [`${entry.title} — ${formatDateDisplay(today)}`]),
    h('label', { class: 'field' }, ['Note', noteInput]),
    h('div', { class: 'form-actions' }, [
      h('button', { type: 'submit', class: 'btn btn--primary' }, ['Save note']),
      h('button', { type: 'button', class: 'btn', onclick: () => modal.close() }, ['Cancel']),
    ]),
  ]);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    modal.close();
    onSave(noteInput.value);
  });

  const modal = openModal(form);
  noteInput.focus();
}

// Modal showing the full day-by-day history of an item: date, time logged,
// and the note for each day.
export function openTimeHistoryModal(entry: TimeEntry): void {
  const days = dayHistory(entry);

  const content = h('div', { class: 'modal-form' }, [
    h('h2', {}, [entry.title]),
    h('p', {}, ['Day-by-day time history']),
    days.length === 0
      ? h('p', { class: 'empty-state' }, ['No time logged yet.'])
      : h(
          'ul',
          { class: 'time-history' },
          days.map((day) =>
            h('li', { class: 'time-history-day' }, [
              h('div', { class: 'time-history-head' }, [
                h('span', { class: 'time-history-date' }, [formatDateDisplay(day.date)]),
                h('span', { class: 'time-history-minutes' }, [formatMinutes(day.minutes)]),
              ]),
              day.note ? h('div', { class: 'time-history-note' }, [day.note]) : null,
            ])
          )
        ),
    h('div', { class: 'form-actions' }, [
      h('button', { type: 'button', class: 'btn', onclick: () => modal.close() }, ['Close']),
    ]),
  ]);

  const modal = openModal(content);
}
