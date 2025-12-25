/**
 * Mouse/touch drag handlers for tasks
 * Extracted from TaskList.svelte to improve maintainability and testability
 * 
 * Provides SortableJS callback handlers for task drag operations
 */

import { applyDropZoneStyles, removeDropZoneStyles } from './dropZoneUtils.js';

/**
 * Apply drop zones to all task lists
 * @returns {void}
 */
function applyDropZonesToAllTaskLists() {
  if (typeof document === 'undefined') return;
  const allTaskLists = document.querySelectorAll('ul[data-list-id]');
  allTaskLists.forEach(ul => {
    if (ul instanceof HTMLElement) {
      applyDropZoneStyles(ul);
    }
  });
}

/**
 * Remove drop zones from all task lists
 * @returns {void}
 */
function removeDropZonesFromAllTaskLists() {
  if (typeof document === 'undefined') return;
  const allTaskLists = document.querySelectorAll('ul[data-list-id]');
  allTaskLists.forEach(ul => {
    if (ul instanceof HTMLElement) {
      removeDropZoneStyles(ul);
    }
  });
}

/**
 * Create mouse drag handlers for task dragging
 * 
 * @param {Object} config - Configuration object
 * @param {Function} [config.onDragStart] - Callback when drag starts (optional)
 * @param {Function} config.onDragEnd - Callback when drag ends (required)
 * @param {Function} [config.setDragJustEnded] - Setter for dragJustEnded flag (optional)
 * @returns {Object} SortableJS callback handlers
 */
export function createTaskMouseDragHandlers(config) {
  const { onDragStart, onDragEnd, setDragJustEnded } = config || {};

  return {
    onStart: (evt) => {
      // Disable hover states during drag
      if (typeof document !== 'undefined') {
        document.body.classList.add('task-dragging-active');
      }
      
      // Show drop zones on all task lists
      if (setDragJustEnded) {
        setDragJustEnded(false);
      }
      
      // Ensure the ghost class is applied to the correct element
      const item = evt.item;
      if (item && item instanceof HTMLElement) {
        // Remove ghost class from any other elements in ALL lists, not just this one
        const allTaskLists = document.querySelectorAll('ul[data-list-id]');
        allTaskLists.forEach(ul => {
          const siblings = Array.from(ul.children);
          siblings.forEach(sibling => {
            if (sibling !== item && sibling.classList.contains('sortable-ghost-task')) {
              sibling.classList.remove('sortable-ghost-task');
            }
          });
        });
      }
      
      applyDropZonesToAllTaskLists();
      
      // Call optional onDragStart callback
      if (onDragStart) {
        onDragStart(evt);
      }
    },
    
    onMove: (evt) => {
      // Apply drop zone to target list when hovering over it
      if (evt.to && evt.to instanceof HTMLElement) {
        applyDropZoneStyles(evt.to);
      }
      // Also ensure source list has drop zone
      if (evt.from && evt.from instanceof HTMLElement) {
        applyDropZoneStyles(evt.from);
      }
    },
    
    onEnd: (evt) => {
      // Re-enable hover states after drag
      if (typeof document !== 'undefined') {
        document.body.classList.remove('task-dragging-active');
      }
      
      // Remove drop zones from all task lists
      removeDropZonesFromAllTaskLists();
      
      // Mark that a drag just ended to prevent click handlers
      if (setDragJustEnded) {
        setDragJustEnded(true);
        // Reset flag after a short delay to allow normal clicks again
        setTimeout(() => {
          setDragJustEnded(false);
        }, 100);
      }
      
      // Call required onDragEnd callback
      if (onDragEnd) {
        onDragEnd(evt);
      }
    }
  };
}

/**
 * Get SortableJS configuration for task dragging
 * 
 * @param {Object} config - Configuration object
 * @param {Function} [config.onDragStart] - Callback when drag starts (optional)
 * @param {Function} config.onDragEnd - Callback when drag ends (required)
 * @param {Function} [config.setDragJustEnded] - Setter for dragJustEnded flag (optional)
 * @returns {Object} SortableJS configuration object
 */
export function getTaskSortableConfig(config) {
  const handlers = createTaskMouseDragHandlers(config);
  
  return {
    animation: 150,
    ghostClass: 'sortable-ghost-task',
    group: 'tasks', // Enable cross-list task dragging
    draggable: 'li[data-id]', // Only drag task items
    filter: '[data-no-drag]', // Prevent dragging from elements with data-no-drag
    preventOnFilter: false, // Allow normal interaction with filtered elements
    emptyInsertThreshold: 50, // Allow dropping into empty lists (distance in pixels from edge)
    swapThreshold: 0.65, // Threshold for when to swap elements (0-1)
    onStart: handlers.onStart,
    onMove: handlers.onMove,
    onEnd: handlers.onEnd
  };
}

