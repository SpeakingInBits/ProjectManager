import { h, clear } from '../utils/dom';
import type { TimeEntry } from '../models/types';
import { openModal } from './modal';
import { dayHistory, formatMinutes, totalMinutes, type TimeViewOptions } from '../domain/timeTracking';
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

export interface TimeSettings extends TimeViewOptions {
  entryDate: string;
}

// Settings modal for the time tracking page: pick the date that time and
// notes are logged to (for backfilling days that were missed), and choose how
// the item list is displayed.
export function openTimeSettingsModal(current: TimeSettings, onSave: (settings: TimeSettings) => void): void {
  const dateInput = h('input', {
    type: 'date',
    name: 'entryDate',
    value: current.entryDate,
    required: true,
  }) as HTMLInputElement;

  const groupCheckbox = h('input', { type: 'checkbox', checked: current.groupByCategory }) as HTMLInputElement;
  const sortCheckbox = h('input', { type: 'checkbox', checked: current.sortAlphabetically }) as HTMLInputElement;

  const form = h('form', { class: 'modal-form' }, [
    h('h2', {}, ['Time tracking settings']),
    h('p', {}, ['Choose the date that time and notes are logged to. Useful for filling in days you missed.']),
    h('label', { class: 'field' }, ['Entry date', dateInput]),
    h('label', { class: 'checkbox-field' }, [groupCheckbox, 'Group items by category']),
    h('label', { class: 'checkbox-field' }, [sortCheckbox, 'Sort items alphabetically']),
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
    onSave({
      entryDate: dateInput.value,
      groupByCategory: groupCheckbox.checked,
      sortAlphabetically: sortCheckbox.checked,
    });
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

// Modal for merging one item into another: pick the target, see what will
// move, and confirm. `candidates` are the other items (the source excluded).
export function openMergeTimeEntryModal(
  source: TimeEntry,
  candidates: TimeEntry[],
  onMerge: (targetId: string) => void
): void {
  const sorted = [...candidates].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
  const targetSelect = h('select', { name: 'targetId', required: true }, [
    h('option', { value: '' }, ['Choose an item…']),
    ...sorted.map((c) => h('option', { value: c.id }, [c.title])),
  ]) as HTMLSelectElement;

  const days = Object.keys(source.dailyMinutes).length;
  const notes = Object.keys(source.dailyNotes).length;
  const logged =
    days === 0
      ? 'It has no logged time.'
      : `Its ${formatMinutes(totalMinutes(source))} across ${days} day${days === 1 ? '' : 's'}` +
        (notes > 0 ? ` (with ${notes} note${notes === 1 ? '' : 's'})` : '') +
        ' will be added to the chosen item.';

  const mergeButton = h('button', { type: 'submit', class: 'btn btn--danger', disabled: true }, ['Merge']) as HTMLButtonElement;
  targetSelect.addEventListener('change', () => {
    mergeButton.disabled = !targetSelect.value;
  });

  const form = h('form', { class: 'modal-form' }, [
    h('h2', {}, [`Merge "${source.title}"`]),
    h('p', {}, [
      `${logged} "${source.title}" will then be deleted. The chosen item keeps its own title, description, and category. This cannot be undone.`,
    ]),
    h('label', { class: 'field' }, ['Merge into', targetSelect]),
    h('div', { class: 'form-actions' }, [
      mergeButton,
      h('button', { type: 'button', class: 'btn', onclick: () => modal.close() }, ['Cancel']),
    ]),
  ]);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!targetSelect.value) return;
    modal.close();
    onMerge(targetSelect.value);
  });

  const modal = openModal(form);
  targetSelect.focus();
}
