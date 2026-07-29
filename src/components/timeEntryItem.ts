import { h } from '../utils/dom';
import type { TimeEntry } from '../models/types';
import { navigate } from '../router/router';
import { formatMinutes, totalMinutes, todayMinutes, weekMinutes, monthMinutes } from '../domain/timeTracking';
import { todayISODate, formatDateDisplay } from '../utils/dates';

export interface TimeEntryItemHandlers {
  onAdd: (entry: TimeEntry) => void;
  onSubtract: (entry: TimeEntry) => void;
  onDelete: (entry: TimeEntry) => void;
  onEditNote: (entry: TimeEntry) => void;
  onHistory: (entry: TimeEntry) => void;
}

// `entryDate` is the day time and notes are logged to — normally today, but
// selectable from the page settings to backfill missed days. `categoryName` is
// the resolved name of the entry's category, or null when uncategorized.
export function timeEntryItem(
  entry: TimeEntry,
  entryDate: string,
  handlers: TimeEntryItemHandlers,
  categoryName: string | null = null
): HTMLElement {
  const total = totalMinutes(entry);
  const isToday = entryDate === todayISODate();
  const dayLabel = isToday ? 'Today' : formatDateDisplay(entryDate);
  const dayMinutes = todayMinutes(entry, entryDate);
  const dayNote = entry.dailyNotes[entryDate] ?? null;

  const summary = (label: string, minutes: number): HTMLElement =>
    h('div', { class: 'time-summary' }, [
      h('span', { class: 'time-summary-label' }, [label]),
      h('span', { class: 'time-summary-value' }, [formatMinutes(minutes)]),
    ]);

  return h('li', { class: `time-item${dayMinutes > 0 ? ' time-item--worked-today' : ''}` }, [
    h('div', { class: 'time-item-head' }, [
      h('div', { class: 'time-item-body' }, [
        h('div', { class: 'time-item-title' }, [
          entry.title,
          categoryName ? h('span', { class: 'badge time-item-category' }, [categoryName]) : null,
        ]),
        entry.description ? h('div', { class: 'time-item-desc' }, [entry.description]) : null,
      ]),
      h('div', { class: 'time-item-actions' }, [
        h('button', { class: 'btn btn--icon', type: 'button', onclick: () => handlers.onHistory(entry) }, ['History']),
        h('button', { class: 'btn btn--icon', type: 'button', onclick: () => navigate(`/time/${entry.id}/edit`) }, ['Edit']),
        h('button', { class: 'btn btn--icon btn--danger', type: 'button', onclick: () => handlers.onDelete(entry) }, ['Delete']),
      ]),
    ]),
    h('div', { class: 'time-item-track' }, [
      h(
        'button',
        {
          class: 'btn time-step',
          type: 'button',
          title: `Subtract 15 minutes from ${isToday ? 'today' : dayLabel}`,
          'aria-label': 'Subtract 15 minutes',
          disabled: total === 0,
          onclick: () => handlers.onSubtract(entry),
        },
        ['−']
      ),
      h('div', { class: 'time-total', title: 'Total time worked' }, [formatMinutes(total)]),
      h(
        'button',
        {
          class: 'btn time-step',
          type: 'button',
          title: `Add 15 minutes to ${isToday ? 'today' : dayLabel}`,
          'aria-label': 'Add 15 minutes',
          onclick: () => handlers.onAdd(entry),
        },
        ['+']
      ),
    ]),
    h('div', { class: 'time-today' }, [
      h('div', { class: 'time-today-main' }, [
        h('span', { class: 'time-today-label' }, [dayLabel]),
        h('span', { class: 'time-today-value' }, [formatMinutes(dayMinutes)]),
        dayMinutes > 0
          ? h('button', { class: 'btn btn--icon', type: 'button', onclick: () => handlers.onEditNote(entry) }, [
              dayNote ? 'Edit note' : 'Add note',
            ])
          : null,
      ]),
      dayNote ? h('div', { class: 'time-today-note' }, [dayNote]) : null,
    ]),
    h('div', { class: 'time-summaries' }, [
      summary('This week', weekMinutes(entry)),
      summary('This month', monthMinutes(entry)),
      summary('Total', total),
    ]),
  ]);
}
