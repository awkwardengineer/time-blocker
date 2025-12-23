/**
 * Library-specific drag detection utilities
 * Abstracts away svelte-dnd-action-specific DOM queries and detection logic
 * 
 * When migrating to a new drag library, only this file needs updating for detection logic
 */

/**
 * Check if there are any dragged elements in the document.
 * Uses library-specific selectors to detect dragged elements.
 * 
 * @returns {boolean} True if any elements are currently being dragged
 */
export function hasDraggedElements() {
  if (typeof document === 'undefined') return false;
  
  // svelte-dnd-action uses aria-grabbed="true" and .svelte-dnd-action-dragged class
  const draggedElements = document.querySelectorAll(
    'li[aria-grabbed="true"], li.svelte-dnd-action-dragged'
  );
  return draggedElements.length > 0;
}

/**
 * Get all currently dragged elements.
 * 
 * @returns {NodeList|Array} List of dragged elements
 */
export function getDraggedElements() {
  if (typeof document === 'undefined') return [];
  
  return document.querySelectorAll(
    'li[aria-grabbed="true"], li.svelte-dnd-action-dragged'
  );
}

/**
 * Check if an element has active drop zone styling.
 * svelte-dnd-action uses box-shadow with 'inset' keyword to indicate active drop zones.
 * 
 * @param {HTMLElement} element - The element to check
 * @returns {boolean} True if element has active drop zone styling
 */
export function hasActiveDropZone(element) {
  if (!element || !(element instanceof HTMLElement)) return false;
  
  const style = window.getComputedStyle(element);
  // Check if box-shadow indicates an active drop zone (the library uses inset shadow)
  return (
    style.boxShadow &&
    style.boxShadow !== 'none' &&
    style.boxShadow.includes('inset')
  );
}

/**
 * Get all active drop zones in the document.
 * 
 * @returns {Array<HTMLElement>} Array of elements with active drop zone styling
 */
export function getAllActiveDropZones() {
  if (typeof document === 'undefined') return [];
  
  const allUls = document.querySelectorAll('ul');
  const activeDropZones = [];
  
  for (const ul of allUls) {
    if (ul instanceof HTMLElement && hasActiveDropZone(ul)) {
      activeDropZones.push(ul);
    }
  }
  
  return activeDropZones;
}

/**
 * Check if there's an active drag operation (either dragged elements or active drop zones).
 * This is more reliable than checking state flags because the drag library may have
 * already updated state when we check.
 * 
 * @returns {boolean} True if there's an active drag operation
 */
export function isDragActive() {
  return hasDraggedElements() || getAllActiveDropZones().length > 0;
}

