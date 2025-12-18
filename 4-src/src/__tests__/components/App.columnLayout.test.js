// @ts-nocheck
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/svelte'
import App from '../../App.svelte'
import db from '../../lib/db.js'
import { setupTestData } from '../helpers/appTestSetup.js'
import { waitForListSection } from '../helpers/appTestHelpers.js'

/**
 * Helper: Get all column elements
 * @returns {NodeListOf<Element>} All elements with data-column-index attribute
 */
function getColumns() {
  return document.querySelectorAll('[data-column-index]')
}

/**
 * Helper: Get lists in a specific column
 * @param {number} columnIndex - The column index (0-4)
 * @returns {Array<string>} Array of list names in that column
 */
function getListsInColumn(columnIndex) {
  const column = document.querySelector(`[data-column-index="${columnIndex}"]`)
  if (!column) return []
  const listSections = Array.from(column.querySelectorAll('[data-list-id]'))
  return listSections.map(section => {
    const heading = section.querySelector('h2')
    return heading ? heading.textContent : ''
  }).filter(Boolean)
}

describe('App - Column Layout', () => {
  beforeEach(async () => {
    await setupTestData()
  })

  it('renders 5 columns', async () => {
    render(App)
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })
    
    // Verify 5 columns are rendered
    const columns = getColumns()
    expect(columns.length).toBe(5)
    
    // Verify each column has the correct data-column-index attribute
    for (let i = 0; i < 5; i++) {
      const column = document.querySelector(`[data-column-index="${i}"]`)
      expect(column).toBeInTheDocument()
    }
  }, 10000)

  it('distributes lists across columns based on columnIndex', async () => {
    render(App)
    
    // Wait for lists to load
    await waitFor(() => {
      const listSections = document.querySelectorAll('[data-list-id]')
      expect(listSections.length).toBeGreaterThan(0)
    })
    
    // Get lists from database to verify their columnIndex
    const lists = await db.lists.toArray()
    
    // Verify each list appears in the correct column
    for (const list of lists) {
      const expectedColumnIndex = list.columnIndex ?? 0
      const columnLists = getListsInColumn(expectedColumnIndex)
      
      // List should be in its assigned column
      expect(columnLists).toContain(list.name || 'Unnamed list')
    }
  }, 10000)

  it('places lists with columnIndex 0 in first column', async () => {
    // Create a list with explicit columnIndex 0
    const listId = await db.lists.add({
      name: 'Column 0 List',
      order: 10,
      columnIndex: 0,
      archivedAt: null
    })
    
    render(App)
    
    // Wait for list to appear
    await waitFor(() => {
      expect(screen.getByText('Column 0 List')).toBeInTheDocument()
    })
    
    // Verify it's in column 0
    const column0Lists = getListsInColumn(0)
    expect(column0Lists).toContain('Column 0 List')
    
    // Verify it's NOT in other columns
    for (let i = 1; i < 5; i++) {
      const columnLists = getListsInColumn(i)
      expect(columnLists).not.toContain('Column 0 List')
    }
  }, 10000)

  it('places lists with columnIndex 4 in last column', async () => {
    // Create a list with explicit columnIndex 4
    const listId = await db.lists.add({
      name: 'Column 4 List',
      order: 10,
      columnIndex: 4,
      archivedAt: null
    })
    
    render(App)
    
    // Wait for list to appear
    await waitFor(() => {
      expect(screen.getByText('Column 4 List')).toBeInTheDocument()
    })
    
    // Verify it's in column 4
    const column4Lists = getListsInColumn(4)
    expect(column4Lists).toContain('Column 4 List')
    
    // Verify it's NOT in other columns
    for (let i = 0; i < 4; i++) {
      const columnLists = getListsInColumn(i)
      expect(columnLists).not.toContain('Column 4 List')
    }
  }, 10000)

  it('handles column overflow - lists with columnIndex >= 5 render in last column', async () => {
    // Create lists with columnIndex beyond available columns
    const list5Id = await db.lists.add({
      name: 'Overflow List 5',
      order: 10,
      columnIndex: 5,
      archivedAt: null
    })
    
    const list10Id = await db.lists.add({
      name: 'Overflow List 10',
      order: 11,
      columnIndex: 10,
      archivedAt: null
    })
    
    render(App)
    
    // Wait for lists to appear
    await waitFor(() => {
      expect(screen.getByText('Overflow List 5')).toBeInTheDocument()
      expect(screen.getByText('Overflow List 10')).toBeInTheDocument()
    })
    
    // Verify both overflow lists are in the last column (index 4)
    const column4Lists = getListsInColumn(4)
    expect(column4Lists).toContain('Overflow List 5')
    expect(column4Lists).toContain('Overflow List 10')
    
    // Verify they're NOT in other columns
    for (let i = 0; i < 4; i++) {
      const columnLists = getListsInColumn(i)
      expect(columnLists).not.toContain('Overflow List 5')
      expect(columnLists).not.toContain('Overflow List 10')
    }
  }, 10000)

  it('maintains list order within each column', async () => {
    // Create multiple lists in the same column with different order values
    const list1Id = await db.lists.add({
      name: 'First in Column',
      order: 100,
      columnIndex: 2,
      archivedAt: null
    })
    
    const list2Id = await db.lists.add({
      name: 'Second in Column',
      order: 101,
      columnIndex: 2,
      archivedAt: null
    })
    
    const list3Id = await db.lists.add({
      name: 'Third in Column',
      order: 102,
      columnIndex: 2,
      archivedAt: null
    })
    
    render(App)
    
    // Wait for all lists to appear
    await waitFor(() => {
      expect(screen.getByText('First in Column')).toBeInTheDocument()
      expect(screen.getByText('Second in Column')).toBeInTheDocument()
      expect(screen.getByText('Third in Column')).toBeInTheDocument()
    })
    
    // Get lists in column 2
    const column2Lists = getListsInColumn(2)
    
    // Verify order is maintained (lower order values appear first)
    const firstIndex = column2Lists.indexOf('First in Column')
    const secondIndex = column2Lists.indexOf('Second in Column')
    const thirdIndex = column2Lists.indexOf('Third in Column')
    
    expect(firstIndex).toBeLessThan(secondIndex)
    expect(secondIndex).toBeLessThan(thirdIndex)
  }, 10000)

  it('shows "Create new list" button in each column when no lists exist', async () => {
    // Clear all lists
    await db.lists.clear()
    
    render(App)
    
    // Wait for empty state
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })
    
    // Verify 5 columns exist
    const columns = getColumns()
    expect(columns.length).toBe(5)
    
    // Verify "Create new list" button appears in each column
    const createButtons = screen.getAllByRole('button', { name: /create new list/i })
    expect(createButtons.length).toBe(5)
  }, 10000)
})

