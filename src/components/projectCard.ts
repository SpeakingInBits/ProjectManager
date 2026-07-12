import { h } from '../utils/dom';
import type { Project } from '../models/types';
import { formatDateDisplay, isOverdue } from '../utils/dates';
import { progressBar } from './progressBar';
import { navigate } from '../router/router';
import type { ProjectProgress } from '../domain/progress';

export interface ProjectCardHandlers {
  onMoveUp: (project: Project) => void;
  onMoveDown: (project: Project) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

export function projectCard(project: Project, progress: ProjectProgress, handlers: ProjectCardHandlers): HTMLElement {
  const overdue = progress.percent < 100 && isOverdue(project.dueDate);

  // The whole card navigates on click, so the reorder arrows stop propagation
  // to avoid opening the project when the user just wants to move it.
  const arrow = (label: string, title: string, enabled: boolean, onActivate: () => void): HTMLElement =>
    h(
      'button',
      {
        class: 'btn btn--icon project-card-move',
        type: 'button',
        title,
        'aria-label': title,
        disabled: !enabled,
        onclick: (e: Event) => {
          e.stopPropagation();
          if (enabled) onActivate();
        },
      },
      [label]
    );

  return h(
    'article',
    { class: 'project-card', onclick: () => navigate(`/projects/${project.id}`) },
    [
      h('div', { class: 'project-card-head' }, [
        h('h3', { class: 'project-card-title' }, [project.title]),
        h('div', { class: 'project-card-move-group' }, [
          arrow('▲', 'Move up', handlers.canMoveUp, () => handlers.onMoveUp(project)),
          arrow('▼', 'Move down', handlers.canMoveDown, () => handlers.onMoveDown(project)),
        ]),
      ]),
      project.description ? h('p', { class: 'project-card-desc' }, [project.description]) : null,
      h('div', { class: 'project-card-meta' }, [
        project.dueDate ? h('span', { class: `badge${overdue ? ' badge--overdue' : ''}` }, [`Due ${formatDateDisplay(project.dueDate)}`]) : null,
      ]),
      progressBar(progress.percent),
      h('div', { class: 'project-card-progress-label' }, [`${progress.done} / ${progress.total} tasks (${progress.percent}%)`]),
    ]
  );
}
