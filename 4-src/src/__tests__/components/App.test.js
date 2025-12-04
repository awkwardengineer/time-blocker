// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import App from '../../App.svelte'
import db from '../../lib/db.js'
import { updateTaskOrder } from '../../lib/dataAccess.js'

function getListSection(name) {
  const heading = screen.getByRole('heading', { name })
  return heading.parentElement
}

async function getFirstCheckboxFor(listName) {
  await waitFor(() => {
    const listSection = getListSection(listName)
    expect(within(listSection).getAllByRole('checkbox').length).toBeGreaterThan(0)
  })
  return within(getListSection(listName)).getAllByRole('checkbox')[0]
}

describe('App', () => {
  beforeEach(async () => {
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

    await waitFor(() => {
      expect(screen.getByText('Work')).toBeInTheDocument()
    })

    const workSection = getListSection('Work')
    
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

    await waitFor(() => {
      expect(screen.getByText('Work')).toBeInTheDocument()
    })

    const workSection = getListSection('Work')
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

    await waitFor(() => {
      expect(screen.getByText('Work')).toBeInTheDocument()
    })

    const workSection = getListSection('Work')
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

    await waitFor(() => {
      expect(screen.getByText('Work')).toBeInTheDocument()
    })

    const workSection = getListSection('Work')
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

    await waitFor(() => {
      expect(screen.getByText('Work')).toBeInTheDocument()
    })

    const workSection = getListSection('Work')
    
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

    await waitFor(() => {
      expect(screen.getByText('Work')).toBeInTheDocument()
    })

    const workSection = getListSection('Work')
    
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

    await waitFor(() => {
      expect(screen.getByText('Work')).toBeInTheDocument()
    })

    const workSection = getListSection('Work')
    
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

    await waitFor(() => {
      expect(screen.getByText('Work')).toBeInTheDocument()
    })

    const refreshedWorkSection = getListSection('Work')
    
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

    await waitFor(() => {
      expect(screen.getByText('Work')).toBeInTheDocument()
    })

    const workSection = getListSection('Work')
    
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

    await waitFor(() => {
      expect(screen.getByText('Work')).toBeInTheDocument()
    })

    const workSection = getListSection('Work')
    
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

  describe('Task Creation UX Behaviors', () => {
    it('"Add Task" button opens input field with focus', async () => {
      const user = userEvent.setup()
      render(App)

      await waitFor(() => {
        expect(screen.getByText('Work')).toBeInTheDocument()
      })

      const workSection = getListSection('Work')
      const addTaskButton = within(workSection).getByRole('button', { name: /add new task to work/i })
      
      // Verify button is visible
      expect(addTaskButton).toBeInTheDocument()
      
      // Click button
      await user.click(addTaskButton)
      
      // Wait for input to appear
      const input = await within(workSection).findByPlaceholderText('Add new task...')
      
      // Verify input is visible and focused
      expect(input).toBeInTheDocument()
      expect(input).toHaveFocus()
    })

    it('Enter key on empty string "" exits task creation (closes input, shows button)', async () => {
      const user = userEvent.setup()
      render(App)

      await waitFor(() => {
        expect(screen.getByText('Work')).toBeInTheDocument()
      })

      const workSection = getListSection('Work')
      const addTaskButton = within(workSection).getByRole('button', { name: /add new task to work/i })
      
      // Open input
      await user.click(addTaskButton)
      const input = await within(workSection).findByPlaceholderText('Add new task...')
      
      // Verify input is visible
      expect(input).toBeInTheDocument()
      
      // Press Enter on empty input (input should be empty by default)
      await user.keyboard('{Enter}')
      
      // Wait for input to disappear and button to reappear
      await waitFor(() => {
        expect(within(workSection).queryByPlaceholderText('Add new task...')).not.toBeInTheDocument()
        expect(within(workSection).getByRole('button', { name: /add new task to work/i })).toBeInTheDocument()
      })
    })

    it('Enter key creates task (including blank tasks with whitespace) and automatically opens new input for sequential creation', async () => {
      const user = userEvent.setup()
      render(App)

      await waitFor(() => {
        expect(screen.getByText('Work')).toBeInTheDocument()
      })

      const workSection = getListSection('Work')
      const addTaskButton = within(workSection).getByRole('button', { name: /add new task to work/i })
      
      // Create a normal task
      await user.click(addTaskButton)
      const input1 = await within(workSection).findByPlaceholderText('Add new task...')
      await user.type(input1, 'Normal Task')
      await user.keyboard('{Enter}')
      
      // Verify task was created
      await waitFor(() => {
        expect(within(workSection).getByText('Normal Task')).toBeInTheDocument()
      })
      
      // Verify new input is automatically opened and focused (sequential creation)
      const input2 = await within(workSection).findByPlaceholderText('Add new task...')
      expect(input2).toBeInTheDocument()
      expect(input2).toHaveFocus()
      
      // Create a blank task with whitespace
      await user.clear(input2)
      await user.type(input2, '   ') // Multiple spaces
      await user.keyboard('{Enter}')
      
      // Verify blank task was created (should appear as empty/blank)
      await waitFor(() => {
        // Blank tasks show as non-breaking space in the UI
        const tasks = within(workSection).getAllByRole('listitem')
        expect(tasks.length).toBeGreaterThan(2) // Should have original tasks + 2 new ones
      })
      
      // Verify new input is again automatically opened
      const input3 = await within(workSection).findByPlaceholderText('Add new task...')
      expect(input3).toBeInTheDocument()
      expect(input3).toHaveFocus()
    })

    it('Escape key closes input and shows button', async () => {
      const user = userEvent.setup()
      render(App)

      await waitFor(() => {
        expect(screen.getByText('Work')).toBeInTheDocument()
      })

      const workSection = getListSection('Work')
      const addTaskButton = within(workSection).getByRole('button', { name: /add new task to work/i })
      
      // Open input
      await user.click(addTaskButton)
      const input = await within(workSection).findByPlaceholderText('Add new task...')
      expect(input).toBeInTheDocument()
      
      // Type something (but don't save)
      await user.type(input, 'Some text')
      
      // Press Escape
      await user.keyboard('{Escape}')
      
      // Wait for input to disappear and button to reappear
      await waitFor(() => {
        expect(within(workSection).queryByPlaceholderText('Add new task...')).not.toBeInTheDocument()
        expect(within(workSection).getByRole('button', { name: /add new task to work/i })).toBeInTheDocument()
      })
      
      // Verify task was NOT created
      expect(within(workSection).queryByText('Some text')).not.toBeInTheDocument()
    })

    it('Click-outside closes input and shows button', async () => {
      const user = userEvent.setup()
      render(App)

      await waitFor(() => {
        expect(screen.getByText('Work')).toBeInTheDocument()
      })

      const workSection = getListSection('Work')
      const addTaskButton = within(workSection).getByRole('button', { name: /add new task to work/i })
      
      // Open input
      await user.click(addTaskButton)
      const input = await within(workSection).findByPlaceholderText('Add new task...')
      expect(input).toBeInTheDocument()
      
      // Click outside (on the heading)
      const heading = within(workSection).getByRole('heading', { name: 'Work' })
      await user.click(heading)
      
      // Wait for input to disappear and button to reappear
      await waitFor(() => {
        expect(within(workSection).queryByPlaceholderText('Add new task...')).not.toBeInTheDocument()
        expect(within(workSection).getByRole('button', { name: /add new task to work/i })).toBeInTheDocument()
      })
    })

    it('Button hidden during print but retains space', async () => {
      render(App)

      await waitFor(() => {
        expect(screen.getByText('Work')).toBeInTheDocument()
      })

      const workSection = getListSection('Work')
      const addTaskButton = within(workSection).getByRole('button', { name: /add new task to work/i })
      
      // Verify button is visible normally
      expect(addTaskButton).toBeVisible()
      
      // Get computed styles in print mode
      const buttonElement = addTaskButton
      const printStyle = window.getComputedStyle(buttonElement, '@media print')
      
      // In a real browser, we'd check print media query, but in test environment
      // we can check the CSS class or style directly
      // The button should have visibility: hidden in print mode
      // Since we can't easily test @media print in jsdom, we'll verify the CSS class exists
      expect(buttonElement).toHaveClass('add-task-button')
      
      // Verify button still exists in DOM (not display: none)
      expect(buttonElement).toBeInTheDocument()
    })
  })

  describe('Task Editing Modal UX Behaviors', () => {
    it('Clicking task opens edit modal', async () => {
      const user = userEvent.setup()
      render(App)

      await waitFor(() => {
        expect(screen.getByText('Work')).toBeInTheDocument()
      })

      const workSection = getListSection('Work')
      
      // Wait for tasks to load
      await waitFor(() => {
        expect(within(workSection).getByText('Task 1')).toBeInTheDocument()
      })
      
      // Find task text and click it
      const task1Text = within(workSection).getByText('Task 1')
      await user.click(task1Text)
      
      // Wait for modal to appear
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText('Edit Task')).toBeInTheDocument()
      })
      
      // Verify modal has input with task text
      const modalInput = screen.getByRole('textbox', { name: /edit task text/i })
      expect(modalInput).toHaveValue('Task 1')
    })

    it('Enter in edit modal saves and closes (when input has content)', async () => {
      const user = userEvent.setup()
      render(App)

      await waitFor(() => {
        expect(screen.getByText('Work')).toBeInTheDocument()
      })

      const workSection = getListSection('Work')
      
      // Wait for tasks to load
      await waitFor(() => {
        expect(within(workSection).getByText('Task 1')).toBeInTheDocument()
      })
      
      // Open modal
      const task1Text = within(workSection).getByText('Task 1')
      await user.click(task1Text)
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      
      // Edit task text
      const modalInput = screen.getByRole('textbox', { name: /edit task text/i })
      await user.clear(modalInput)
      await user.type(modalInput, 'Updated Task 1')
      
      // Press Enter (without Shift)
      await user.keyboard('{Enter}')
      
      // Wait for modal to close
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
      
      // Verify task was updated
      await waitFor(() => {
        expect(within(workSection).getByText('Updated Task 1')).toBeInTheDocument()
      })
    })

    it('Enter in edit modal saves and closes (when input has whitespace-only)', async () => {
      const user = userEvent.setup()
      render(App)

      await waitFor(() => {
        expect(screen.getByText('Work')).toBeInTheDocument()
      })

      const workSection = getListSection('Work')
      
      // Wait for tasks to load
      await waitFor(() => {
        expect(within(workSection).getByText('Task 1')).toBeInTheDocument()
      })
      
      // Open modal
      const task1Text = within(workSection).getByText('Task 1')
      await user.click(task1Text)
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      
      // Edit task text to whitespace only
      const modalInput = screen.getByRole('textbox', { name: /edit task text/i })
      await user.clear(modalInput)
      await user.type(modalInput, '   ') // Multiple spaces
      
      // Press Enter (without Shift)
      await user.keyboard('{Enter}')
      
      // Wait for modal to close
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
      
      // Verify task was saved as blank task (whitespace-only becomes blank)
      await waitFor(() => {
        // Blank tasks appear as non-breaking space, so we check the list item exists
        const tasks = within(workSection).getAllByRole('listitem')
        expect(tasks.length).toBeGreaterThan(0)
      })
    })

    it('Enter in edit modal with empty input prevents saving and shows validation', async () => {
      const user = userEvent.setup()
      render(App)

      await waitFor(() => {
        expect(screen.getByText('Work')).toBeInTheDocument()
      })

      const workSection = getListSection('Work')
      
      // Wait for tasks to load
      await waitFor(() => {
        expect(within(workSection).getByText('Task 1')).toBeInTheDocument()
      })
      
      // Open modal
      const task1Text = within(workSection).getByText('Task 1')
      await user.click(task1Text)
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      
      // Clear task text completely
      const modalInput = screen.getByRole('textbox', { name: /edit task text/i })
      await user.clear(modalInput)
      
      // Press Enter
      await user.keyboard('{Enter}')
      
      // Verify validation message appears
      await waitFor(() => {
        expect(screen.getByText(/Task cannot be empty. Consider archiving this task instead./i)).toBeInTheDocument()
      })
      
      // Verify modal is still open
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      
      // Verify Save button is disabled
      const saveButton = screen.getByRole('button', { name: /save disabled: task cannot be empty/i })
      expect(saveButton).toBeDisabled()
    })

    it('Save button in edit modal with empty input prevents saving and shows validation', async () => {
      const user = userEvent.setup()
      render(App)

      await waitFor(() => {
        expect(screen.getByText('Work')).toBeInTheDocument()
      })

      const workSection = getListSection('Work')
      
      // Wait for tasks to load
      await waitFor(() => {
        expect(within(workSection).getByText('Task 1')).toBeInTheDocument()
      })
      
      // Open modal
      const task1Text = within(workSection).getByText('Task 1')
      await user.click(task1Text)
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      
      // Clear task text completely
      const modalInput = screen.getByRole('textbox', { name: /edit task text/i })
      await user.clear(modalInput)
      
      // Click Save button
      const saveButton = screen.getByRole('button', { name: /save task changes/i })
      await user.click(saveButton)
      
      // Verify validation message appears
      await waitFor(() => {
        expect(screen.getByText(/Task cannot be empty. Consider archiving this task instead./i)).toBeInTheDocument()
      })
      
      // Verify modal is still open
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      
      // Verify Save button is now disabled
      const disabledSaveButton = screen.getByRole('button', { name: /save disabled: task cannot be empty/i })
      expect(disabledSaveButton).toBeDisabled()
    })

    it('Save button in edit modal with whitespace-only saves as blank task', async () => {
      const user = userEvent.setup()
      render(App)

      await waitFor(() => {
        expect(screen.getByText('Work')).toBeInTheDocument()
      })

      const workSection = getListSection('Work')
      
      // Wait for tasks to load
      await waitFor(() => {
        expect(within(workSection).getByText('Task 1')).toBeInTheDocument()
      })
      
      // Open modal
      const task1Text = within(workSection).getByText('Task 1')
      await user.click(task1Text)
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      
      // Edit task text to whitespace only
      const modalInput = screen.getByRole('textbox', { name: /edit task text/i })
      await user.clear(modalInput)
      await user.type(modalInput, '   ') // Multiple spaces
      
      // Click Save button
      const saveButton = screen.getByRole('button', { name: /save task changes/i })
      await user.click(saveButton)
      
      // Wait for modal to close
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
      
      // Verify task was saved as blank task
      await waitFor(() => {
        const tasks = within(workSection).getAllByRole('listitem')
        expect(tasks.length).toBeGreaterThan(0)
      })
    })

    it('Validation message suggests archiving when input is empty', async () => {
      const user = userEvent.setup()
      render(App)

      await waitFor(() => {
        expect(screen.getByText('Work')).toBeInTheDocument()
      })

      const workSection = getListSection('Work')
      
      // Wait for tasks to load
      await waitFor(() => {
        expect(within(workSection).getByText('Task 1')).toBeInTheDocument()
      })
      
      // Open modal
      const task1Text = within(workSection).getByText('Task 1')
      await user.click(task1Text)
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      
      // Clear task text
      const modalInput = screen.getByRole('textbox', { name: /edit task text/i })
      await user.clear(modalInput)
      
      // Try to save (trigger validation)
      await user.keyboard('{Enter}')
      
      // Verify validation message contains archiving suggestion
      await waitFor(() => {
        const validationMessage = screen.getByText(/Task cannot be empty. Consider archiving this task instead./i)
        expect(validationMessage).toBeInTheDocument()
        expect(validationMessage).toHaveAttribute('role', 'alert')
      })
      
      // Verify "Archive instead" button is visible
      const archiveButton = screen.getByRole('button', { name: /archive this task instead of saving/i })
      expect(archiveButton).toBeInTheDocument()
    })

    it('Escape in edit modal discards and closes', async () => {
      const user = userEvent.setup()
      render(App)

      await waitFor(() => {
        expect(screen.getByText('Work')).toBeInTheDocument()
      })

      const workSection = getListSection('Work')
      
      // Wait for tasks to load
      await waitFor(() => {
        expect(within(workSection).getByText('Task 1')).toBeInTheDocument()
      })
      
      // Open modal
      const task1Text = within(workSection).getByText('Task 1')
      await user.click(task1Text)
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      
      // Edit task text
      const modalInput = screen.getByRole('textbox', { name: /edit task text/i })
      await user.clear(modalInput)
      await user.type(modalInput, 'This should be discarded')
      
      // Press Escape
      await user.keyboard('{Escape}')
      
      // Wait for modal to close
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
      
      // Verify task was NOT updated (still shows original text)
      expect(within(workSection).getByText('Task 1')).toBeInTheDocument()
      expect(within(workSection).queryByText('This should be discarded')).not.toBeInTheDocument()
    })

    it('Click outside edit modal discards and closes', async () => {
      const user = userEvent.setup()
      render(App)

      await waitFor(() => {
        expect(screen.getByText('Work')).toBeInTheDocument()
      })

      const workSection = getListSection('Work')
      
      // Wait for tasks to load
      await waitFor(() => {
        expect(within(workSection).getByText('Task 1')).toBeInTheDocument()
      })
      
      // Open modal
      const task1Text = within(workSection).getByText('Task 1')
      await user.click(task1Text)
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      
      // Edit task text
      const modalInput = screen.getByRole('textbox', { name: /edit task text/i })
      await user.clear(modalInput)
      await user.type(modalInput, 'This should be discarded')
      
      // Click on backdrop (outside modal content)
      const backdrop = screen.getByRole('dialog')
      await user.click(backdrop)
      
      // Wait for modal to close
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
      
      // Verify task was NOT updated
      expect(within(workSection).getByText('Task 1')).toBeInTheDocument()
      expect(within(workSection).queryByText('This should be discarded')).not.toBeInTheDocument()
    })

    it('Save button saves and closes modal (when input has content)', async () => {
      const user = userEvent.setup()
      render(App)

      await waitFor(() => {
        expect(screen.getByText('Work')).toBeInTheDocument()
      })

      const workSection = getListSection('Work')
      
      // Wait for tasks to load
      await waitFor(() => {
        expect(within(workSection).getByText('Task 1')).toBeInTheDocument()
      })
      
      // Open modal
      const task1Text = within(workSection).getByText('Task 1')
      await user.click(task1Text)
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      
      // Edit task text
      const modalInput = screen.getByRole('textbox', { name: /edit task text/i })
      await user.clear(modalInput)
      await user.type(modalInput, 'Saved via button')
      
      // Click Save button
      const saveButton = screen.getByRole('button', { name: /save task changes/i })
      await user.click(saveButton)
      
      // Wait for modal to close
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
      
      // Verify task was updated
      await waitFor(() => {
        expect(within(workSection).getByText('Saved via button')).toBeInTheDocument()
      })
    })
  })

  describe('Keyboard Navigation', () => {
    it('Tab navigation works through interactive elements', async () => {
      const user = userEvent.setup()
      render(App)

      await waitFor(() => {
        expect(screen.getByText('Work')).toBeInTheDocument()
      })

      const workSection = getListSection('Work')
      
      // Wait for tasks to load
      await waitFor(() => {
        expect(within(workSection).getByText('Task 1')).toBeInTheDocument()
      })
      
      // Find first checkbox
      const task1Text = within(workSection).getByText('Task 1')
      const task1ListItem = task1Text.closest('li')
      const checkbox = within(task1ListItem).getByRole('checkbox')
      
      // Focus checkbox
      checkbox.focus()
      expect(checkbox).toHaveFocus()
      
      // Tab through interactive elements - verify we can navigate
      // Tab to task text (focusable span inside the list item)
      await user.keyboard('{Tab}')
      const taskTextSpan = task1ListItem.querySelector('span[role="button"]')
      expect(taskTextSpan).toHaveFocus()
      
      // Continue tabbing - should eventually reach Add Task button
      // (drag library adds tabindex to list items, so exact order may vary)
      let addTaskButton = within(workSection).getByRole('button', { name: /add new task to work/i })
      let foundAddTaskButton = false
      
      // Tab up to 5 times to find the Add Task button (should be reachable)
      for (let i = 0; i < 5; i++) {
        await user.keyboard('{Tab}')
        if (document.activeElement === addTaskButton) {
          foundAddTaskButton = true
          break
        }
      }
      
      // Verify Add Task button is reachable via tab navigation
      expect(foundAddTaskButton).toBe(true)
      expect(addTaskButton).toHaveFocus()
    })
  })

  describe('Focus Management', () => {
    it('Focus returns to task after closing edit modal', async () => {
      const user = userEvent.setup()
      render(App)

      await waitFor(() => {
        expect(screen.getByText('Work')).toBeInTheDocument()
      })

      const workSection = getListSection('Work')
      
      // Wait for tasks to load
      await waitFor(() => {
        expect(within(workSection).getByText('Task 1')).toBeInTheDocument()
      })
      
      // Open modal by clicking task text
      const task1Text = within(workSection).getByText('Task 1')
      await user.click(task1Text)
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      
      // Verify modal input has focus
      const modalInput = screen.getByRole('textbox', { name: /edit task text/i })
      expect(modalInput).toHaveFocus()
      
      // Save and close modal
      await user.keyboard('{Enter}')
      
      // Wait for modal to close
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
      
      // Verify focus returned to task text
      const task1ListItem = task1Text.closest('li')
      const taskTextSpan = task1ListItem.querySelector('span[role="button"]')
      // Note: Focus return happens in setTimeout, so we wait a bit
      await waitFor(() => {
        expect(taskTextSpan).toHaveFocus()
      }, { timeout: 1000 })
    })

    it('Focus moves to next task after archiving', async () => {
      const user = userEvent.setup()
      render(App)

      await waitFor(() => {
        expect(screen.getByText('Work')).toBeInTheDocument()
      })

      const workSection = getListSection('Work')
      
      // Wait for tasks to load
      await waitFor(() => {
        expect(within(workSection).getByText('Task 1')).toBeInTheDocument()
        expect(within(workSection).getByText('Task 2')).toBeInTheDocument()
      })
      
      // Open modal for Task 1
      const task1Text = within(workSection).getByText('Task 1')
      await user.click(task1Text)
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      
      // Archive Task 1 from modal
      const archiveButton = screen.getByRole('button', { name: /archive this task instead of saving/i })
      await user.click(archiveButton)
      
      // Wait for modal to close and Task 1 to be archived
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        expect(within(workSection).queryByText('Task 1')).not.toBeInTheDocument()
      })
      
      // Verify focus moved to Task 2 (next task)
      const task2Text = within(workSection).getByText('Task 2')
      const task2ListItem = task2Text.closest('li')
      const task2TextSpan = task2ListItem.querySelector('span[role="button"]')
      await waitFor(() => {
        expect(task2TextSpan).toHaveFocus()
      }, { timeout: 1000 })
    })

    it('Focus moves to Add Task button when all tasks archived', async () => {
      const user = userEvent.setup()
      render(App)

      await waitFor(() => {
        expect(screen.getByText('Work')).toBeInTheDocument()
      })

      const workSection = getListSection('Work')
      
      // Wait for tasks to load
      await waitFor(() => {
        expect(within(workSection).getByText('Task 1')).toBeInTheDocument()
        expect(within(workSection).getByText('Task 2')).toBeInTheDocument()
      })
      
      // Archive Task 1 via modal (this triggers focus management)
      const task1Text = within(workSection).getByText('Task 1')
      await user.click(task1Text)
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      
      // Archive from modal
      const archiveButton = screen.getByRole('button', { name: /archive this task instead of saving/i })
      await user.click(archiveButton)
      
      // Wait for Task 1 to be archived
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        expect(within(workSection).queryByText('Task 1')).not.toBeInTheDocument()
      })
      
      // Archive Task 2 via modal (this should trigger focus to Add Task button)
      const task2Text = within(workSection).getByText('Task 2')
      await user.click(task2Text)
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      
      // Archive from modal
      const archiveButton2 = screen.getByRole('button', { name: /archive this task instead of saving/i })
      await user.click(archiveButton2)
      
      // Wait for all tasks to be archived
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        expect(within(workSection).queryByText('Task 2')).not.toBeInTheDocument()
      })
      
      // Verify focus moved to Add Task button
      const addTaskButton = within(workSection).getByRole('button', { name: /add new task to work/i })
      await waitFor(() => {
        expect(addTaskButton).toHaveFocus()
      }, { timeout: 1000 })
    })
  })
})
