/**
 * Visual feedback utilities for drag-and-drop
 * 
 * Provides functions to apply and remove visual feedback for grabbed items.
 * Ensures focus is maintained for accessibility (focus ring visibility).
 */

/**
 * Apply grabbed state styling to an element
 * Ensures the element maintains focus so the focus ring stays visible
 * 
 * @param {HTMLElement} element - The element to style as grabbed
 */
export function applyGrabbedState(element) {
  if (!(element instanceof HTMLElement)) return;
  
  element.classList.add('keyboard-drag-active');
  
  // Ensure the element maintains focus so the ring stays visible
  if (document.activeElement !== element) {
    element.focus();
  }
}

/**
 * Remove grabbed state styling from an element
 * 
 * @param {HTMLElement} element - The element to remove grabbed state from
 */
export function removeGrabbedState(element) {
  if (!(element instanceof HTMLElement)) return;
  
  element.classList.remove('keyboard-drag-active');
}

/**
 * Maintain focus on an element
 * Useful after applying grabbed state to ensure focus ring is visible
 * 
 * @param {HTMLElement} element - The element to maintain focus on
 */
export function maintainFocus(element) {
  if (!(element instanceof HTMLElement)) return;
  
  if (document.activeElement !== element) {
    element.focus();
  }
}

