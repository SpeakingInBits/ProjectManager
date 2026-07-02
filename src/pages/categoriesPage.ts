import { h, clear } from '../utils/dom';
import * as categoriesRepo from '../db/categories.repo';
import * as subcategoriesRepo from '../db/subcategories.repo';

export async function renderCategoriesPage(container: HTMLElement): Promise<void> {
  let categories = await categoriesRepo.list();
  let selectedCategoryId: string | null = categories[0]?.id ?? null;

  function renameButton(currentName: string, onRename: (newName: string) => void): HTMLElement {
    return h(
      'button',
      {
        type: 'button',
        class: 'btn btn--icon',
        onclick: () => {
          const next = prompt('Rename to:', currentName);
          if (next && next.trim() && next.trim() !== currentName) onRename(next.trim());
        },
      },
      ['Rename']
    );
  }

  function renderCategoryList(): HTMLElement {
    const nameInput = h('input', { type: 'text', placeholder: 'New category name', required: true }) as HTMLInputElement;

    const form = h(
      'form',
      {
        class: 'inline-form',
        onsubmit: (e: Event) => {
          e.preventDefault();
          const name = nameInput.value.trim();
          if (!name) return;
          void categoriesRepo.create({ name }).then((created) => {
            selectedCategoryId = created.id;
            void render();
          });
        },
      },
      [nameInput, h('button', { type: 'submit', class: 'btn' }, ['Add category'])]
    );

    const items = categories.map((category) =>
      h('li', { class: `list-row${category.id === selectedCategoryId ? ' list-row--active' : ''}` }, [
        h(
          'button',
          {
            type: 'button',
            class: 'list-row-label',
            onclick: () => {
              selectedCategoryId = category.id;
              void render();
            },
          },
          [category.name]
        ),
        renameButton(category.name, (newName) => {
          void categoriesRepo.update(category.id, { name: newName }).then(render);
        }),
        h(
          'button',
          {
            type: 'button',
            class: 'btn btn--icon btn--danger',
            onclick: () => {
              if (
                confirm(
                  `Delete category "${category.name}"? Its subcategories will be removed and any projects/tasks using it will become uncategorized.`
                )
              ) {
                void categoriesRepo.removeCategory(category.id).then(render);
              }
            },
          },
          ['Delete']
        ),
      ])
    );

    return h('section', { class: 'panel' }, [
      h('h2', {}, ['Categories']),
      form,
      categories.length === 0
        ? h('p', { class: 'empty-state' }, ['No categories yet. Add one above.'])
        : h('ul', { class: 'list' }, items),
    ]);
  }

  async function renderSubcategoryPanel(): Promise<HTMLElement> {
    const selected = categories.find((c) => c.id === selectedCategoryId) ?? null;
    if (!selected) {
      return h('section', { class: 'panel' }, [
        h('p', { class: 'empty-state' }, ['Select a category to manage its subcategories.']),
      ]);
    }

    const subcategories = await subcategoriesRepo.listByCategory(selected.id);
    const nameInput = h('input', { type: 'text', placeholder: 'New subcategory name', required: true }) as HTMLInputElement;

    const form = h(
      'form',
      {
        class: 'inline-form',
        onsubmit: (e: Event) => {
          e.preventDefault();
          const name = nameInput.value.trim();
          if (!name) return;
          void subcategoriesRepo.create({ categoryId: selected.id, name }).then(render);
        },
      },
      [nameInput, h('button', { type: 'submit', class: 'btn' }, ['Add subcategory'])]
    );

    const items = subcategories.map((sub) =>
      h('li', { class: 'list-row' }, [
        h('span', { class: 'list-row-label' }, [sub.name]),
        renameButton(sub.name, (newName) => {
          void subcategoriesRepo.update(sub.id, { name: newName }).then(render);
        }),
        h(
          'button',
          {
            type: 'button',
            class: 'btn btn--icon btn--danger',
            onclick: () => {
              if (confirm(`Delete subcategory "${sub.name}"?`)) {
                void subcategoriesRepo.remove(sub.id).then(render);
              }
            },
          },
          ['Delete']
        ),
      ])
    );

    return h('section', { class: 'panel' }, [
      h('h2', {}, [`Subcategories of "${selected.name}"`]),
      form,
      subcategories.length === 0 ? h('p', { class: 'empty-state' }, ['No subcategories yet.']) : h('ul', { class: 'list' }, items),
    ]);
  }

  async function render(): Promise<void> {
    categories = await categoriesRepo.list();
    if (selectedCategoryId && !categories.some((c) => c.id === selectedCategoryId)) {
      selectedCategoryId = categories[0]?.id ?? null;
    }

    const subcategoryPanel = await renderSubcategoryPanel();

    clear(container);
    container.append(
      h('div', { class: 'page' }, [
        h('h1', {}, ['Categories']),
        h('div', { class: 'master-detail' }, [renderCategoryList(), subcategoryPanel]),
      ])
    );
  }

  await render();
}
