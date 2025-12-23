/**
 * Pure functions for list drag-and-drop handler logic
 */

import { isPlaceholderItem } from './listDndUtils.js';
import { updateListOrderWithColumn } from './dataAccess.js';

/**
 * Process the consider event for list dragging
 * Updates the lists array to reflect the new column state during drag
 * 
 * @param {Array} newColumnItems - Items from the drag event (may include placeholders)
 * @param {number} columnIndex - The column index being updated
 * @param {Array} currentLists - Current draggableLists array
 * @returns {Array} Updated draggableLists array
 */
export function processListConsider(newColumnItems, columnIndex, currentLists) {
  // Update draggableLists:
  // 1. Remove items that were in this column (based on current columnIndex)
  // 2. Add new items for this column (with columnIndex set correctly)
  // 3. Keep items from other columns unchanged
  const updatedLists = currentLists.filter(list => {
    const listColumnIndex = list.columnIndex ?? 0;
    return listColumnIndex !== columnIndex;
  });
  
  // Add new items for this column, setting columnIndex and order based on position
  for (let i = 0; i < newColumnItems.length; i++) {
    const item = newColumnItems[i];
    // Preserve existing properties if item already exists, otherwise use item as-is
    const existingItem = currentLists.find(l => l.id === item.id);
    // Set order based on position in array (for same-column reordering)
    // The drag library uses array position to determine order
    const listItem = existingItem 
      ? { ...existingItem, ...item, columnIndex, order: i } // Merge and set order based on position
      : { ...item, columnIndex, order: i }; // New item, set columnIndex and order
    updatedLists.push(listItem);
  }
  
  return updatedLists;
}

/**
 * Determine if the finalize event should skip the database update
 * Skips if this is a source column that only lost items (target column will handle the update)
 * 
 * @param {Array} validItems - Valid items after filtering placeholders
 * @param {number} columnIndex - The column index where drop occurred
 * @param {Array} sourceLists - Source of truth lists (from liveQuery)
 * @param {Array} currentDraggableLists - Current draggableLists for cross-reference
 * @returns {boolean} True if database update should be skipped
 */
export function shouldSkipFinalizeUpdate(validItems, columnIndex, sourceLists, currentDraggableLists) {
  // Track column changes - check against sourceLists (source of truth) not currentDraggableLists
  let hasItemsFromOtherColumns = false;
  for (const item of validItems) {
    // Check against sourceLists (source of truth) to see original columnIndex
    const originalList = (sourceLists || []).find(l => l.id === item.id);
    if (originalList) {
      const oldColumnIndex = originalList.columnIndex ?? 0;
      if (oldColumnIndex !== columnIndex) {
        hasItemsFromOtherColumns = true;
      }
    } else {
      // Item not found in sourceLists - might be a new item or from another column
      // Check if it exists in currentDraggableLists with different columnIndex
      const existingInDraggable = currentDraggableLists.find(l => l.id === item.id);
      if (existingInDraggable && (existingInDraggable.columnIndex ?? 0) !== columnIndex) {
        hasItemsFromOtherColumns = true;
      }
    }
  }
  
  // Check if this column lost items by comparing with original state
  const originalColumnLists = (sourceLists || []).filter(list => (list.columnIndex ?? 0) === columnIndex);
  const originalColumnCount = originalColumnLists.length;
  const currentColumnCount = validItems.length;
  const columnLostItems = currentColumnCount < originalColumnCount;
  
  // Determine if this is a target column (receiving items) or source column (losing items)
  // Skip update if: column lost items AND no items came from other columns (source column that only lost items)
  // This ensures only the target column (which received items) updates the database
  if (columnLostItems && !hasItemsFromOtherColumns) {
    return true;
  }
  
  // Also skip if column is empty and wasn't receiving items (edge case: all items moved away)
  if (validItems.length === 0 && !hasItemsFromOtherColumns && originalColumnCount > 0) {
    return true;
  }
  
  return false;
}

/**
 * Filter out placeholder items from drag event items.
 * 
 * @param {Array} items - Items from drag event (may include placeholders)
 * @returns {Array} Filtered array with only valid list items (no placeholders)
 */
export function filterValidListItems(items) {
  if (!Array.isArray(items)) return [];
  return items.filter(item => !isPlaceholderItem(item));
}

/**
 * Process the finalize event for list dragging.
 * Filters placeholders, checks if update should be skipped, and updates the database.
 * 
 * @param {Array} items - Items from drag event (may include placeholders)
 * @param {number} columnIndex - The column index where the drop occurred
 * @param {Array} sourceLists - Source of truth lists (from liveQuery)
 * @param {Array} currentDraggableLists - Current draggableLists for cross-reference
 * @returns {Promise<Array>} Promise that resolves to the valid items array, or null if update was skipped
 */
export async function processListFinalize(items, columnIndex, sourceLists, currentDraggableLists) {
  // Filter out placeholders - placeholders should be gone by finalize, but filter just in case
  const validItems = filterValidListItems(items);
  const filteredPlaceholders = items.filter(item => isPlaceholderItem(item));
  
  if (filteredPlaceholders.length > 0) {
    console.warn('[DRAG] finalize - WARNING: Placeholders still present in finalize!', filteredPlaceholders.length);
  }
  
  // Check if we should skip the database update (source column that only lost items)
  if (shouldSkipFinalizeUpdate(validItems, columnIndex, sourceLists, currentDraggableLists)) {
    return null; // Indicates update was skipped
  }
  
  // Update database with new order and columnIndex values
  try {
    await updateListOrderWithColumn(columnIndex, validItems);
    // Return valid items for potential state update
    // Note: liveQuery will automatically update the UI after database changes
    return validItems;
  } catch (error) {
    console.error('[DRAG] finalize - ERROR updating list order:', error);
    // Re-throw so caller can handle error (e.g., revert state)
    throw error;
  }
}

