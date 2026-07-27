import { h, clear } from '../utils/dom';
import type { TimeEntry } from '../models/types';
import * as timeEntriesRepo from '../db/timeEntries.repo';
import { timeEntryItem } from '../components/timeEntryItem';
import { INCREMENT_MINUTES, formatMinutes, todayMinutes, weekMinutes, monthMinutes } from '../domain/timeTracking';
import { openDayNoteModal, openTimeHistoryModal, openEntryDateModal } from '../components/timeEntryModals';
import { todayISODate, formatDateDisplay } from '../utils/dates';
import { navigate } from '../router/router';

// The day that +/− time and notes are logged to. Normally today, but
// changeable from the settings modal to backfill missed days. Module-level so
// it survives navigating away and back within a session.
let entryDate = todayISODate();

// Rolls every tracked item's logged minutes into a single day/week/month
// total, so the page answers "how much did I work?" without mental addition.
function overallSummary(entries: TimeEntry[]): HTMLElement {
  const sum = (minutesFor: (entry: TimeEntry) => number): number =>
    entries.reduce((total, entry) => total + minutesFor(entry), 0);

  const tile = (label: string, minutes: number): HTMLElement =>
    h('div', { class: 'time-summary' }, [
      h('span', { class: 'time-summary-label' }, [label]),
      h('span', { class: 'time-summary-value' }, [formatMinutes(minutes)]),
    ]);

  const dayLabel = entryDate === todayISODate() ? 'Today' : formatDateDisplay(entryDate);

  return h('section', { class: 'time-overall' }, [
    h('h2', { class: 'time-overall-title' }, ['All items']),
    h('div', { class: 'time-today time-today--overall' }, [
      h('div', { class: 'time-today-main' }, [
        h('span', { class: 'time-today-label' }, [dayLabel]),
        h('span', { class: 'time-today-value' }, [formatMinutes(sum((entry) => todayMinutes(entry, entryDate)))]),
      ]),
    ]),
    h('div', { class: 'time-summaries' }, [
      tile('This week', sum((entry) => weekMinutes(entry))),
      tile('This month', sum((entry) => monthMinutes(entry))),
    ]),
  ]);
}

export async function renderTimeTrackingPage(container: HTMLElement): Promise<void> {
  async function render(): Promise<void> {
    const entries = await timeEntriesRepo.list();
    const isToday = entryDate === todayISODate();

    clear(container);
    container.append(
      h('div', { class: 'page' }, [
        h('div', { class: 'page-header' }, [
          h('h1', {}, ['Time Tracking']),
          h('div', { class: 'page-header-actions' }, [
            h(
              'button',
              {
                class: 'btn',
                type: 'button',
                title: 'Change the date time is logged to',
                onclick: () =>
                  openEntryDateModal(entryDate, (date) => {
                    entryDate = date;
                    void render();
                  }),
              },
              ['Settings']
            ),
            h('button', { class: 'btn btn--primary', type: 'button', onclick: () => navigate('/time/new') }, ['New item']),
          ]),
        ]),
        isToday
          ? null
          : h('div', { class: 'time-date-warning', role: 'alert' }, [
              h('span', {}, [
                `You are logging time for ${formatDateDisplay(entryDate)}, not today. New time and notes will be saved to that day.`,
              ]),
              h(
                'button',
                {
                  class: 'btn time-date-warning-btn',
                  type: 'button',
                  onclick: () => {
                    entryDate = todayISODate();
                    void render();
                  },
                },
                ['Switch back to today']
              ),
            ]),
        entries.length === 0 ? null : overallSummary(entries),
        entries.length === 0
          ? h('p', { class: 'empty-state' }, ['No time-tracked items yet. Create one to start logging time.'])
          : h(
              'ul',
              { class: 'time-list' },
              entries.map((entry) =>
                timeEntryItem(entry, entryDate, {
                  onAdd: (e) => {
                    void timeEntriesRepo.addMinutesOnDay(e.id, entryDate, INCREMENT_MINUTES).then(render);
                  },
                  onSubtract: (e) => {
                    void timeEntriesRepo.addMinutesOnDay(e.id, entryDate, -INCREMENT_MINUTES).then(render);
                  },
                  onDelete: (e) => {
                    if (confirm(`Delete time-tracked item "${e.title}"? This also deletes its logged time.`))
                      void timeEntriesRepo.remove(e.id).then(render);
                  },
                  onEditNote: (e) => {
                    openDayNoteModal(e, entryDate, (note) => {
                      void timeEntriesRepo.setDayNote(e.id, entryDate, note).then(render);
                    });
                  },
                  onHistory: (e) => {
                    openTimeHistoryModal(e, (date, note) =>
                      timeEntriesRepo.setDayNote(e.id, date, note).then((updated) => {
                        void render();
                        return updated;
                      })
                    );
                  },
                })
              )
            ),
      ])
    );
  }

  await render();
}
