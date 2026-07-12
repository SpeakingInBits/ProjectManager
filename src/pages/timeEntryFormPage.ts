import { h, clear } from '../utils/dom';
import * as timeEntriesRepo from '../db/timeEntries.repo';
import { navigate } from '../router/router';

export async function renderTimeEntryFormPage(container: HTMLElement, params: Record<string, string>): Promise<void> {
  const isEdit = Boolean(params.id);
  const existing = isEdit ? await timeEntriesRepo.get(params.id!) : null;
  if (isEdit && !existing) {
    clear(container);
    container.append(h('p', { class: 'empty-state' }, ['Time-tracked item not found.']));
    return;
  }

  const titleInput = h('input', { type: 'text', name: 'title', required: true, value: existing?.title ?? '' }) as HTMLInputElement;
  const descInput = h('textarea', { name: 'description', rows: 4, value: existing?.description ?? '' }) as HTMLTextAreaElement;

  const form = h('form', { class: 'form' }, [
    h('label', { class: 'field' }, ['Title', titleInput]),
    h('label', { class: 'field' }, ['Description', descInput]),
    h('div', { class: 'form-actions' }, [
      h('button', { type: 'submit', class: 'btn btn--primary' }, [isEdit ? 'Save changes' : 'Create item']),
      h('button', { type: 'button', class: 'btn', onclick: () => history.back() }, ['Cancel']),
    ]),
  ]);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = titleInput.value.trim();
    if (!title) return;

    const input = { title, description: descInput.value.trim() };

    void (isEdit
      ? timeEntriesRepo.update(existing!.id, input).then(() => navigate('/time'))
      : timeEntriesRepo.create(input).then(() => navigate('/time')));
  });

  clear(container);
  container.append(h('div', { class: 'page' }, [h('h1', {}, [isEdit ? 'Edit time item' : 'New time item']), form]));
}
