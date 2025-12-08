// @ts-nocheck
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import App from '../../App.svelte'
import db from '../../lib/db.js'

describe('App - Empty State (No Lists)', () => {
  beforeEach(async () => {
    // Clear all data to create empty state
    await db.lists.clear()
    await db.tasks.clear()
  })

  it('displays empty state when no lists exist', async () => {
    render(App)
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })
    
    // Verify empty state buttons are visible
    expect(screen.getByRole('button', { name: /create your first list/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add your first task/i })).toBeInTheDocument()
  })

  it('allows creating first list via "Create Your First List" button', async () => {
    const user = userEvent.setup()
    render(App)
    
    // Wait for empty state
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create your first list/i })).toBeInTheDocument()
    })
    
    // Click "Create Your First List"
    const createButton = screen.getByRole('button', { name: /create your first list/i })
    await user.click(createButton)
    
    // Verify input field appears
    const input = await screen.findByRole('textbox', { name: /enter list name/i })
    expect(input).toBeInTheDocument()
    
    // Type list name and save
    await user.type(input, 'My First List')
    await user.keyboard('{Enter}')
    
    // Verify list is created and appears
    await waitFor(() => {
      expect(screen.getByText('My First List')).toBeInTheDocument()
    })
    
    // Verify empty state is gone
    expect(screen.queryByRole('button', { name: /create your first list/i })).not.toBeInTheDocument()
  })

  it.skip('allows creating first task via "Add your first task" button', async () => {
    const user = userEvent.setup()
    render(App)
    
    // Wait for empty state
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add your first task/i })).toBeInTheDocument()
    })
    
    // Click "Add your first task"
    const addTaskButton = screen.getByRole('button', { name: /add your first task/i })
    await user.click(addTaskButton)
    
    // Verify input field appears
    const textarea = await screen.findByRole('textbox', { name: /enter task text/i })
    expect(textarea).toBeInTheDocument()
    
    // Type task text and save
    await user.type(textarea, 'My First Task')
    await user.keyboard('{Enter}')
    
    // Verify unnamed list is created with the task (with longer timeout for DOM updates)
    await waitFor(() => {
      expect(screen.getByText('Unnamed list')).toBeInTheDocument()
      expect(screen.getByText('My First Task')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    // Verify empty state is gone
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /add your first task/i })).not.toBeInTheDocument()
    }, { timeout: 2000 })
  })

  it.skip('shows "Create List" button after creating first task', async () => {
    const user = userEvent.setup()
    render(App)
    
    // Wait for empty state
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add your first task/i })).toBeInTheDocument()
    })
    
    // Create first task
    const addTaskButton = screen.getByRole('button', { name: /add your first task/i })
    await user.click(addTaskButton)
    
    const textarea = await screen.findByRole('textbox', { name: /enter task text/i })
    await user.type(textarea, 'My First Task')
    await user.keyboard('{Enter}')
    
    // Wait for list and task to appear (with longer timeout for DOM updates)
    await waitFor(() => {
      expect(screen.getByText('Unnamed list')).toBeInTheDocument()
      expect(screen.getByText('My First Task')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    // Verify "Create List" button appears (not "Create Your First List")
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create new list/i })).toBeInTheDocument()
    }, { timeout: 3000 })
    
    // Verify "Create Your First List" is gone
    expect(screen.queryByRole('button', { name: /create your first list/i })).not.toBeInTheDocument()
  })

  it('can cancel creating first list', async () => {
    const user = userEvent.setup()
    render(App)
    
    // Wait for empty state
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create your first list/i })).toBeInTheDocument()
    })
    
    // Click "Create Your First List"
    const createButton = screen.getByRole('button', { name: /create your first list/i })
    await user.click(createButton)
    
    // Verify input field appears
    const input = await screen.findByRole('textbox', { name: /enter list name/i })
    expect(input).toBeInTheDocument()
    
    // Press Escape to cancel
    await user.keyboard('{Escape}')
    
    // Verify input is gone and button is back
    await waitFor(() => {
      expect(screen.queryByRole('textbox', { name: /enter list name/i })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create your first list/i })).toBeInTheDocument()
    })
  })
})

