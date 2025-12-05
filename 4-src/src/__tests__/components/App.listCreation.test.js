// @ts-nocheck
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import App from '../../App.svelte'
import { setupTestData } from '../helpers/appTestSetup.js'
import { 
  waitForListSection
} from '../helpers/appTestHelpers.js'

describe('App - List Creation Modal UX Behaviors', () => {
  beforeEach(async () => {
    await setupTestData()
  })

  // Helper: Open list create modal by clicking Create List button
  async function openListCreateModal(user) {
    const createButton = screen.getByRole('button', { name: /create new list/i })
    await user.click(createButton)
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
    return screen.getByRole('textbox', { name: /enter list name/i })
  }

  it('Clicking Create List button opens modal', async () => {
    const user = userEvent.setup()
    render(App)
    
    const modalInput = await openListCreateModal(user)
    
    // Verify modal has input
    expect(screen.getByText('Create New List')).toBeInTheDocument()
    expect(modalInput).toBeInTheDocument()
    expect(modalInput).toHaveValue('')
  })

  it('Enter in modal creates named list and closes', async () => {
    const user = userEvent.setup()
    render(App)
    
    const modalInput = await openListCreateModal(user)
    await user.type(modalInput, 'New List Name')
    
    // Press Enter
    await user.keyboard('{Enter}')
    
    // Wait for modal to close
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    
    // Verify list was created
    await waitFor(() => {
      expect(screen.getByText('New List Name')).toBeInTheDocument()
    })
  })

  it('Enter in modal with empty input creates unnamed list and closes', async () => {
    const user = userEvent.setup()
    render(App)
    
    const modalInput = await openListCreateModal(user)
    // Don't type anything - leave it empty
    
    // Press Enter
    await user.keyboard('{Enter}')
    
    // Wait for modal to close
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    
    // Verify unnamed list was created (shows as "(Unnamed)")
    await waitFor(() => {
      expect(screen.getByText('(Unnamed)')).toBeInTheDocument()
    })
  })

  it('Create button creates named list and closes', async () => {
    const user = userEvent.setup()
    render(App)
    
    const modalInput = await openListCreateModal(user)
    await user.type(modalInput, 'Created via button')
    
    // Click Create button
    const createButton = screen.getByRole('button', { name: /create list/i })
    await user.click(createButton)
    
    // Wait for modal to close
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    
    // Verify list was created
    await waitFor(() => {
      expect(screen.getByText('Created via button')).toBeInTheDocument()
    })
  })

  it('Create button with empty input creates unnamed list and closes', async () => {
    const user = userEvent.setup()
    render(App)
    
    const modalInput = await openListCreateModal(user)
    // Leave input empty
    
    // Click Create button
    const createButton = screen.getByRole('button', { name: /create list/i })
    await user.click(createButton)
    
    // Wait for modal to close
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    
    // Verify unnamed list was created
    await waitFor(() => {
      expect(screen.getByText('(Unnamed)')).toBeInTheDocument()
    })
  })

  it('Escape in modal discards and closes', async () => {
    const user = userEvent.setup()
    render(App)
    
    const modalInput = await openListCreateModal(user)
    await user.type(modalInput, 'This should be discarded')
    
    // Press Escape
    await user.keyboard('{Escape}')
    
    // Wait for modal to close
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    
    // Verify list was NOT created
    expect(screen.queryByText('This should be discarded')).not.toBeInTheDocument()
  })

  it('Click outside modal discards and closes', async () => {
    const user = userEvent.setup()
    render(App)
    
    const modalInput = await openListCreateModal(user)
    await user.type(modalInput, 'This should be discarded')
    
    // Click on backdrop
    const backdrop = screen.getByRole('dialog')
    await user.click(backdrop)
    
    // Wait for modal to close
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    
    // Verify list was NOT created
    expect(screen.queryByText('This should be discarded')).not.toBeInTheDocument()
  })

  it('List name trims whitespace when creating', async () => {
    const user = userEvent.setup()
    render(App)
    
    const modalInput = await openListCreateModal(user)
    await user.type(modalInput, '  Trimmed List  ')
    
    // Press Enter
    await user.keyboard('{Enter}')
    
    // Wait for modal to close
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    
    // Verify list name was trimmed
    await waitFor(() => {
      expect(screen.getByText('Trimmed List')).toBeInTheDocument()
    })
    expect(screen.queryByText('  Trimmed List  ')).not.toBeInTheDocument()
  })

  it('Whitespace-only input creates unnamed list', async () => {
    const user = userEvent.setup()
    render(App)
    
    const modalInput = await openListCreateModal(user)
    await user.type(modalInput, '   ') // Only spaces
    
    // Press Enter
    await user.keyboard('{Enter}')
    
    // Wait for modal to close
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    
    // Verify unnamed list was created (whitespace-only becomes unnamed)
    await waitFor(() => {
      expect(screen.getByText('(Unnamed)')).toBeInTheDocument()
    })
  })

  it('New list appears immediately in UI', async () => {
    const user = userEvent.setup()
    render(App)
    
    // Count initial lists by counting list sections (data-list-id attributes)
    await waitFor(() => {
      const listSections = document.querySelectorAll('[data-list-id]')
      expect(listSections.length).toBeGreaterThan(0)
    })
    const initialListSections = document.querySelectorAll('[data-list-id]')
    const initialCount = initialListSections.length
    
    const modalInput = await openListCreateModal(user)
    await user.type(modalInput, 'Immediate List')
    await user.keyboard('{Enter}')
    
    // Wait for modal to close and list to appear
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      const updatedListSections = document.querySelectorAll('[data-list-id]')
      expect(updatedListSections.length).toBe(initialCount + 1)
    })
    
    // Verify the new list is visible
    expect(screen.getByText('Immediate List')).toBeInTheDocument()
  })

  it('Multiple lists can be created in sequence', async () => {
    const user = userEvent.setup()
    render(App)
    
    // Create first list
    let modalInput = await openListCreateModal(user)
    await user.type(modalInput, 'First New List')
    await user.keyboard('{Enter}')
    
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    
    // Create second list
    modalInput = await openListCreateModal(user)
    await user.type(modalInput, 'Second New List')
    await user.keyboard('{Enter}')
    
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    
    // Verify both lists exist
    await waitFor(() => {
      expect(screen.getByText('First New List')).toBeInTheDocument()
      expect(screen.getByText('Second New List')).toBeInTheDocument()
    })
  })
})

