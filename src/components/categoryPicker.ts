import { h } from '../utils/dom';
import * as categoriesRepo from '../db/categories.repo';
import * as subcategoriesRepo from '../db/subcategories.repo';

export interface CategoryPickerValue {
  categoryId: string | null;
  subcategoryId: string | null;
}

export async function categoryPicker(
  value: CategoryPickerValue,
  onChange: (value: CategoryPickerValue) => void
): Promise<HTMLElement> {
  const categories = await categoriesRepo.list();

  const categorySelect = h('select', { name: 'categoryId' }, [
    h('option', { value: '' }, ['No category']),
    ...categories.map((c) => h('option', { value: c.id, selected: c.id === value.categoryId }, [c.name])),
  ]) as HTMLSelectElement;

  const subcategorySelect = h('select', { name: 'subcategoryId' }) as HTMLSelectElement;

  async function refreshSubcategories(categoryId: string, selectedSubcategoryId: string | null): Promise<void> {
    subcategorySelect.replaceChildren();
    subcategorySelect.append(h('option', { value: '' }, ['No subcategory']));
    if (!categoryId) {
      subcategorySelect.disabled = true;
      return;
    }
    subcategorySelect.disabled = false;
    const subcategories = await subcategoriesRepo.listByCategory(categoryId);
    for (const sub of subcategories) {
      subcategorySelect.append(h('option', { value: sub.id, selected: sub.id === selectedSubcategoryId }, [sub.name]));
    }
  }

  await refreshSubcategories(value.categoryId ?? '', value.subcategoryId);

  categorySelect.addEventListener('change', () => {
    void refreshSubcategories(categorySelect.value, null).then(() => {
      onChange({ categoryId: categorySelect.value || null, subcategoryId: null });
    });
  });

  subcategorySelect.addEventListener('change', () => {
    onChange({ categoryId: categorySelect.value || null, subcategoryId: subcategorySelect.value || null });
  });

  return h('div', { class: 'field-row' }, [
    h('label', { class: 'field' }, ['Category', categorySelect]),
    h('label', { class: 'field' }, ['Subcategory', subcategorySelect]),
  ]);
}
