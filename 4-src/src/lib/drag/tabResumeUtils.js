/**
 * Shared utilities for Tab resume behavior after keyboard drag operations
 * 
 * After a keyboard drag operation ends (via Tab, Escape, etc.), the next Tab press
 * should refocus the element that was being dragged. This provides consistent
 * keyboard navigation behavior.
 */

/**
 * Handle Tab resume for an element-based refocus
 * Used for tasks and other elements that can be directly refocused
 * 
 * @param {KeyboardEvent} e - The keydown event
 * @param {boolean} shouldResume - Whether Tab resume should occur
 * @param {HTMLElement|null} lastBlurredElement - The element to refocus
 * @param {Function} setShouldResume - Setter to clear the shouldResume flag
 * @param {HTMLElement|null} fallbackElement - Optional fallback element if lastBlurredElement is no longer in DOM
 * @returns {boolean} True if the event was handled (should prevent default)
 */
export function handleTabResumeElement(
  e,
  shouldResume,
  lastBlurredElement,
  setShouldResume,
  fallbackElement = null
) {
  if (e.key !== 'Tab' || !shouldResume || !lastBlurredElement) {
    return false;
  }

  e.preventDefault();
  e.stopImmediatePropagation();
  e.stopPropagation();

  setShouldResume(false);

  // Try to refocus the previously blurred element
  if (typeof document === 'undefined') {
    return true;
  }

  let target = lastBlurredElement;
  
  // If stored element is no longer in the DOM, use fallback
  if (
    !(target instanceof HTMLElement) ||
    !document.contains(target)
  ) {
    if (fallbackElement && fallbackElement instanceof HTMLElement) {
      target = fallbackElement;
    } else {
      return true; // Event handled, but no valid target
    }
  }

  if (target && target instanceof HTMLElement) {
    target.focus();
  }

  return true;
}

/**
 * Handle Tab resume for an ID-based refocus
 * Used for lists and other elements that need a lookup function
 * 
 * @param {KeyboardEvent} e - The keydown event
 * @param {boolean} shouldResume - Whether Tab resume should occur
 * @param {any} lastDraggedId - The ID of the element to refocus
 * @param {Function} setShouldResume - Setter to clear the shouldResume flag
 * @param {Function} focusFunction - Function to focus the element by ID
 * @returns {boolean} True if the event was handled (should prevent default)
 */
export function handleTabResumeById(
  e,
  shouldResume,
  lastDraggedId,
  setShouldResume,
  focusFunction
) {
  if (e.key !== 'Tab' || !shouldResume || lastDraggedId == null) {
    return false;
  }

  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
  
  setShouldResume(false);
  
  if (focusFunction) {
    focusFunction(lastDraggedId);
  }

  return true;
}

/**
 * Create a Tab resume handler for element-based refocus
 * Returns a function that can be used directly in keydown handlers
 * 
 * @param {Object} config - Configuration object
 * @param {Function} config.getShouldResume - Getter for shouldResume flag
 * @param {Function} config.getLastBlurredElement - Getter for last blurred element
 * @param {Function} config.setShouldResume - Setter to clear shouldResume flag
 * @param {Function} [config.getFallbackElement] - Optional getter for fallback element
 * @returns {Function} Handler function for keydown events
 */
export function createTabResumeElementHandler(config) {
  const {
    getShouldResume,
    getLastBlurredElement,
    setShouldResume,
    getFallbackElement
  } = config;

  return function handleTabResume(e) {
    const shouldResume = getShouldResume();
    const lastBlurredElement = getLastBlurredElement();
    const fallbackElement = getFallbackElement ? getFallbackElement() : null;

    return handleTabResumeElement(
      e,
      shouldResume,
      lastBlurredElement,
      setShouldResume,
      fallbackElement
    );
  };
}

/**
 * Create a Tab resume handler for ID-based refocus
 * Returns a function that can be used directly in keydown handlers
 * 
 * @param {Object} config - Configuration object
 * @param {Function} config.getShouldResume - Getter for shouldResume flag
 * @param {Function} config.getLastDraggedId - Getter for last dragged ID
 * @param {Function} config.setShouldResume - Setter to clear shouldResume flag
 * @param {Function} config.focusFunction - Function to focus element by ID
 * @returns {Function} Handler function for keydown events
 */
export function createTabResumeByIdHandler(config) {
  const {
    getShouldResume,
    getLastDraggedId,
    setShouldResume,
    focusFunction
  } = config;

  return function handleTabResume(e) {
    const shouldResume = getShouldResume();
    const lastDraggedId = getLastDraggedId();

    return handleTabResumeById(
      e,
      shouldResume,
      lastDraggedId,
      setShouldResume,
      focusFunction
    );
  };
}

