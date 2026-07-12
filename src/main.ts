import './style.css';
import { Router } from './router/router';
import { navBar } from './components/navBar';
import { registerServiceWorker } from './sw-register';
import { renderProjectsListPage } from './pages/projectsListPage';
import { renderProjectDetailPage } from './pages/projectDetailPage';
import { renderProjectFormPage } from './pages/projectFormPage';
import { renderTasksPage } from './pages/tasksPage';
import { renderTaskFormPage } from './pages/taskFormPage';
import { renderTimeTrackingPage } from './pages/timeTrackingPage';
import { renderTimeEntryFormPage } from './pages/timeEntryFormPage';
import { renderCategoriesPage } from './pages/categoriesPage';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('#app root element not found');

app.replaceChildren();

const navContainer = document.createElement('div');
const mainContainer = document.createElement('main');
mainContainer.className = 'app-main';
app.append(navContainer, mainContainer);

function refreshNav(): void {
  navContainer.replaceChildren(navBar());
}
window.addEventListener('hashchange', refreshNav);
refreshNav();

const router = new Router(mainContainer);
router
  .add('/', renderProjectsListPage)
  .add('/projects/new', renderProjectFormPage)
  .add('/projects/:id/edit', renderProjectFormPage)
  .add('/projects/:id', renderProjectDetailPage)
  .add('/tasks', renderTasksPage)
  .add('/tasks/new', renderTaskFormPage)
  .add('/tasks/:id/edit', renderTaskFormPage)
  .add('/time', renderTimeTrackingPage)
  .add('/time/new', renderTimeEntryFormPage)
  .add('/time/:id/edit', renderTimeEntryFormPage)
  .add('/categories', renderCategoriesPage);

router.start();
registerServiceWorker();
