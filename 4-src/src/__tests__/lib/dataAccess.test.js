import { describe, it, expect, beforeEach } from 'vitest'
import db from '../../lib/db.js'
import { getAllLists, getTasksForList, getAllTasks, getArchivedTasks, createTask, updateTaskStatus, restoreTask } from '../../lib/dataAccess.js'

describe('dataAccess', () => {
  beforeEach(async () => {
    // Clear existing data and set up fresh test data
    await db.lists.clear()
    await db.tasks.clear()
    
    // Insert lists out of order to verify sorting works
    const list1 = await db.lists.add({ name: 'Second', order: 1 })
    const list2 = await db.lists.add({ name: 'First', order: 0 })
    const list3 = await db.lists.add({ name: 'Third', order: 2 })
    
    // Insert tasks out of order to verify sorting works
    await db.tasks.add({ text: 'Task 2', listId: list1, order: 1, status: 'unchecked' })
    await db.tasks.add({ text: 'Task 1', listId: list1, order: 0, status: 'unchecked' })
    await db.tasks.add({ text: 'Task 3', listId: list1, order: 2, status: 'unchecked' })
    await db.tasks.add({ text: 'Other Task', listId: list2, order: 0, status: 'unchecked' })
  })

  describe('getAllLists', () => {
    it('should return lists ordered by order field', async () => {
      const lists = await getAllLists()
      
      // Verify we have lists
      expect(lists.length).toBe(3)
      
      // Verify lists are returned in order (0, 1, 2)
      expect(lists[0].order).toBe(0)
      expect(lists[0].name).toBe('First')
      expect(lists[1].order).toBe(1)
      expect(lists[1].name).toBe('Second')
      expect(lists[2].order).toBe(2)
      expect(lists[2].name).toBe('Third')
      
      // Verify ordering is correct
      for (let i = 0; i < lists.length - 1; i++) {
        expect(lists[i].order).toBeLessThanOrEqual(lists[i + 1].order)
      }
    })
  })

  describe('getTasksForList', () => {
    it('should return tasks for a specific list, ordered by order field', async () => {
      // Get the list with order 1 (Second list)
      const lists = await getAllLists()
      const targetList = lists.find(l => l.order === 1)
      expect(targetList).toBeDefined()
      
      const tasks = await getTasksForList(targetList.id)
      
      // Verify we have the correct tasks
      expect(tasks.length).toBe(3)
      
      // Verify all tasks belong to the specified list
      tasks.forEach(task => {
        expect(task.listId).toBe(targetList.id)
      })
      
      // Verify tasks are returned in order (0, 1, 2)
      expect(tasks[0].order).toBe(0)
      expect(tasks[0].text).toBe('Task 1')
      expect(tasks[1].order).toBe(1)
      expect(tasks[1].text).toBe('Task 2')
      expect(tasks[2].order).toBe(2)
      expect(tasks[2].text).toBe('Task 3')
      
      // Verify ordering is correct
      for (let i = 0; i < tasks.length - 1; i++) {
        expect(tasks[i].order).toBeLessThanOrEqual(tasks[i + 1].order)
      }
    })
    
    it('should only return tasks for the specified list', async () => {
      const lists = await getAllLists()
      const targetList = lists.find(l => l.order === 0) // First list
      expect(targetList).toBeDefined()
      
      const tasks = await getTasksForList(targetList.id)
      
      // Should only have tasks for this list
      expect(tasks.length).toBe(1)
      expect(tasks[0].listId).toBe(targetList.id)
      expect(tasks[0].text).toBe('Other Task')
    })
  })

  describe('getAllTasks', () => {
    it('should return all tasks excluding archived ones', async () => {
      // Add an archived task
      const lists = await getAllLists()
      const list1 = lists.find(l => l.order === 1)
      await db.tasks.add({ text: 'Archived Task', listId: list1.id, order: 10, status: 'archived' })
      
      const tasks = await getAllTasks()
      
      // Should have 4 tasks (3 unchecked + 1 other unchecked, but not the archived one)
      expect(tasks.length).toBe(4)
      
      // Verify no archived tasks are included
      tasks.forEach(task => {
        expect(task.status).not.toBe('archived')
      })
    })
  })

  describe('getArchivedTasks', () => {
    it('should return only archived tasks ordered by archive time (newest first)', async () => {
      const lists = await getAllLists()
      const list1 = lists.find(l => l.order === 1)
      
      // Add archived tasks
      const now = Date.now()
      await db.tasks.add({ text: 'Archived Task 1', listId: list1.id, order: 0, status: 'archived', archivedAt: now - 1000 })
      await db.tasks.add({ text: 'Archived Task 2', listId: list1.id, order: 1, status: 'archived', archivedAt: now })
      
      const archivedTasks = await getArchivedTasks()
      
      // Should have 2 archived tasks
      expect(archivedTasks.length).toBe(2)
      
      // Verify all are archived
      archivedTasks.forEach(task => {
        expect(task.status).toBe('archived')
      })
      
      // Verify ordering (newest first)
      expect(archivedTasks[0].text).toBe('Archived Task 2')
      expect(archivedTasks[0].archivedAt).toBeGreaterThan(archivedTasks[1].archivedAt)
      expect(archivedTasks[1].text).toBe('Archived Task 1')
    })
  })

  describe('getTasksForList filtering', () => {
    it('should exclude archived tasks from list results', async () => {
      const lists = await getAllLists()
      const list1 = lists.find(l => l.order === 1)
      
      // Add an archived task to the same list
      await db.tasks.add({ text: 'Archived Task', listId: list1.id, order: 5, status: 'archived' })
      
      const tasks = await getTasksForList(list1.id)
      
      // Should still have 3 tasks (the original unchecked ones), not 4
      expect(tasks.length).toBe(3)
      
      // Verify no archived tasks
      tasks.forEach(task => {
        expect(task.status).not.toBe('archived')
      })
    })
  })

  describe('createTask', () => {
    it('should create a new task with correct properties', async () => {
      const lists = await getAllLists()
      const list1 = lists.find(l => l.order === 1)
      
      const taskId = await createTask(list1.id, 'New Task')
      
      expect(taskId).toBeDefined()
      
      const task = await db.tasks.get(taskId)
      expect(task).toBeDefined()
      expect(task.text).toBe('New Task')
      expect(task.listId).toBe(list1.id)
      expect(task.status).toBe('unchecked')
      expect(typeof task.order).toBe('number')
    })
    
    it('should set order to 0 for first task in empty list', async () => {
      const lists = await getAllLists()
      const list2 = lists.find(l => l.order === 0) // This list has 1 task
      
      // Clear existing tasks for this list
      await db.tasks.where('listId').equals(list2.id).delete()
      
      const taskId = await createTask(list2.id, 'First Task')
      const task = await db.tasks.get(taskId)
      
      expect(task.order).toBe(0)
    })
    
    it('should append new task to end of list (max order + 1)', async () => {
      const lists = await getAllLists()
      const list1 = lists.find(l => l.order === 1) // This list has 3 tasks with orders 0, 1, 2
      
      const taskId = await createTask(list1.id, 'Last Task')
      const task = await db.tasks.get(taskId)
      
      expect(task.order).toBe(3) // Should be max (2) + 1
    })
    
    it('should trim whitespace from task text', async () => {
      const lists = await getAllLists()
      const list1 = lists.find(l => l.order === 1)
      
      const taskId = await createTask(list1.id, '  Trimmed Task  ')
      const task = await db.tasks.get(taskId)
      
      expect(task.text).toBe('Trimmed Task')
    })
  })

  describe('updateTaskStatus', () => {
    it('should update task status to checked', async () => {
      const lists = await getAllLists()
      const list1 = lists.find(l => l.order === 1)
      const tasks = await getTasksForList(list1.id)
      const task = tasks[0]
      
      await updateTaskStatus(task.id, 'checked')
      
      const updatedTask = await db.tasks.get(task.id)
      expect(updatedTask.status).toBe('checked')
    })
    
    it('should update task status to unchecked', async () => {
      const lists = await getAllLists()
      const list1 = lists.find(l => l.order === 1)
      const tasks = await getTasksForList(list1.id)
      const task = tasks[0]
      
      // First set to checked
      await updateTaskStatus(task.id, 'checked')
      // Then set back to unchecked
      await updateTaskStatus(task.id, 'unchecked')
      
      const updatedTask = await db.tasks.get(task.id)
      expect(updatedTask.status).toBe('unchecked')
    })
    
    it('should update task status to archived', async () => {
      const lists = await getAllLists()
      const list1 = lists.find(l => l.order === 1)
      const tasks = await getTasksForList(list1.id)
      const task = tasks[0]
      
      await updateTaskStatus(task.id, 'archived')
      
      const updatedTask = await db.tasks.get(task.id)
      expect(updatedTask.status).toBe('archived')
      
      // Verify archived task is excluded from getTasksForList
      const listTasks = await getTasksForList(list1.id)
      expect(listTasks.find(t => t.id === task.id)).toBeUndefined()
    })
    
    it('should throw error for invalid status', async () => {
      const lists = await getAllLists()
      const list1 = lists.find(l => l.order === 1)
      const tasks = await getTasksForList(list1.id)
      const task = tasks[0]
      
      await expect(updateTaskStatus(task.id, 'invalid')).rejects.toThrow('Invalid status')
    })
  })

  describe('restoreTask', () => {
    it('should restore archived task to checked status', async () => {
      const lists = await getAllLists()
      const list1 = lists.find(l => l.order === 1)
      
      // Create and archive a task
      const taskId = await createTask(list1.id, 'Task to Archive')
      await updateTaskStatus(taskId, 'archived')
      
      // Verify it's archived
      let task = await db.tasks.get(taskId)
      expect(task.status).toBe('archived')
      
      // Restore it
      await restoreTask(taskId)
      
      // Verify it's checked and appended to end
      task = await db.tasks.get(taskId)
      expect(task.status).toBe('checked')
      
      // Verify it appears in the list
      const listTasks = await getTasksForList(list1.id)
      expect(listTasks.find(t => t.id === taskId)).toBeDefined()
    })
    
    it('should append restored task to end of list', async () => {
      const lists = await getAllLists()
      const list1 = lists.find(l => l.order === 1)
      
      // Get current max order
      const currentTasks = await getTasksForList(list1.id)
      const maxOrder = currentTasks.length > 0 
        ? Math.max(...currentTasks.map(t => t.order))
        : -1
      
      // Create and archive a task
      const taskId = await createTask(list1.id, 'Task to Restore')
      await updateTaskStatus(taskId, 'archived')
      
      // Restore it
      await restoreTask(taskId)
      
      // Verify it's at the end (maxOrder + 1)
      const task = await db.tasks.get(taskId)
      expect(task.order).toBe(maxOrder + 1)
    })
  })
})

