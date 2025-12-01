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
 * @param {number} listId - The ID of the list
 * @returns {Promise<Array>} Array of task objects
 */
export async function getTasksForList(listId) {
  return await db.tasks.where('listId').equals(listId).sortBy('order');
}

/**
 * Fetch all tasks ordered by their order field
 * @returns {Promise<Array>} Array of all task objects
 */
export async function getAllTasks() {
  return await db.tasks.orderBy('order').toArray();
}

