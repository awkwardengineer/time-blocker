import db from './db.js';

/**
 * Fetch all lists ordered by their order field
 * @returns {Promise<Array>} Array of list objects
 */
export async function getAllLists() {
  return await db.lists.orderBy('order').toArray();
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
 * @param {number} listId - The ID of the list
 * @param {string} text - The task text content
 * @returns {Promise<number>} The ID of the created task
 */
export async function createTask(listId, text) {
  // Get existing tasks for this list to determine the next order value
  const existingTasks = await db.tasks
    .where('listId')
    .equals(listId)
    .filter(task => task.status !== 'archived')
    .sortBy('order');
  
  // Calculate the next order value (max order + 1, or 0 if no tasks)
  const maxOrder = existingTasks.length > 0 
    ? Math.max(...existingTasks.map(t => t.order))
    : -1;
  const nextOrder = maxOrder + 1;
  
  // Create the task
  // Note: text can be empty string for blank tasks (whitespace-only input creates blank tasks)
  // For non-empty text, trim whitespace; for empty/blank tasks, preserve empty string
  const taskText = text === '' ? '' : text.trim();
  
  const taskId = await db.tasks.add({
    text: taskText,
    listId: listId,
    order: nextOrder,
    status: 'unchecked'
  });
  
  return taskId;
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
 * @param {number} taskId - The ID of the task to restore
 * @returns {Promise<number>} The number of tasks updated (should be 1)
 */
export async function restoreTask(taskId) {
  // Get the task to find its listId
  const task = await db.tasks.get(taskId);
  if (!task) {
    throw new Error(`Task ${taskId} not found`);
  }
  
  // Get existing tasks for this list to determine the next order value
  const existingTasks = await db.tasks
    .where('listId')
    .equals(task.listId)
    .filter(t => t.status !== 'archived' && t.id !== taskId)
    .sortBy('order');
  
  // Calculate the next order value (max order + 1, or 0 if no tasks)
  const maxOrder = existingTasks.length > 0 
    ? Math.max(...existingTasks.map(t => t.order))
    : -1;
  const nextOrder = maxOrder + 1;
  
  // Update task status and order
  return await db.tasks.update(taskId, {
    status: 'checked',
    order: nextOrder
  });
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
 * Permanently delete a task from the database
 * This is a destructive operation - use with caution
 * @param {number} taskId - The ID of the task to delete
 * @returns {Promise<void>}
 */
export async function deleteTask(taskId) {
  await db.tasks.delete(taskId);
}

