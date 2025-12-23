/**
 * Drag adapter/abstraction layer for drag-and-drop functionality
 * 
 * This adapter wraps the drag library (currently svelte-dnd-action) behind a
 * consistent interface. When migrating to a new library, only this file needs
 * to be updated - components remain unchanged.
 * 
 * The adapter provides:
 * - Standardized drag zone creation
 * - Standardized event handling
 * - Standardized configuration options
 */

import { dndzone } from 'svelte-dnd-action';

/**
 * Create a drag zone action.
 * Wraps the library's dndzone action with standardized configuration.
 * 
 * This is a Svelte action function that receives (node, params) where:
 * - node: The DOM element the action is applied to
 * - params: Drag zone configuration object
 * 
 * @param {HTMLElement} node - The DOM element (provided by Svelte)
 * @param {Object} params - Drag zone configuration
 * @param {Array} params.items - Items in the drag zone
 * @param {string} params.type - Drag type (e.g., 'task', 'list')
 * @param {number} [params.zoneTabIndex=-1] - Tab index for the zone
 * @param {Object} [params.dropTargetStyle] - Styles for active drop target
 * @returns {Object} Action return value (update/destroy methods from dndzone)
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

  // Call the library's dndzone action with (node, config)
  return dndzone(node, {
    items,
    type,
    zoneTabIndex,
    dropTargetStyle
  });
}

/**
 * Handle a drag consider event.
 * Extracts items from the library-specific event format and calls the handler.
 * 
 * @param {Event} event - The drag consider event from the library
 * @param {Function} handler - Handler function that receives the items array
 */
export function handleDragConsider(event, handler) {
  // svelte-dnd-action uses event.detail.items
  const items = event.detail?.items || [];
  handler(items);
}

/**
 * Handle a drag finalize event.
 * Extracts items from the library-specific event format and calls the handler.
 * 
 * @param {Event} event - The drag finalize event from the library
 * @param {Function} handler - Handler function that receives the items array (may be async)
 * @returns {Promise} Promise that resolves when handler completes (if handler is async)
 */
export async function handleDragFinalize(event, handler) {
  // svelte-dnd-action uses event.detail.items
  const items = event.detail?.items || [];
  await handler(items);
}

