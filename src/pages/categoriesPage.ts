import { h, clear } from '../utils/dom';
import * as categoriesRepo from '../db/categories.repo';
import * as subcategoriesRepo from '../db/subcategories.repo';

export async function renderCategoriesPage(container: HTMLElement): Promise<void> {
  let categories = await categoriesRepo.list();
  let selectedCategoryId: string | null = categories[0]?.id ?? null;
  let renamingCategoryId: string | null = null;
  let renamingSubcategoryId: string | null = null;

  function renameRow(opts: {
    name: string;
    isRenaming: boolean;
    onStartRename: () => void;
    onSubmitRename: (newName: string) => void;
    onCancelRename: () => void;
    onSelect?: () => void;
    onDelete: () => void;
    active?: boolean;
  }): HTMLElement {
    if (opts.isRenaming) {
      const input = h('input', {
        type: 'text',
        value: opts.name,
        required: true,
        'data-rename-input': 'true',
      }) as HTMLInputElement;

      return h(
        'li',
        { class: 'list-row' },
        [
          h(
            'form',
            {
              class: 'inline-form',
              onsubmit: (e: Event) => {
                e.preventDefault();
                const name = input.value.trim();
                if (name && name !== opts.name) {
                  opts.onSubmitRename(name);
                } else {
                  opts.onCancelRename();
                }
              },
            },
            [
              input,
              h('button', { type: 'submit', class: 'btn btn--icon' }, ['Save']),
              h('button', { type: 'button', class: 'btn btn--icon', onclick: opts.onCancelRename }, ['Cancel']),
            ]
          ),
        ]
      );
    }

    return h('li', { class: `list-row${opts.active ? ' list-row--active' : ''}` }, [
      opts.onSelect
        ? h('button', { type: 'button', class: 'list-row-label', onclick: opts.onSelect }, [opts.name])
        : h('span', { class: 'list-row-label' }, [opts.name]),
      h('button', { type: 'button', class: 'btn btn--icon', onclick: opts.onStartRename }, ['Rename']),
      h('button', { type: 'button', class: 'btn btn--icon btn--danger', onclick: opts.onDelete }, ['Delete']),
    ]);
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
      renameRow({
        name: category.name,
        isRenaming: renamingCategoryId === category.id,
        active: category.id === selectedCategoryId,
        onSelect: () => {
          selectedCategoryId = category.id;
          void render();
        },
        onStartRename: () => {
          renamingCategoryId = category.id;
          void render();
        },
        onSubmitRename: (newName) => {
          renamingCategoryId = null;
          void categoriesRepo.update(category.id, { name: newName }).then(render);
        },
        onCancelRename: () => {
          renamingCategoryId = null;
          void render();
        },
        onDelete: () => {
          if (
            confirm(
              `Delete category "${category.name}"? Its subcategories will be removed and any projects/tasks using it will become uncategorized.`
            )
          ) {
            void categoriesRepo.removeCategory(category.id).then(render);
          }
        },
      })
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
      renameRow({
        name: sub.name,
        isRenaming: renamingSubcategoryId === sub.id,
        onStartRename: () => {
          renamingSubcategoryId = sub.id;
          void render();
        },
        onSubmitRename: (newName) => {
          renamingSubcategoryId = null;
          void subcategoriesRepo.update(sub.id, { name: newName }).then(render);
        },
        onCancelRename: () => {
          renamingSubcategoryId = null;
          void render();
        },
        onDelete: () => {
          if (confirm(`Delete subcategory "${sub.name}"?`)) {
            void subcategoriesRepo.remove(sub.id).then(render);
          }
        },
      })
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
    if (renamingCategoryId && !categories.some((c) => c.id === renamingCategoryId)) {
      renamingCategoryId = null;
    }

    const subcategoryPanel = await renderSubcategoryPanel();

    clear(container);
    container.append(
      h('div', { class: 'page' }, [
        h('h1', {}, ['Categories']),
        h('div', { class: 'master-detail' }, [renderCategoryList(), subcategoryPanel]),
      ])
    );

    const renameInput = container.querySelector<HTMLInputElement>('[data-rename-input]');
    if (renameInput) {
      renameInput.focus();
      renameInput.select();
    }
  }

  await render();
}
