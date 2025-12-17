/**
 * Composable for keyboard-based list dragging
 * Handles keyboard navigation for dragging lists between columns
 * 
 * This composable provides helper functions and a document-level keydown handler
 * setup. State management remains in the component.
 */

import { tick } from 'svelte';

/**
 * Focus the list card element for keyboard drag feedback
 * @param {number|string} listId - ID of the list to focus
 */
export async function focusListCardForKeyboardDrag(listId) {
  if (typeof document === 'undefined') return;

  await tick();

  // Find all elements with this data-id and pick the list card wrapper.
  const candidates = Array.from(document.querySelectorAll(`[data-id="${listId}"]`));
  let card = candidates.find(
    (el) => el instanceof HTMLElement && el.getAttribute('role') === 'group'
  );
  if (!card) {
    // Fallback: first DIV with this data-id (lists use div[data-id], tasks use li[data-id])
    card = candidates.find(
      (el) => el instanceof HTMLElement && el.tagName === 'DIV'
    );
  }
  if (card instanceof HTMLElement) {
    card.focus();
  }
}

/**
 * Set up document-level keyboard handler for list dragging
 * Designed to be used within Svelte's $effect
 * 
 * @param {Object} state - Reactive state getters/setters
 * @param {Function} state.getKeyboardListDrag - Getter for keyboardListDrag
 * @param {Function} state.getLastKeyboardDraggedListId - Getter for lastKeyboardDraggedListId
 * @param {Function} state.getShouldRefocusListOnNextTab - Getter for shouldRefocusListOnNextTab
 * @param {Function} state.setShouldRefocusListOnNextTab - Setter for shouldRefocusListOnNextTab
 * @param {Function} onMove - Callback when list is moved (receives listId, direction)
 * @param {Function} onStop - Callback when drag stops
 * @param {Function} onBlur - Callback to blur active element
 * @returns {() => void} Cleanup function to be returned from $effect
 */
export function setupKeyboardListDragHandler(state, onMove, onStop, onBlur) {
  const {
    getKeyboardListDrag,
    getLastKeyboardDraggedListId,
    getShouldRefocusListOnNextTab,
    setShouldRefocusListOnNextTab
  } = state;

  function handleDocumentKeydownForListDrag(e) {
    const key = e.key;
    const keyboardListDrag = getKeyboardListDrag();
    const isActive = keyboardListDrag.active === true;
    const activeListId = keyboardListDrag.listId;
    const lastKeyboardDraggedListId = getLastKeyboardDraggedListId();
    const shouldRefocusListOnNextTab = getShouldRefocusListOnNextTab();

    // After a blur-on-drop via Tab, treat the very next Tab as
    // "refocus the last dragged list card", then let Tab behave normally.
    if (
      !isActive &&
      key === 'Tab' &&
      shouldRefocusListOnNextTab &&
      lastKeyboardDraggedListId != null
    ) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      setShouldRefocusListOnNextTab(false);
      focusListCardForKeyboardDrag(lastKeyboardDraggedListId);
      return;
    }

    if (!isActive || activeListId == null) {
      return;
    }

    // Movement keys while in keyboard list drag mode
    if (key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      onMove(activeListId, 'up');
      return;
    }

    if (key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      onMove(activeListId, 'down');
      return;
    }

    if (key === 'ArrowLeft') {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      onMove(activeListId, 'left');
      return;
    }

    if (key === 'ArrowRight') {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      onMove(activeListId, 'right');
      return;
    }

    // End drag mode and commit at current position
    if (key === 'Escape' || key === 'Enter' || key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      onStop();
      onBlur();
      return;
    }

    if (key === 'Tab') {
      // Tab should drop the list and then blur (no focused element).
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      onStop();
      onBlur();
      return;
    }
  }

  document.addEventListener('keydown', handleDocumentKeydownForListDrag, true);

  return () => {
    document.removeEventListener('keydown', handleDocumentKeydownForListDrag, true);
  };
}

