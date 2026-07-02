import { h } from '../utils/dom';

export function progressBar(percent: number): HTMLElement {
  const clamped = Math.min(100, Math.max(0, percent));
  return h(
    'div',
    {
      class: 'progress-bar',
      role: 'progressbar',
      'aria-valuenow': clamped,
      'aria-valuemin': 0,
      'aria-valuemax': 100,
    },
    [h('div', { class: 'progress-bar-fill', style: { width: `${clamped}%` } })]
  );
}
