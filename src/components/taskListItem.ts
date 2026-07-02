import { h } from '../utils/dom';
import type { Task } from '../models/types';
import { formatDateDisplay, isOverdue } from '../utils/dates';
import { navigate } from '../router/router';

export interface TaskListItemHandlers {
  onToggleComplete: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export interface TaskListItemOptions {
  projectLabel?: string;
}

export function taskListItem(task: Task, handlers: TaskListItemHandlers, options: TaskListItemOptions = {}): HTMLElement {
  const checkbox = h('input', {
    type: 'checkbox',
    checked: task.completed,
    onchange: () => handlers.onToggleComplete(task),
  }) as HTMLInputElement;

  const overdue = !task.completed && isOverdue(task.dueDate);

  return h('li', { class: `task-item${task.completed ? ' task-item--done' : ''}` }, [
    checkbox,
    h('div', { class: 'task-item-body' }, [
      h('div', { class: 'task-item-title' }, [task.title]),
      h('div', { class: 'task-item-meta' }, [
        options.projectLabel ? h('span', { class: 'badge' }, [options.projectLabel]) : null,
        task.dueDate ? h('span', { class: `badge${overdue ? ' badge--overdue' : ''}` }, [`Due ${formatDateDisplay(task.dueDate)}`]) : null,
        task.repeat.kind !== 'never' ? h('span', { class: 'badge' }, ['Repeats']) : null,
        h('span', { class: 'badge' }, [`${task.timeSpentHours}h`]),
      ]),
    ]),
    h('div', { class: 'task-item-actions' }, [
      h('button', { class: 'btn btn--icon', type: 'button', onclick: () => navigate(`/tasks/${task.id}/edit`) }, ['Edit']),
      h('button', { class: 'btn btn--icon btn--danger', type: 'button', onclick: () => handlers.onDelete(task) }, ['Delete']),
    ]),
  ]);
}
