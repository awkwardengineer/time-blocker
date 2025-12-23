/**
 * Pure functions and handlers for task drag-and-drop logic
 */

import { getTasksForList, updateTaskOrderCrossList } from '../dataAccess.js';

/**
 * Filter out invalid items from drag event items.
 * Only keeps items with numeric IDs (real tasks, not placeholders).
 * 
 * @param {Array} items - Items from drag event (may include placeholders)
 * @returns {Array} Filtered array with only valid task items
 */
export function filterValidTaskItems(items) {
  if (!Array.isArray(items)) return [];
  return items.filter(item => 
    item && typeof item.id === 'number'
  );
}

/**
 * Process the consider event for task dragging.
 * Filters items and returns valid tasks for visual feedback during drag.
 * 
 * @param {Array} items - Items from drag event (may include placeholders)
 * @returns {Array} Filtered array with only valid task items
 */
export function processTaskConsider(items) {
  return filterValidTaskItems(items);
}

/**
 * Process the finalize event for task dragging.
 * Updates the database with the new task order.
 * 
 * @param {Array} items - Items from drag event (may include placeholders)
 * @param {number} listId - The list ID where the drop occurred
 * @returns {Promise<Array>} Promise that resolves to the valid items array
 */
export async function processTaskFinalize(items, listId) {
  const validItems = filterValidTaskItems(items);
  
  // Update database with new order values
  // Supports both same-list reordering and cross-list moves
  try {
    await updateTaskOrderCrossList(listId, validItems);
    // Return valid items for state update
    return validItems;
  } catch (error) {
    console.error('Error updating task order:', error);
    // Re-throw so caller can handle error (e.g., revert state)
    throw error;
  }
}

/**
 * Return all non-archived lists in visual column order.
 * Columns are ordered left-to-right by columnIndex, and within
 * each column lists are ordered top-to-bottom by their order.
 * 
 * @param {Array} lists - Array of list objects
 * @returns {Array} Sorted array of lists in visual column order
 */
export function getListsInColumnOrder(lists) {
  if (!Array.isArray(lists)) return [];
  return [...lists].sort((a, b) => {
    const colA = a?.columnIndex ?? 0;
    const colB = b?.columnIndex ?? 0;
    if (colA !== colB) return colA - colB;

    const orderA = a?.order ?? 0;
    const orderB = b?.order ?? 0;
    if (orderA !== orderB) return orderA - orderB;

    const idA = a?.id ?? 0;
    const idB = b?.id ?? 0;
    return idA - idB;
  });
}

/**
 * Find the next/previous list ID relative to the current list,
 * using visual column order (left-to-right columns, top-to-bottom rows).
 * 
 * @param {number} currentListId - The current list ID
 * @param {Array} lists - Array of all lists
 * @param {string} direction - 'next' or 'prev'
 * @returns {number|null} The neighbor list ID, or null if none exists
 */
export function findNeighborListId(currentListId, lists, direction) {
  const ordered = getListsInColumnOrder(lists);
  if (!ordered.length) return null;

  const index = ordered.findIndex((l) => l.id === currentListId);
  if (index === -1) return null;

  if (direction === 'next') {
    if (index >= ordered.length - 1) return null;
    return ordered[index + 1].id;
  }

  if (direction === 'prev') {
    if (index <= 0) return null;
    return ordered[index - 1].id;
  }

  return null;
}

/**
 * Move task to next list (first position).
 * 
 * @param {number} taskId - The task ID to move
 * @param {number} nextListId - The target list ID
 * @returns {Promise<void>}
 */
export async function moveTaskToNextList(taskId, nextListId) {
  try {
    // Get all tasks from next list
    const nextListTasks = await getTasksForList(nextListId);
    // Create new array with this task at the beginning
    const newTasks = [{ id: taskId }, ...nextListTasks];
    await updateTaskOrderCrossList(nextListId, newTasks);
  } catch (error) {
    console.error('Error moving task to next list:', error);
    throw error;
  }
}

/**
 * Move task to previous list (last position).
 * 
 * @param {number} taskId - The task ID to move
 * @param {number} prevListId - The target list ID
 * @returns {Promise<void>}
 */
export async function moveTaskToPreviousList(taskId, prevListId) {
  try {
    // Get all tasks from previous list
    const prevListTasks = await getTasksForList(prevListId);
    // Create new array with this task at the end
    const newTasks = [...prevListTasks, { id: taskId }];
    await updateTaskOrderCrossList(prevListId, newTasks);
  } catch (error) {
    console.error('Error moving task to previous list:', error);
    throw error;
  }
}

