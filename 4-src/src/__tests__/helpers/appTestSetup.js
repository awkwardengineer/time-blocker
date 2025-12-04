// @ts-nocheck
import { vi } from 'vitest'
import db from '../../lib/db.js'

export async function setupTestData() {
  // Mock window.print() before each test
  window.print = vi.fn()
  
  // Clear existing data and set up fresh test data
  // This ensures each test starts with a clean state
  await db.lists.clear()
  await db.tasks.clear()
  
  // Insert test lists
  const list1 = await db.lists.add({ name: 'Work', order: 0 })
  const list2 = await db.lists.add({ name: 'Personal', order: 1 })
  
  // Insert test tasks
  await db.tasks.add({ text: 'Task 1', listId: list1, order: 0, status: 'unchecked' })
  await db.tasks.add({ text: 'Task 2', listId: list1, order: 1, status: 'unchecked' })
  await db.tasks.add({ text: 'Personal Task', listId: list2, order: 0, status: 'unchecked' })
}

