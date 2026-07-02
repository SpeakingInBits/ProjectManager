import { h } from '../utils/dom';

const LINKS: [string, string][] = [
  ['#/', 'Projects'],
  ['#/tasks', 'Tasks'],
  ['#/categories', 'Categories'],
];

function isActive(href: string): boolean {
  const current = location.hash || '#/';
  if (href === '#/') return current === '#/' || current.startsWith('#/projects');
  return current.startsWith(href);
}

export function navBar(): HTMLElement {
  return h(
    'nav',
    { class: 'nav-bar' },
    LINKS.map(([href, label]) => h('a', { href, class: `nav-link${isActive(href) ? ' nav-link--active' : ''}` }, [label]))
  );
}
