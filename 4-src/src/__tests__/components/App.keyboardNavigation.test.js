// @ts-nocheck
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import App from '../../App.svelte'
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
})

