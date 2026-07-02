import { h } from '../utils/dom';
import type { Project } from '../models/types';
import { formatDateDisplay, isOverdue } from '../utils/dates';
import { progressBar } from './progressBar';
import { navigate } from '../router/router';
import type { ProjectProgress } from '../domain/progress';

export function projectCard(project: Project, progress: ProjectProgress, timeSpentHours: number): HTMLElement {
  const overdue = progress.percent < 100 && isOverdue(project.dueDate);

  return h(
    'article',
    { class: 'project-card', onclick: () => navigate(`/projects/${project.id}`) },
    [
      h('h3', { class: 'project-card-title' }, [project.title]),
      project.description ? h('p', { class: 'project-card-desc' }, [project.description]) : null,
      h('div', { class: 'project-card-meta' }, [
        project.dueDate ? h('span', { class: `badge${overdue ? ' badge--overdue' : ''}` }, [`Due ${formatDateDisplay(project.dueDate)}`]) : null,
        h('span', { class: 'badge' }, [`${timeSpentHours}h logged`]),
      ]),
      progressBar(progress.percent),
      h('div', { class: 'project-card-progress-label' }, [`${progress.done} / ${progress.total} tasks`]),
    ]
  );
}
