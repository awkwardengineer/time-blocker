/**
 * Mouse/touch drag handlers for lists
 * Extracted from Board.svelte to improve maintainability and testability
 * 
 * Provides SortableJS callback handlers for list drag operations
 */

import { applyDropZoneStyles, removeDropZoneStyles } from './dropZoneUtils.js';

/**
 * Apply drop zones to all columns
 * @returns {void}
 */
function applyDropZonesToAllColumns() {
  if (typeof document === 'undefined') return;
  const allColumns = document.querySelectorAll('.sortable-column-container');
  allColumns.forEach(col => {
    if (col instanceof HTMLElement) {
      applyDropZoneStyles(col);
    }
  });
}

/**
 * Remove drop zones from all columns
 * @returns {void}
 */
function removeDropZonesFromAllColumns() {
  if (typeof document === 'undefined') return;
  const allColumns = document.querySelectorAll('.sortable-column-container');
  allColumns.forEach(col => {
    if (col instanceof HTMLElement) {
      removeDropZoneStyles(col);
    }
  });
}

/**
 * Get SortableJS configuration for list dragging
 * 
 * @param {Object} config - Configuration object
 * @param {Function} [config.onDragStart] - Callback when drag starts (optional)
 * @param {Function} config.onDragEnd - Callback when drag ends (required, receives evt and columnIndex)
 * @param {number} config.columnIndex - Column index for this sortable instance (required)
 * @param {Function} [config.getSortableInstance] - Function to get sortable instance (optional, for modal check)
 * @returns {Object} SortableJS configuration object
 */
export function getListSortableConfig(config) {
  const { onDragStart, onDragEnd, columnIndex, getSortableInstance } = config;
  
  return {
    animation: 150,
    ghostClass: 'sortable-ghost-list',
    group: 'lists', // Enable cross-column list dragging
    draggable: '[data-id]', // Only drag list containers
    filter: 'ul, li, .create-list-container, .empty-drop-zone', // Prevent dragging tasks, button, and empty drop zone
    preventOnFilter: false,
    delay: 50, // Shorter delay before drag starts - prevents accidental drags on clicks
    delayOnStartOnly: true, // Only delay on start, not during drag
    distance: 5, // Require mouse to move 5px before drag starts - prevents text selection
    emptyInsertThreshold: 50, // Allow dropping into empty columns (distance in pixels from edge)
    forceFallback: true, // Use clone instead of moving element - prevents DOM manipulation conflicts with Svelte
    fallbackOnBody: true, // Clone appears at cursor position
    scroll: true, // Enable auto-scrolling when dragging near edges
    scrollSensitivity: 30, // Distance from edge to trigger scroll
    scrollSpeed: 10, // Scroll speed
    onStart: (evt) => {
      // Prevent drag if a modal is open (check for modal backdrop)
      if (typeof document !== 'undefined') {
        const modalBackdrop = document.querySelector('.modal-backdrop');
        if (modalBackdrop) {
          // Cancel the drag by disabling and immediately re-enabling
          // This prevents the drag from continuing
          const sortableInstance = getSortableInstance ? getSortableInstance() : null;
          if (sortableInstance) {
            sortableInstance.option('disabled', true);
            // Re-enable after a tick to allow normal operation when modal closes
            setTimeout(() => {
              sortableInstance.option('disabled', false);
            }, 0);
          }
          return;
        }
        document.body.classList.add('list-dragging-active');
      }
      
      // Show drop zones on all columns
      applyDropZonesToAllColumns();
      
      // Call optional onDragStart callback
      if (onDragStart) {
        onDragStart(evt);
      }
    },
    onMove: (evt) => {
      // Apply drop zone to target column when hovering over it
      if (evt.to && evt.to instanceof HTMLElement) {
        applyDropZoneStyles(evt.to);
      }
      // Also ensure source column has drop zone
      if (evt.from && evt.from instanceof HTMLElement) {
        applyDropZoneStyles(evt.from);
      }
    },
    onEnd: (evt) => {
      // Re-enable hover states after drag
      if (typeof document !== 'undefined') {
        document.body.classList.remove('list-dragging-active');
      }
      
      // Remove drop zones from all columns
      removeDropZonesFromAllColumns();
      
      // Call required onDragEnd callback with columnIndex
      if (onDragEnd) {
        onDragEnd(evt, columnIndex);
      }
    }
  };
}

