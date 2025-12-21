// @ts-nocheck
import { expect } from 'vitest'
import { screen, waitFor, within } from '@testing-library/svelte'

export function getListSection(name) {
  // List name is now a button (h2 with role="button"), so find by text instead
  // But if the name appears in both main view and archived view, we need to find the one in main view
  // Main view sections have data-list-id attribute
  const allMatches = screen.getAllByText(name)
  // Find the one that's inside a section with data-list-id (main view)
  const listNameElement = allMatches.find(el => {
    const section = el.closest('[data-list-id]')
    return section !== null
  })
  if (!listNameElement) {
    throw new Error(`Could not find list section for "${name}" in main view`)
  }
  // Return the div[data-list-id] element, not just the parent of h2
  // The h2 is inside a div.flex, which is inside the div[data-list-id]
  const section = listNameElement.closest('[data-list-id]')
  if (!section) {
    throw new Error(`Could not find [data-list-id] container for "${name}"`)
  }
  return section
}

export async function getFirstCheckboxFor(listName) {
  await waitFor(() => {
    const listSection = getListSection(listName)
    expect(within(listSection).getAllByRole('checkbox').length).toBeGreaterThan(0)
  })
  return within(getListSection(listName)).getAllByRole('checkbox')[0]
}

// Helper: Wait for a specific list section to be ready (assumes App is already rendered)
export async function waitForListSection(listName = 'Work') {
  await waitFor(() => {
    // Use getAllByText to handle cases where list name appears in multiple places
    // (e.g., main view and archived view)
    const allMatches = screen.getAllByText(listName)
    // Find the one in main view (has data-list-id ancestor)
    const mainViewMatch = allMatches.find(el => {
      const section = el.closest('[data-list-id]')
      return section !== null
    })
    expect(mainViewMatch).toBeInTheDocument()
  })
  return getListSection(listName)
}

// Helper: Open task input field by clicking "Add Task" button
// Waits for tasks to load first (for optimistic display behavior)
// With optimistic display, button text changes from "Add your first task" to "Add Task" 
// once query resolves and tasks load. We wait for the button text to be correct.
export async function openTaskInput(user, listSection, listName = 'Work') {
  // Wait for "Add Task" button to appear (not "Add your first task")
  // This indicates the query has resolved and tasks have loaded
  await waitFor(() => {
    const addTaskButton = within(listSection).queryByRole('button', { 
      name: new RegExp(`add new task to ${listName}`, 'i') 
    })
    expect(addTaskButton).toBeInTheDocument()
  }, { timeout: 3000 })
  
  const addTaskButton = within(listSection).getByRole('button', { 
    name: new RegExp(`add new task to ${listName}`, 'i') 
  })
  await user.click(addTaskButton)
  return await within(listSection).findByPlaceholderText('start typing...')
}

// Helper: Wait for tasks to load in a list section
export async function waitForTasksToLoad(listSection, taskText) {
  await waitFor(() => {
    expect(within(listSection).getByText(taskText)).toBeInTheDocument()
  })
}

// Helper: Open edit modal by clicking on a task
export async function openTaskEditModal(user, listSection, taskText) {
  await waitForTasksToLoad(listSection, taskText)
  const taskElement = within(listSection).getByText(taskText)
  await user.click(taskElement)
  await waitFor(() => {
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
  return screen.getByRole('textbox', { name: /edit task text/i })
}

