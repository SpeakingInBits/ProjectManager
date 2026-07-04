import { h, clear } from '../utils/dom';
import * as projectsRepo from '../db/projects.repo';
import * as tasksRepo from '../db/tasks.repo';
import * as categoriesRepo from '../db/categories.repo';
import * as subcategoriesRepo from '../db/subcategories.repo';
import { computeProjectProgress, computeProjectTimeSpent } from '../domain/progress';
import { toggleTaskCompletion } from '../domain/completionFlow';
import { progressBar } from '../components/progressBar';
import { taskListItem } from '../components/taskListItem';
import { navigate } from '../router/router';
import { formatDateDisplay } from '../utils/dates';
import type { Task } from '../models/types';

export async function renderProjectDetailPage(container: HTMLElement, params: Record<string, string>): Promise<void> {
  const projectId = params.id!;
  let showCompleted = false;

  async function onDeleteProject(id: string, title: string, taskCount: number): Promise<void> {
    if (!confirm(`Delete project "${title}"? This cannot be undone.`)) return;
    const deleteTasks =
      taskCount > 0
        ? confirm(`This project has ${taskCount} task(s). Click OK to delete them too, or Cancel to keep them as standalone tasks.`)
        : false;
    await projectsRepo.removeProject(id, { deleteTasks });
    navigate('/');
  }

  function taskSection(allTasks: Task[]): HTMLElement {
    const filtered = allTasks
      .filter((t) => showCompleted || !t.completed)
      .sort((a, b) => Number(a.completed) - Number(b.completed));

    const toggle = h('label', { class: 'checkbox-field' }, [
      h('input', {
        type: 'checkbox',
        checked: showCompleted,
        onchange: (e: Event) => {
          showCompleted = (e.target as HTMLInputElement).checked;
          void render();
        },
      }),
      'Show completed tasks',
    ]);

    const list =
      filtered.length === 0
        ? h('p', { class: 'empty-state' }, ['No tasks to show.'])
        : h(
            'ul',
            { class: 'task-list' },
            filtered.map((task) =>
              taskListItem(task, {
                onToggleComplete: (t) => {
                  void toggleTaskCompletion(t).then(render);
                },
                onDelete: (t) => {
                  if (confirm(`Delete task "${t.title}"?`)) void tasksRepo.remove(t.id).then(render);
                },
              })
            )
          );

    return h('div', { class: 'task-section' }, [toggle, list]);
  }

  async function render(): Promise<void> {
    const project = await projectsRepo.get(projectId);
    if (!project) {
      clear(container);
      container.append(h('p', { class: 'empty-state' }, ['Project not found.']));
      return;
    }

    const allTasks = await tasksRepo.listByProject(projectId);
    const progress = computeProjectProgress(allTasks);
    const timeSpent = computeProjectTimeSpent(allTasks);

    const [category, subcategory] = await Promise.all([
      project.categoryId ? categoriesRepo.get(project.categoryId) : Promise.resolve(undefined),
      project.subcategoryId ? subcategoriesRepo.get(project.subcategoryId) : Promise.resolve(undefined),
    ]);

    clear(container);
    container.append(
      h('div', { class: 'page' }, [
        h('div', { class: 'page-header' }, [
          h('h1', {}, [project.title]),
          h('div', { class: 'button-row' }, [
            h('button', { class: 'btn', type: 'button', onclick: () => navigate(`/projects/${project.id}/edit`) }, ['Edit']),
            h(
              'button',
              {
                class: 'btn btn--danger',
                type: 'button',
                onclick: () => void onDeleteProject(project.id, project.title, allTasks.length),
              },
              ['Delete']
            ),
          ]),
        ]),
        project.description ? h('p', {}, [project.description]) : null,
        h('div', { class: 'project-card-meta' }, [
          project.dueDate ? h('span', { class: 'badge' }, [`Due ${formatDateDisplay(project.dueDate)}`]) : null,
          category ? h('span', { class: 'badge' }, [subcategory ? `${category.name} / ${subcategory.name}` : category.name]) : null,
          h('span', { class: 'badge' }, [`${timeSpent}h logged`]),
        ]),
        progressBar(progress.percent),
        h('div', { class: 'project-card-progress-label' }, [`${progress.done} / ${progress.total} tasks complete (${progress.percent}%)`]),
        h('div', { class: 'page-header' }, [
          h('h2', {}, ['Tasks']),
          h(
            'button',
            { class: 'btn btn--primary', type: 'button', onclick: () => navigate(`/tasks/new?projectId=${project.id}`) },
            ['Add task']
          ),
        ]),
        taskSection(allTasks),
      ])
    );
  }

  await render();
}
