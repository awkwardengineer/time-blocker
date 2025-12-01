import { describe, it, expect, beforeEach } from 'vitest'
import db from '../../lib/db.js'
import { getAllLists, getTasksForList } from '../../lib/dataAccess.js'

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
    await db.tasks.add({ text: 'Task 2', listId: list1, order: 1 })
    await db.tasks.add({ text: 'Task 1', listId: list1, order: 0 })
    await db.tasks.add({ text: 'Task 3', listId: list1, order: 2 })
    await db.tasks.add({ text: 'Other Task', listId: list2, order: 0 })
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
})

