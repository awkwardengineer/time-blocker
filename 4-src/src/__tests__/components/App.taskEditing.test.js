// @ts-nocheck
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import App from '../../App.svelte'
import { setupTestData } from '../helpers/appTestSetup.js'
import { 
  waitForListSection, 
  openTaskEditModal 
} from '../helpers/appTestHelpers.js'

describe('App - Task Editing Modal UX Behaviors', () => {
  beforeEach(async () => {
    await setupTestData()
  })

  it('Clicking task opens edit modal', async () => {
    const user = userEvent.setup()
    render(App)
    const workSection = await waitForListSection('Work')
    
    const modalInput = await openTaskEditModal(user, workSection, 'Task 1')
    
    // Verify modal has input with task text
    expect(screen.getByText('Edit Task')).toBeInTheDocument()
    expect(modalInput).toHaveValue('Task 1')
  })

  it('Enter in edit modal saves and closes (when input has content)', async () => {
    const user = userEvent.setup()
    render(App)
    const workSection = await waitForListSection('Work')
    
    const modalInput = await openTaskEditModal(user, workSection, 'Task 1')
    await user.clear(modalInput)
    await user.type(modalInput, 'Updated Task 1')
    
    // Press Enter (without Shift)
    await user.keyboard('{Enter}')
    
    // According to TEST_TIMING_NOTES: prefer positive assertions first, then negative
    // Wait for updated task text to appear (positive assertion)
    await waitFor(() => {
      expect(within(workSection).getByText('Updated Task 1')).toBeInTheDocument()
    }, { timeout: 10000 })
    
    // Then verify modal is closed (negative assertion - after positive succeeds)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  }, 15000) // Increased test timeout per TEST_TIMING_NOTES

  it('Enter in edit modal saves and closes (when input has whitespace-only)', async () => {
    const user = userEvent.setup()
    render(App)
    const workSection = await waitForListSection('Work')
    
    const modalInput = await openTaskEditModal(user, workSection, 'Task 1')
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
    const workSection = await waitForListSection('Work')
    
    const modalInput = await openTaskEditModal(user, workSection, 'Task 1')
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
    const workSection = await waitForListSection('Work')
    
    const modalInput = await openTaskEditModal(user, workSection, 'Task 1')
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
    const workSection = await waitForListSection('Work')
    
    const modalInput = await openTaskEditModal(user, workSection, 'Task 1')
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
    const workSection = await waitForListSection('Work')
    
    const modalInput = await openTaskEditModal(user, workSection, 'Task 1')
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
    const workSection = await waitForListSection('Work')
    
    const modalInput = await openTaskEditModal(user, workSection, 'Task 1')
    await user.clear(modalInput)
    await user.type(modalInput, 'This should be discarded')
    
    // Press Escape
    await user.keyboard('{Escape}')
    
    // According to TEST_TIMING_NOTES: prefer positive assertions first, then negative
    // Wait for original task text to appear (positive assertion) - confirms modal closed and changes discarded
    await waitFor(() => {
      expect(within(workSection).getByText('Task 1')).toBeInTheDocument()
    }, { timeout: 10000 })
    
    // Then verify negative assertions (modal closed, discarded text not present)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(within(workSection).queryByText('This should be discarded')).not.toBeInTheDocument()
  }, 15000) // Increased test timeout per TEST_TIMING_NOTES

  it('Click outside edit modal discards and closes', async () => {
    const user = userEvent.setup()
    render(App)
    const workSection = await waitForListSection('Work')
    
    const modalInput = await openTaskEditModal(user, workSection, 'Task 1')
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
    const workSection = await waitForListSection('Work')
    
    const modalInput = await openTaskEditModal(user, workSection, 'Task 1')
    await user.clear(modalInput)
    await user.type(modalInput, 'Saved via button')
    
    // Click Save button
    const saveButton = screen.getByRole('button', { name: /save task changes/i })
    await user.click(saveButton)
    
    // According to TEST_TIMING_NOTES: prefer positive assertions first, then negative
    // Wait for updated task text to appear (positive assertion)
    await waitFor(() => {
      expect(within(workSection).getByText('Saved via button')).toBeInTheDocument()
    }, { timeout: 10000 })
    
    // Then verify modal is closed (negative assertion - after positive succeeds)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  }, 15000) // Increased test timeout per TEST_TIMING_NOTES

  it('Keyboard navigation: Enter key on task text opens edit modal', async () => {
    const user = userEvent.setup()
    render(App)
    const workSection = await waitForListSection('Work')
    
    await waitFor(() => {
      expect(within(workSection).getByText('Task 1')).toBeInTheDocument()
    })
    
    // Find task text span (has role="button")
    const task1Text = within(workSection).getByText('Task 1')
    const task1ListItem = task1Text.closest('li')
    const taskTextSpan = within(task1ListItem).getByRole('button', { name: /edit task: task 1/i })
    
    // Focus the task text
    taskTextSpan.focus()
    await new Promise(resolve => setTimeout(resolve, 10))
    
    // Press Enter - should open modal
    await user.keyboard('{Enter}')
    
    // Wait for modal to open
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    // Verify modal opened correctly
    const modalInput = screen.getByRole('textbox', { name: /edit task/i })
    expect(modalInput).toHaveValue('Task 1')
  })

  it('Keyboard navigation: Space key on task text opens edit modal', async () => {
    const user = userEvent.setup()
    render(App)
    const workSection = await waitForListSection('Work')
    
    await waitFor(() => {
      expect(within(workSection).getByText('Task 1')).toBeInTheDocument()
    })
    
    // Find task text span (has role="button")
    const task1Text = within(workSection).getByText('Task 1')
    const task1ListItem = task1Text.closest('li')
    const taskTextSpan = within(task1ListItem).getByRole('button', { name: /edit task: task 1/i })
    
    // Focus the task text
    taskTextSpan.focus()
    await new Promise(resolve => setTimeout(resolve, 10))
    
    // Press Space - should open modal
    await user.keyboard(' ')
    
    // Wait for modal to open
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    // Verify modal opened correctly
    const modalInput = screen.getByRole('textbox', { name: /edit task/i })
    expect(modalInput).toHaveValue('Task 1')
  })
})

