/**
 * Pure functions for keyboard-based list dragging logic
 */

import { findListPosition } from './listDndUtils.js';

/**
 * Calculate the target position for a list move based on direction
 * @param {Object} position - Current position {columnIndex, index}
 * @param {string} direction - 'up', 'down', 'left', or 'right'
 * @param {Array} columns - Array of columns
 * @param {number} columnCount - Total number of columns
 * @returns {{targetColumnIndex: number, targetIndex: number} | null} Target position or null if move is invalid
 */
export function calculateListMoveTarget(position, direction, columns, columnCount) {
  const { columnIndex: currentColumnIndex, index: currentIndex } = position;
  let targetColumnIndex = currentColumnIndex;
  let targetIndex = currentIndex;

  if (direction === 'up') {
    if (currentIndex === 0) return null; // Already at top
    targetIndex = currentIndex - 1;
  } else if (direction === 'down') {
    const currentColumnLists = columns[currentColumnIndex] || [];
    if (currentIndex === currentColumnLists.length - 1) return null; // Already at bottom
    targetIndex = currentIndex + 1;
  } else if (direction === 'left') {
    if (currentColumnIndex === 0) return null; // Already at first column
    targetColumnIndex = currentColumnIndex - 1;
    const targetColumnLists = columns[targetColumnIndex] || [];
    targetIndex = targetColumnLists.length; // Move to end of target column
  } else if (direction === 'right') {
    if (currentColumnIndex === columnCount - 1) return null; // Already at last column
    targetColumnIndex = currentColumnIndex + 1;
    const targetColumnLists = columns[targetColumnIndex] || [];
    targetIndex = targetColumnLists.length; // Move to end of target column
  } else {
    return null;
  }

  return { targetColumnIndex, targetIndex };
}

/**
 * Apply a keyboard-driven move to columns structure
 * @param {Array} columns - Current columns structure
 * @param {string} listId - ID of list to move
 * @param {string} direction - 'up', 'down', 'left', or 'right'
 * @param {number} columnCount - Total number of columns
 * @returns {{newColumns: Array, updatedDraggableLists: Array} | null} Updated structure or null if move invalid
 */
export function applyListMoveInColumns(columns, listId, direction, columnCount) {
  const position = findListPosition(columns, listId);
  if (!position) {
    return null;
  }

  const { columnIndex: currentColumnIndex, index: currentIndex } = position;
  const target = calculateListMoveTarget(position, direction, columns, columnCount);
  if (!target) {
    return null;
  }

  const { targetColumnIndex, targetIndex } = target;

  // Clone columns to avoid mutating derived data directly
  const newColumns = columns.map(col => Array.isArray(col) ? [...col] : []);

  const sourceColumnLists = newColumns[currentColumnIndex];
  if (!sourceColumnLists || sourceColumnLists.length === 0) {
    return null;
  }

  const [movingItem] = sourceColumnLists.splice(currentIndex, 1);
  if (!movingItem) {
    return null;
  }

  const targetColumnLists = newColumns[targetColumnIndex];
  if (!targetColumnLists) {
    return null;
  }

  // Clamp target index to valid range
  const safeTargetIndex = Math.min(Math.max(targetIndex, 0), targetColumnLists.length);

  if (direction === 'left' || direction === 'right') {
    // When moving across columns, update columnIndex for the moved item
    targetColumnLists.splice(safeTargetIndex, 0, { ...movingItem, columnIndex: targetColumnIndex });
  } else {
    // Same-column reordering
    targetColumnLists.splice(safeTargetIndex, 0, movingItem);
  }

  // Update local draggableLists for immediate UI feedback
  const updatedDraggableLists = [];
  for (let colIndex = 0; colIndex < newColumns.length; colIndex++) {
    const columnLists = newColumns[colIndex] || [];
    for (let i = 0; i < columnLists.length; i++) {
      const listItem = columnLists[i];
      updatedDraggableLists.push({
        ...listItem,
        columnIndex: colIndex,
        order: i
      });
    }
  }

  return { newColumns, updatedDraggableLists, targetColumnIndex, targetColumnItems: (newColumns[targetColumnIndex] || []).map(item => ({ id: item.id })) };
}

