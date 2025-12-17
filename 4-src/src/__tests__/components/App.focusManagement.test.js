// @ts-nocheck
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import App from '../../App.svelte'
import { setupTestData } from '../helpers/appTestSetup.js'
import { 
  waitForListSection, 
  waitForTasksToLoad, 
  openTaskEditModal 
} from '../helpers/appTestHelpers.js'

describe('App - Focus Management', () => {
  beforeEach(async () => {
    await setupTestData()
  })

  it('Focus returns to task after closing edit modal', async () => {
    const user = userEvent.setup()
    render(App)
    const workSection = await waitForListSection('Work')
    
    await waitForTasksToLoad(workSection, 'Task 1')
    const task1Text = within(workSection).getByText('Task 1')
    const modalInput = await openTaskEditModal(user, workSection, 'Task 1')
    expect(modalInput).toHaveFocus()
    
    // Save and close modal
    await user.keyboard('{Enter}')
    
    // Wait for modal to close
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    
    // Verify focus returned to task text
    // Re-query task element after modal closes (DOM might have updated)
    await waitFor(() => {
      const updatedTask1Text = within(workSection).getByText('Task 1')
      const task1ListItem = updatedTask1Text.closest('li')
      const taskTextSpan = task1ListItem?.querySelector('span[role="button"]')
      expect(taskTextSpan).toBeInTheDocument()
      expect(taskTextSpan).toHaveFocus()
    }, { timeout: 3000 })
  }, 15000)

  it('Focus moves to next task after archiving', async () => {
    const user = userEvent.setup()
    render(App)
    const workSection = await waitForListSection('Work')
    
    await waitForTasksToLoad(workSection, 'Task 2')
    
    await openTaskEditModal(user, workSection, 'Task 1')
    
    // Archive Task 1 from modal
    const archiveButton = screen.getByRole('button', { name: /archive this task instead of saving/i })
    await user.click(archiveButton)
    
    // Wait for modal to close and Task 1 to be archived
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(within(workSection).queryByText('Task 1')).not.toBeInTheDocument()
    })
    
    // Verify focus moved to Task 2 (next task)
    // Wait for Task 2 to be in the DOM first, then check focus
    await waitFor(() => {
      expect(within(workSection).getByText('Task 2')).toBeInTheDocument()
    })
    
    // Wait a bit longer for focus to be set (DOM updates and focus management need time)
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Query element inside waitFor to ensure fresh reference after DOM updates
    // Increased timeout to handle timing issues in full test suite
    await waitFor(() => {
      const task2Text = within(workSection).getByText('Task 2')
      const task2ListItem = task2Text.closest('li')
      const task2TextSpan = task2ListItem?.querySelector('span[role="button"]')
      expect(task2TextSpan).toBeInTheDocument()
      expect(task2TextSpan).toHaveFocus()
    }, { timeout: 5000 })
  }, 15000)

  it('Focus moves to Add Task button when all tasks archived', async () => {
    const user = userEvent.setup()
    render(App)
    const workSection = await waitForListSection('Work')
    
    await waitForTasksToLoad(workSection, 'Task 2')
    
    // Archive Task 1 via modal (this triggers focus management)
    await openTaskEditModal(user, workSection, 'Task 1')
    
    // Archive from modal
    const archiveButton = screen.getByRole('button', { name: /archive this task instead of saving/i })
    await user.click(archiveButton)
    
    // Wait for Task 1 to be archived
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(within(workSection).queryByText('Task 1')).not.toBeInTheDocument()
    })
    
    // Archive Task 2 via modal (this should trigger focus to Add Task button)
    await openTaskEditModal(user, workSection, 'Task 2')
    
    // Archive from modal
    const archiveButton2 = screen.getByRole('button', { name: /archive this task instead of saving/i })
    await user.click(archiveButton2)
    
    // Wait for all tasks to be archived
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(within(workSection).queryByText('Task 2')).not.toBeInTheDocument()
    })
    
    // Wait for button to appear (list becomes empty, so button text changes)
    const addTaskButton = await within(workSection).findByRole('button', { name: /add your first task to work/i }, { timeout: 5000 })
    
    // Verify focus moved to Add Task button
    // Increased timeout to handle timing issues in full test suite
    // Focus management uses setTimeout with retries, so wait longer
    await waitFor(() => {
      expect(addTaskButton).toHaveFocus()
    }, { timeout: 5000 })
  }, 15000)
})

