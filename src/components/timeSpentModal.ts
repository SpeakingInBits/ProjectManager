import { h } from '../utils/dom';
import { openModal } from './modal';

// Resolves to the entered hours, or null if the user cancels (in which case
// the caller should leave the task incomplete).
export function promptTimeSpentHours(taskTitle: string): Promise<number | null> {
  return new Promise((resolve) => {
    const input = h('input', { type: 'number', min: '0', step: '0.25', value: '0' }) as HTMLInputElement;

    let settled = false;
    function settle(value: number | null): void {
      if (settled) return;
      settled = true;
      modal.close();
      resolve(value);
    }

    const form = h(
      'form',
      {
        class: 'modal-form',
        onsubmit: (e: Event) => {
          e.preventDefault();
          settle(Math.max(0, Number(input.value) || 0));
        },
      },
      [
        h('h2', {}, ['Log time spent']),
        h('p', {}, [`This task has no time logged yet. How many hours did you spend on "${taskTitle}"?`]),
        h('label', { class: 'field' }, ['Hours spent', input]),
        h('div', { class: 'form-actions' }, [
          h('button', { type: 'submit', class: 'btn btn--primary' }, ['Mark complete']),
          h('button', { type: 'button', class: 'btn', onclick: () => settle(null) }, ['Cancel']),
        ]),
      ]
    );

    const modal = openModal(form, () => settle(null));
    input.focus();
    input.select();
  });
}
