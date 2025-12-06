// @ts-nocheck
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import App from '../../App.svelte'
import db from '../../lib/db.js'
import { setupTestData } from '../helpers/appTestSetup.js'
import { 
  waitForListSection, 
  waitForTasksToLoad 
} from '../helpers/appTestHelpers.js'

describe('App - Keyboard Navigation', () => {
  beforeEach(async () => {
    await setupTestData()
  })

  it('Tab navigation works through interactive elements', async () => {
    const user = userEvent.setup()
    render(App)
    const workSection = await waitForListSection('Work')
    
    await waitForTasksToLoad(workSection, 'Task 1')
    
    // Find first checkbox
    const task1Text = within(workSection).getByText('Task 1')
    const task1ListItem = task1Text.closest('li')
    const checkbox = within(task1ListItem).getByRole('checkbox')
    
    // Focus checkbox
    checkbox.focus()
    expect(checkbox).toHaveFocus()
    
    // Tab through interactive elements - verify we can navigate
    // Tab to task text (focusable span inside the list item)
    await user.keyboard('{Tab}')
    const taskTextSpan = task1ListItem.querySelector('span[role="button"]')
    expect(taskTextSpan).toHaveFocus()
    
    // Continue tabbing - should eventually reach Add Task button
    // (drag library adds tabindex to list items, so exact order may vary)
    let addTaskButton = within(workSection).getByRole('button', { name: /add new task to work/i })
    let foundAddTaskButton = false
    
    // Tab up to 5 times to find the Add Task button (should be reachable)
    for (let i = 0; i < 5; i++) {
      await user.keyboard('{Tab}')
      if (document.activeElement === addTaskButton) {
        foundAddTaskButton = true
        break
      }
    }
    
    // Verify Add Task button is reachable via tab navigation
    expect(foundAddTaskButton).toBe(true)
    expect(addTaskButton).toHaveFocus()
  })

  it('moves task to next list when pressing ArrowDown on last task', async () => {
    const user = userEvent.setup()
    render(App)
    const workSection = await waitForListSection('Work')
    const personalSection = await waitForListSection('Personal')
    
    await waitForTasksToLoad(workSection, 'Task 2')
    
    // Find the last task in Work list (Task 2)
    const task2Text = within(workSection).getByText('Task 2')
    const task2ListItem = task2Text.closest('li')
    const task2TextSpan = task2ListItem.querySelector('span[role="button"]')
    
    // Focus on Task 2 text
    task2TextSpan.focus()
    expect(task2TextSpan).toHaveFocus()
    
    // Press ArrowDown (should move to next list)
    await user.keyboard('{ArrowDown}')
    
    // Wait for task to move to Personal list
    await waitFor(() => {
      expect(within(personalSection).getByText('Task 2')).toBeInTheDocument()
      expect(within(workSection).queryByText('Task 2')).not.toBeInTheDocument()
    }, { timeout: 3000 })
    
    // Verify task moved in database
    const lists = await db.lists.toArray()
    const workList = lists.find(l => l.name === 'Work')
    const personalList = lists.find(l => l.name === 'Personal')
    const personalTasks = await db.tasks.where('listId').equals(personalList.id)
      .filter(t => t.status !== 'archived')
      .sortBy('order')
    
    expect(personalTasks.some(t => t.text === 'Task 2')).toBe(true)
    expect(personalTasks[0].text).toBe('Task 2') // Should be first in Personal list
  })

  it('moves task to previous list when pressing ArrowUp on first task', async () => {
    const user = userEvent.setup()
    render(App)
    const workSection = await waitForListSection('Work')
    const personalSection = await waitForListSection('Personal')
    
    await waitForTasksToLoad(personalSection, 'Personal Task')
    
    // Find the first task in Personal list
    const personalTaskText = within(personalSection).getByText('Personal Task')
    const personalTaskListItem = personalTaskText.closest('li')
    const personalTaskTextSpan = personalTaskListItem.querySelector('span[role="button"]')
    
    // Focus on Personal Task text
    personalTaskTextSpan.focus()
    expect(personalTaskTextSpan).toHaveFocus()
    
    // Press ArrowUp (should move to previous list)
    await user.keyboard('{ArrowUp}')
    
    // Wait for task to move to Work list
    await waitFor(() => {
      expect(within(workSection).getByText('Personal Task')).toBeInTheDocument()
      expect(within(personalSection).queryByText('Personal Task')).not.toBeInTheDocument()
    }, { timeout: 3000 })
    
    // Verify task moved in database
    const lists = await db.lists.toArray()
    const workList = lists.find(l => l.name === 'Work')
    const workTasks = await db.tasks.where('listId').equals(workList.id)
      .filter(t => t.status !== 'archived')
      .sortBy('order')
    
    expect(workTasks.some(t => t.text === 'Personal Task')).toBe(true)
    // Should be last in Work list
    expect(workTasks[workTasks.length - 1].text).toBe('Personal Task')
  })

  it('creates new unnamed list when pressing ArrowDown on last task in last list', async () => {
    const user = userEvent.setup()
    render(App)
    
    // Get all lists to find the last one
    const lists = await db.lists.toArray()
    const sortedLists = lists.sort((a, b) => a.order - b.order)
    const lastList = sortedLists[sortedLists.length - 1]
    
    // Get tasks from last list
    const lastListTasks = await db.tasks.where('listId').equals(lastList.id)
      .filter(t => t.status !== 'archived')
      .sortBy('order')
    
    if (lastListTasks.length === 0) {
      // If last list is empty, create a task first
      const taskId = await db.tasks.add({
        text: 'Last Task',
        listId: lastList.id,
        order: 0,
        status: 'unchecked'
      })
      lastListTasks.push(await db.tasks.get(taskId))
    }
    
    const lastTask = lastListTasks[lastListTasks.length - 1]
    const lastListSection = await waitForListSection(lastList.name)
    
    await waitForTasksToLoad(lastListSection, lastTask.text)
    
    // Find the last task in the last list
    const lastTaskText = within(lastListSection).getByText(lastTask.text)
    const lastTaskListItem = lastTaskText.closest('li')
    const lastTaskTextSpan = lastTaskListItem.querySelector('span[role="button"]')
    
    // Focus on last task text
    lastTaskTextSpan.focus()
    expect(lastTaskTextSpan).toHaveFocus()
    
    // Count lists before
    const listsBefore = await db.lists.toArray()
    const listsCountBefore = listsBefore.length
    
    // Press ArrowDown (should create new unnamed list)
    await user.keyboard('{ArrowDown}')
    
    // Wait for new unnamed list to appear
    await waitFor(() => {
      expect(screen.getByText('Unnamed list')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    // Verify new list was created
    const listsAfter = await db.lists.toArray()
    expect(listsAfter.length).toBe(listsCountBefore + 1)
    
    // Find the new unnamed list
    const newList = listsAfter.find(l => l.name === null || l.name === '')
    expect(newList).toBeDefined()
    
    // Verify task moved to new list
    const newListSection = await waitForListSection('Unnamed list')
    await waitFor(() => {
      expect(within(newListSection).getByText(lastTask.text)).toBeInTheDocument()
    }, { timeout: 3000 })
    
    // Verify task is no longer in old list
    expect(within(lastListSection).queryByText(lastTask.text)).not.toBeInTheDocument()
  })

  it('moves task and updates UI when using keyboard cross-list navigation', async () => {
    const user = userEvent.setup()
    render(App)
    const workSection = await waitForListSection('Work')
    const personalSection = await waitForListSection('Personal')
    
    await waitForTasksToLoad(workSection, 'Task 2')
    
    // Find the last task in Work list
    const task2Text = within(workSection).getByText('Task 2')
    const task2ListItem = task2Text.closest('li')
    const task2TextSpan = task2ListItem.querySelector('span[role="button"]')
    
    // Focus on Task 2 text
    task2TextSpan.focus()
    expect(task2TextSpan).toHaveFocus()
    
    // Press ArrowDown to move to next list
    await user.keyboard('{ArrowDown}')
    
    // Wait for task to move and UI to update
    await waitFor(() => {
      expect(within(personalSection).getByText('Task 2')).toBeInTheDocument()
      expect(within(workSection).queryByText('Task 2')).not.toBeInTheDocument()
    }, { timeout: 3000 })
    
    // Verify task moved in database
    const lists = await db.lists.toArray()
    const personalList = lists.find(l => l.name === 'Personal')
    const personalTasks = await db.tasks.where('listId').equals(personalList.id)
      .filter(t => t.status !== 'archived')
      .sortBy('order')
    
    expect(personalTasks.some(t => t.text === 'Task 2')).toBe(true)
    // Note: Focus management after cross-list move may need separate implementation
    // This test verifies the move works correctly via keyboard
  })
})

