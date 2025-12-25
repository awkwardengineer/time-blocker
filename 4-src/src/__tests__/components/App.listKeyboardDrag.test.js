// @ts-nocheck
import { describe, it, expect, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import App from '../../App.svelte'
import db from '../../lib/db.js'
import { setupTestData } from '../helpers/appTestSetup.js'
import { waitForListSection } from '../helpers/appTestHelpers.js'

async function getColumnListOrder(columnIndex = 0) {
  const column = document.querySelector(`[data-column-index="${columnIndex}"]`)
  if (!column) return []
  // Query for [data-list-id] elements that have an h2 heading (the outer div, not the ul)
  // This filters out ul elements which also have data-list-id but no heading
  const listSections = Array.from(column.querySelectorAll('[data-list-id]'))
    .filter(section => section.querySelector('h2') !== null)
  return listSections.map(section => {
    const heading = section.querySelector('h2')
    return heading ? heading.textContent : ''
  })
}

describe('App - List Keyboard Drag', () => {
  beforeEach(async () => {
    await setupTestData()
  })

  it('reorders lists within a column using keyboard drag', async () => {
    const user = userEvent.setup()
    render(App)

    const workSection = await waitForListSection('Work')
    const workCard = workSection.closest('[data-id]')
    expect(workCard).not.toBeNull()

    // Initial order should be Work, Personal
    await waitFor(async () => {
      const order = await getColumnListOrder(0)
      expect(order).toEqual(['Work', 'Personal'])
    })

    // Focus list card and start keyboard drag with Space
    workCard.focus()
    expect(workCard).toHaveFocus()

    await user.keyboard(' ')
    expect(workCard).toHaveFocus()

    // Move list down within the same column
    await user.keyboard('{ArrowDown}')

    // Order should now be Personal, Work
    await waitFor(async () => {
      const order = await getColumnListOrder(0)
      expect(order).toEqual(['Personal', 'Work'])
    })

  })

  it('moves list to another column with ArrowRight and persists columnIndex', async () => {
    const user = userEvent.setup()
    render(App)

    const workSection = await waitForListSection('Work')
    const workCard = workSection.closest('[data-id]')
    expect(workCard).not.toBeNull()

    workCard.focus()
    expect(workCard).toHaveFocus()

    // Start keyboard drag
    await user.keyboard(' ')

    // Move list to the next column
    await user.keyboard('{ArrowRight}')

    // Wait for UI to reflect the move (positive assertion first)
    // According to TEST_TIMING_NOTES: prefer positive assertions, use waitFor for state changes
    await waitFor(async () => {
      const column0Order = await getColumnListOrder(0)
      const column1Order = await getColumnListOrder(1)
      expect(column0Order).not.toContain('Work')
      expect(column1Order).toContain('Work')
    }, { timeout: 10000 })

    // Verify database columnIndex updated (wait for database update to propagate)
    // According to TEST_TIMING_NOTES: database updates with liveQuery may need time to propagate
    // Database transaction may need additional time to complete after UI update
    // Re-query inside waitFor to avoid stale references
    await waitFor(async () => {
      // Re-query database inside waitFor to ensure fresh data
      const lists = await db.lists.toArray()
      const workList = lists.find(l => l.name === 'Work')
      expect(workList).toBeDefined()
      expect(workList.columnIndex ?? 0).toBe(1)
    }, { timeout: 10000 })
  }, 15000) // Increased test timeout per TEST_TIMING_NOTES

  it('Tab, Escape, Enter, and Space all end keyboard list drag mode', async () => {
    const user = userEvent.setup()
    render(App)

    const workSection = await waitForListSection('Work')
    const workCard = workSection.closest('[data-id]')
    expect(workCard).not.toBeNull()

    // Helper to get current order in column 0
    async function getOrder() {
      return await getColumnListOrder(0)
    }

    // Baseline order
    const initialOrder = await getOrder()

    // Function to start drag and move once so we know we're in drag mode
    async function startDragAndMoveDown() {
      workCard.focus()
      expect(workCard).toHaveFocus()
      await user.keyboard(' ')
      await user.keyboard('{ArrowDown}')
      await waitFor(async () => {
        const order = await getOrder()
        expect(order).not.toEqual(initialOrder)
      })
    }

    // 1. Tab ends drag and allows focus to move, further arrows do not change list order
    await startDragAndMoveDown()
    const afterMoveOrder = await getOrder()
    await user.keyboard('{Tab}')

    // Refocus card and verify ArrowUp does not change order (drag mode ended)
    workCard.focus()
    await user.keyboard('{ArrowUp}')
    await waitFor(async () => {
      const order = await getOrder()
      expect(order).toEqual(afterMoveOrder)
    })

    // 2. Escape ends drag
    await startDragAndMoveDown()
    const afterMoveOrder2 = await getOrder()
    await user.keyboard('{Escape}')
    workCard.focus()
    await user.keyboard('{ArrowUp}')
    await waitFor(async () => {
      const order = await getOrder()
      expect(order).toEqual(afterMoveOrder2)
    })

    // 3. Enter ends drag
    await startDragAndMoveDown()
    const afterMoveOrder3 = await getOrder()
    await user.keyboard('{Enter}')
    workCard.focus()
    await user.keyboard('{ArrowUp}')
    await waitFor(async () => {
      const order = await getOrder()
      expect(order).toEqual(afterMoveOrder3)
    })

    // 4. Space ends drag
    await startDragAndMoveDown()
    const afterMoveOrder4 = await getOrder()
    await user.keyboard(' ')
    workCard.focus()
    await user.keyboard('{ArrowUp}')
    await waitFor(async () => {
      const order = await getOrder()
      expect(order).toEqual(afterMoveOrder4)
    })
  })
})


