type Props = Record<string, unknown> | null | undefined;
type Child = Node | string | number | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props?: Props,
  children?: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (value == null || value === false) continue;
      if (key === 'class' || key === 'className') {
        el.className = String(value);
      } else if (key === 'for') {
        (el as unknown as HTMLLabelElement).htmlFor = String(value);
      } else if (key === 'style' && typeof value === 'object') {
        Object.assign(el.style, value as Partial<CSSStyleDeclaration>);
      } else if (key.startsWith('on') && typeof value === 'function') {
        el.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
      } else if (key in el) {
        (el as unknown as Record<string, unknown>)[key] = value;
      } else {
        el.setAttribute(key, String(value));
      }
    }
  }
  if (children) append(el, children);
  return el;
}

export function append(parent: Node, children: Child[]): void {
  for (const child of children) {
    if (child == null || child === false) continue;
    parent.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

export function clear(el: Element): void {
  el.replaceChildren();
}

export function qs<T extends Element = Element>(selector: string, root: ParentNode = document): T | null {
  return root.querySelector<T>(selector);
}
