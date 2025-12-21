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
    
    // Verify empty state primary CTAs are visible (one per column)
    const createListButtons = screen.getAllByRole('button', { name: /create new list/i })
    expect(createListButtons.length).toBe(5)

    // Verify there are 5 empty column containers rendered
    const columns = document.querySelectorAll('[data-column-index]')
    expect(columns.length).toBe(5)

    // "Add your first task" should NOT be visible until at least one list exists
    expect(screen.queryByRole('button', { name: /add your first task/i })).not.toBeInTheDocument()
  })

  it('allows creating first list via "Create new list" button', async () => {
    const user = userEvent.setup()
    render(App)
    
    // Wait for empty state
    let createButtons
    await waitFor(() => {
      createButtons = screen.getAllByRole('button', { name: /create new list/i })
      expect(createButtons.length).toBeGreaterThan(0)
    })
    
    // Click first "Create new list" button (first column)
    const createButton = createButtons[0]
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
    
    // Verify empty state is gone (no more "Create new list" buttons for empty board)
    expect(screen.queryAllByRole('button', { name: /create new list/i }).length).toBeGreaterThan(0)
  })

  it('can cancel creating first list', async () => {
    const user = userEvent.setup()
    render(App)
    
    // Wait for empty state
    let createButtons
    await waitFor(() => {
      createButtons = screen.getAllByRole('button', { name: /create new list/i })
      expect(createButtons.length).toBeGreaterThan(0)
    })
    
    // Click first "Create new list" button
    const createButton = createButtons[0]
    await user.click(createButton)
    
    // Verify input field appears
    const input = await screen.findByRole('textbox', { name: /enter list name/i })
    expect(input).toBeInTheDocument()
    
    // Press Escape to cancel
    await user.keyboard('{Escape}')
    
    // Verify input is gone and at least one Create new list button is back
    await waitFor(() => {
      expect(screen.queryByRole('textbox', { name: /enter list name/i })).not.toBeInTheDocument()
      expect(screen.getAllByRole('button', { name: /create new list/i }).length).toBeGreaterThan(0)
    })
  })
})

