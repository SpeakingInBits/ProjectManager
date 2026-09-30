import { h } from '../utils/dom';
import type { Task } from '../models/types';
import { openModal } from './modal';

// Preferences for how tasks behave, set from the Tasks page settings modal.
// A lasting preference, so it persists across sessions via localStorage, and
// applies everywhere tasks are completed (Tasks page and project detail).
export interface TaskSettings {
  confirmCompletion: boolean;
}

const TASK_SETTINGS_KEY = 'tasks.settings';

export function loadTaskSettings(): TaskSettings {
  try {
    const raw = localStorage.getItem(TASK_SETTINGS_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        const p = parsed as Record<string, unknown>;
        return { confirmCompletion: Boolean(p.confirmCompletion) };
      }
    }
  } catch {
    // Corrupt or inaccessible storage — fall through to defaults.
  }
  return { confirmCompletion: false };
}

export function saveTaskSettings(settings: TaskSettings): void {
  try {
    localStorage.setItem(TASK_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Storage unavailable — the setting is lost on the next load.
  }
}

// Returns whether the pending completion toggle should go ahead. Only marking
// a task complete is guarded (un-completing is harmless and undoable), and
// only when the user turned confirmation on.
export function confirmTaskCompletion(task: Task): boolean {
  if (task.completed || !loadTaskSettings().confirmCompletion) return true;
  const repeatNote = task.repeat.kind !== 'never' ? '\n\nThis task repeats — its next occurrence will be created.' : '';
  return confirm(`Mark "${task.title}" as completed?${repeatNote}`);
}

// Settings modal for the Tasks page.
export function openTaskSettingsModal(onSave: (settings: TaskSettings) => void): void {
  const current = loadTaskSettings();
  const confirmCheckbox = h('input', { type: 'checkbox', checked: current.confirmCompletion }) as HTMLInputElement;

  const form = h('form', { class: 'modal-form' }, [
    h('h2', {}, ['Task settings']),
    h('label', { class: 'checkbox-field' }, [confirmCheckbox, 'Ask for confirmation before completing a task']),
    h('div', { class: 'form-actions' }, [
      h('button', { type: 'submit', class: 'btn btn--primary' }, ['Save']),
      h('button', { type: 'button', class: 'btn', onclick: () => modal.close() }, ['Cancel']),
    ]),
  ]);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    modal.close();
    const settings = { confirmCompletion: confirmCheckbox.checked };
    saveTaskSettings(settings);
    onSave(settings);
  });

  const modal = openModal(form);
  confirmCheckbox.focus();
}
