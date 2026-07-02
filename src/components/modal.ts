import { h } from '../utils/dom';

export interface ModalHandle {
  close: () => void;
}

// `onDismiss` fires when the user closes the modal via the overlay or Escape
// (as opposed to the caller explicitly calling `close()` after resolving its
// own flow) — callers use it to treat a dismissal as a cancellation.
export function openModal(content: HTMLElement, onDismiss?: () => void): ModalHandle {
  const overlay = h('div', { class: 'modal-overlay' }, [h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' }, [content])]);

  function close(): void {
    overlay.remove();
    document.removeEventListener('keydown', onKeydown);
  }

  function onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      close();
      onDismiss?.();
    }
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      close();
      onDismiss?.();
    }
  });
  document.addEventListener('keydown', onKeydown);
  document.body.append(overlay);

  return { close };
}
