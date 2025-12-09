import db from './db.js';

/**
 * Calculate the next order value for a collection of items.
 * Returns max order + 1, or 0 if the collection is empty.
 * @param {Array<{order: number}>} items - Array of items with order property
 * @returns {number} The next order value
 */
function getNextOrderValue(items) {
  if (items.length === 0) {
    return 0;
  }
  const maxOrder = Math.max(...items.map(item => item.order));
  return maxOrder + 1;
}

/**
 * Fetch all lists ordered by their order field
 * Only returns lists where archivedAt is null (excludes archived lists)
 * @returns {Promise<Array>} Array of list objects
 */
export async function getAllLists() {
  // Filter for lists where archivedAt is null or undefined (active lists)
  // This handles both existing lists (which may not have the field) and new lists
  const allLists = await db.lists.orderBy('order').toArray();
  return allLists.filter(list => list.archivedAt == null); // == null matches both null and undefined
}

/**
 * Fetch all lists including archived ones, ordered by their order field
 * @returns {Promise<Array>} Array of list objects (both active and archived)
 */
export async function getAllListsIncludingArchived() {
  return await db.lists.orderBy('order').toArray();
}

/**
 * Create a new list
 * @param {string} name - The list name (cannot be empty or whitespace-only)
 * @param {number} [columnIndex] - Optional column index (0-4). If not provided, distributes evenly across columns.
 * @returns {Promise<number>} The ID of the created list
 */
export async function createList(name, columnIndex = null) {
  // Validate: name cannot be empty string '' or whitespace-only
  const trimmedName = name.trim();
  if (trimmedName === '') {
    throw new Error('List name cannot be empty or whitespace-only');
  }
  
  // Get all existing lists to determine the next order value
  const existingLists = await db.lists.orderBy('order').toArray();
  const nextOrder = getNextOrderValue(existingLists);
  
  // Assign columnIndex: use provided value, or distribute evenly across 5 columns (0-4)
  const columnCount = 5;
  let finalColumnIndex;
  if (columnIndex !== null && columnIndex >= 0 && columnIndex < columnCount) {
    finalColumnIndex = columnIndex;
  } else {
    // Fallback to distribution if invalid or not provided
    finalColumnIndex = nextOrder % columnCount;
  }
  
  // Create the list with trimmed name
  const listId = await db.lists.add({
    name: trimmedName,
    order: nextOrder,
    archivedAt: null,
    columnIndex: finalColumnIndex
  });
  
  return listId;
}

/**
 * Create a new unnamed list (name set to null)
 * @param {number} [columnIndex] - Optional column index (0-4). If not provided, distributes evenly across columns.
 * @returns {Promise<number>} The ID of the created list
 */
export async function createUnnamedList(columnIndex = null) {
  // Get all existing lists to determine the next order value
  const existingLists = await db.lists.orderBy('order').toArray();
  const nextOrder = getNextOrderValue(existingLists);
  
  // Assign columnIndex: use provided value, or distribute evenly across 5 columns (0-4)
  const columnCount = 5;
  let finalColumnIndex;
  if (columnIndex !== null && columnIndex >= 0 && columnIndex < columnCount) {
    finalColumnIndex = columnIndex;
  } else {
    // Fallback to distribution if invalid or not provided
    finalColumnIndex = nextOrder % columnCount;
  }
  
  // Create the list with name set to null
  const listId = await db.lists.add({
    name: null,
    order: nextOrder,
    archivedAt: null,
    columnIndex: finalColumnIndex
  });
  
  return listId;
}

/**
 * Update a list's name
 * @param {number} listId - The ID of the list
 * @param {string} name - The new list name (cannot be empty)
 * @returns {Promise<number>} The number of lists updated (should be 1)
 */
export async function updateListName(listId, name) {
  const trimmedName = name.trim();
  if (trimmedName === '') {
    throw new Error('List name cannot be empty');
  }
  
  return await db.lists.update(listId, { name: trimmedName });
}

/**
 * Fetch all tasks for a specific list, ordered by their order field
 * Only returns unchecked and checked tasks (excludes archived)
 * @param {number} listId - The ID of the list
 * @returns {Promise<Array>} Array of task objects
 */
export async function getTasksForList(listId) {
  return await db.tasks
    .where('listId')
    .equals(listId)
    .filter(task => task.status !== 'archived')
    .sortBy('order');
}

/**
 * Fetch all tasks ordered by their order field
 * Only returns unchecked and checked tasks (excludes archived)
 * @returns {Promise<Array>} Array of task objects
 */
export async function getAllTasks() {
  return await db.tasks
    .orderBy('order')
    .filter(task => task.status !== 'archived')
    .toArray();
}

/**
 * Fetch all archived tasks, ordered by archive time (newest first)
 * @returns {Promise<Array>} Array of archived task objects
 */
export async function getArchivedTasks() {
  const tasks = await db.tasks
    .where('status')
    .equals('archived')
    .toArray();
  
  // Sort by archivedAt descending (newest first), fallback to order for tasks without archivedAt
  return tasks.sort((a, b) => {
    const aTime = a.archivedAt || 0;
    const bTime = b.archivedAt || 0;
    if (bTime !== aTime) {
      return bTime - aTime; // Descending order (newest first)
    }
    // Fallback to order if archivedAt is the same
    return (b.order || 0) - (a.order || 0);
  });
}

/**
 * Create a new task in a list
 * @param {number|null} listId - The ID of the list, or null to create an unnamed list first
 *   Note: null is only used as a parameter convention; the stored listId is always a number.
 *   The list's name field can be null (for unnamed lists), but listId is never null in the database.
 * @param {string} text - The task text content
 * @param {number} [columnIndex] - Optional column index (0-4) when creating unnamed list (only used if listId is null)
 * @returns {Promise<number>} The ID of the created task
 */
export async function createTask(listId, text, columnIndex = null) {
  // If listId is null, create an unnamed list first (listId will be a number after this)
  let targetListId = listId;
  if (listId === null) {
    targetListId = await createUnnamedList(columnIndex); // Returns a number (database ID)
  }
  
  // At this point, targetListId is always a number (never null)
  
  // Get existing tasks for this list to determine the next order value
  const existingTasks = await db.tasks
    .where('listId')
    .equals(targetListId)
    .filter(task => task.status !== 'archived')
    .sortBy('order');
  
  const nextOrder = getNextOrderValue(existingTasks);
  
  // Create the task
  // Note: text can be empty string for blank tasks (whitespace-only input creates blank tasks)
  // For non-empty text, trim whitespace; for empty/blank tasks, preserve empty string
  const taskText = text === '' ? '' : text.trim();
  
  const taskId = await db.tasks.add({
    text: taskText,
    listId: targetListId,
    order: nextOrder,
    status: 'unchecked'
  });
  
  return taskId;
}

/**
 * Update a task's text content
 * @param {number} taskId - The ID of the task
 * @param {string} text - The new text content (can be empty string for blank tasks)
 * @returns {Promise<number>} The number of tasks updated (should be 1)
 */
export async function updateTaskText(taskId, text) {
  // Note: text can be empty string for blank tasks (whitespace-only input creates blank tasks)
  // For non-empty text, trim whitespace; for empty/blank tasks, preserve empty string
  const taskText = text === '' ? '' : text.trim();
  
  return await db.tasks.update(taskId, { text: taskText });
}

/**
 * Update a task's status
 * @param {number} taskId - The ID of the task
 * @param {string} status - The new status ('unchecked', 'checked', 'archived')
 * @returns {Promise<number>} The number of tasks updated (should be 1)
 */
export async function updateTaskStatus(taskId, status) {
  if (!['unchecked', 'checked', 'archived'].includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }
  
  const updateData = { status };
  
  // Set archivedAt timestamp when archiving
  if (status === 'archived') {
    updateData.archivedAt = Date.now();
  } else if (status !== 'archived') {
    // Clear archivedAt when restoring or changing to non-archived status
    updateData.archivedAt = null;
  }
  
  return await db.tasks.update(taskId, updateData);
}

/**
 * Restore an archived task (change status from 'archived' to 'checked')
 * Appends task to end of list (max order + 1)
 * If the task's list is archived, automatically restores the list as well
 * @param {number} taskId - The ID of the task to restore
 * @returns {Promise<{taskUpdated: number, listRestored: boolean}>} Object with task update count and whether list was restored
 */
export async function restoreTask(taskId) {
  // Get the task to find its listId
  const task = await db.tasks.get(taskId);
  if (!task) {
    throw new Error(`Task ${taskId} not found`);
  }
  
  // Check if the list exists and if it's archived
  const list = await db.lists.get(task.listId);
  if (!list) {
    // List doesn't exist - deferred: will be handled when delete lists feature is added
    throw new Error(`Task's list ${task.listId} not found`);
  }
  
  let listRestored = false;
  // If the list is archived, restore it first
  if (list.archivedAt != null) {
    await restoreList(task.listId);
    listRestored = true;
  }
  
  // Get existing tasks for this list to determine the next order value
  const existingTasks = await db.tasks
    .where('listId')
    .equals(task.listId)
    .filter(t => t.status !== 'archived' && t.id !== taskId)
    .sortBy('order');
  
  const nextOrder = getNextOrderValue(existingTasks);
  
  // Update task status and order
  const taskUpdated = await db.tasks.update(taskId, {
    status: 'checked',
    order: nextOrder
  });
  
  return { taskUpdated, listRestored };
}

/**
 * Update the order of tasks in a list
 * Recalculates sequential order values (0, 1, 2, 3...) for all tasks based on their new positions
 * @param {number} listId - The ID of the list
 * @param {Array<{id: number}>} reorderedTasks - Array of tasks in their new order (must include id field)
 * @returns {Promise<void>}
 */
export async function updateTaskOrder(listId, reorderedTasks) {
  if (!reorderedTasks || reorderedTasks.length === 0) {
    return; // No tasks to update
  }
  
  // Validate that all tasks belong to the specified list
  const taskIds = reorderedTasks.map(t => t.id);
  const tasks = await db.tasks.bulkGet(taskIds);
  const invalidTasks = tasks.filter(t => !t || t.listId !== listId);
  if (invalidTasks.length > 0) {
    throw new Error(`Cannot update order: some tasks do not belong to list ${listId}`);
  }
  
  // Calculate new sequential order values based on array position
  // Array index becomes the order value (0, 1, 2, 3...)
  const updates = reorderedTasks.map((task, index) => ({
    id: task.id,
    order: index
  }));
  
  // Update all tasks in a transaction for atomicity
  await db.transaction('rw', db.tasks, async () => {
    for (const update of updates) {
      await db.tasks.update(update.id, { order: update.order });
    }
  });
}

/**
 * Update task order with support for cross-list moves
 * Handles both same-list reordering and cross-list dragging
 * @param {number} destinationListId - The ID of the list where tasks were dropped
 * @param {Array<{id: number}>} newTasks - Array of tasks in their new order in the destination list (must include id field)
 * @returns {Promise<void>}
 */
export async function updateTaskOrderCrossList(destinationListId, newTasks) {
  if (!newTasks || newTasks.length === 0) {
    // If destination list is now empty, we still need to update source lists
    // Get all tasks that might have been moved out
    // But actually, if newTasks is empty, there's nothing to do
    return;
  }
  
  const taskIds = newTasks.map(t => t.id);
  const currentTasks = await db.tasks.bulkGet(taskIds);
  
  // Filter out any tasks that don't exist
  const validTasks = currentTasks.filter(t => t !== undefined);
  if (validTasks.length === 0) {
    return; // No valid tasks
  }
  
  // Identify tasks that changed lists (moved from another list to this one)
  const movedTasks = validTasks.filter(t => t.listId !== destinationListId);
  const sourceListIds = new Set(movedTasks.map(t => t.listId));
  
  // Update all tasks in a transaction for atomicity
  await db.transaction('rw', db.tasks, async () => {
    // Step 1: Update listId and order for tasks in destination list
    for (let index = 0; index < newTasks.length; index++) {
      const taskId = newTasks[index].id;
      const currentTask = validTasks.find(t => t.id === taskId);
      if (!currentTask) continue;
      
      const updates = { order: index };
      // Update listId if task moved from another list
      if (currentTask.listId !== destinationListId) {
        updates.listId = destinationListId;
      }
      
      await db.tasks.update(taskId, updates);
    }
    
    // Step 2: Recalculate order for source lists (tasks that were moved out)
    for (const sourceListId of sourceListIds) {
      // Get all remaining tasks in the source list (excluding archived)
      const remainingTasks = await db.tasks
        .where('listId')
        .equals(sourceListId)
        .filter(task => task.status !== 'archived')
        .sortBy('order');
      
      // Recalculate sequential order values (0, 1, 2, 3...)
      for (let index = 0; index < remainingTasks.length; index++) {
        await db.tasks.update(remainingTasks[index].id, { order: index });
      }
    }
  });
}

/**
 * Archive a list by setting its archivedAt timestamp
 * @param {number} listId - The ID of the list to archive
 * @returns {Promise<number>} The number of lists updated (should be 1)
 */
export async function archiveList(listId) {
  const archivedAt = Date.now();
  return await db.lists.update(listId, { archivedAt });
}

/**
 * Restore an archived list by clearing its archivedAt timestamp
 * @param {number} listId - The ID of the list to restore
 * @returns {Promise<number>} The number of lists updated (should be 1)
 */
export async function restoreList(listId) {
  return await db.lists.update(listId, { archivedAt: null });
}

/**
 * Archive all active tasks (unchecked/checked) in a list
 * Sets archivedAt timestamp on each task and updates status to 'archived'
 * @param {number} listId - The ID of the list
 * @returns {Promise<number>} The number of tasks archived
 */
export async function archiveAllTasksInList(listId) {
  const archivedAt = Date.now();
  
  // Get all active tasks in the list
  const activeTasks = await db.tasks
    .where('listId')
    .equals(listId)
    .filter(task => task.status === 'unchecked' || task.status === 'checked')
    .toArray();
  
  // Archive each task
  const updatePromises = activeTasks.map(task =>
    db.tasks.update(task.id, {
      status: 'archived',
      archivedAt: archivedAt
    })
  );
  
  await Promise.all(updatePromises);
  
  return activeTasks.length;
}

/**
 * Update the order of lists
 * Recalculates sequential order values (0, 1, 2, 3...) for all lists based on their new positions
 * @param {Array<{id: number}>} reorderedLists - Array of lists in their new order (must include id field)
 * @returns {Promise<void>}
 */
export async function updateListOrder(reorderedLists) {
  if (!reorderedLists || reorderedLists.length === 0) {
    return; // No lists to update
  }
  
  // Validate that all lists exist
  const listIds = reorderedLists.map(l => l.id);
  const lists = await db.lists.bulkGet(listIds);
  const invalidLists = lists.filter(l => !l);
  if (invalidLists.length > 0) {
    throw new Error('Cannot update order: some lists do not exist');
  }
  
  // Calculate new sequential order values based on array position
  // Array index becomes the order value (0, 1, 2, 3...)
  const updates = reorderedLists.map((list, index) => ({
    id: list.id,
    order: index
  }));
  
  // Update all lists in a transaction for atomicity
  await db.transaction('rw', db.lists, async () => {
    for (const update of updates) {
      await db.lists.update(update.id, { order: update.order });
    }
  });
}

