import { h, clear } from '../utils/dom';
import * as tasksRepo from '../db/tasks.repo';
import * as projectsRepo from '../db/projects.repo';
import { toggleTaskCompletion } from '../domain/completionFlow';
import { sortTasks } from '../domain/taskSort';
import { taskListItem } from '../components/taskListItem';
import { navigate } from '../router/router';

export async function renderTasksPage(container: HTMLElement): Promise<void> {
  let scope: 'standalone' | 'all' = 'standalone';
  let showCompleted = false;

  async function render(): Promise<void> {
    const tasks = scope === 'standalone' ? await tasksRepo.listStandalone() : await tasksRepo.list();
    const projects = scope === 'all' ? await projectsRepo.list() : [];
    const projectNameById = new Map(projects.map((p) => [p.id, p.title]));

    const filtered = sortTasks(tasks.filter((t) => showCompleted || !t.completed));

    clear(container);
    container.append(
      h('div', { class: 'page' }, [
        h('div', { class: 'page-header' }, [
          h('h1', {}, ['Tasks']),
          h('button', { class: 'btn btn--primary', type: 'button', onclick: () => navigate('/tasks/new') }, ['New task']),
        ]),
        h('div', { class: 'field-row' }, [
          h('label', { class: 'checkbox-field' }, [
            h('input', {
              type: 'radio',
              name: 'scope',
              checked: scope === 'standalone',
              onchange: () => {
                scope = 'standalone';
                void render();
              },
            }),
            'Standalone tasks',
          ]),
          h('label', { class: 'checkbox-field' }, [
            h('input', {
              type: 'radio',
              name: 'scope',
              checked: scope === 'all',
              onchange: () => {
                scope = 'all';
                void render();
              },
            }),
            'All tasks',
          ]),
          h('label', { class: 'checkbox-field' }, [
            h('input', {
              type: 'checkbox',
              checked: showCompleted,
              onchange: (e: Event) => {
                showCompleted = (e.target as HTMLInputElement).checked;
                void render();
              },
            }),
            'Show completed',
          ]),
        ]),
        filtered.length === 0
          ? h('p', { class: 'empty-state' }, ['No tasks to show.'])
          : h(
              'ul',
              { class: 'task-list' },
              filtered.map((task) =>
                taskListItem(
                  task,
                  {
                    onToggleComplete: (t) => {
                      void toggleTaskCompletion(t).then(render);
                    },
                    onTogglePin: (t) => {
                      void tasksRepo.update(t.id, { pinned: !t.pinned }).then(render);
                    },
                    onDelete: (t) => {
                      if (confirm(`Delete task "${t.title}"?`)) void tasksRepo.remove(t.id).then(render);
                    },
                  },
                  {
                    projectLabel: scope === 'all' && task.projectId ? projectNameById.get(task.projectId) : undefined,
                  }
                )
              )
            ),
      ])
    );
  }

  await render();
}
