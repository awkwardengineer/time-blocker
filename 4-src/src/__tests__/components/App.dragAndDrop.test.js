// @ts-nocheck
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/svelte'
import App from '../../App.svelte'
import db from '../../lib/db.js'
import { setupTestData } from '../helpers/appTestSetup.js'
import { waitForListSection } from '../helpers/appTestHelpers.js'

/**
 * Simulates a drag-and-drop operation by dispatching consider and finalize events
 * @param {HTMLElement} dropZone - The ul element that acts as the drop zone
 * @param {Array} items - Array of task objects in the desired order after drop
 */
async function simulateDragDrop(dropZone, items) {
  // Simulate consider event (visual feedback during drag)
  const considerEvent = new CustomEvent('consider', {
    detail: { items }
  })
  dropZone.dispatchEvent(considerEvent)
  
  // Wait a bit for consider to process
  await new Promise(resolve => setTimeout(resolve, 10))
  
  // Simulate finalize event (database update)
  const finalizeEvent = new CustomEvent('finalize', {
    detail: { items }
  })
  dropZone.dispatchEvent(finalizeEvent)
  
  // Wait for database updates and UI to reflect changes
  await new Promise(resolve => setTimeout(resolve, 100))
}

/**
 * Gets the ul element (drop zone) for a specific list
 * @param {HTMLElement} listSection - The list section element
 * @returns {HTMLElement|null} The ul element or null if not found
 */
function getDropZone(listSection) {
  return listSection.querySelector('ul[use\\:dndzone]') || listSection.querySelector('ul')
}

describe('App - Drag and Drop Interactions', () => {
  beforeEach(async () => {
    await setupTestData()
  })

  it('allows dragging task to empty list', async () => {
    render(App)

    // Create an empty list
    const emptyListId = await db.lists.add({ name: 'Empty List', order: 2, columnIndex: 0 })
    
    // Wait for lists to load
    const workSection = await waitForListSection('Work')
    const emptySection = await waitForListSection('Empty List')
    
    // Wait for tasks to load in Work section
    await waitFor(() => {
      expect(within(workSection).getByText('Task 1')).toBeInTheDocument()
    })
    
    // Verify empty list has no tasks
    await waitFor(() => {
      expect(within(emptySection).queryByText(/Task/)).not.toBeInTheDocument()
      expect(within(emptySection).getByText(/Add your first task/i)).toBeInTheDocument()
    })
    
    // Get tasks from Work list
    const workTasks = await db.tasks.where('listId').equals(
      (await db.lists.where('name').equals('Work').first()).id
    ).filter(t => t.status !== 'archived').sortBy('order')
    
    // Get the drop zones
    const workDropZone = getDropZone(workSection)
    const emptyDropZone = getDropZone(emptySection)
    
    expect(workDropZone).toBeTruthy()
    expect(emptyDropZone).toBeTruthy()
    
    // Move Task 1 from Work to Empty List
    const task1 = workTasks.find(t => t.text === 'Task 1')
    const newEmptyListTasks = [task1]
    
    // Simulate drag to empty list
    await simulateDragDrop(emptyDropZone, newEmptyListTasks)
    
    // Wait for UI to update
    await waitFor(() => {
      // Task 1 should now be in Empty List
      expect(within(emptySection).getByText('Task 1')).toBeInTheDocument()
      // Task 1 should no longer be in Work
      expect(within(workSection).queryByText('Task 1')).not.toBeInTheDocument()
    }, { timeout: 3000 })
    
    // Verify Task 2 is still in Work
    expect(within(workSection).getByText('Task 2')).toBeInTheDocument()
    
    // Verify database was updated
    const emptyListTasks = await db.tasks.where('listId').equals(emptyListId)
      .filter(t => t.status !== 'archived').sortBy('order')
    expect(emptyListTasks.length).toBe(1)
    expect(emptyListTasks[0].text).toBe('Task 1')
    expect(emptyListTasks[0].listId).toBe(emptyListId)
    expect(emptyListTasks[0].order).toBe(0)
  })

  it('allows cross-list dragging through UI', async () => {
    render(App)

    const workSection = await waitForListSection('Work')
    const personalSection = await waitForListSection('Personal')
    
    // Wait for tasks to load
    await waitFor(() => {
      expect(within(workSection).getByText('Task 1')).toBeInTheDocument()
      expect(within(workSection).getByText('Task 2')).toBeInTheDocument()
      expect(within(personalSection).getByText('Personal Task')).toBeInTheDocument()
    })
    
    // Get list IDs
    const workList = (await db.lists.where('name').equals('Work').first())
    const personalList = (await db.lists.where('name').equals('Personal').first())
    
    // Get tasks
    const workTasks = await db.tasks.where('listId').equals(workList.id)
      .filter(t => t.status !== 'archived').sortBy('order')
    const personalTasks = await db.tasks.where('listId').equals(personalList.id)
      .filter(t => t.status !== 'archived').sortBy('order')
    
    // Get drop zones
    const workDropZone = getDropZone(workSection)
    const personalDropZone = getDropZone(personalSection)
    
    expect(workDropZone).toBeTruthy()
    expect(personalDropZone).toBeTruthy()
    
    // Move Task 1 from Work to Personal (append to end)
    const task1 = workTasks.find(t => t.text === 'Task 1')
    const newPersonalTasks = [...personalTasks, task1]
    
    // Simulate drag to Personal list
    await simulateDragDrop(personalDropZone, newPersonalTasks)
    
    // Wait for UI to update
    await waitFor(() => {
      // Task 1 should no longer be in Work
      expect(within(workSection).queryByText('Task 1')).not.toBeInTheDocument()
      // Task 1 should now be in Personal
      expect(within(personalSection).getByText('Task 1')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    // Verify Task 2 is still in Work
    expect(within(workSection).getByText('Task 2')).toBeInTheDocument()
    
    // Verify Personal has both tasks
    const personalTaskTexts = within(personalSection).getAllByText(/Personal Task|Task 1/)
    expect(personalTaskTexts.length).toBe(2)
    
    // Verify database
    const updatedPersonalTasks = await db.tasks.where('listId').equals(personalList.id)
      .filter(t => t.status !== 'archived').sortBy('order')
    expect(updatedPersonalTasks.length).toBe(2)
    expect(updatedPersonalTasks[1].text).toBe('Task 1')
    expect(updatedPersonalTasks[1].listId).toBe(personalList.id)
  })

  it('allows same-list reordering through UI', async () => {
    render(App)

    const workSection = await waitForListSection('Work')
    
    // Wait for tasks to load
    await waitFor(() => {
      expect(within(workSection).getByText('Task 1')).toBeInTheDocument()
      expect(within(workSection).getByText('Task 2')).toBeInTheDocument()
    })
    
    // Get list and tasks
    const workList = (await db.lists.where('name').equals('Work').first())
    const workTasks = await db.tasks.where('listId').equals(workList.id)
      .filter(t => t.status !== 'archived').sortBy('order')
    
    const task1 = workTasks.find(t => t.text === 'Task 1')
    const task2 = workTasks.find(t => t.text === 'Task 2')
    
    // Get drop zone
    const workDropZone = getDropZone(workSection)
    expect(workDropZone).toBeTruthy()
    
    // Reorder: swap Task 1 and Task 2
    const reorderedTasks = [task2, task1]
    
    // Simulate drag to reorder
    await simulateDragDrop(workDropZone, reorderedTasks)
    
    // Wait for UI to update
    await waitFor(() => {
      const taskTexts = within(workSection).getAllByText(/Task \d/).map(el => el.textContent)
      // After reordering, Task 2 should be first
      expect(taskTexts[0]).toBe('Task 2')
      expect(taskTexts[1]).toBe('Task 1')
    }, { timeout: 3000 })
    
    // Verify database
    const updatedTasks = await db.tasks.where('listId').equals(workList.id)
      .filter(t => t.status !== 'archived').sortBy('order')
    expect(updatedTasks[0].text).toBe('Task 2')
    expect(updatedTasks[0].order).toBe(0)
    expect(updatedTasks[1].text).toBe('Task 1')
    expect(updatedTasks[1].order).toBe(1)
  })

  it('handles dragging to list with single task', async () => {
    render(App)

    // Create a list with one task
    const singleTaskListId = await db.lists.add({ name: 'Single Task List', order: 2, columnIndex: 0 })
    await db.tasks.add({ 
      text: 'Only Task', 
      listId: singleTaskListId, 
      order: 0, 
      status: 'unchecked' 
    })
    
    const workSection = await waitForListSection('Work')
    const singleTaskSection = await waitForListSection('Single Task List')
    
    // Wait for tasks to load
    await waitFor(() => {
      expect(within(workSection).getByText('Task 1')).toBeInTheDocument()
      expect(within(singleTaskSection).getByText('Only Task')).toBeInTheDocument()
    })
    
    // Get tasks
    const workTasks = await db.tasks.where('listId').equals(
      (await db.lists.where('name').equals('Work').first()).id
    ).filter(t => t.status !== 'archived').sortBy('order')
    
    const singleTaskListTasks = await db.tasks.where('listId').equals(singleTaskListId)
      .filter(t => t.status !== 'archived').sortBy('order')
    
    // Get drop zones
    const workDropZone = getDropZone(workSection)
    const singleTaskDropZone = getDropZone(singleTaskSection)
    
    // Move Task 1 to Single Task List (insert at beginning)
    const task1 = workTasks.find(t => t.text === 'Task 1')
    const newSingleTaskListTasks = [task1, ...singleTaskListTasks]
    
    await simulateDragDrop(singleTaskDropZone, newSingleTaskListTasks)
    
    // Wait for UI to update
    await waitFor(() => {
      expect(within(singleTaskSection).getByText('Task 1')).toBeInTheDocument()
      expect(within(singleTaskSection).getByText('Only Task')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    // Verify order in database
    const updatedTasks = await db.tasks.where('listId').equals(singleTaskListId)
      .filter(t => t.status !== 'archived').sortBy('order')
    expect(updatedTasks.length).toBe(2)
    expect(updatedTasks[0].text).toBe('Task 1')
    expect(updatedTasks[0].order).toBe(0)
    expect(updatedTasks[1].text).toBe('Only Task')
    expect(updatedTasks[1].order).toBe(1)
  })

  it('handles moving last task from a list (list becomes empty)', async () => {
    render(App)

    // Create a list with one task
    const singleTaskListId = await db.lists.add({ name: 'Will Be Empty', order: 2, columnIndex: 0 })
    await db.tasks.add({ 
      text: 'Last Task', 
      listId: singleTaskListId, 
      order: 0, 
      status: 'unchecked' 
    })
    
    const workSection = await waitForListSection('Work')
    const willBeEmptySection = await waitForListSection('Will Be Empty')
    
    // Wait for tasks to load
    await waitFor(() => {
      expect(within(workSection).getByText('Task 1')).toBeInTheDocument()
      expect(within(willBeEmptySection).getByText('Last Task')).toBeInTheDocument()
    })
    
    // Get tasks
    const workTasks = await db.tasks.where('listId').equals(
      (await db.lists.where('name').equals('Work').first()).id
    ).filter(t => t.status !== 'archived').sortBy('order')
    
    const willBeEmptyTasks = await db.tasks.where('listId').equals(singleTaskListId)
      .filter(t => t.status !== 'archived').sortBy('order')
    
    // Get drop zones
    const workDropZone = getDropZone(workSection)
    const willBeEmptyDropZone = getDropZone(willBeEmptySection)
    
    // Move last task from "Will Be Empty" to Work
    const lastTask = willBeEmptyTasks[0]
    const newWorkTasks = [...workTasks, lastTask]
    
    await simulateDragDrop(workDropZone, newWorkTasks)
    
    // Wait for UI to update
    await waitFor(() => {
      // Last Task should now be in Work
      expect(within(workSection).getByText('Last Task')).toBeInTheDocument()
      // Will Be Empty should show empty state
      expect(within(willBeEmptySection).queryByText('Last Task')).not.toBeInTheDocument()
      expect(within(willBeEmptySection).getByText(/Add your first task/i)).toBeInTheDocument()
    }, { timeout: 3000 })
    
    // Verify source list is empty in database
    const emptyListTasks = await db.tasks.where('listId').equals(singleTaskListId)
      .filter(t => t.status !== 'archived')
      .toArray()
    expect(emptyListTasks.length).toBe(0)
    
    // Verify task moved to Work
    const workList = (await db.lists.where('name').equals('Work').first())
    const updatedWorkTasks = await db.tasks.where('listId').equals(workList.id)
      .filter(t => t.status !== 'archived').sortBy('order')
    expect(updatedWorkTasks.some(t => t.text === 'Last Task')).toBe(true)
  })

  it('filters out invalid items during drag operations', async () => {
    render(App)

    const workSection = await waitForListSection('Work')
    
    // Wait for tasks to load
    await waitFor(() => {
      expect(within(workSection).getByText('Task 1')).toBeInTheDocument()
    })
    
    // Get list and tasks
    const workList = (await db.lists.where('name').equals('Work').first())
    const workTasks = await db.tasks.where('listId').equals(workList.id)
      .filter(t => t.status !== 'archived').sortBy('order')
    
    const workDropZone = getDropZone(workSection)
    
    // Simulate drag with invalid items (placeholder-like objects)
    const task1 = workTasks.find(t => t.text === 'Task 1')
    const invalidItems = [
      task1,
      { id: 'id:dnd-shadow-placeholder-0000', isDndShadowItem: true }, // Invalid placeholder
      { id: 'invalid-string-id' }, // Invalid string ID
      { id: null }, // Invalid null ID
    ]
    
    // Should not throw error and should filter out invalid items
    await expect(simulateDragDrop(workDropZone, invalidItems)).resolves.not.toThrow()
    
    // Verify only valid task remains
    await waitFor(() => {
      expect(within(workSection).getByText('Task 1')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    // Verify database only has valid tasks
    const updatedTasks = await db.tasks.where('listId').equals(workList.id)
      .filter(t => t.status !== 'archived').sortBy('order')
    expect(updatedTasks.length).toBeGreaterThan(0)
    expect(updatedTasks.every(t => typeof t.id === 'number')).toBe(true)
  })
})

