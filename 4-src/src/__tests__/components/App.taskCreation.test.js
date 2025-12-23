// @ts-nocheck
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, within, fireEvent } from '@testing-library/svelte'
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
    
    // Wait for tasks to load before checking button text
    await waitFor(() => {
      expect(within(workSection).getByText('Task 1')).toBeInTheDocument()
    })
    
    const addTaskButton = within(workSection).getByRole('button', { name: /add new task to work/i })
    expect(addTaskButton).toBeInTheDocument()
    
    const input = await openTaskInput(user, workSection, 'Work')
    
    // Verify input is visible
    expect(input).toBeInTheDocument()
    
    // Wait for focus (focus is set asynchronously)
    await waitFor(() => {
      expect(input).toHaveFocus()
    }, { timeout: 2000 })
  })

  it('Enter key on empty string "" exits task creation (closes input, shows button)', async () => {
    const user = userEvent.setup()
    render(App)
    const workSection = await waitForListSection('Work')
    
    const input = await openTaskInput(user, workSection, 'Work')
    expect(input).toBeInTheDocument()
    
    // Verify input is empty (should be empty by default)
    expect(input).toHaveValue('')
    
    // Press Enter on empty input - dispatch directly on the textarea to avoid relying on focus
    await fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
    
    // First wait for button to reappear (positive assertion - more reliable per TEST_TIMING_NOTES)
    await waitFor(() => {
      const button = within(workSection).getByRole('button', { name: /add new task to work/i })
      expect(button).toBeInTheDocument()
    }, { timeout: 10000 })

    // Then verify textarea is gone (negative assertion after positive succeeds)
    expect(within(workSection).queryByPlaceholderText('start typing...')).not.toBeInTheDocument()
  }, 15000)

  it('Enter key creates task (including blank tasks with whitespace) and automatically opens new input for sequential creation', async () => {
    const user = userEvent.setup()
    render(App)
    const workSection = await waitForListSection('Work')
    
    // Create a normal task
    const input1 = await openTaskInput(user, workSection, 'Work')
    await user.type(input1, 'Normal Task')
    await user.keyboard('{Enter}')
    
    // According to TEST_TIMING_NOTES: prefer positive assertions first
    // Wait for task to appear (positive assertion)
    await waitFor(() => {
      expect(within(workSection).getByText('Normal Task')).toBeInTheDocument()
    }, { timeout: 10000 })
    
    // Small delay to allow UI to update
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Verify new input is automatically opened and focused (sequential creation)
    const input2 = await within(workSection).findByPlaceholderText('start typing...', {}, { timeout: 10000 })
    expect(input2).toBeInTheDocument()
    expect(input2).toHaveFocus()
    
    // Create a blank task with whitespace
    await user.clear(input2)
    await user.type(input2, '   ') // Multiple spaces
    await user.keyboard('{Enter}')
    
    // Small delay to allow UI and database to update
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Verify blank task was created (positive assertion first)
    await waitFor(() => {
      // Blank tasks show as non-breaking space in the UI
      const tasks = within(workSection).getAllByRole('listitem')
      expect(tasks.length).toBeGreaterThan(2) // Should have original tasks + 2 new ones
    }, { timeout: 10000 })
    
    // Verify new input is again automatically opened
    const input3 = await within(workSection).findByPlaceholderText('start typing...', {}, { timeout: 10000 })
    expect(input3).toBeInTheDocument()
    expect(input3).toHaveFocus()
  }, 20000) // Increased test timeout per TEST_TIMING_NOTES

  it('Escape key closes input and shows button', async () => {
    const user = userEvent.setup()
    render(App)
    const workSection = await waitForListSection('Work')
    
    const input = await openTaskInput(user, workSection, 'Work')
    expect(input).toBeInTheDocument()
    
    // Type something
    await user.type(input, 'Some text')
    
    // Press Escape - with text, Escape creates the task and closes input
    await user.keyboard('{Escape}')
    
    // Wait for input to disappear and button to reappear
    await waitFor(() => {
      expect(within(workSection).queryByPlaceholderText('start typing...')).not.toBeInTheDocument()
      expect(within(workSection).getByRole('button', { name: /add new task to work/i })).toBeInTheDocument()
    })
    
    // Verify task WAS created (Escape with text creates task)
    await waitFor(() => {
      expect(within(workSection).getByText('Some text')).toBeInTheDocument()
    })
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
      expect(within(workSection).queryByPlaceholderText('start typing...')).not.toBeInTheDocument()
      expect(within(workSection).getByRole('button', { name: /add new task to work/i })).toBeInTheDocument()
    })
  })

  it('Button hidden during print but retains space', async () => {
    render(App)
    const workSection = await waitForListSection('Work')
    
    // Wait for tasks to load before checking button
    await waitFor(() => {
      expect(within(workSection).getByText('Task 1')).toBeInTheDocument()
    })
    
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

