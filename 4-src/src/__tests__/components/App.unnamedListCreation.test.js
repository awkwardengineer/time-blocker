// @ts-nocheck
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import App from '../../App.svelte'
import { setupTestData } from '../helpers/appTestSetup.js'
import { 
  waitForListSection
} from '../helpers/appTestHelpers.js'

describe('App - Unnamed List Creation (Task 3b)', () => {
  beforeEach(async () => {
    await setupTestData()
  })

  // Helper: Activate unnamed list task input by clicking "Add your first task" button
  async function activateUnnamedListInput(user) {
    // Wait for "Add your first task" button to appear (should be visible when lists exist)
    const addTaskButton = await waitFor(() => {
      return screen.getByRole('button', { name: /add your first task/i })
    })
    await user.click(addTaskButton)
    
    // Wait for input to appear
    await waitFor(() => {
      const textarea = screen.getByPlaceholderText('Add new task...')
      expect(textarea).toBeInTheDocument()
    })
    
    return screen.getByPlaceholderText('Add new task...')
  }

  it('"Add a task" button appears when lists exist', async () => {
    render(App)
    
    // Wait for lists to load
    await waitFor(() => {
      expect(screen.getByText('Work')).toBeInTheDocument()
    })
    
    // Verify "Add your first task" button exists
    const addTaskButton = screen.getByRole('button', { name: /add your first task/i })
    expect(addTaskButton).toBeInTheDocument()
  })

  it('Clicking "Add a task" button reveals input field', async () => {
    const user = userEvent.setup()
    render(App)
    
    const input = await activateUnnamedListInput(user)
    
    // Verify input is visible and empty
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue('')
  })

  it('Creating task creates unnamed list automatically', async () => {
    const user = userEvent.setup()
    render(App)
    
    // Count initial lists
    await waitFor(() => {
      const listSections = document.querySelectorAll('[data-list-id]')
      expect(listSections.length).toBeGreaterThan(0)
    })
    const initialListSections = document.querySelectorAll('[data-list-id]')
    const initialCount = initialListSections.length
    
    const input = await activateUnnamedListInput(user)
    await user.type(input, 'First Task in Unnamed List')
    await user.keyboard('{Enter}')
    
    // Wait for unnamed list to appear
    await waitFor(() => {
      const updatedListSections = document.querySelectorAll('[data-list-id]')
      expect(updatedListSections.length).toBe(initialCount + 1)
    })
    
    // Verify list displays as "Unnamed list"
    await waitFor(() => {
      expect(screen.getByText('Unnamed list')).toBeInTheDocument()
    })
    
    // Wait for tasks to load - wait for "Loading tasks..." to disappear and task to appear
    await waitFor(() => {
      const unnamedList = Array.from(document.querySelectorAll('[data-list-id]')).find(section => {
        const h2 = section.querySelector('h2')
        return h2 && h2.textContent === 'Unnamed list'
      })
      expect(unnamedList).toBeDefined()
      // Verify loading message is gone
      const loadingText = unnamedList.querySelector('p')
      if (loadingText) {
        expect(loadingText.textContent).not.toBe('Loading tasks...')
      }
      // Verify task appears
      expect(within(unnamedList).getByText('First Task in Unnamed List')).toBeInTheDocument()
    })
  })

  it('Unnamed list displays as "Unnamed list" (not "(Unnamed)")', async () => {
    const user = userEvent.setup()
    render(App)
    
    const input = await activateUnnamedListInput(user)
    await user.type(input, 'Test Task')
    await user.keyboard('{Enter}')
    
    // Wait for list to appear
    await waitFor(() => {
      expect(screen.getByText('Unnamed list')).toBeInTheDocument()
    })
    
    // Verify it's not "(Unnamed)"
    expect(screen.queryByText('(Unnamed)')).not.toBeInTheDocument()
  })

  it('Focus stays in task input after creating task (for sequential creation)', async () => {
    const user = userEvent.setup()
    render(App)
    
    const input = await activateUnnamedListInput(user)
    await user.type(input, 'First Task')
    await user.keyboard('{Enter}')
    
    // Wait for task to be created and tasks to load
    await waitFor(() => {
      expect(screen.getByText('First Task')).toBeInTheDocument()
    })
    
    // Verify focus stays in task input (not moved to bottom button)
    // The focus management happens via setTimeout in App.svelte, wait for focus to move
    await waitFor(() => {
      const unnamedListSection = Array.from(document.querySelectorAll('[data-list-id]')).find(section => {
        const h2 = section.querySelector('h2')
        return h2 && h2.textContent === 'Unnamed list'
      })
      expect(unnamedListSection).toBeDefined()
      const taskInput = unnamedListSection?.querySelector('textarea[placeholder="Add new task..."]')
      expect(taskInput).toBeInTheDocument()
      expect(taskInput).toHaveFocus()
    })
  })

  it('"Create List" button appears after unnamed list is created', async () => {
    const user = userEvent.setup()
    render(App)
    
    const input = await activateUnnamedListInput(user)
    await user.type(input, 'Task to Create Unnamed List')
    await user.keyboard('{Enter}')
    
    // Wait for unnamed list to be created
    await waitFor(() => {
      expect(screen.getByText('Unnamed list')).toBeInTheDocument()
    })
    
    // Verify "Create List" button appears
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create new list/i })).toBeInTheDocument()
    })
  })

  it('Unnamed list appears immediately in UI', async () => {
    const user = userEvent.setup()
    render(App)
    
    // Count initial lists
    await waitFor(() => {
      const listSections = document.querySelectorAll('[data-list-id]')
      expect(listSections.length).toBeGreaterThan(0)
    })
    const initialListSections = document.querySelectorAll('[data-list-id]')
    const initialCount = initialListSections.length
    
    const input = await activateUnnamedListInput(user)
    await user.type(input, 'Immediate Task')
    await user.keyboard('{Enter}')
    
    // Wait for list to appear immediately
    await waitFor(() => {
      const updatedListSections = document.querySelectorAll('[data-list-id]')
      expect(updatedListSections.length).toBe(initialCount + 1)
    })
    
    // Verify the unnamed list is visible
    expect(screen.getByText('Unnamed list')).toBeInTheDocument()
  })

  it('Escape key cancels and closes input', async () => {
    const user = userEvent.setup()
    render(App)
    
    const input = await activateUnnamedListInput(user)
    await user.type(input, 'This should be discarded')
    
    // Press Escape
    await user.keyboard('{Escape}')
    
    // Wait for input to close
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Add new task...')).not.toBeInTheDocument()
    })
    
    // Verify no unnamed list was created
    expect(screen.queryByText('Unnamed list')).not.toBeInTheDocument()
    
    // Verify "Add your first task" button appears again
    expect(screen.getByRole('button', { name: /add your first task/i })).toBeInTheDocument()
  })

  it('Click outside input (when empty) cancels and closes', async () => {
    const user = userEvent.setup()
    render(App)
    
    const input = await activateUnnamedListInput(user)
    // Don't type anything
    
    // Click outside (on the main container)
    const main = screen.getByRole('main')
    await user.click(main)
    
    // Wait for input to close
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Add new task...')).not.toBeInTheDocument()
    })
    
    // Verify "Add your first task" button appears again
    expect(screen.getByRole('button', { name: /add your first task/i })).toBeInTheDocument()
  })

  it('Multiple tasks can be created in unnamed list sequentially', async () => {
    const user = userEvent.setup()
    render(App)
    
    const input = await activateUnnamedListInput(user)
    await user.type(input, 'First Task')
    await user.keyboard('{Enter}')
    
    // Wait for first task to be created and tasks to load
    await waitFor(() => {
      expect(screen.getByText('First Task')).toBeInTheDocument()
    })
    
    // Verify focus stays in input for sequential creation
    await waitFor(() => {
      const unnamedListSection = Array.from(document.querySelectorAll('[data-list-id]')).find(section => {
        const h2 = section.querySelector('h2')
        return h2 && h2.textContent === 'Unnamed list'
      })
      expect(unnamedListSection).toBeDefined()
      const taskInput = unnamedListSection?.querySelector('textarea[placeholder="Add new task..."]')
      expect(taskInput).toHaveFocus()
    })
    
    // Create second task
    const input2 = screen.getByPlaceholderText('Add new task...')
    await user.type(input2, 'Second Task')
    await user.keyboard('{Enter}')
    
    // Verify both tasks exist in unnamed list
    await waitFor(() => {
      expect(screen.getByText('Second Task')).toBeInTheDocument()
    })
    
    const unnamedListSection = Array.from(document.querySelectorAll('[data-list-id]')).find(section => {
      const h2 = section.querySelector('h2')
      return h2 && h2.textContent === 'Unnamed list'
    })
    expect(unnamedListSection).toBeDefined()
    expect(within(unnamedListSection).getByText('First Task')).toBeInTheDocument()
    expect(within(unnamedListSection).getByText('Second Task')).toBeInTheDocument()
  })
})


