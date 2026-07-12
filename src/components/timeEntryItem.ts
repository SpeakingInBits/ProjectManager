import { h } from '../utils/dom';
import type { TimeEntry } from '../models/types';
import { navigate } from '../router/router';
import { formatMinutes, totalMinutes, weekMinutes, monthMinutes } from '../domain/timeTracking';

export interface TimeEntryItemHandlers {
  onAdd: (entry: TimeEntry) => void;
  onSubtract: (entry: TimeEntry) => void;
  onDelete: (entry: TimeEntry) => void;
}

export function timeEntryItem(entry: TimeEntry, handlers: TimeEntryItemHandlers): HTMLElement {
  const total = totalMinutes(entry);

  const summary = (label: string, minutes: number): HTMLElement =>
    h('div', { class: 'time-summary' }, [
      h('span', { class: 'time-summary-label' }, [label]),
      h('span', { class: 'time-summary-value' }, [formatMinutes(minutes)]),
    ]);

  return h('li', { class: 'time-item' }, [
    h('div', { class: 'time-item-head' }, [
      h('div', { class: 'time-item-body' }, [
        h('div', { class: 'time-item-title' }, [entry.title]),
        entry.description ? h('div', { class: 'time-item-desc' }, [entry.description]) : null,
      ]),
      h('div', { class: 'time-item-actions' }, [
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
          title: 'Subtract 15 minutes from today',
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
          title: 'Add 15 minutes to today',
          'aria-label': 'Add 15 minutes',
          onclick: () => handlers.onAdd(entry),
        },
        ['+']
      ),
    ]),
    h('div', { class: 'time-summaries' }, [
      summary('This week', weekMinutes(entry)),
      summary('This month', monthMinutes(entry)),
      summary('Total', total),
    ]),
  ]);
}
