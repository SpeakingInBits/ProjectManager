import { h, clear } from '../utils/dom';
import * as projectsRepo from '../db/projects.repo';
import * as tasksRepo from '../db/tasks.repo';
import { computeProjectProgress } from '../domain/progress';
import { projectCard } from '../components/projectCard';
import { navigate } from '../router/router';
import type { Project } from '../models/types';

export async function renderProjectsListPage(container: HTMLElement): Promise<void> {
  async function move(project: Project, direction: 'up' | 'down'): Promise<void> {
    await projectsRepo.move(project.id, direction);
    await render();
  }

  async function render(): Promise<void> {
    const projects = await projectsRepo.list();

    const cards = await Promise.all(
      projects.map(async (project, index) => {
        const tasks = await tasksRepo.listByProject(project.id);
        const progress = computeProjectProgress(tasks);
        return projectCard(project, progress, {
          onMoveUp: (p) => void move(p, 'up'),
          onMoveDown: (p) => void move(p, 'down'),
          canMoveUp: index > 0,
          canMoveDown: index < projects.length - 1,
        });
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

  await render();
}
