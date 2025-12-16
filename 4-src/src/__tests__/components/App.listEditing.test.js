// @ts-nocheck
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import App from '../../App.svelte'
import { setupTestData } from '../helpers/appTestSetup.js'
import { 
  waitForListSection
} from '../helpers/appTestHelpers.js'

describe('App - List Editing Modal UX Behaviors', () => {
  beforeEach(async () => {
    await setupTestData()
  })

  // Helper: Open list edit modal by clicking on list name
  async function openListEditModal(user, listSection, listName) {
    await waitFor(() => {
      expect(within(listSection).getByText(listName)).toBeInTheDocument()
    })
    // List name is now a button (h2 with role="button")
    const listHeading = within(listSection).getByRole('button', { name: new RegExp(`Rename list: ${listName}`, 'i') })
    await user.click(listHeading)
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
    return screen.getByRole('textbox', { name: /edit list name/i })
  }

  it('Clicking list name opens edit modal', async () => {
    const user = userEvent.setup()
    render(App)
    const workSection = await waitForListSection('Work')
    
    const modalInput = await openListEditModal(user, workSection, 'Work')
    
    // Verify modal has input with list name
    expect(screen.getByText('Rename List')).toBeInTheDocument()
    expect(modalInput).toHaveValue('Work')
  })

  it('Enter in edit modal saves and closes (when input has content)', async () => {
    const user = userEvent.setup()
    render(App)
    const workSection = await waitForListSection('Work')
    
    const modalInput = await openListEditModal(user, workSection, 'Work')
    await user.clear(modalInput)
    await user.type(modalInput, 'Updated Work')
    
    // Press Enter (without Shift)
    await user.keyboard('{Enter}')
    
    // Wait for modal to close
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    
    // Verify list name was updated
    await waitFor(() => {
      expect(within(workSection).getByText('Updated Work')).toBeInTheDocument()
    })
  })

  it('Enter in edit modal with empty input prevents saving and shows validation', async () => {
    const user = userEvent.setup()
    render(App)
    const workSection = await waitForListSection('Work')
    
    const modalInput = await openListEditModal(user, workSection, 'Work')
    await user.clear(modalInput)
    
    // Press Enter (without Shift)
    await user.keyboard('{Enter}')
    
    // Modal should still be open
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    
    // Validation message should appear
    expect(screen.getByText('List name cannot be empty.')).toBeInTheDocument()
    
    // Save button should be disabled
    const saveButton = screen.getByRole('button', { name: /save disabled/i })
    expect(saveButton).toBeDisabled()
    
    // List name should not be updated
    expect(within(workSection).getByText('Work')).toBeInTheDocument()
  })

  it('Enter in edit modal with whitespace-only prevents saving and shows validation', async () => {
    const user = userEvent.setup()
    render(App)
    const workSection = await waitForListSection('Work')
    
    const modalInput = await openListEditModal(user, workSection, 'Work')
    await user.clear(modalInput)
    await user.type(modalInput, '   ') // Multiple spaces
    
    // Press Enter (without Shift)
    await user.keyboard('{Enter}')
    
    // Modal should still be open
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    
    // Validation message should appear
    expect(screen.getByText('List name cannot be empty.')).toBeInTheDocument()
    
    // List name should not be updated
    expect(within(workSection).getByText('Work')).toBeInTheDocument()
  })

  it('Escape in edit modal discards and closes', async () => {
    const user = userEvent.setup()
    render(App)
    const workSection = await waitForListSection('Work')
    
    const modalInput = await openListEditModal(user, workSection, 'Work')
    await user.clear(modalInput)
    await user.type(modalInput, 'This should be discarded')
    
    // Press Escape
    await user.keyboard('{Escape}')
    
    // Wait for modal to close
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    
    // Verify list name was NOT updated
    expect(within(workSection).getByText('Work')).toBeInTheDocument()
    expect(within(workSection).queryByText('This should be discarded')).not.toBeInTheDocument()
  })

  it('Click outside edit modal discards and closes', async () => {
    const user = userEvent.setup()
    render(App)
    const workSection = await waitForListSection('Work')
    
    const modalInput = await openListEditModal(user, workSection, 'Work')
    await user.clear(modalInput)
    await user.type(modalInput, 'This should be discarded')
    
    // Click on backdrop (outside modal content)
    const backdrop = screen.getByRole('dialog')
    await user.click(backdrop)
    
    // Wait for modal to close
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    
    // Verify list name was NOT updated
    expect(within(workSection).getByText('Work')).toBeInTheDocument()
    expect(within(workSection).queryByText('This should be discarded')).not.toBeInTheDocument()
  })

  it('Save button saves and closes modal (when input has content)', async () => {
    const user = userEvent.setup()
    render(App)
    const workSection = await waitForListSection('Work')
    
    const modalInput = await openListEditModal(user, workSection, 'Work')
    await user.clear(modalInput)
    await user.type(modalInput, 'Saved via button')
    
    // Click Save button
    const saveButton = screen.getByRole('button', { name: /save list name changes/i })
    await user.click(saveButton)
    
    // Wait for modal to close
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    
    // Verify list name was updated
    await waitFor(() => {
      expect(within(workSection).getByText('Saved via button')).toBeInTheDocument()
    })
  })

  it('Save button with empty input prevents saving and shows validation', async () => {
    const user = userEvent.setup()
    render(App)
    const workSection = await waitForListSection('Work')
    
    const modalInput = await openListEditModal(user, workSection, 'Work')
    await user.clear(modalInput)
    
    // Click Save button
    const saveButton = screen.getByRole('button', { name: /save list name changes/i })
    await user.click(saveButton)
    
    // Modal should still be open
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    
    // Validation message should appear
    expect(screen.getByText('List name cannot be empty.')).toBeInTheDocument()
    
    // List name should not be updated
    expect(within(workSection).getByText('Work')).toBeInTheDocument()
  })

  it('List name trims whitespace when saving', async () => {
    const user = userEvent.setup()
    render(App)
    const workSection = await waitForListSection('Work')
    
    const modalInput = await openListEditModal(user, workSection, 'Work')
    await user.clear(modalInput)
    await user.type(modalInput, '  Trimmed Name  ')
    
    // Press Enter
    await user.keyboard('{Enter}')
    
    // Wait for modal to close
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    
    // Verify list name was trimmed
    await waitFor(() => {
      expect(within(workSection).getByText('Trimmed Name')).toBeInTheDocument()
    })
  })

  it('Keyboard navigation: Enter key on list name opens modal', async () => {
    const user = userEvent.setup()
    render(App)
    const workSection = await waitForListSection('Work')
    
    // List name is now a button (h2 with role="button")
    const listHeading = within(workSection).getByRole('button', { name: /Rename list: Work/i })
    await user.click(listHeading) // Click to ensure it's focused and interactive
    listHeading.focus()
    
    // Small delay to ensure focus is set
    await new Promise(resolve => setTimeout(resolve, 10))
    
    // Press Enter
    await user.keyboard('{Enter}')
    
    // Wait for modal to open with longer timeout
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    const modalInput = screen.getByRole('textbox', { name: /edit list name/i })
    expect(modalInput).toHaveValue('Work')
  })

  it('Keyboard navigation: Space key on list name opens modal', async () => {
    const user = userEvent.setup()
    render(App)
    const workSection = await waitForListSection('Work')
    
    // List name is now a button (h2 with role="button")
    const listHeading = within(workSection).getByRole('button', { name: /Rename list: Work/i })
    await user.click(listHeading) // Click to ensure it's focused and interactive
    listHeading.focus()
    
    // Small delay to ensure focus is set
    await new Promise(resolve => setTimeout(resolve, 10))
    
    // Press Space
    await user.keyboard(' ')
    
    // Wait for modal to open with longer timeout
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    const modalInput = screen.getByRole('textbox', { name: /edit list name/i })
    expect(modalInput).toHaveValue('Work')
  })

  it('Keyboard navigation: Enter/Space on focused list name opens modal', async () => {
    const user = userEvent.setup()
    render(App)
    const workSection = await waitForListSection('Work')
    
    // Get the list heading
    const listHeading = within(workSection).getByRole('button', { name: /Rename list: Work/i })
    
    // Focus the list heading directly (simulating keyboard navigation)
    listHeading.focus()
    await new Promise(resolve => setTimeout(resolve, 10))
    
    // Press Enter - should open modal
    await user.keyboard('{Enter}')
    
    // Wait for modal to open
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    // Verify modal opened correctly
    const modalInput = screen.getByRole('textbox', { name: /edit list name/i })
    expect(modalInput).toHaveValue('Work')
    
    // Close modal for next test
    await user.keyboard('{Escape}')
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    
    // Focus again and test Space key
    listHeading.focus()
    await new Promise(resolve => setTimeout(resolve, 10))
    
    // Press Space - should open modal
    await user.keyboard(' ')
    
    // Wait for modal to open
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    // Verify modal opened correctly
    const modalInput2 = screen.getByRole('textbox', { name: /edit list name/i })
    expect(modalInput2).toHaveValue('Work')
  })
})

