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
 * Fetch all archived tasks, ordered by their order field
 * @returns {Promise<Array>} Array of archived task objects
 */
export async function getArchivedTasks() {
  return await db.tasks
    .where('status')
    .equals('archived')
    .sortBy('order');
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
  const taskId = await db.tasks.add({
    text: text.trim(),
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
  
  return await db.tasks.update(taskId, { status });
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

