// @ts-nocheck
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import App from '../../App.svelte'
import db from '../../lib/db.js'
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
    // Wait for lists to load first (button only appears when lists.length > 0)
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })
    // Wait for lists to appear
    await waitFor(() => {
      const listSections = document.querySelectorAll('[data-list-id]')
      expect(listSections.length).toBeGreaterThan(0)
    })
    // Wait for lists to load and button to appear (get first button since there's one per column)
    const createButton = await waitFor(() => {
      const buttons = screen.getAllByRole('button', { name: /create new list/i })
      expect(buttons.length).toBeGreaterThan(0)
      return buttons[0] // Use first button (first column)
    }, { timeout: 10000 })
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

  it('Enter in input creates named list and keeps input open', async () => {
    const user = userEvent.setup()
    render(App)
    
    const input = await activateCreateListInput(user)
    await user.type(input, 'New List Name')
    
    // Press Enter
    await user.keyboard('{Enter}')
    
    // Wait for list to be created
    await waitFor(() => {
      expect(screen.getByText('New List Name')).toBeInTheDocument()
    }, { timeout: 5000 })
    
    // Verify input stays open and is cleared
    await waitFor(() => {
      const createListInput = screen.getByRole('textbox', { name: /enter list name/i })
      expect(createListInput).toBeInTheDocument()
      expect(createListInput).toHaveValue('')
    }, { timeout: 5000 })
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
    
    // Verify Create List button appears again (check first button)
    const buttons = screen.getAllByRole('button', { name: /create new list/i })
    expect(buttons.length).toBeGreaterThan(0)
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
    
    // Verify Create List button appears again (check first button)
    const buttons = screen.getAllByRole('button', { name: /create new list/i })
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('List name trims whitespace when creating', async () => {
    const user = userEvent.setup()
    render(App)
    
    const input = await activateCreateListInput(user)
    await user.type(input, '  Trimmed List  ')
    
    // Press Enter
    await user.keyboard('{Enter}')
    
    // Wait for list to be created
    await waitFor(() => {
      expect(screen.getByText('Trimmed List')).toBeInTheDocument()
    })
    
    // Verify list name was trimmed (not the untrimmed version)
    expect(screen.queryByText('  Trimmed List  ')).not.toBeInTheDocument()
    
    // Verify input stays open and is cleared (new behavior)
    await waitFor(() => {
      const createListInput = screen.getByRole('textbox', { name: /enter list name/i })
      expect(createListInput).toBeInTheDocument()
      expect(createListInput).toHaveValue('')
    }, { timeout: 5000 })
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

  it('Multiple lists can be created in sequence without reactivating input', async () => {
    const user = userEvent.setup()
    render(App)
    
    // Create first list
    let input = await activateCreateListInput(user)
    await user.type(input, 'First New List')
    await user.keyboard('{Enter}')
    
    // Wait for first list to be created
    await waitFor(() => {
      expect(screen.getByText('First New List')).toBeInTheDocument()
    }, { timeout: 10000 })
    
    // Verify input stays open and is cleared
    await waitFor(() => {
      input = screen.getByRole('textbox', { name: /enter list name/i })
      expect(input).toBeInTheDocument()
      expect(input).toHaveValue('')
    }, { timeout: 5000 })
    
    // Create second list using the same input (no need to reactivate)
    await user.type(input, 'Second New List')
    await user.keyboard('{Enter}')
    
    // Wait for second list to be created
    await waitFor(() => {
      expect(screen.getByText('Second New List')).toBeInTheDocument()
    }, { timeout: 10000 })
    
    // Verify input is still open and cleared
    await waitFor(() => {
      input = screen.getByRole('textbox', { name: /enter list name/i })
      expect(input).toBeInTheDocument()
      expect(input).toHaveValue('')
    }, { timeout: 5000 })
    
    // Verify both lists exist
    expect(screen.getByText('First New List')).toBeInTheDocument()
    expect(screen.getByText('Second New List')).toBeInTheDocument()
  }, 20000)

  it('Focus moves back to create list input after creating list', async () => {
    const user = userEvent.setup()
    render(App)
    
    const input = await activateCreateListInput(user)
    await user.type(input, 'List for Focus Test')
    await user.keyboard('{Enter}')
    
    // Wait for list to be created
    await waitFor(() => {
      expect(screen.getByText('List for Focus Test')).toBeInTheDocument()
    })
    
    // Wait for create list input to be refocused
    // The focus management happens via setTimeout in App.svelte, wait for focus to move
    await waitFor(() => {
      const createListInput = screen.getByRole('textbox', { name: /enter list name/i })
      expect(createListInput).toBeInTheDocument()
      expect(createListInput).toHaveFocus()
      // Verify input is cleared and ready for next list
      expect(createListInput).toHaveValue('')
    }, { timeout: 5000 })
    
    // Verify the "add a new task" empty state appears below the newly created list
    await waitFor(() => {
      const listSection = Array.from(document.querySelectorAll('[data-list-id]')).find(section => {
        const h2 = section.querySelector('h2')
        return h2 && h2.textContent === 'List for Focus Test'
      })
      expect(listSection).toBeDefined()
      
      // Check for either the button or textarea (button appears first, textarea appears when active)
      const addTaskButton = listSection?.querySelector('span[role="button"][aria-label*="Add your first task"]')
      const taskInput = listSection?.querySelector('textarea[placeholder="start typing..."]')
      
      // At least one should be present
      expect(addTaskButton || taskInput).toBeTruthy()
    }, { timeout: 5000 })
  })

  it('creates list in the correct column based on which Create button was clicked', async () => {
    const user = userEvent.setup()
    render(App)
    
    // Wait for lists to load
    await waitFor(() => {
      const listSections = document.querySelectorAll('[data-list-id]')
      expect(listSections.length).toBeGreaterThan(0)
    })
    
    // Get all "Create new list" buttons (one per column)
    const createButtons = await waitFor(() => {
      const buttons = screen.getAllByRole('button', { name: /create new list/i })
      expect(buttons.length).toBe(5) // Should be 5 buttons (one per column)
      return buttons
    }, { timeout: 10000 })
    
    // Click the button in column 2 (index 2)
    const column2Button = createButtons[2]
    await user.click(column2Button)
    
    // Wait for input to appear
    const input = await waitFor(() => {
      return screen.getByRole('textbox', { name: /enter list name/i })
    })
    
    // Type list name and save
    await user.type(input, 'Column 2 List')
    await user.keyboard('{Enter}')
    
    // Wait for list to be created
    await waitFor(() => {
      expect(screen.getByText('Column 2 List')).toBeInTheDocument()
    }, { timeout: 10000 })
    
    // Verify list is in column 2
    const column2 = document.querySelector('[data-column-index="2"]')
    expect(column2).toBeInTheDocument()
    const column2Lists = Array.from(column2.querySelectorAll('[data-list-id]')).map(section => {
      const heading = section.querySelector('h2')
      return heading ? heading.textContent : ''
    }).filter(Boolean)
    expect(column2Lists).toContain('Column 2 List')
    
    // Verify list is NOT in other columns
    for (let i = 0; i < 5; i++) {
      if (i === 2) continue // Skip column 2
      const column = document.querySelector(`[data-column-index="${i}"]`)
      const columnLists = Array.from(column.querySelectorAll('[data-list-id]')).map(section => {
        const heading = section.querySelector('h2')
        return heading ? heading.textContent : ''
      }).filter(Boolean)
      expect(columnLists).not.toContain('Column 2 List')
    }
    
    // Verify columnIndex is set correctly in database
    const lists = await db.lists.toArray()
    const createdList = lists.find(l => l.name === 'Column 2 List')
    expect(createdList).toBeDefined()
    expect(createdList.columnIndex).toBe(2)
  }, 20000)
})

