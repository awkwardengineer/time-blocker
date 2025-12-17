/**
 * Utility functions for list drag-and-drop operations
 */

/**
 * Check if an item is a placeholder used by the drag library
 */
export function isPlaceholderItem(item) {
  return item && (item.isDndShadowItem === true || 
                  (typeof item.id === 'string' && item.id.startsWith('id:dnd-shadow-placeholder-')));
}

/**
 * Group lists into columns based on their columnIndex
 * @param {Array} draggableLists - Array of list objects with columnIndex property
 * @param {number} columnCount - Number of columns (default 5)
 * @returns {Array} Array of columns, each containing lists for that column
 */
export function groupListsIntoColumns(draggableLists, columnCount = 5) {
  if (!draggableLists || draggableLists.length === 0) {
    return Array(columnCount).fill(null).map(() => []);
  }
  
  const columns = Array(columnCount).fill(null).map(() => []);
  const lastColumnIndex = columnCount - 1;
  
  for (const list of draggableLists) {
    let columnIndex = list.columnIndex ?? 0;
    // Handle overflow: if columnIndex >= columnCount, place in last column
    if (columnIndex >= columnCount) {
      columnIndex = lastColumnIndex;
    }
    columns[columnIndex].push(list);
  }
  
  // Sort lists within each column by their order
  for (let i = 0; i < columns.length; i++) {
    columns[i].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }
  
  return columns;
}

/**
 * Find the current column index and position index for a list ID
 * @param {Array} columns - Array of columns (from groupListsIntoColumns)
 * @param {string} listId - ID of the list to find
 * @returns {{columnIndex: number, index: number} | null} Position info or null if not found
 */
export function findListPosition(columns, listId) {
  if (!columns || columns.length === 0) {
    return null;
  }
  for (let columnIndex = 0; columnIndex < columns.length; columnIndex++) {
    const columnLists = columns[columnIndex];
    if (!Array.isArray(columnLists)) continue;
    const index = columnLists.findIndex(list => list.id === listId);
    if (index !== -1) {
      return { columnIndex, index };
    }
  }
  return null;
}

