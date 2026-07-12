import { h, clear } from '../utils/dom';
import * as tasksRepo from '../db/tasks.repo';
import * as projectsRepo from '../db/projects.repo';
import { categoryPicker, type CategoryPickerValue } from '../components/categoryPicker';
import { repeatConfigEditor } from '../components/repeatConfigEditor';
import { navigate } from '../router/router';
import { todayISODate } from '../utils/dates';
import type { RepeatConfig } from '../models/types';

export async function renderTaskFormPage(container: HTMLElement, params: Record<string, string>): Promise<void> {
  const isEdit = Boolean(params.id);
  const existing = isEdit ? await tasksRepo.get(params.id!) : null;
  if (isEdit && !existing) {
    clear(container);
    container.append(h('p', { class: 'empty-state' }, ['Task not found.']));
    return;
  }

  const preselectedProjectId = existing?.projectId ?? params.projectId ?? null;
  const projects = await projectsRepo.list();
  const preselectedProject = preselectedProjectId ? (projects.find((p) => p.id === preselectedProjectId) ?? null) : null;

  let pickerValue: CategoryPickerValue = existing
    ? { categoryId: existing.categoryId, subcategoryId: existing.subcategoryId }
    : { categoryId: preselectedProject?.categoryId ?? null, subcategoryId: preselectedProject?.subcategoryId ?? null };
  let repeatValue: RepeatConfig = existing?.repeat ?? { kind: 'never' };

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

  const projectSelect = h('select', { name: 'projectId' }, [
    h('option', { value: '' }, ['Standalone (no project)']),
    ...projects.map((p) => h('option', { value: p.id, selected: p.id === preselectedProjectId }, [p.title])),
  ]) as HTMLSelectElement;

  const picker = await categoryPicker(pickerValue, (v) => {
    pickerValue = v;
  });
  const repeatEditor = repeatConfigEditor(repeatValue, (v) => {
    repeatValue = v;
  });

  const form = h('form', { class: 'form' }, [
    h('label', { class: 'field' }, ['Title', titleInput]),
    h('label', { class: 'field' }, ['Description', descInput]),
    h('div', { class: 'field-row' }, [
      h('label', { class: 'checkbox-field' }, [hasDueDate, 'Has due date']),
      h('label', { class: 'field' }, ['Due date', dueDateInput]),
    ]),
    h('label', { class: 'field' }, ['Project', projectSelect]),
    picker,
    repeatEditor,
    h('div', { class: 'form-actions' }, [
      h('button', { type: 'submit', class: 'btn btn--primary' }, [isEdit ? 'Save changes' : 'Create task']),
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
      projectId: projectSelect.value || null,
      categoryId: pickerValue.categoryId,
      subcategoryId: pickerValue.subcategoryId,
      repeat: repeatValue,
    };

    const destination = input.projectId ? `/projects/${input.projectId}` : '/tasks';

    void (isEdit
      ? tasksRepo.update(existing!.id, input).then(() => navigate(destination))
      : tasksRepo.create(input).then(() => navigate(destination)));
  });

  clear(container);
  container.append(h('div', { class: 'page' }, [h('h1', {}, [isEdit ? 'Edit task' : 'New task']), form]));
}
