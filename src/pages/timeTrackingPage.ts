import { h, clear } from '../utils/dom';
import * as timeEntriesRepo from '../db/timeEntries.repo';
import { timeEntryItem } from '../components/timeEntryItem';
import { INCREMENT_MINUTES } from '../domain/timeTracking';
import { navigate } from '../router/router';

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
