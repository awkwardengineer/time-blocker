// @ts-nocheck
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import App from '../../App.svelte'
import db from '../../lib/db.js'
import { updateTaskOrder, updateTaskOrderCrossList } from '../../lib/dataAccess.js'
import { setupTestData } from '../helpers/appTestSetup.js'
import { 
  getListSection, 
  getFirstCheckboxFor, 
  waitForListSection 
} from '../helpers/appTestHelpers.js'

describe('App', () => {
  beforeEach(async () => {
    await setupTestData()
  })

  it('should call window.print() when print button is clicked', async () => {
    // Render the component using @testing-library/svelte
    render(App)
    
    const user = userEvent.setup()
    
    // Find the print button by its text
    const printButton = screen.getByRole('button', { name: /print/i })
    
    // Click the button
    await user.click(printButton)
    
    // Verify window.print() was called
    expect(window.print).toHaveBeenCalledTimes(1)
  })

  it('should display lists and tasks after mounting', async () => {
    render(App)
    
    // Initially should show loading state
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    
    // Wait for lists to appear (data has started loading)
    await waitFor(() => {
      expect(screen.getByText('Work')).toBeInTheDocument()
    })
    const personalSection = await waitForListSection('Personal')
    expect(within(personalSection).getByText('Personal')).toBeInTheDocument()
    
    // Wait for tasks to load and be displayed
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument()
      expect(screen.getByText('Task 2')).toBeInTheDocument()
      expect(screen.getByText('Personal Task')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    // Verify loading message is gone
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
  })

  it('shows empty state message when a list has no tasks', async () => {
    await db.lists.add({ name: 'Empty', order: 2 })
    
    render(App)
    
    await waitFor(() => {
      expect(screen.getByText('Empty')).toBeInTheDocument()
    })
    
    // Wait for tasks to finish loading (the "Loading tasks..." message should disappear)
    await waitFor(() => {
      expect(screen.queryByText('Loading tasks...')).not.toBeInTheDocument()
    })
    
    // When a list has no tasks, it shows the "Add your first task" button
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /add your first task to empty/i })
      ).toBeInTheDocument()
    })
  })

  it('allows creating and toggling tasks through the UI', async () => {
    const user = userEvent.setup()
    render(App)

    const workSection = await waitForListSection('Work')
    
    // Wait for initial tasks to load
    await waitFor(() => {
      expect(within(workSection).getByText('Task 1')).toBeInTheDocument()
    })
    
    // Find Task 1's checkbox specifically (more reliable than assuming first checkbox)
    const task1Text = within(workSection).getByText('Task 1')
    const task1ListItem = task1Text.closest('li')
    const task1Checkbox = within(task1ListItem).getByRole('checkbox')
    
    // Verify Task 1 starts unchecked
    expect(task1Checkbox).not.toBeChecked()

    // Add a new task - click "Add Task" button first to show input
    const addTaskButton = within(workSection).getByRole('button', { name: /add new task to work/i })
    await user.click(addTaskButton)
    
    // Wait for input to appear and get it
    const input = await within(workSection).findByPlaceholderText('Add new task...')
    await user.type(input, 'UI Task')
    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(within(workSection).getByText('UI Task')).toBeInTheDocument()
    })

    // Toggle Task 1 checkbox
    await user.click(task1Checkbox)
    await waitFor(() => {
      // Re-query to get fresh reference after state update
      const updatedCheckbox = within(task1ListItem).getByRole('checkbox')
      expect(updatedCheckbox).toBeChecked()
    }, { timeout: 10000 })
    
    // Small delay to ensure first toggle is fully processed before second toggle
    await new Promise(resolve => setTimeout(resolve, 200))

    // Toggle it back - re-query the checkbox to avoid stale reference
    // Re-query before clicking to get fresh reference
    const task1ListItemUpdated = within(workSection).getByText('Task 1').closest('li')
    const task1CheckboxUpdated = within(task1ListItemUpdated).getByRole('checkbox')
    
    // Verify it's still checked before toggling (sanity check)
    expect(task1CheckboxUpdated).toBeChecked()
    
    await user.click(task1CheckboxUpdated)
    
    // Small delay to ensure click is processed and database update starts
    await new Promise(resolve => setTimeout(resolve, 200))
    
    // Wait for state to update - re-query inside waitFor to ensure we have latest state
    // liveQuery updates can take time to propagate, especially in CI
    await waitFor(() => {
      // Re-query the checkbox to ensure we have the latest state
      const finalCheckbox = within(task1ListItemUpdated).getByRole('checkbox')
      expect(finalCheckbox).not.toBeChecked()
    }, { timeout: 10000 })
  }, 15000)

  it('Keyboard navigation: Enter/Space on checkbox toggles task checked state', async () => {
    const user = userEvent.setup()
    render(App)
    const workSection = await waitForListSection('Work')
    
    // Wait for initial tasks to load
    await waitFor(() => {
      expect(within(workSection).getByText('Task 1')).toBeInTheDocument()
    })
    
    // Find Task 1's checkbox
    const task1Text = within(workSection).getByText('Task 1')
    const task1ListItem = task1Text.closest('li')
    const task1Checkbox = within(task1ListItem).getByRole('checkbox')
    
    // Verify Task 1 starts unchecked
    expect(task1Checkbox).not.toBeChecked()
    
    // Focus the checkbox
    task1Checkbox.focus()
    await new Promise(resolve => setTimeout(resolve, 10))
    
    // Press Enter - should toggle checkbox
    await user.keyboard('{Enter}')
    
    // Wait for checkbox to become checked
    await waitFor(() => {
      const updatedCheckbox = within(task1ListItem).getByRole('checkbox')
      expect(updatedCheckbox).toBeChecked()
    }, { timeout: 10000 })
    
    // Small delay before next toggle
    await new Promise(resolve => setTimeout(resolve, 200))
    
    // Focus again and press Space - should toggle back
    task1Checkbox.focus()
    await new Promise(resolve => setTimeout(resolve, 10))
    
    // Press Space - should toggle checkbox back
    await user.keyboard(' ')
    
    // Wait for checkbox to become unchecked
    await waitFor(() => {
      const finalCheckbox = within(task1ListItem).getByRole('checkbox')
      expect(finalCheckbox).not.toBeChecked()
    }, { timeout: 10000 })
  }, 15000)

  it('allows archiving and restoring tasks via the archived view', async () => {
    const user = userEvent.setup()
    render(App)

    const workSection = await waitForListSection('Work')
    const checkbox = await getFirstCheckboxFor('Work')
    await user.click(checkbox)

    await waitFor(() => {
      expect(within(getListSection('Work')).getAllByRole('checkbox')[0]).toBeChecked()
    })

    const archiveButton = await within(workSection).findByRole('button', { name: /archive/i })
    await user.click(archiveButton)

    await waitFor(() => {
      expect(within(workSection).queryByText('Task 1')).not.toBeInTheDocument()
    })

    const archivedSection = screen.getByText('Archived Tasks').parentElement

    await waitFor(() => {
      expect(within(archivedSection).getByText('Task 1')).toBeInTheDocument()
    })

    const restoreButton = within(archivedSection).getByRole('button', { name: /restore/i })
    await user.click(restoreButton)

    await waitFor(() => {
      expect(within(workSection).getByText('Task 1')).toBeInTheDocument()
    })
  })

  it('persists task state across rerenders (simulating refresh)', async () => {
    const user = userEvent.setup()
    const view = render(App)

    const workSection = await waitForListSection('Work')
    const checkbox = await getFirstCheckboxFor('Work')
    await user.click(checkbox)

    await waitFor(() => {
      expect(within(getListSection('Work')).getAllByRole('checkbox')[0]).toBeChecked()
    })

    view.unmount()
    render(App)

    await waitFor(() => {
      expect(screen.getByText('Work')).toBeInTheDocument()
    })

    const refreshedCheckbox = await getFirstCheckboxFor('Work')
    await waitFor(() => {
      expect(refreshedCheckbox).toBeChecked()
    })
  })

  it('displays tasks in correct order initially', async () => {
    render(App)

    const workSection = await waitForListSection('Work')
    
    // Wait for tasks to load
    await waitFor(() => {
      expect(within(workSection).getByText('Task 1')).toBeInTheDocument()
      expect(within(workSection).getByText('Task 2')).toBeInTheDocument()
    })

    // Get all task text elements in order
    const taskTexts = within(workSection).getAllByText(/Task \d/).map(el => el.textContent)
    
    // Verify tasks are displayed in order (Task 1, Task 2)
    expect(taskTexts[0]).toBe('Task 1')
    expect(taskTexts[1]).toBe('Task 2')
  })

  it('updates task order after reordering and persists in UI', async () => {
    render(App)

    const workSection = await waitForListSection('Work')
    
    // Wait for tasks to load
    await waitFor(() => {
      expect(within(workSection).getByText('Task 1')).toBeInTheDocument()
      expect(within(workSection).getByText('Task 2')).toBeInTheDocument()
    })

    // Get list ID from database
    const lists = await db.lists.toArray()
    const workList = lists.find(l => l.name === 'Work')
    const tasks = await db.tasks.where('listId').equals(workList.id).toArray()
    
    // Reorder tasks: swap Task 1 and Task 2
    const task1 = tasks.find(t => t.text === 'Task 1')
    const task2 = tasks.find(t => t.text === 'Task 2')
    const reorderedTasks = [task2, task1] // Reverse order
    
    // Update order in database (simulating drag-and-drop finalize event)
    await updateTaskOrder(workList.id, reorderedTasks)

    // Wait for UI to update (liveQuery should trigger re-render)
    await waitFor(() => {
      const taskTexts = within(workSection).getAllByText(/Task \d/).map(el => el.textContent)
      // After reordering, Task 2 should be first
      expect(taskTexts[0]).toBe('Task 2')
      expect(taskTexts[1]).toBe('Task 1')
    }, { timeout: 3000 })
  })

  it('persists task order across rerenders (simulating refresh)', async () => {
    const view = render(App)

    const workSection = await waitForListSection('Work')
    
    // Wait for tasks to load
    await waitFor(() => {
      expect(within(workSection).getByText('Task 1')).toBeInTheDocument()
      expect(within(workSection).getByText('Task 2')).toBeInTheDocument()
    })

    // Get list ID and reorder tasks
    const lists = await db.lists.toArray()
    const workList = lists.find(l => l.name === 'Work')
    const tasks = await db.tasks.where('listId').equals(workList.id).toArray()
    const task1 = tasks.find(t => t.text === 'Task 1')
    const task2 = tasks.find(t => t.text === 'Task 2')
    const reorderedTasks = [task2, task1]
    
    // Reorder tasks
    await updateTaskOrder(workList.id, reorderedTasks)

    // Wait for UI to update
    await waitFor(() => {
      const taskTexts = within(workSection).getAllByText(/Task \d/).map(el => el.textContent)
      expect(taskTexts[0]).toBe('Task 2')
    }, { timeout: 3000 })

    // Unmount and remount (simulating page refresh)
    view.unmount()
    render(App)

    const refreshedWorkSection = await waitForListSection('Work')
    
    // Verify order persisted after refresh
    await waitFor(() => {
      const taskTexts = within(refreshedWorkSection).getAllByText(/Task \d/).map(el => el.textContent)
      expect(taskTexts[0]).toBe('Task 2')
      expect(taskTexts[1]).toBe('Task 1')
    }, { timeout: 3000 })
  })

  it('excludes archived tasks from reordering', async () => {
    const user = userEvent.setup()
    render(App)

    const workSection = await waitForListSection('Work')
    
    // Archive Task 1
    const checkbox = await getFirstCheckboxFor('Work')
    await user.click(checkbox)

    await waitFor(() => {
      expect(within(getListSection('Work')).getAllByRole('checkbox')[0]).toBeChecked()
    })

    const archiveButton = await within(workSection).findByRole('button', { name: /archive/i })
    await user.click(archiveButton)

    // Wait for Task 1 to be archived
    await waitFor(() => {
      expect(within(workSection).queryByText('Task 1')).not.toBeInTheDocument()
    })

    // Verify only Task 2 is visible (archived tasks excluded)
    await waitFor(() => {
      expect(within(workSection).getByText('Task 2')).toBeInTheDocument()
      const taskTexts = within(workSection).getAllByText(/Task \d/)
      expect(taskTexts.length).toBe(1) // Only Task 2 should be visible
    })

    // Get list ID and verify archived task is not in draggable list
    const lists = await db.lists.toArray()
    const workList = lists.find(l => l.name === 'Work')
    const tasks = await db.tasks.where('listId').equals(workList.id)
      .filter(t => t.status !== 'archived')
      .toArray()
    
    // Verify archived task is excluded
    expect(tasks.length).toBe(1)
    expect(tasks[0].text).toBe('Task 2')
  })

  it('maintains order consistency after creating new task', async () => {
    const user = userEvent.setup()
    render(App)

    const workSection = await waitForListSection('Work')
    
    // Click "Add Task" button first to show input
    const addTaskButton = within(workSection).getByRole('button', { name: /add new task to work/i })
    await user.click(addTaskButton)
    
    // Wait for input to appear and get it
    const input = await within(workSection).findByPlaceholderText('Add new task...')
    await user.type(input, 'New Task')
    await user.keyboard('{Enter}')

    // Wait for new task to appear
    await waitFor(() => {
      expect(within(workSection).getByText('New Task')).toBeInTheDocument()
    })

    // Verify new task appears at end
    const taskTexts = within(workSection).getAllByText(/Task \d|New Task/).map(el => el.textContent)
    expect(taskTexts[taskTexts.length - 1]).toBe('New Task')
    
    // Verify order in database
    const lists = await db.lists.toArray()
    const workList = lists.find(l => l.name === 'Work')
    const tasks = await db.tasks.where('listId').equals(workList.id)
      .filter(t => t.status !== 'archived')
      .sortBy('order')
    
    expect(tasks[tasks.length - 1].text).toBe('New Task')
    expect(tasks[tasks.length - 1].order).toBe(2) // Should be max order + 1
  })

  it('moves task from one list to another and updates UI', async () => {
    render(App)

    const workSection = await waitForListSection('Work')
    const personalSection = await waitForListSection('Personal')
    
    // Wait for tasks to load
    await waitFor(() => {
      expect(within(workSection).getByText('Task 1')).toBeInTheDocument()
      expect(within(workSection).getByText('Task 2')).toBeInTheDocument()
      expect(within(personalSection).getByText('Personal Task')).toBeInTheDocument()
    })

    // Get list IDs from database
    const lists = await db.lists.toArray()
    const workList = lists.find(l => l.name === 'Work')
    const personalList = lists.find(l => l.name === 'Personal')
    
    // Get tasks from both lists
    const workTasks = await db.tasks.where('listId').equals(workList.id)
      .filter(t => t.status !== 'archived')
      .sortBy('order')
    const personalTasks = await db.tasks.where('listId').equals(personalList.id)
      .filter(t => t.status !== 'archived')
      .sortBy('order')
    
    // Move Task 1 from Work to Personal
    const task1 = workTasks.find(t => t.text === 'Task 1')
    const newPersonalTasks = [...personalTasks, task1]
    
    // Simulate cross-list drag-and-drop
    await updateTaskOrderCrossList(personalList.id, newPersonalTasks)

    // Wait for UI to update (task should move from Work to Personal)
    await waitFor(() => {
      // Task 1 should no longer be in Work section
      expect(within(workSection).queryByText('Task 1')).not.toBeInTheDocument()
      // Task 1 should now be in Personal section
      expect(within(personalSection).getByText('Task 1')).toBeInTheDocument()
    }, { timeout: 3000 })

    // Verify Task 2 is still in Work section
    expect(within(workSection).getByText('Task 2')).toBeInTheDocument()
    
    // Verify Personal section has both tasks
    const personalTaskTexts = within(personalSection).getAllByText(/Personal Task|Task 1/).map(el => el.textContent)
    expect(personalTaskTexts.length).toBe(2)
    expect(personalTaskTexts).toContain('Personal Task')
    expect(personalTaskTexts).toContain('Task 1')
  })

  it('maintains order in both source and destination lists after cross-list move', async () => {
    render(App)

    const workSection = await waitForListSection('Work')
    const personalSection = await waitForListSection('Personal')
    
    // Wait for tasks to load
    await waitFor(() => {
      expect(within(workSection).getByText('Task 1')).toBeInTheDocument()
      expect(within(workSection).getByText('Task 2')).toBeInTheDocument()
    })

    // Get list IDs from database
    const lists = await db.lists.toArray()
    const workList = lists.find(l => l.name === 'Work')
    const personalList = lists.find(l => l.name === 'Personal')
    
    // Get tasks
    const workTasks = await db.tasks.where('listId').equals(workList.id)
      .filter(t => t.status !== 'archived')
      .sortBy('order')
    const personalTasks = await db.tasks.where('listId').equals(personalList.id)
      .filter(t => t.status !== 'archived')
      .sortBy('order')
    
    // Move Task 1 from Work to Personal (insert at beginning)
    const task1 = workTasks.find(t => t.text === 'Task 1')
    const newPersonalTasks = [task1, ...personalTasks] // Insert at position 0
    
    await updateTaskOrderCrossList(personalList.id, newPersonalTasks)

    // Wait for UI to update
    await waitFor(() => {
      expect(within(personalSection).getByText('Task 1')).toBeInTheDocument()
    }, { timeout: 3000 })

    // Verify order in Personal list (Task 1 should be first)
    const personalTaskTexts = within(personalSection).getAllByText(/Personal Task|Task 1/).map(el => el.textContent)
    expect(personalTaskTexts[0]).toBe('Task 1')
    expect(personalTaskTexts[1]).toBe('Personal Task')
    
    // Verify order in Work list (Task 2 should be first, no gaps)
    const workTaskTexts = within(workSection).getAllByText(/Task \d/).map(el => el.textContent)
    expect(workTaskTexts.length).toBe(1)
    expect(workTaskTexts[0]).toBe('Task 2')
    
    // Verify order in database
    const updatedWorkTasks = await db.tasks.where('listId').equals(workList.id)
      .filter(t => t.status !== 'archived')
      .sortBy('order')
    expect(updatedWorkTasks.length).toBe(1)
    expect(updatedWorkTasks[0].order).toBe(0)
    
    const updatedPersonalTasks = await db.tasks.where('listId').equals(personalList.id)
      .filter(t => t.status !== 'archived')
      .sortBy('order')
    expect(updatedPersonalTasks.length).toBe(2)
    expect(updatedPersonalTasks[0].order).toBe(0)
    expect(updatedPersonalTasks[1].order).toBe(1)
  })

  it('persists cross-list moves across rerenders (simulating refresh)', async () => {
    const view = render(App)

    const workSection = await waitForListSection('Work')
    const personalSection = await waitForListSection('Personal')
    
    // Wait for tasks to load
    await waitFor(() => {
      expect(within(workSection).getByText('Task 1')).toBeInTheDocument()
    })

    // Get list IDs and move task
    const lists = await db.lists.toArray()
    const workList = lists.find(l => l.name === 'Work')
    const personalList = lists.find(l => l.name === 'Personal')
    
    const workTasks = await db.tasks.where('listId').equals(workList.id)
      .filter(t => t.status !== 'archived')
      .sortBy('order')
    const personalTasks = await db.tasks.where('listId').equals(personalList.id)
      .filter(t => t.status !== 'archived')
      .sortBy('order')
    
    const task1 = workTasks.find(t => t.text === 'Task 1')
    const newPersonalTasks = [...personalTasks, task1]
    
    await updateTaskOrderCrossList(personalList.id, newPersonalTasks)

    // Wait for UI to update
    await waitFor(() => {
      expect(within(personalSection).getByText('Task 1')).toBeInTheDocument()
    }, { timeout: 3000 })

    // Unmount and remount (simulating page refresh)
    view.unmount()
    render(App)

    const refreshedWorkSection = await waitForListSection('Work')
    const refreshedPersonalSection = await waitForListSection('Personal')
    
    // Verify move persisted after refresh
    await waitFor(() => {
      expect(within(refreshedWorkSection).queryByText('Task 1')).not.toBeInTheDocument()
      expect(within(refreshedPersonalSection).getByText('Task 1')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('handles moving task to empty list', async () => {
    render(App)

    // Get list IDs
    const lists = await db.lists.toArray()
    const workList = lists.find(l => l.name === 'Work')
    const personalList = lists.find(l => l.name === 'Personal')
    
    // Clear Personal list (archive its task)
    const personalTasks = await db.tasks.where('listId').equals(personalList.id).toArray()
    for (const task of personalTasks) {
      await db.tasks.update(task.id, { status: 'archived' })
    }
    
    // Wait for Personal section to show empty state
    const personalSection = await waitForListSection('Personal')
    await waitFor(() => {
      expect(within(personalSection).queryByText('Personal Task')).not.toBeInTheDocument()
    })

    // Get Work tasks
    const workTasks = await db.tasks.where('listId').equals(workList.id)
      .filter(t => t.status !== 'archived')
      .sortBy('order')
    
    // Move Task 1 to empty Personal list
    const task1 = workTasks.find(t => t.text === 'Task 1')
    const newPersonalTasks = [task1]
    
    await updateTaskOrderCrossList(personalList.id, newPersonalTasks)

    // Wait for UI to update
    const workSection = await waitForListSection('Work')
    await waitFor(() => {
      expect(within(personalSection).getByText('Task 1')).toBeInTheDocument()
      expect(within(workSection).queryByText('Task 1')).not.toBeInTheDocument()
    }, { timeout: 3000 })
    
    // Verify task in database
    const updatedPersonalTasks = await db.tasks.where('listId').equals(personalList.id)
      .filter(t => t.status !== 'archived')
      .sortBy('order')
    expect(updatedPersonalTasks.length).toBe(1)
    expect(updatedPersonalTasks[0].id).toBe(task1.id)
    expect(updatedPersonalTasks[0].order).toBe(0)
  })
})
