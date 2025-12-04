// @ts-nocheck
import { expect } from 'vitest'
import { screen, waitFor, within } from '@testing-library/svelte'

export function getListSection(name) {
  const heading = screen.getByRole('heading', { name })
  return heading.parentElement
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
    expect(screen.getByText(listName)).toBeInTheDocument()
  })
  return getListSection(listName)
}

// Helper: Open task input field by clicking "Add Task" button
export async function openTaskInput(user, listSection, listName = 'Work') {
  const addTaskButton = within(listSection).getByRole('button', { 
    name: new RegExp(`add new task to ${listName}`, 'i') 
  })
  await user.click(addTaskButton)
  return await within(listSection).findByPlaceholderText('Add new task...')
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

