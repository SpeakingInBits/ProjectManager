import { h, clear } from '../utils/dom';
import type { TimeEntry } from '../models/types';
import * as timeEntriesRepo from '../db/timeEntries.repo';
import { timeEntryItem } from '../components/timeEntryItem';
import { INCREMENT_MINUTES, formatMinutes, todayMinutes, weekMinutes, monthMinutes } from '../domain/timeTracking';
import { navigate } from '../router/router';

// Rolls every tracked item's logged minutes into a single Today/week/month
// total, so the page answers "how much did I work?" without mental addition.
function overallSummary(entries: TimeEntry[]): HTMLElement {
  const sum = (minutesFor: (entry: TimeEntry) => number): number =>
    entries.reduce((total, entry) => total + minutesFor(entry), 0);

  const tile = (label: string, minutes: number): HTMLElement =>
    h('div', { class: 'time-summary' }, [
      h('span', { class: 'time-summary-label' }, [label]),
      h('span', { class: 'time-summary-value' }, [formatMinutes(minutes)]),
    ]);

  return h('section', { class: 'time-overall' }, [
    h('h2', { class: 'time-overall-title' }, ['All items']),
    h('div', { class: 'time-summaries time-summaries--plain' }, [
      tile('Today', sum((entry) => todayMinutes(entry))),
      tile('This week', sum((entry) => weekMinutes(entry))),
      tile('This month', sum((entry) => monthMinutes(entry))),
    ]),
  ]);
}

export async function renderTimeTrackingPage(container: HTMLElement): Promise<void> {
  async function render(): Promise<void> {
    const entries = await timeEntriesRepo.list();

    clear(container);
    container.append(
      h('div', { class: 'page' }, [
        h('div', { class: 'page-header' }, [
          h('h1', {}, ['Time Tracking']),
          h('button', { class: 'btn btn--primary', type: 'button', onclick: () => navigate('/time/new') }, ['New item']),
        ]),
        entries.length === 0 ? null : overallSummary(entries),
        entries.length === 0
          ? h('p', { class: 'empty-state' }, ['No time-tracked items yet. Create one to start logging time.'])
          : h(
              'ul',
              { class: 'time-list' },
              entries.map((entry) =>
                timeEntryItem(entry, {
                  onAdd: (e) => {
                    void timeEntriesRepo.addMinutesToday(e.id, INCREMENT_MINUTES).then(render);
                  },
                  onSubtract: (e) => {
                    void timeEntriesRepo.addMinutesToday(e.id, -INCREMENT_MINUTES).then(render);
                  },
                  onDelete: (e) => {
                    if (confirm(`Delete time-tracked item "${e.title}"? This also deletes its logged time.`))
                      void timeEntriesRepo.remove(e.id).then(render);
                  },
                })
              )
            ),
      ])
    );
  }

  await render();
}
