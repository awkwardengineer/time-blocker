// @ts-nocheck
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import App from '../../App.svelte'
import { setupTestData } from '../helpers/appTestSetup.js'
import { 
  waitForListSection
} from '../helpers/appTestHelpers.js'

describe('App - List Creation (Happy Path - Inline Input)', () => {
  beforeEach(async () => {
    await setupTestData()
  })

  // Helper: Activate create list input by clicking Create List button
  async function activateCreateListInput(user) {
    // Wait for lists to load and button to appear
    const createButton = await waitFor(() => {
      return screen.getByRole('button', { name: /create new list/i })
    })
    await user.click(createButton)
    
    // Wait for input to appear
    await waitFor(() => {
      const input = screen.getByRole('textbox', { name: /enter list name/i })
      expect(input).toBeInTheDocument()
    })
    
    return screen.getByRole('textbox', { name: /enter list name/i })
  }

  it('Clicking Create List button reveals inline input', async () => {
    const user = userEvent.setup()
    render(App)
    
    const input = await activateCreateListInput(user)
    
    // Verify input is visible and empty
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue('')
    // Verify no modal/dialog
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('Enter in input creates named list and closes input', async () => {
    const user = userEvent.setup()
    render(App)
    
    const input = await activateCreateListInput(user)
    await user.type(input, 'New List Name')
    
    // Press Enter
    await user.keyboard('{Enter}')
    
    // Wait for input to close
    await waitFor(() => {
      expect(screen.queryByRole('textbox', { name: /enter list name/i })).not.toBeInTheDocument()
    })
    
    // Verify list was created
    await waitFor(() => {
      expect(screen.getByText('New List Name')).toBeInTheDocument()
    })
    
    // Verify Create List button appears again
    expect(screen.getByRole('button', { name: /create new list/i })).toBeInTheDocument()
  })

  it('Empty input does not create list', async () => {
    const user = userEvent.setup()
    render(App)
    
    const input = await activateCreateListInput(user)
    // Don't type anything - leave it empty
    
    // Press Enter
    await user.keyboard('{Enter}')
    
    // Wait for input to close
    await waitFor(() => {
      expect(screen.queryByRole('textbox', { name: /enter list name/i })).not.toBeInTheDocument()
    })
    
    // Verify no new list was created (count should be same)
    const listSections = document.querySelectorAll('[data-list-id]')
    const initialCount = listSections.length
    
    // Wait a bit to ensure no list appears
    await new Promise(resolve => setTimeout(resolve, 100))
    const finalListSections = document.querySelectorAll('[data-list-id]')
    expect(finalListSections.length).toBe(initialCount)
  })

  it('Whitespace-only input does not create list', async () => {
    const user = userEvent.setup()
    render(App)
    
    const input = await activateCreateListInput(user)
    await user.type(input, '   ') // Only spaces
    
    // Press Enter
    await user.keyboard('{Enter}')
    
    // Wait for input to close
    await waitFor(() => {
      expect(screen.queryByRole('textbox', { name: /enter list name/i })).not.toBeInTheDocument()
    })
    
    // Verify no new list was created
    const listSections = document.querySelectorAll('[data-list-id]')
    const initialCount = listSections.length
    
    await new Promise(resolve => setTimeout(resolve, 100))
    const finalListSections = document.querySelectorAll('[data-list-id]')
    expect(finalListSections.length).toBe(initialCount)
  })

  it('Save button creates named list', async () => {
    const user = userEvent.setup()
    render(App)
    
    const input = await activateCreateListInput(user)
    await user.type(input, 'Created via Save button')
    
    // Click Save button
    const saveButton = screen.getByRole('button', { name: /create list/i })
    await user.click(saveButton)
    
    // Wait for input to close
    await waitFor(() => {
      expect(screen.queryByRole('textbox', { name: /enter list name/i })).not.toBeInTheDocument()
    })
    
    // Verify list was created
    await waitFor(() => {
      expect(screen.getByText('Created via Save button')).toBeInTheDocument()
    })
  })

  it('Escape key cancels and closes input', async () => {
    const user = userEvent.setup()
    render(App)
    
    const input = await activateCreateListInput(user)
    await user.type(input, 'This should be discarded')
    
    // Press Escape
    await user.keyboard('{Escape}')
    
    // Wait for input to close
    await waitFor(() => {
      expect(screen.queryByRole('textbox', { name: /enter list name/i })).not.toBeInTheDocument()
    })
    
    // Verify list was NOT created
    expect(screen.queryByText('This should be discarded')).not.toBeInTheDocument()
    
    // Verify Create List button appears again
    expect(screen.getByRole('button', { name: /create new list/i })).toBeInTheDocument()
  })

  it('Click outside input (when empty) cancels and closes', async () => {
    const user = userEvent.setup()
    render(App)
    
    const input = await activateCreateListInput(user)
    // Don't type anything
    
    // Click outside (on the main container)
    const main = screen.getByRole('main')
    await user.click(main)
    
    // Wait for input to close
    await waitFor(() => {
      expect(screen.queryByRole('textbox', { name: /enter list name/i })).not.toBeInTheDocument()
    })
    
    // Verify Create List button appears again
    expect(screen.getByRole('button', { name: /create new list/i })).toBeInTheDocument()
  })

  it('List name trims whitespace when creating', async () => {
    const user = userEvent.setup()
    render(App)
    
    const input = await activateCreateListInput(user)
    await user.type(input, '  Trimmed List  ')
    
    // Press Enter
    await user.keyboard('{Enter}')
    
    // Wait for input to close
    await waitFor(() => {
      expect(screen.queryByRole('textbox', { name: /enter list name/i })).not.toBeInTheDocument()
    })
    
    // Verify list name was trimmed
    await waitFor(() => {
      expect(screen.getByText('Trimmed List')).toBeInTheDocument()
    })
    expect(screen.queryByText('  Trimmed List  ')).not.toBeInTheDocument()
  })

  it('New list appears immediately in UI', async () => {
    const user = userEvent.setup()
    render(App)
    
    // Count initial lists
    await waitFor(() => {
      const listSections = document.querySelectorAll('[data-list-id]')
      expect(listSections.length).toBeGreaterThan(0)
    })
    const initialListSections = document.querySelectorAll('[data-list-id]')
    const initialCount = initialListSections.length
    
    const input = await activateCreateListInput(user)
    await user.type(input, 'Immediate List')
    await user.keyboard('{Enter}')
    
    // Wait for list to appear
    await waitFor(() => {
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
    let input = await activateCreateListInput(user)
    await user.type(input, 'First New List')
    await user.keyboard('{Enter}')
    
    // Wait for first list to be created and input to close
    await waitFor(() => {
      expect(screen.getByText('First New List')).toBeInTheDocument()
      expect(screen.queryByRole('textbox', { name: /enter list name/i })).not.toBeInTheDocument()
    })
    
    // Create second list
    input = await activateCreateListInput(user)
    await user.type(input, 'Second New List')
    await user.keyboard('{Enter}')
    
    // Wait for second list to be created and input to close
    await waitFor(() => {
      expect(screen.getByText('Second New List')).toBeInTheDocument()
      expect(screen.queryByRole('textbox', { name: /enter list name/i })).not.toBeInTheDocument()
    })
    
    // Verify both lists exist
    expect(screen.getByText('First New List')).toBeInTheDocument()
    expect(screen.getByText('Second New List')).toBeInTheDocument()
  })

  it('Focus moves to first task input after creating list', async () => {
    const user = userEvent.setup()
    render(App)
    
    const input = await activateCreateListInput(user)
    await user.type(input, 'List for Focus Test')
    await user.keyboard('{Enter}')
    
    // Wait for list to be created
    await waitFor(() => {
      expect(screen.getByText('List for Focus Test')).toBeInTheDocument()
    })
    
    // Wait for task input to appear and verify it has focus
    // The focus management happens via setTimeout in App.svelte, wait for focus to move
    await waitFor(() => {
      const listSection = Array.from(document.querySelectorAll('[data-list-id]')).find(section => {
        const h2 = section.querySelector('h2')
        return h2 && h2.textContent === 'List for Focus Test'
      })
      expect(listSection).toBeDefined()
      const taskInput = listSection?.querySelector('textarea[placeholder="Add new task..."]')
      expect(taskInput).toBeInTheDocument()
      expect(taskInput).toHaveFocus()
    })
  })
})

