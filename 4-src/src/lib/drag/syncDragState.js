/**
 * Utility for syncing liveQuery data to drag-and-drop state
 * 
 * WHY THIS PATTERN EXISTS:
 * 
 * The drag library (svelte-dnd-action) needs to mutate arrays during drag operations:
 * - Adds placeholder items for visual feedback
 * - Reorders items for visual feedback
 * - Changes array structure during drag
 * 
 * liveQuery results are reactive and should not be mutated directly:
 * - Mutating liveQuery can cause query recreation/duplication
 * - Can lead to "Loading tasks..." stuck states
 * - Can cause components to remount unexpectedly
 * 
 * SOLUTION: Create a "safe copy" that the drag library can mutate
 * - liveQuery → draggableState (one-way sync)
 * - Drag library mutates draggableState (safe)
 * - After drag: update database → liveQuery updates → sync back to draggableState
 * 
 * This pattern protects liveQuery from mutation while allowing drag library
 * to work with a mutable array for visual feedback.
 */

/**
 * Syncs liveQuery results to drag state with optional filtering
 * 
 * @param {any} queryResult - The reactive liveQuery result (may be undefined during loading)
 * @param {Function} [filterFn] - Optional filter function to apply to items
 * @param {Function} [transformFn] - Optional transform function to map items
 * @returns {Array} New drag state array (or empty array if query not ready)
 */
export function syncDragStateFromQuery(queryResult, filterFn = null, transformFn = null) {
  // If query is not ready (undefined = loading), return empty array
  // Don't preserve current state here - let the effect handle it
  if (queryResult === undefined || queryResult === null) {
    return [];
  }

  // If query result is not an array, return empty array
  if (!Array.isArray(queryResult)) {
    return [];
  }

  // Apply transform if provided (e.g., map to specific fields)
  let items = queryResult;
  if (transformFn) {
    items = items.map(transformFn);
  }

  // Apply filter if provided (e.g., exclude archived items)
  if (filterFn) {
    items = items.filter(filterFn);
  }

  // Create new array to ensure reactivity
  return [...items];
}

/**
 * Syncs tasks from liveQuery, filtering out archived tasks
 * 
 * @param {Array|undefined} tasksQuery - The reactive tasks liveQuery result
 * @returns {Array} New draggableTasks array
 */
export function syncTasksForDrag(tasksQuery) {
  return syncDragStateFromQuery(
    tasksQuery,
    // Filter: only include unchecked/checked tasks (exclude archived)
    (task) => task.status === 'unchecked' || task.status === 'checked'
  );
}

/**
 * Syncs lists from liveQuery, transforming to drag-friendly format
 * 
 * @param {Array|undefined} listsQuery - The reactive lists liveQuery result
 * @returns {Array} New draggableLists array
 */
export function syncListsForDrag(listsQuery) {
  return syncDragStateFromQuery(
    listsQuery,
    null, // No filter needed for lists
    // Transform: extract only fields needed for drag
    (list) => ({
      id: list.id,
      name: list.name,
      order: list.order,
      columnIndex: list.columnIndex
    })
  );
}

