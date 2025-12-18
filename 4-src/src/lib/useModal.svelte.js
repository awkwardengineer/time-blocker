/**
 * Composable for managing modal state and common operations.
 * Handles opening/closing modals with position tracking and focus management.
 */
export function useModal() {
  let isOpen = $state(false);
  let position = $state(null); // { top, left, width, height }
  let element = $state(null); // Reference to the element that opened the modal (for focus return)

  /**
   * Open the modal and capture the element's position.
   * @param {HTMLElement} targetElement - The element that triggered the modal (for positioning and focus return)
   */
  function openModal(targetElement) {
    if (targetElement && targetElement instanceof HTMLElement) {
      const rect = targetElement.getBoundingClientRect();
      position = {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      };
      element = targetElement;
    }
    isOpen = true;
  }

  /**
   * Close the modal and return focus to the element that opened it.
   */
  function closeModal() {
    const elementToFocus = element; // Store reference before clearing
    isOpen = false;
    position = null;
    element = null;

    // Return focus to the element after modal closes
    if (elementToFocus && elementToFocus instanceof HTMLElement) {
      setTimeout(() => {
        elementToFocus.focus();
      }, 0);
    }
  }

  /**
   * Close the modal without returning focus (e.g., when focus is handled elsewhere).
   */
  function closeModalWithoutFocus() {
    isOpen = false;
    position = null;
    element = null;
  }

  /**
   * Handle click event to open modal.
   * @param {Event} event - The click event
   */
  function handleClick(event) {
    const clickedElement = event?.currentTarget || event?.target;
    openModal(clickedElement);
  }

  /**
   * Handle keydown event to open modal (Enter/Space) or close (Escape).
   * @param {Event} event - The keydown event
   * @param {Object} options - Options for keydown handling
   * @param {Function} [options.onEscape] - Optional callback for Escape key (if not provided, just prevents default)
   */
  function handleKeydown(event, options = {}) {
    const key = event.key;

    if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const targetElement = event.currentTarget;
      if (targetElement) {
        openModal(targetElement);
      }
    } else if (key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      if (options.onEscape) {
        options.onEscape(event);
      } else {
        // Default: blur the element
        const targetElement = event.currentTarget;
        if (targetElement && targetElement instanceof HTMLElement) {
          targetElement.blur();
        }
      }
    }
  }

  return {
    get isOpen() { return isOpen; },
    get position() { return position; },
    get element() { return element; },
    openModal,
    closeModal,
    closeModalWithoutFocus,
    handleClick,
    handleKeydown
  };
}

