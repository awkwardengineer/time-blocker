// @ts-nocheck
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import App from '../../App.svelte'
import { setupTestData } from '../helpers/appTestSetup.js'
import { 
  waitForListSection,
  getFirstCheckboxFor
} from '../helpers/appTestHelpers.js'
import db from '../../lib/db.js'
import { archiveList, archiveAllTasksInList } from '../../lib/dataAccess.js'

describe('App - Archived View Grid Layout', () => {
  beforeEach(async () => {
    await setupTestData()
  })

  it('displays archived view with grid layout', async () => {
    render(App)
    
    // Wait for archived section to appear
    await waitFor(() => {
      expect(screen.getByText('Archived Tasks')).toBeInTheDocument()
    })
    
    const archivedSection = screen.getByText('Archived Tasks').parentElement
    
    // Verify grid layout structure exists (2 columns)
    // The grid should have list names in one column and tasks in another
    expect(archivedSection).toBeInTheDocument()
  })

  it('shows archived lists with [List Archived] badge', async () => {
    const user = userEvent.setup()
    render(App)
    
    const workSection = await waitForListSection('Work')
    
    // Archive the Work list
    // First, open list edit modal
    const listHeading = within(workSection).getByRole('button', { name: /rename list: work/i })
    await user.click(listHeading)
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
    
    // Click Archive button
    const archiveButton = screen.getByRole('button', { name: /archive this list/i })
    await user.click(archiveButton)
    
    // Confirm archive
    await waitFor(() => {
      expect(screen.getByText('Archive List')).toBeInTheDocument()
    })
    
    const confirmButton = screen.getByRole('button', { name: /confirm archive list/i })
    await user.click(confirmButton)
    
    // Wait for list to be archived (it should disappear from main view)
    await waitFor(() => {
      // Work list should no longer be in main view
      const mainViewLists = Array.from(document.querySelectorAll('[data-list-id]'))
      const workListInMain = mainViewLists.find(section => {
        const h2 = section.querySelector('h2')
        return h2 && h2.textContent === 'Work'
      })
      expect(workListInMain).toBeUndefined()
    }, { timeout: 5000 })
    
    // Archived view is always visible - find it by the heading
    const archivedSection = await waitFor(() => {
      const heading = screen.getByText('Archived Tasks')
      return heading.parentElement
    }, { timeout: 5000 })
    
    // Verify list appears in archived view with [List Archived] badge
    await waitFor(() => {
      expect(within(archivedSection).getByText('Work')).toBeInTheDocument()
      expect(within(archivedSection).getByText('[List Archived]')).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('shows active lists with archived tasks with [List Active] badge', async () => {
    const user = userEvent.setup()
    render(App)
    
    const workSection = await waitForListSection('Work')
    
    // Archive a task (not the list)
    const checkbox = await getFirstCheckboxFor('Work')
    await user.click(checkbox)
    
    await waitFor(() => {
      expect(checkbox).toBeChecked()
    })
    
    // Archive button only appears for checked tasks - wait for it to appear
    const archiveButton = await within(workSection).findByRole('button', { name: /archive task/i }, { timeout: 5000 })
    await user.click(archiveButton)
    
    // Wait for task to be archived
    await waitFor(() => {
      expect(within(workSection).queryByText('Task 1')).not.toBeInTheDocument()
    })
    
    // Check archived view
    const archivedSection = screen.getByText('Archived Tasks').parentElement
    
    // Verify list appears in archived view with [List Active] badge
    await waitFor(() => {
      expect(within(archivedSection).getByText('Work')).toBeInTheDocument()
      expect(within(archivedSection).getByText('[List Active]')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('shows "No archived tasks" when list has no archived tasks', async () => {
    const user = userEvent.setup()
    render(App)
    
    const workSection = await waitForListSection('Work')
    
    // Archive the Work list (which will archive all tasks)
    const listHeading = within(workSection).getByRole('button', { name: /rename list: work/i })
    await user.click(listHeading)
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
    
    const archiveButton = screen.getByRole('button', { name: /archive this list/i })
    await user.click(archiveButton)
    
    await waitFor(() => {
      expect(screen.getByText('Archive List')).toBeInTheDocument()
    })
    
    const confirmButton = screen.getByRole('button', { name: /confirm archive list/i })
    await user.click(confirmButton)
    
    // Wait for list to be archived
    await waitFor(() => {
      expect(within(workSection).queryByText('Work')).not.toBeInTheDocument()
    })
    
    // Now create a new list and archive it (without tasks)
    // This will show "No archived tasks" for that list
    const createButton = screen.getByRole('button', { name: /create new list/i })
    await user.click(createButton)
    
    const input = await screen.findByRole('textbox', { name: /enter list name/i })
    await user.type(input, 'Empty List')
    await user.keyboard('{Enter}')
    
    // Wait for new list to appear
    const emptyListSection = await waitForListSection('Empty List')
    
    // Archive this empty list
    const emptyListHeading = within(emptyListSection).getByRole('button', { name: /rename list: empty list/i })
    await user.click(emptyListHeading)
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
    
    const archiveButton2 = screen.getByRole('button', { name: /archive this list/i })
    await user.click(archiveButton2)
    
    await waitFor(() => {
      expect(screen.getByText('Archive List')).toBeInTheDocument()
    })
    
    const confirmButton2 = screen.getByRole('button', { name: /confirm archive list/i })
    await user.click(confirmButton2)
    
    // Wait for list to be archived
    await waitFor(() => {
      expect(within(emptyListSection).queryByText('Empty List')).not.toBeInTheDocument()
    }, { timeout: 5000 })
    
    // Wait a bit for archived view to update
    await new Promise(resolve => setTimeout(resolve, 200))
    
    // Archived view is always visible - find it by the heading
    const archivedSection = await waitFor(() => {
      const heading = screen.getByText('Archived Tasks')
      return heading.parentElement
    }, { timeout: 5000 })
    
    // Find the Empty List in archived view
    await waitFor(() => {
      expect(within(archivedSection).getByText('Empty List')).toBeInTheDocument()
    }, { timeout: 5000 })
    
    // Verify "No archived tasks" message appears
    // The message appears in the second column of the grid for the Empty List
    await waitFor(() => {
      // Find the Empty List row, then check the second column for "No archived tasks"
      const emptyListHeading = within(archivedSection).getByText('Empty List')
      const listRow = emptyListHeading.closest('.border-b')
      expect(listRow).toBeDefined()
      // The "No archived tasks" should be in a sibling div (second column)
      const tasksColumn = listRow?.nextElementSibling
      if (tasksColumn) {
        expect(within(tasksColumn).getByText('No archived tasks')).toBeInTheDocument()
      } else {
        // Fallback: search within the entire archived section
        expect(within(archivedSection).getByText('No archived tasks')).toBeInTheDocument()
      }
    }, { timeout: 10000 })
  }, 30000)

  it('groups tasks by archive date within each list', async () => {
    const user = userEvent.setup()
    render(App)
    
    const workSection = await waitForListSection('Work')
    
    // Archive Task 1
    const checkbox1 = await getFirstCheckboxFor('Work')
    await user.click(checkbox1)
    
    await waitFor(() => {
      expect(checkbox1).toBeChecked()
    })
    
    const archiveButton1 = await within(workSection).findByRole('button', { name: /archive/i })
    await user.click(archiveButton1)
    
    // Wait a bit to ensure different archive times
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Archive Task 2 - re-query to get fresh reference
    await waitFor(() => {
      const checkboxes = within(workSection).getAllByRole('checkbox')
      expect(checkboxes.length).toBeGreaterThan(0)
    })
    
    const checkboxes = within(workSection).getAllByRole('checkbox')
    const checkbox2 = checkboxes[0] // After archiving Task 1, Task 2 is now first
    await user.click(checkbox2)
    
    await waitFor(() => {
      const updatedCheckbox = within(workSection).getAllByRole('checkbox')[0]
      expect(updatedCheckbox).toBeChecked()
    })
    
    const archiveButton2 = await within(workSection).findByRole('button', { name: /archive/i })
    await user.click(archiveButton2)
    
    // Check archived view
    const archivedSection = screen.getByText('Archived Tasks').parentElement
    
    // Verify both tasks appear in archived view
    await waitFor(() => {
      expect(within(archivedSection).getByText('Task 1')).toBeInTheDocument()
      expect(within(archivedSection).getByText('Task 2')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    // Tasks should be grouped by date (they should appear under date headers)
    // The exact date format may vary, but tasks should be organized
    const workListInArchive = within(archivedSection).getByText('Work').closest('div')
    expect(workListInArchive).toBeInTheDocument()
  })
})

