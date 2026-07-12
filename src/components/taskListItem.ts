import { h } from '../utils/dom';
import type { Task } from '../models/types';
import { formatDateDisplay, isOverdue } from '../utils/dates';
import { navigate } from '../router/router';

export interface TaskListItemHandlers {
  onToggleComplete: (task: Task) => void;
  onTogglePin: (task: Task) => void;
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
  const pinned = !task.completed && task.pinned;

  return h('li', { class: `task-item${task.completed ? ' task-item--done' : ''}${pinned ? ' task-item--pinned' : ''}` }, [
    checkbox,
    h('div', { class: 'task-item-body' }, [
      h('div', { class: 'task-item-title' }, [pinned ? h('span', { class: 'task-pin-marker', title: 'Pinned' }, ['📌']) : null, task.title]),
      h('div', { class: 'task-item-meta' }, [
        options.projectLabel ? h('span', { class: 'badge' }, [options.projectLabel]) : null,
        task.dueDate ? h('span', { class: `badge${overdue ? ' badge--overdue' : ''}` }, [`Due ${formatDateDisplay(task.dueDate)}`]) : null,
        task.repeat.kind !== 'never' ? h('span', { class: 'badge' }, ['Repeats']) : null,
      ]),
    ]),
    h('div', { class: 'task-item-actions' }, [
      task.completed
        ? null
        : h(
            'button',
            {
              class: `btn btn--icon${task.pinned ? ' btn--active' : ''}`,
              type: 'button',
              title: task.pinned ? 'Unpin task' : 'Pin task to top',
              onclick: () => handlers.onTogglePin(task),
            },
            [task.pinned ? 'Unpin' : 'Pin']
          ),
      h('button', { class: 'btn btn--icon', type: 'button', onclick: () => navigate(`/tasks/${task.id}/edit`) }, ['Edit']),
      h('button', { class: 'btn btn--icon btn--danger', type: 'button', onclick: () => handlers.onDelete(task) }, ['Delete']),
    ]),
  ]);
}
