// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import App from '../../App.svelte'
import db from '../../lib/db.js'

function getListSection(name) {
  const heading = screen.getByRole('heading', { name })
  return heading.parentElement
}

async function getFirstCheckboxFor(listName) {
  await waitFor(() => {
    const listSection = getListSection(listName)
    expect(within(listSection).getAllByRole('checkbox').length).toBeGreaterThan(0)
  })
  return within(getListSection(listName)).getAllByRole('checkbox')[0]
}

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
    await db.tasks.add({ text: 'Task 1', listId: list1, order: 0, status: 'unchecked' })
    await db.tasks.add({ text: 'Task 2', listId: list1, order: 1, status: 'unchecked' })
    await db.tasks.add({ text: 'Personal Task', listId: list2, order: 0, status: 'unchecked' })
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

  it('allows creating and toggling tasks through the UI', async () => {
    const user = userEvent.setup()
    render(App)

    await waitFor(() => {
      expect(screen.getByText('Work')).toBeInTheDocument()
    })

    const workSection = getListSection('Work')
    const input = within(workSection).getByPlaceholderText('Add new task...')
    const addButton = within(workSection).getByRole('button', { name: /add/i })

    await user.type(input, 'UI Task')
    await user.click(addButton)

    await waitFor(() => {
      expect(within(workSection).getByText('UI Task')).toBeInTheDocument()
    })

    const checkbox = await getFirstCheckboxFor('Work')
    expect(checkbox).not.toBeChecked()

    await user.click(checkbox)
    await waitFor(() => {
      expect(within(getListSection('Work')).getAllByRole('checkbox')[0]).toBeChecked()
    })

    await user.click(within(getListSection('Work')).getAllByRole('checkbox')[0])
    await waitFor(() => {
      expect(within(getListSection('Work')).getAllByRole('checkbox')[0]).not.toBeChecked()
    })
  })

  it('allows archiving and restoring tasks via the archived view', async () => {
    const user = userEvent.setup()
    render(App)

    await waitFor(() => {
      expect(screen.getByText('Work')).toBeInTheDocument()
    })

    const workSection = getListSection('Work')
    const checkbox = await getFirstCheckboxFor('Work')
    await user.click(checkbox)

    await waitFor(() => {
      expect(within(getListSection('Work')).getAllByRole('checkbox')[0]).toBeChecked()
    })

    const archiveButton = await within(workSection).findByRole('button', { name: /archive/i })
    await user.click(archiveButton)

    await waitFor(() => {
      expect(within(workSection).queryByText('Task 1')).not.toBeInTheDocument()
    })

    const archivedSection = screen.getByText('Archived Tasks').parentElement

    await waitFor(() => {
      expect(within(archivedSection).getByText('Task 1')).toBeInTheDocument()
    })

    const restoreButton = within(archivedSection).getByRole('button', { name: /restore/i })
    await user.click(restoreButton)

    await waitFor(() => {
      expect(within(workSection).getByText('Task 1')).toBeInTheDocument()
    })
  })

  it('requires confirmation before deleting archived tasks', async () => {
    const user = userEvent.setup()
    render(App)

    await waitFor(() => {
      expect(screen.getByText('Work')).toBeInTheDocument()
    })

    const workSection = getListSection('Work')
    const checkbox = await getFirstCheckboxFor('Work')
    await user.click(checkbox)

    await waitFor(() => {
      expect(within(getListSection('Work')).getAllByRole('checkbox')[0]).toBeChecked()
    })

    const archiveButton = await within(workSection).findByRole('button', { name: /archive/i })
    await user.click(archiveButton)

    const archivedSection = screen.getByText('Archived Tasks').parentElement
    await waitFor(() => {
      expect(within(archivedSection).getByText('Task 1')).toBeInTheDocument()
    })

    const deleteButton = within(archivedSection).getByRole('button', { name: /delete/i })
    await user.click(deleteButton)

    const modalContent = await screen.findByText(/permanently delete "Task 1"/i)
    const modal = modalContent.closest('div')

    await user.click(within(modal).getByRole('button', { name: /cancel/i }))

    await waitFor(() => {
      expect(screen.queryByText(/permanently delete "Task 1"/i)).not.toBeInTheDocument()
    })

    await user.click(deleteButton)
    const modalContent2 = await screen.findByText(/permanently delete "Task 1"/i)
    const modal2 = modalContent2.closest('div')

    await user.click(within(modal2).getByRole('button', { name: /^delete$/i }))

    await waitFor(() => {
      expect(within(archivedSection).queryByText('Task 1')).not.toBeInTheDocument()
    })
  })

  it('persists task state across rerenders (simulating refresh)', async () => {
    const user = userEvent.setup()
    const view = render(App)

    await waitFor(() => {
      expect(screen.getByText('Work')).toBeInTheDocument()
    })

    const workSection = getListSection('Work')
    const checkbox = await getFirstCheckboxFor('Work')
    await user.click(checkbox)

    await waitFor(() => {
      expect(within(getListSection('Work')).getAllByRole('checkbox')[0]).toBeChecked()
    })

    view.unmount()
    render(App)

    await waitFor(() => {
      expect(screen.getByText('Work')).toBeInTheDocument()
    })

    const refreshedCheckbox = await getFirstCheckboxFor('Work')
    await waitFor(() => {
      expect(refreshedCheckbox).toBeChecked()
    })
  })
})
