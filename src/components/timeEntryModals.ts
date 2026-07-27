import { h, clear } from '../utils/dom';
import type { TimeEntry } from '../models/types';
import { openModal } from './modal';
import { dayHistory, formatMinutes } from '../domain/timeTracking';
import { formatDateDisplay, todayISODate } from '../utils/dates';

// Modal for adding/editing the optional note on a day's logged time.
export function openDayNoteModal(entry: TimeEntry, date: string, onSave: (note: string) => void): void {
  const existingNote = entry.dailyNotes[date] ?? '';
  const dayLabel = date === todayISODate() ? 'today' : formatDateDisplay(date);

  const noteInput = h('textarea', {
    name: 'note',
    rows: 4,
    placeholder: `What did you work on ${date === todayISODate() ? 'today' : 'this day'}?`,
    value: existingNote,
  }) as HTMLTextAreaElement;

  const form = h('form', { class: 'modal-form' }, [
    h('h2', {}, [existingNote ? `Edit note for ${dayLabel}` : `Add note for ${dayLabel}`]),
    h('p', {}, [`${entry.title} — ${formatDateDisplay(date)}`]),
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

// Settings modal for the time tracking page: pick the date that time and
// notes are logged to, for backfilling days that were missed.
export function openEntryDateModal(currentDate: string, onSave: (date: string) => void): void {
  const dateInput = h('input', {
    type: 'date',
    name: 'entryDate',
    value: currentDate,
    required: true,
  }) as HTMLInputElement;

  const form = h('form', { class: 'modal-form' }, [
    h('h2', {}, ['Time tracking settings']),
    h('p', {}, ['Choose the date that time and notes are logged to. Useful for filling in days you missed.']),
    h('label', { class: 'field' }, ['Entry date', dateInput]),
    h('div', { class: 'form-actions' }, [
      h('button', { type: 'submit', class: 'btn btn--primary' }, ['Save']),
      h(
        'button',
        {
          type: 'button',
          class: 'btn',
          onclick: () => {
            dateInput.value = todayISODate();
          },
        },
        ['Use today']
      ),
      h('button', { type: 'button', class: 'btn', onclick: () => modal.close() }, ['Cancel']),
    ]),
  ]);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!dateInput.value) return;
    modal.close();
    onSave(dateInput.value);
  });

  const modal = openModal(form);
  dateInput.focus();
}

// Modal showing the full day-by-day history of an item: date, time logged,
// and the note for each day. Clicking a day opens the note editor for that
// day; `onSaveNote` persists the note and resolves with the updated entry so
// the list refreshes in place.
export function openTimeHistoryModal(
  entry: TimeEntry,
  onSaveNote: (date: string, note: string) => Promise<TimeEntry>
): void {
  let current = entry;

  const daysContainer = h('div', {});

  function renderDays(): void {
    const days = dayHistory(current);
    clear(daysContainer);
    daysContainer.append(
      days.length === 0
        ? h('p', { class: 'empty-state' }, ['No time logged yet.'])
        : h(
            'ul',
            { class: 'time-history' },
            days.map((day) =>
              h('li', {}, [
                h(
                  'button',
                  {
                    type: 'button',
                    class: 'time-history-day',
                    title: day.note ? 'Edit note for this day' : 'Add note for this day',
                    onclick: () => {
                      openDayNoteModal(current, day.date, (note) => {
                        void onSaveNote(day.date, note).then((updated) => {
                          current = updated;
                          renderDays();
                        });
                      });
                    },
                  },
                  [
                    h('div', { class: 'time-history-head' }, [
                      h('span', { class: 'time-history-date' }, [formatDateDisplay(day.date)]),
                      h('span', { class: 'time-history-minutes' }, [formatMinutes(day.minutes)]),
                    ]),
                    day.note
                      ? h('div', { class: 'time-history-note' }, [day.note])
                      : h('div', { class: 'time-history-note time-history-note--empty' }, ['Add note…']),
                  ]
                ),
              ])
            )
          )
    );
  }

  renderDays();

  const content = h('div', { class: 'modal-form' }, [
    h('h2', {}, [entry.title]),
    h('p', {}, ['Day-by-day time history. Click a day to add or edit its note.']),
    daysContainer,
    h('div', { class: 'form-actions' }, [
      h('button', { type: 'button', class: 'btn', onclick: () => modal.close() }, ['Close']),
    ]),
  ]);

  const modal = openModal(content);
}
