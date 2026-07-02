type RouteRender = (container: HTMLElement, params: Record<string, string>) => void | Promise<void>;

interface Route {
  pattern: RegExp;
  paramNames: string[];
  render: RouteRender;
}

export class Router {
  private routes: Route[] = [];
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    window.addEventListener('hashchange', () => void this.resolve());
  }

  add(path: string, render: RouteRender): this {
    const paramNames: string[] = [];
    const patternStr = path
      .split('/')
      .map((segment) => {
        if (segment.startsWith(':')) {
          paramNames.push(segment.slice(1));
          return '([^/]+)';
        }
        return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      })
      .join('/');
    this.routes.push({ pattern: new RegExp(`^${patternStr}$`), paramNames, render });
    return this;
  }

  start(): void {
    void this.resolve();
  }

  private async resolve(): Promise<void> {
    const hash = location.hash.slice(1) || '/';
    const [path = '/', queryStr] = hash.split('?');

    for (const route of this.routes) {
      const match = route.pattern.exec(path);
      if (!match) continue;

      const params: Record<string, string> = {};
      route.paramNames.forEach((name, i) => {
        params[name] = decodeURIComponent(match[i + 1] ?? '');
      });
      if (queryStr) {
        for (const [key, value] of new URLSearchParams(queryStr)) {
          params[key] = value;
        }
      }

      this.container.replaceChildren();
      await route.render(this.container, params);
      return;
    }

    this.container.replaceChildren();
    this.container.append('Page not found');
  }
}

export function navigate(path: string): void {
  location.hash = path;
}
