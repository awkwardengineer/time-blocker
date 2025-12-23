// @ts-nocheck
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, waitFor, within } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import App from '../../App.svelte'
import { setupTestData } from '../helpers/appTestSetup.js'
import { 
  waitForListSection, 
  waitForTasksToLoad 
} from '../helpers/appTestHelpers.js'

// This test focuses on focus-management semantics around keyboard-based
// task dragging and does not rely on the full behavior of the drag library.
// Mock the drag adapter's dependency (svelte-dnd-action) to avoid a known
// keyboard drag bug in the library that can throw when its internal items
// array temporarily diverges from DOM children.
// Note: We mock the library, not the adapter, since the adapter is a thin
// wrapper and mocking at the library level is more reliable for this test.
vi.mock('svelte-dnd-action', () => ({
  dndzone: vi.fn(() => ({
    update: () => {},
    destroy: () => {}
  }))
}))

describe('App - Task Keyboard Drag', () => {
  beforeEach(async () => {
    await setupTestData()
  })

  it('refocuses the dragged task on first Tab after a keyboard drop', async () => {
    const user = userEvent.setup()
    render(App)

    const workSection = await waitForListSection('Work')
    await waitForTasksToLoad(workSection, 'Task 1')

    // Get the list item for Task 1
    const task1Text = within(workSection).getByText('Task 1')
    const task1ListItem = task1Text.closest('li')
    expect(task1ListItem).not.toBeNull()

    // Make the list item programmatically focusable in the test
    // environment (jsdom), then focus it as the keyboard drag entry point.
    task1ListItem.setAttribute('tabindex', '-1')
    task1ListItem.focus()
    expect(task1ListItem).toHaveFocus()

    // Start keyboard drag with Space
    await user.keyboard(' ')
    expect(task1ListItem).toHaveFocus()

    // Immediately drop the task with Space (the drag library will blur
    // the active element as part of its keyboard drop handling).
    await user.keyboard(' ')

    // First Tab after drop should *resume* on the dragged task item,
    // not jump straight into its checkbox.
    await user.keyboard('{Tab}')
    expect(task1ListItem).toHaveFocus()

    // Second Tab should now move into one of the task's interactive
    // children (typically the checkbox).
    await user.keyboard('{Tab}')
    const checkbox = within(task1ListItem).getByRole('checkbox')
    const textButton = task1ListItem.querySelector('span[role="button"]')
    const active = document.activeElement

    expect(
      active === checkbox ||
      active === textButton
    ).toBe(true)
  })
})


