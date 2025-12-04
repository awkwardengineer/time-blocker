// @ts-nocheck
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import App from '../../App.svelte'
import db from '../../lib/db.js'
import { updateTaskOrder } from '../../lib/dataAccess.js'
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
      expect(screen.getByText('Personal')).toBeInTheDocument()
    })
    
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
    
    await waitFor(() => {
      expect(
        screen.getByText('No tasks yet for Empty. Add your first task.')
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
      expect(task1Checkbox).toBeChecked()
    })

    // Toggle it back - re-query the checkbox to avoid stale reference
    await user.click(task1Checkbox)
    await waitFor(async () => {
      // Re-query the checkbox to ensure we have the latest state
      const updatedCheckbox = within(task1ListItem).getByRole('checkbox')
      expect(updatedCheckbox).not.toBeChecked()
    })
  })

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

  it('requires confirmation before deleting archived tasks', async () => {
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

    const archivedSection = screen.getByText('Archived Tasks').parentElement
    await waitFor(() => {
      expect(within(archivedSection).getByText('Task 1')).toBeInTheDocument()
    })

    const deleteButton = within(archivedSection).getByRole('button', { name: /delete/i })
    await user.click(deleteButton)

    const modalContent = await screen.findByText(/permanently delete "Task 1"/i)
    const modal = modalContent.closest('div')

    await user.click(within(modal).getByRole('button', { name: /cancel/i }))

    await waitFor(() => {
      expect(screen.queryByText(/permanently delete "Task 1"/i)).not.toBeInTheDocument()
    })

    await user.click(deleteButton)
    const modalContent2 = await screen.findByText(/permanently delete "Task 1"/i)
    const modal2 = modalContent2.closest('div')

    await user.click(within(modal2).getByRole('button', { name: /^delete$/i }))

    await waitFor(() => {
      expect(within(archivedSection).queryByText('Task 1')).not.toBeInTheDocument()
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
})
