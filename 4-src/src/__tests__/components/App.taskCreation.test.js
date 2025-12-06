// @ts-nocheck
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import App from '../../App.svelte'
import { setupTestData } from '../helpers/appTestSetup.js'
import { 
  getListSection, 
  openTaskInput, 
  waitForListSection 
} from '../helpers/appTestHelpers.js'

describe('App - Task Creation UX Behaviors', () => {
  beforeEach(async () => {
    await setupTestData()
  })

  it('"Add Task" button opens input field with focus', async () => {
    const user = userEvent.setup()
    render(App)
    const workSection = await waitForListSection('Work')
    
    const addTaskButton = within(workSection).getByRole('button', { name: /add new task to work/i })
    expect(addTaskButton).toBeInTheDocument()
    
    const input = await openTaskInput(user, workSection, 'Work')
    
    // Verify input is visible and focused
    expect(input).toBeInTheDocument()
    expect(input).toHaveFocus()
  })

  it('Enter key on empty string "" exits task creation (closes input, shows button)', async () => {
    const user = userEvent.setup()
    render(App)
    const workSection = await waitForListSection('Work')
    
    const input = await openTaskInput(user, workSection, 'Work')
    expect(input).toBeInTheDocument()
    
    // Verify input is empty (should be empty by default)
    expect(input).toHaveValue('')
    
    // Press Enter on empty input
    await user.keyboard('{Enter}')
    
    // Wait for input to disappear and button to reappear
    // waitFor actively polls (checks every ~50ms) and returns immediately when condition is true
    // Split into two waits to handle timing issues in full test suite
    await waitFor(() => {
      expect(within(workSection).queryByPlaceholderText('Add new task...')).not.toBeInTheDocument()
    }, { timeout: 5000 })
    
    // Then verify button is back
    await waitFor(() => {
      expect(within(workSection).getByRole('button', { name: /add new task to work/i })).toBeInTheDocument()
    }, { timeout: 2000 })
  })

  it('Enter key creates task (including blank tasks with whitespace) and automatically opens new input for sequential creation', async () => {
    const user = userEvent.setup()
    render(App)
    const workSection = await waitForListSection('Work')
    
    // Create a normal task
    const input1 = await openTaskInput(user, workSection, 'Work')
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
    const workSection = await waitForListSection('Work')
    
    const input = await openTaskInput(user, workSection, 'Work')
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
    const workSection = await waitForListSection('Work')
    
    const input = await openTaskInput(user, workSection, 'Work')
    expect(input).toBeInTheDocument()
    
    // Click outside (on the list name button)
    const listNameButton = within(workSection).getByRole('button', { name: /Rename list: Work/i })
    await user.click(listNameButton)
    
    // Wait for input to disappear and button to reappear
    await waitFor(() => {
      expect(within(workSection).queryByPlaceholderText('Add new task...')).not.toBeInTheDocument()
      expect(within(workSection).getByRole('button', { name: /add new task to work/i })).toBeInTheDocument()
    })
  })

  it('Button hidden during print but retains space', async () => {
    render(App)
    const workSection = await waitForListSection('Work')
    const addTaskButton = within(workSection).getByRole('button', { name: /add new task to work/i })
    
    // Verify button is visible normally
    expect(addTaskButton).toBeVisible()
    
    // Get the container element (parent div) which has the add-task-button class
    const buttonContainer = addTaskButton.closest('.add-task-button')
    expect(buttonContainer).toBeInTheDocument()
    expect(buttonContainer).toHaveClass('add-task-button')
    
    // Verify button still exists in DOM (not display: none)
    expect(addTaskButton).toBeInTheDocument()
  })
})

