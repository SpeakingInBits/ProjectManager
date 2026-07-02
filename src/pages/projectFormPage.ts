import { h, clear } from '../utils/dom';
import * as projectsRepo from '../db/projects.repo';
import { categoryPicker, type CategoryPickerValue } from '../components/categoryPicker';
import { navigate } from '../router/router';
import { todayISODate } from '../utils/dates';

export async function renderProjectFormPage(container: HTMLElement, params: Record<string, string>): Promise<void> {
  const isEdit = Boolean(params.id);
  const existing = isEdit ? await projectsRepo.get(params.id!) : null;
  if (isEdit && !existing) {
    clear(container);
    container.append(h('p', { class: 'empty-state' }, ['Project not found.']));
    return;
  }

  let pickerValue: CategoryPickerValue = {
    categoryId: existing?.categoryId ?? null,
    subcategoryId: existing?.subcategoryId ?? null,
  };

  const titleInput = h('input', { type: 'text', name: 'title', required: true, value: existing?.title ?? '' }) as HTMLInputElement;
  const descInput = h('textarea', { name: 'description', rows: 4, value: existing?.description ?? '' }) as HTMLTextAreaElement;

  const hasDueDate = h('input', { type: 'checkbox', checked: Boolean(existing?.dueDate) }) as HTMLInputElement;
  const dueDateInput = h('input', {
    type: 'date',
    name: 'dueDate',
    value: existing?.dueDate ?? '',
    disabled: !existing?.dueDate,
  }) as HTMLInputElement;

  hasDueDate.addEventListener('change', () => {
    dueDateInput.disabled = !hasDueDate.checked;
    if (hasDueDate.checked && !dueDateInput.value) dueDateInput.value = todayISODate();
  });

  const picker = await categoryPicker(pickerValue, (v) => {
    pickerValue = v;
  });

  const form = h('form', { class: 'form' }, [
    h('label', { class: 'field' }, ['Title', titleInput]),
    h('label', { class: 'field' }, ['Description', descInput]),
    h('div', { class: 'field-row' }, [
      h('label', { class: 'checkbox-field' }, [hasDueDate, 'Has due date']),
      h('label', { class: 'field' }, ['Due date', dueDateInput]),
    ]),
    picker,
    h('div', { class: 'form-actions' }, [
      h('button', { type: 'submit', class: 'btn btn--primary' }, [isEdit ? 'Save changes' : 'Create project']),
      h('button', { type: 'button', class: 'btn', onclick: () => history.back() }, ['Cancel']),
    ]),
  ]);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = titleInput.value.trim();
    if (!title) return;

    const input = {
      title,
      description: descInput.value.trim(),
      dueDate: hasDueDate.checked && dueDateInput.value ? dueDateInput.value : null,
      categoryId: pickerValue.categoryId,
      subcategoryId: pickerValue.subcategoryId,
    };

    void (isEdit
      ? projectsRepo.update(existing!.id, input).then((p) => navigate(`/projects/${p.id}`))
      : projectsRepo.create(input).then((p) => navigate(`/projects/${p.id}`)));
  });

  clear(container);
  container.append(h('div', { class: 'page' }, [h('h1', {}, [isEdit ? 'Edit project' : 'New project']), form]));
}
