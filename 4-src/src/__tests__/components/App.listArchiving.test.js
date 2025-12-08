// @ts-nocheck
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import App from '../../App.svelte'
import { setupTestData } from '../helpers/appTestSetup.js'
import { 
  waitForListSection
} from '../helpers/appTestHelpers.js'

describe('App - List Archiving', () => {
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

  it('shows Archive button in list edit modal', async () => {
    const user = userEvent.setup()
    render(App)
    const workSection = await waitForListSection('Work')
    
    await openListEditModal(user, workSection, 'Work')
    
    // Verify Archive button is visible
    const archiveButton = screen.getByRole('button', { name: /archive this list/i })
    expect(archiveButton).toBeInTheDocument()
  })

  it('shows confirmation prompt when Archive button is clicked', async () => {
    const user = userEvent.setup()
    render(App)
    const workSection = await waitForListSection('Work')
    
    await openListEditModal(user, workSection, 'Work')
    
    // Click Archive button
    const archiveButton = screen.getByRole('button', { name: /archive this list/i })
    await user.click(archiveButton)
    
    // Verify confirmation prompt appears
    await waitFor(() => {
      expect(screen.getByText('Archive List')).toBeInTheDocument()
      expect(screen.getByText(/Archive this list\? This will archive all tasks in the list\./i)).toBeInTheDocument()
    })
    
    // Verify Cancel and Archive buttons are present
    expect(screen.getByRole('button', { name: /cancel archiving/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /confirm archive list/i })).toBeInTheDocument()
  })

  it('cancels archiving when Cancel is clicked in confirmation', async () => {
    const user = userEvent.setup()
    render(App)
    const workSection = await waitForListSection('Work')
    
    await openListEditModal(user, workSection, 'Work')
    
    // Click Archive button
    const archiveButton = screen.getByRole('button', { name: /archive this list/i })
    await user.click(archiveButton)
    
    // Wait for confirmation prompt
    await waitFor(() => {
      expect(screen.getByText('Archive List')).toBeInTheDocument()
    })
    
    // Click Cancel
    const cancelButton = screen.getByRole('button', { name: /cancel archiving/i })
    await user.click(cancelButton)
    
    // Verify modal returns to edit state (Archive button visible again)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /archive this list/i })).toBeInTheDocument()
      expect(screen.queryByText('Archive List')).not.toBeInTheDocument()
    })
    
    // Verify list is still visible (not archived)
    expect(within(workSection).getByText('Work')).toBeInTheDocument()
  })

  it('archives list and all tasks when confirmed', async () => {
    const user = userEvent.setup()
    render(App)
    const workSection = await waitForListSection('Work')
    
    // Verify tasks are visible before archiving
    await waitFor(() => {
      expect(within(workSection).getByText('Task 1')).toBeInTheDocument()
      expect(within(workSection).getByText('Task 2')).toBeInTheDocument()
    })
    
    await openListEditModal(user, workSection, 'Work')
    
    // Click Archive button
    const archiveButton = screen.getByRole('button', { name: /archive this list/i })
    await user.click(archiveButton)
    
    // Wait for confirmation prompt
    await waitFor(() => {
      expect(screen.getByText('Archive List')).toBeInTheDocument()
    })
    
    // Click Confirm Archive
    const confirmButton = screen.getByRole('button', { name: /confirm archive list/i })
    await user.click(confirmButton)
    
    // Verify modal closes
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    
    // Verify list is no longer visible in main view
    await waitFor(() => {
      expect(within(workSection).queryByText('Work')).not.toBeInTheDocument()
    }, { timeout: 3000 })
    
    // Verify tasks are archived (visible in archived view)
    const archivedSection = screen.getByText('Archived Tasks').parentElement
    await waitFor(() => {
      expect(within(archivedSection).getByText('Task 1')).toBeInTheDocument()
      expect(within(archivedSection).getByText('Task 2')).toBeInTheDocument()
    })
  })

})

