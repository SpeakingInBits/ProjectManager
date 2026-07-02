import { h } from '../utils/dom';
import type { RepeatConfig } from '../models/types';

const REPEAT_KINDS: { value: RepeatConfig['kind']; label: string }[] = [
  { value: 'never', label: 'Never' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'custom', label: 'Custom (every N days)' },
  { value: 'movable', label: 'Movable (N days after completion)' },
];

function needsInterval(kind: RepeatConfig['kind']): boolean {
  return kind === 'custom' || kind === 'movable';
}

export function repeatConfigEditor(value: RepeatConfig, onChange: (value: RepeatConfig) => void): HTMLElement {
  const kindSelect = h(
    'select',
    { name: 'repeatKind' },
    REPEAT_KINDS.map((k) => h('option', { value: k.value, selected: k.value === value.kind }, [k.label]))
  ) as HTMLSelectElement;

  const initialDays = 'intervalDays' in value ? value.intervalDays : 7;
  const intervalInput = h('input', {
    type: 'number',
    name: 'repeatIntervalDays',
    min: '1',
    step: '1',
    value: String(initialDays),
  }) as HTMLInputElement;

  const intervalField = h('label', { class: 'field', style: { display: needsInterval(value.kind) ? '' : 'none' } }, [
    'Repeat every (days)',
    intervalInput,
  ]);

  function currentConfig(): RepeatConfig {
    const kind = kindSelect.value as RepeatConfig['kind'];
    if (needsInterval(kind)) {
      return { kind, intervalDays: Math.max(1, Math.trunc(Number(intervalInput.value)) || 1) };
    }
    return { kind } as RepeatConfig;
  }

  kindSelect.addEventListener('change', () => {
    intervalField.style.display = needsInterval(kindSelect.value as RepeatConfig['kind']) ? '' : 'none';
    onChange(currentConfig());
  });

  intervalInput.addEventListener('input', () => onChange(currentConfig()));

  return h('div', { class: 'field-row' }, [h('label', { class: 'field' }, ['Repeat', kindSelect]), intervalField]);
}
