import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import App from '../../App.svelte'
import db from '../../lib/db.js'

describe('App', () => {
  beforeEach(async () => {
    // Mock window.print() before each test
    window.print = vi.fn()
    
    // Clear existing data and set up fresh test data
    await db.lists.clear()
    await db.tasks.clear()
    
    // Insert test lists
    const list1 = await db.lists.add({ name: 'Work', order: 0 })
    const list2 = await db.lists.add({ name: 'Personal', order: 1 })
    
    // Insert test tasks
    await db.tasks.add({ text: 'Task 1', listId: list1, order: 0 })
    await db.tasks.add({ text: 'Task 2', listId: list1, order: 1 })
    await db.tasks.add({ text: 'Personal Task', listId: list2, order: 0 })
  })

  it('should call window.print() when print button is clicked', async () => {
    // Render the component using @testing-library/svelte
    render(App)
    
    const user = userEvent.setup()
    
    // Find the print button by its text
    const printButton = screen.getByRole('button', { name: /print/i })
    
    // Click the button
    await user.click(printButton)
    
    // Verify window.print() was called
    expect(window.print).toHaveBeenCalledTimes(1)
  })

  it('should display lists and tasks after mounting', async () => {
    render(App)
    
    // Initially should show loading state
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    
    // Wait for lists to appear (data has started loading)
    await waitFor(() => {
      expect(screen.getByText('Work')).toBeInTheDocument()
      expect(screen.getByText('Personal')).toBeInTheDocument()
    })
    
    // Wait for tasks to load and be displayed
    await waitFor(() => {
      expect(screen.getByText('Task 1')).toBeInTheDocument()
      expect(screen.getByText('Task 2')).toBeInTheDocument()
      expect(screen.getByText('Personal Task')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    // Verify loading message is gone
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
  })

  it('shows empty state message when a list has no tasks', async () => {
    await db.lists.add({ name: 'Empty', order: 2 })
    
    render(App)
    
    await waitFor(() => {
      expect(screen.getByText('Empty')).toBeInTheDocument()
    })
    
    await waitFor(() => {
      expect(
        screen.getByText('No tasks yet for Empty. Add your first task.')
      ).toBeInTheDocument()
    })
  })
})
