/**
 * Drag adapter/abstraction layer for drag-and-drop functionality
 * 
 * This adapter wraps the drag library (currently SortableJS) behind a
 * consistent interface. When migrating to a new library, only this file needs
 * to be updated - components remain unchanged.
 * 
 * The adapter provides:
 * - Standardized drag zone creation
 * - Standardized event handling
 * - Standardized configuration options
 */

import Sortable from 'sortablejs';
import { applyDropZoneStyles, removeDropZoneStyles } from './dropZoneUtils.js';

/**
 * Extract items from DOM order based on data-id attributes
 * Used to get current order after SortableJS reorders elements
 * 
 * For cross-zone drags, items may appear in the DOM that weren't in the original
 * items array. In that case, we create a minimal object with just the id.
 * 
 * @param {HTMLElement} container - The container element
 * @param {Array} items - Original items array (for reference)
 * @returns {Array} Items in current DOM order
 */
function extractItemsFromDOM(container, items) {
  if (!container) return [];
  
  const children = Array.from(container.children);
  const itemMap = new Map(items ? items.map(item => [item.id, item]) : []);
  
  return children
    .map(child => {
      const idAttr = child.getAttribute('data-id');
      if (!idAttr) return null;
      const id = parseInt(idAttr, 10);
      // If item is in the map, use it; otherwise create minimal object (for cross-zone moves)
      return itemMap.get(id) || { id };
    })
    .filter(Boolean);
}

/**
 * Create a drag zone action.
 * Creates a SortableJS instance with standardized configuration.
 * 
 * This is a Svelte action function that receives (node, params) where:
 * - node: The DOM element the action is applied to
 * - params: Drag zone configuration object
 * 
 * @param {HTMLElement} node - The DOM element (provided by Svelte)
 * @param {Object} params - Drag zone configuration
 * @param {Array} params.items - Items in the drag zone
 * @param {string} params.type - Drag type (e.g., 'task', 'list')
 * @param {number} [params.zoneTabIndex=-1] - Tab index for the zone (not used by SortableJS)
 * @param {Object} [params.dropTargetStyle] - Styles for active drop target (used for drop zones)
 * @returns {Object} Action return value (update/destroy methods)
 */
export function createDragZone(node, params) {
  if (!params) {
    // If params is not provided, return a no-op action
    return {
      update: () => {},
      destroy: () => {}
    };
  }

  const {
    items,
    type,
    zoneTabIndex = -1,
    dropTargetStyle
  } = params;

  let sortableInstance = null;
  let currentItems = items;
  let currentType = type;

  // Determine draggable selector based on type
  const draggableSelector = type === 'task' 
    ? 'li[data-id]' 
    : type === 'list'
    ? '[data-id]'
    : '[data-id]';

  // Create SortableJS instance
  function initializeSortable() {
    if (!node || sortableInstance) return;

    sortableInstance = new Sortable(node, {
      animation: 150,
      ghostClass: 'sortable-ghost',
      group: type, // Enable cross-zone dragging for same type
      draggable: draggableSelector,
      onStart: () => {
        // Show drop zones on drag start
        if (dropTargetStyle && node instanceof HTMLElement) {
          applyDropZoneStyles(node);
        }
        
        // Dispatch consider event for visual feedback
        // Extract current items from DOM (before drag starts)
        const currentOrder = extractItemsFromDOM(node, currentItems);
        const considerEvent = new CustomEvent('consider', {
          detail: { items: currentOrder },
          bubbles: true,
          cancelable: true
        });
        node.dispatchEvent(considerEvent);
      },
      onEnd: (evt) => {
        // Remove drop zones from all drop zones (in case of cross-zone drag)
        if (dropTargetStyle) {
          // Remove from this node
          if (node instanceof HTMLElement) {
            removeDropZoneStyles(node);
          }
          // Also remove from source if different
          if (evt.from && evt.from !== node && evt.from instanceof HTMLElement) {
            removeDropZoneStyles(evt.from);
          }
        }
        
        // Extract items from DOM order after drag
        // SortableJS fires onEnd on the target container (where item ended up)
        // So 'node' is the target container, and evt.to is also the target container
        const targetContainer = evt.to || node;
        
        // Extract items from target container's DOM
        // For cross-zone moves, items might not be in currentItems yet,
        // so extractItemsFromDOM will create minimal { id } objects for unknown items
        // The component handlers will look up full item data from the database
        const newOrder = extractItemsFromDOM(targetContainer, currentItems);
        
        // Include source/target information for cross-zone detection
        const finalizeEvent = new CustomEvent('finalize', {
          detail: { 
            items: newOrder,
            from: evt.from,
            to: evt.to,
            oldIndex: evt.oldIndex,
            newIndex: evt.newIndex
          },
          bubbles: true,
          cancelable: true
        });
        
        // Dispatch on the target container (where the item ended up)
        // This ensures the target list's handler receives the event
        targetContainer.dispatchEvent(finalizeEvent);
      }
    });
  }

  // Initialize when action is applied
  if (node) {
    initializeSortable();
  }

  // Return action lifecycle methods
  return {
    update(newParams) {
      if (!newParams) {
        if (sortableInstance) {
          sortableInstance.destroy();
          sortableInstance = null;
        }
        return;
      }

      const {
        items: newItems,
        type: newType,
        zoneTabIndex: newZoneTabIndex,
        dropTargetStyle: newDropTargetStyle
      } = newParams;

      currentItems = newItems;
      
      // Reinitialize if type changed or if instance was destroyed
      if (!sortableInstance || newType !== currentType) {
        if (sortableInstance) {
          sortableInstance.destroy();
        }
        currentType = newType;
        // Update node reference if needed (Svelte may pass new node)
        initializeSortable();
      }
    },
    destroy() {
      if (sortableInstance) {
        sortableInstance.destroy();
        sortableInstance = null;
      }
      if (node instanceof HTMLElement) {
        removeDropZoneStyles(node);
      }
    }
  };
}

/**
 * Handle a drag consider event.
 * Extracts items from the library-specific event format and calls the handler.
 * 
 * @param {Event} event - The drag consider event (CustomEvent from adapter)
 * @param {Function} handler - Handler function that receives the items array
 */
export function handleDragConsider(event, handler) {
  // CustomEvent from adapter uses event.detail.items
  const items = event.detail?.items || [];
  handler(items);
}

/**
 * Handle a drag finalize event.
 * Extracts items from the library-specific event format and calls the handler.
 * 
 * @param {Event} event - The drag finalize event (CustomEvent from adapter)
 * @param {Function} handler - Handler function that receives the items array (may be async)
 * @returns {Promise} Promise that resolves when handler completes (if handler is async)
 */
export async function handleDragFinalize(event, handler) {
  // CustomEvent from adapter uses event.detail.items
  const items = event.detail?.items || [];
  await handler(items);
}

