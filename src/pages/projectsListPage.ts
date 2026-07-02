import { h, clear } from '../utils/dom';
import * as projectsRepo from '../db/projects.repo';
import * as tasksRepo from '../db/tasks.repo';
import { computeProjectProgress, computeProjectTimeSpent } from '../domain/progress';
import { projectCard } from '../components/projectCard';
import { navigate } from '../router/router';

export async function renderProjectsListPage(container: HTMLElement): Promise<void> {
  const projects = await projectsRepo.list();

  const cards = await Promise.all(
    projects.map(async (project) => {
      const tasks = await tasksRepo.listByProject(project.id);
      const progress = computeProjectProgress(tasks);
      const timeSpent = computeProjectTimeSpent(tasks);
      return projectCard(project, progress, timeSpent);
    })
  );

  clear(container);
  container.append(
    h('div', { class: 'page' }, [
      h('div', { class: 'page-header' }, [
        h('h1', {}, ['Projects']),
        h('button', { class: 'btn btn--primary', type: 'button', onclick: () => navigate('/projects/new') }, ['New project']),
      ]),
      projects.length === 0
        ? h('p', { class: 'empty-state' }, ['No projects yet. Create your first project to get started.'])
        : h('div', { class: 'project-grid' }, cards),
    ])
  );
}
