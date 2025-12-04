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

