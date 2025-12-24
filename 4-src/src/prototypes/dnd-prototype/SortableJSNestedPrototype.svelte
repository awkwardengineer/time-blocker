<script>
  import { onMount, tick, onDestroy } from 'svelte'
  import Sortable from 'sortablejs'

  // Constants
  const ANIMATION_DURATION = 150
  const INIT_DELAY_MS = 100
  const BINDING_DELAY_MS = 100
  const RETRY_DELAY_MS = 200
  const ACTION_INIT_DELAY_MS = 10

  // Keyboard drag state
  let isKeyboardDragging = $state(false)
  let draggedItemId = $state(null) // taskId or listId
  let draggedItemType = $state(null) // 'task' or 'list'
  let draggedItemElement = $state(null) // HTMLElement
  let lastBlurredElement = $state(null) // HTMLElement for Tab resume
  let shouldRefocusOnNextTab = $state(false)
  
  // Mouse drag state
  let isMouseDragging = $state(false)
  let mouseDragType = $state(null) // 'task' or 'list'

  // Nested structure: Columns -> Lists -> Tasks
  // Column 1
  let column1Lists = $state([
    {
      id: 1,
      name: 'List 1',
      tasks: [
        { id: 1, text: 'Task 1-1' },
        { id: 2, text: 'Task 1-2' },
        { id: 3, text: 'Task 1-3' }
      ]
    },
    {
      id: 2,
      name: 'List 2',
      tasks: [
        { id: 4, text: 'Task 2-1' },
        { id: 5, text: 'Task 2-2' }
      ]
    },
    {
      id: 3,
      name: 'List 3',
      tasks: [
        { id: 6, text: 'Task 3-1' },
        { id: 7, text: 'Task 3-2' }
      ]
    }
  ])

  // Column 2
  let column2Lists = $state([
    {
      id: 4,
      name: 'List 4',
      tasks: [
        { id: 8, text: 'Task 4-1' },
        { id: 9, text: 'Task 4-2' },
        { id: 10, text: 'Task 4-3' }
      ]
    },
    {
      id: 5,
      name: 'List 5',
      tasks: [
        { id: 11, text: 'Task 5-1' },
        { id: 12, text: 'Task 5-2' },
        { id: 13, text: 'Task 5-3' },
        { id: 14, text: 'Task 5-4' }
      ]
    },
    {
      id: 6,
      name: 'List 6',
      tasks: [
        { id: 15, text: 'Task 6-1' }
      ]
    }
  ])

  // Store references to DOM elements and Sortable instances
  let column1Element = $state(null)
  let column2Element = $state(null)
  let listElements = $state(new Map()) // Map<listId, HTMLElement>
  let taskListElements = $state(new Map()) // Map<listId, HTMLElement>
  let columnSortables = $state(new Map()) // Map<columnElement, Sortable>
  let taskSortables = $state(new Map()) // Map<listId, Sortable>
  
  // Helper to get all lists from both columns
  function getAllLists() {
    return [...column1Lists, ...column2Lists]
  }

  // Svelte action to bind task list elements
  function bindTaskListElement(node, listId) {
    if (node) {
      taskListElements.set(listId, node)
      // Try to initialize sortable for this list if not already done
      setTimeout(() => {
        if (!taskSortables.has(listId) && taskListElements.has(listId)) {
          initializeTaskSortableForList(listId)
        }
      }, ACTION_INIT_DELAY_MS)
    }
    return {
      update(newListId) {
        taskListElements.delete(listId)
        if (node) {
          taskListElements.set(newListId, node)
        }
      },
      destroy() {
        taskListElements.delete(listId)
        const sortable = taskSortables.get(listId)
        if (sortable) {
          sortable.destroy()
          taskSortables.delete(listId)
        }
      }
    }
  }
  
  function initializeTaskSortableForList(listId) {
    const taskListElement = taskListElements.get(listId)
    if (!taskListElement) {
      return
    }
    
    // Don't reinitialize if already exists
    if (taskSortables.has(listId)) {
      return
    }
    
    const taskSortable = new Sortable(taskListElement, {
      animation: ANIMATION_DURATION,
      ghostClass: 'sortable-ghost',
      group: 'tasks', // Enable cross-list task dragging
      draggable: 'li[data-task-id]', // Only drag task items
      onStart: () => {
        isMouseDragging = true
        mouseDragType = 'task'
        updateMouseDragDropZones()
      },
      onEnd: (evt) => {
        handleTaskDragEnd(evt, listId)
        isMouseDragging = false
        mouseDragType = null
        clearMouseDragDropZones()
      }
    })
    
    taskSortables.set(listId, taskSortable)
  }

  // Create column sortable configuration
  function createColumnSortableConfig(onEndHandler) {
    return {
      animation: ANIMATION_DURATION,
      ghostClass: 'sortable-ghost',
      group: 'lists', // Enable cross-column list dragging
      draggable: '.list-container', // Only drag list containers
      filter: 'ul, li', // Prevent dragging tasks (ul and li elements)
      preventOnFilter: false, // Allow default behavior for filtered elements
      onStart: () => {
        isMouseDragging = true
        mouseDragType = 'list'
        updateMouseDragDropZones()
      },
      onEnd: (evt) => {
        onEndHandler(evt)
        isMouseDragging = false
        mouseDragType = null
        clearMouseDragDropZones()
      }
    }
  }

  onMount(() => {
    // Initialize column-level dragging (lists between columns)
    if (column1Element && column2Element) {
      const col1Sortable = new Sortable(column1Element, createColumnSortableConfig((evt) => {
        handleListDragEnd(evt, 1, 2)
      }))
      columnSortables.set(column1Element, col1Sortable)

      const col2Sortable = new Sortable(column2Element, createColumnSortableConfig((evt) => {
        handleListDragEnd(evt, 2, 1)
      }))
      columnSortables.set(column2Element, col2Sortable)
    }

    // Initialize task-level dragging after DOM is ready
    setTimeout(() => {
      initializeTaskSortables()
    }, INIT_DELAY_MS)
  })

  function initializeTaskSortables() {
    const allLists = getAllLists()
    
    // Clean up sortables for lists that no longer exist
    const existingListIds = new Set(allLists.map(l => l.id))
    taskSortables.forEach((sortable, listId) => {
      if (!existingListIds.has(listId)) {
        sortable.destroy()
        taskSortables.delete(listId)
      }
    })
    
    // Initialize sortables for all lists
    allLists.forEach(list => {
      initializeTaskSortableForList(list.id)
    })
  }

  // Reinitialize task sortables after list moves
  async function reinitializeTaskSortablesAfterListMove() {
    // Destroy all task sortables first
    taskSortables.forEach(sortable => sortable.destroy())
    taskSortables.clear()
    
    // Wait for Svelte to update DOM
    await tick()
    await tick()
    
    // Wait for action bindings to complete
    await new Promise(resolve => setTimeout(resolve, BINDING_DELAY_MS))
    
    // Reinitialize
    initializeTaskSortables()
    
    // Retry for any missing sortables
    setTimeout(() => {
      const allLists = getAllLists()
      allLists.forEach(list => {
        if (!taskSortables.has(list.id)) {
          initializeTaskSortableForList(list.id)
        }
      })
    }, RETRY_DELAY_MS)
  }

  // Reorder lists within the same column
  function reorderListsInColumn(columnElement, columnLists) {
    const items = Array.from(columnElement.children)
    return items.map(item => {
      const listId = parseInt(item.dataset.listId)
      return columnLists.find(l => l.id === listId)
    }).filter(Boolean)
  }

  // Move list between columns
  function moveListBetweenColumns(fromLists, toLists, oldIndex, newIndex) {
    const movedList = fromLists[oldIndex]
    const newFromLists = fromLists.filter((_, i) => i !== oldIndex)
    const newToLists = [
      ...toLists.slice(0, newIndex),
      movedList,
      ...toLists.slice(newIndex)
    ]
    return { newFromLists, newToLists }
  }

  function handleListDragEnd(evt, fromColumn, toColumn) {
    const { oldIndex, newIndex, from, to } = evt
    
    if (from === to) {
      // Same column reordering
      if (fromColumn === 1) {
        column1Lists = reorderListsInColumn(column1Element, column1Lists)
      } else {
        column2Lists = reorderListsInColumn(column2Element, column2Lists)
      }
    } else {
      // Cross-column movement
      const fromLists = fromColumn === 1 ? column1Lists : column2Lists
      const toLists = toColumn === 1 ? column1Lists : column2Lists
      
      const { newFromLists, newToLists } = moveListBetweenColumns(fromLists, toLists, oldIndex, newIndex)
      
      if (fromColumn === 1) {
        column1Lists = newFromLists
        column2Lists = newToLists
      } else {
        column2Lists = newFromLists
        column1Lists = newToLists
      }
      
      // Reinitialize task sortables after list move
      reinitializeTaskSortablesAfterListMove()
    }
  }

  // Reorder tasks within the same list
  function reorderTasksInList(listElement, tasks) {
    const items = Array.from(listElement.children)
    return items.map(item => {
      const taskId = parseInt(item.dataset.taskId)
      return tasks.find(t => t.id === taskId)
    }).filter(Boolean)
  }

  // Update column state to trigger reactivity
  function updateColumnState(listId) {
    if (column1Lists.find(l => l.id === listId)) {
      column1Lists = [...column1Lists]
    } else {
      column2Lists = [...column2Lists]
    }
  }

  function handleTaskDragEnd(evt, sourceListId) {
    const { oldIndex, newIndex, from, to } = evt
    
    const targetListId = parseInt(to.dataset.listId)
    const allLists = getAllLists()
    const sourceList = allLists.find(l => l.id === sourceListId)
    const targetList = allLists.find(l => l.id === targetListId)
    
    if (!sourceList || !targetList) {
      return
    }
    
    if (sourceListId === targetListId) {
      // Same list reordering
      sourceList.tasks = reorderTasksInList(to, sourceList.tasks)
    } else {
      // Cross-list movement
      const movedTask = sourceList.tasks[oldIndex]
      sourceList.tasks = sourceList.tasks.filter((_, i) => i !== oldIndex)
      targetList.tasks = [
        ...targetList.tasks.slice(0, newIndex),
        movedTask,
        ...targetList.tasks.slice(newIndex)
      ]
    }
    
    // Update state to trigger reactivity
    updateColumnState(sourceListId)
    if (sourceListId !== targetListId) {
      updateColumnState(targetListId)
    }
  }

  // Keyboard drag helpers
  function findTaskElement(taskId) {
    return document.querySelector(`li[data-task-id="${taskId}"]`)
  }

  function findListElement(listId) {
    return document.querySelector(`.list-container[data-list-id="${listId}"]`)
  }

  function findListContainer(listId) {
    const listElement = findListElement(listId)
    return listElement ? listElement.querySelector('ul[data-list-id]') : null
  }

  function getTaskListId(taskElement) {
    const listContainer = taskElement.closest('ul[data-list-id]')
    return listContainer ? parseInt(listContainer.dataset.listId) : null
  }

  function getTaskIndex(taskId, listId) {
    const allLists = getAllLists()
    const list = allLists.find(l => l.id === listId)
    if (!list) return -1
    return list.tasks.findIndex(t => t.id === taskId)
  }

  function getListIndex(listId, columnElement) {
    const items = Array.from(columnElement.children)
    return items.findIndex(item => parseInt(item.dataset.listId) === listId)
  }

  function getColumnForList(listId) {
    if (column1Lists.find(l => l.id === listId)) {
      return { element: column1Element, lists: column1Lists, columnNum: 1 }
    } else if (column2Lists.find(l => l.id === listId)) {
      return { element: column2Element, lists: column2Lists, columnNum: 2 }
    }
    return null
  }

  function getNeighborListId(listId, direction) {
    const column = getColumnForList(listId)
    if (!column) return null
    
    const currentIndex = getListIndex(listId, column.element)
    if (currentIndex === -1) return null
    
    if (direction === 'up' && currentIndex > 0) {
      return parseInt(column.element.children[currentIndex - 1].dataset.listId)
    } else if (direction === 'down' && currentIndex < column.element.children.length - 1) {
      return parseInt(column.element.children[currentIndex + 1].dataset.listId)
    } else if (direction === 'left' && column.columnNum === 2) {
      // Move to column 1, same position
      const targetIndex = Math.min(currentIndex, column1Lists.length)
      return column1Lists[targetIndex]?.id || null
    } else if (direction === 'right' && column.columnNum === 1) {
      // Move to column 2, same position
      const targetIndex = Math.min(currentIndex, column2Lists.length)
      return column2Lists[targetIndex]?.id || null
    }
    return null
  }

  function getNeighborTaskId(taskId, listId, direction) {
    const allLists = getAllLists()
    const list = allLists.find(l => l.id === listId)
    if (!list) return null
    
    const currentIndex = getTaskIndex(taskId, listId)
    if (currentIndex === -1) return null
    
    if (direction === 'up' && currentIndex > 0) {
      return list.tasks[currentIndex - 1].id
    } else if (direction === 'down' && currentIndex < list.tasks.length - 1) {
      return list.tasks[currentIndex + 1].id
    } else if (direction === 'left' || direction === 'right') {
      // Cross-list movement
      const neighborListId = getNeighborListId(listId, direction)
      if (neighborListId) {
        const neighborList = allLists.find(l => l.id === neighborListId)
        if (neighborList && neighborList.tasks.length > 0) {
          // Move to same position in neighbor list, or end if position doesn't exist
          const targetIndex = Math.min(currentIndex, neighborList.tasks.length)
          return neighborList.tasks[targetIndex].id
        }
      }
    }
    return null
  }

  function moveTaskWithKeyboard(taskId, direction) {
    const taskElement = findTaskElement(taskId)
    if (!taskElement) return false
    
    const currentListId = getTaskListId(taskElement)
    if (!currentListId) return false
    
    const allLists = getAllLists()
    const sourceList = allLists.find(l => l.id === currentListId)
    if (!sourceList) return false
    
    const sourceIndex = getTaskIndex(taskId, currentListId)
    if (sourceIndex === -1) return false
    
    let targetListId = currentListId
    let targetIndex = sourceIndex
    
    // Calculate target position
    if (direction === 'up') {
      if (sourceIndex > 0) {
        // Move within same list
        targetIndex = sourceIndex - 1
      } else {
        // At start of list - move to end of previous list in same column
        const neighborListId = getNeighborListId(currentListId, 'up')
        if (neighborListId) {
          targetListId = neighborListId
          const targetList = allLists.find(l => l.id === targetListId)
          if (targetList && targetList.tasks.length > 0) {
            targetIndex = targetList.tasks.length // Insert at end
          } else {
            return false
          }
        } else {
          return false
        }
      }
    } else if (direction === 'down') {
      if (sourceIndex < sourceList.tasks.length - 1) {
        // Move within same list
        targetIndex = sourceIndex + 1
      } else {
        // At end of list - move to start of next list in same column
        const neighborListId = getNeighborListId(currentListId, 'down')
        if (neighborListId) {
          targetListId = neighborListId
          targetIndex = 0 // Insert at start
        } else {
          return false
        }
      }
    } else if (direction === 'left' || direction === 'right') {
      // Cross-column movement (between columns)
      const neighborListId = getNeighborListId(currentListId, direction)
      if (neighborListId) {
        targetListId = neighborListId
        const targetList = allLists.find(l => l.id === targetListId)
        if (targetList) {
          // Move to same position in neighbor list, or end if position doesn't exist
          targetIndex = Math.min(sourceIndex, targetList.tasks.length)
        } else {
          return false
        }
      } else {
        return false
      }
    } else {
      // Can't move in this direction
      return false
    }
    
    // Update state
    const movedTask = sourceList.tasks[sourceIndex]
    if (!movedTask) return false
    
    if (currentListId === targetListId) {
      // Same list reordering
      const newTasks = [...sourceList.tasks]
      newTasks.splice(sourceIndex, 1)
      newTasks.splice(targetIndex, 0, movedTask)
      sourceList.tasks = newTasks
      updateColumnState(currentListId)
    } else {
      // Cross-list movement
      const targetList = allLists.find(l => l.id === targetListId)
      if (!targetList) return false
      
      sourceList.tasks = sourceList.tasks.filter((_, i) => i !== sourceIndex)
      targetList.tasks = [
        ...targetList.tasks.slice(0, targetIndex),
        movedTask,
        ...targetList.tasks.slice(targetIndex)
      ]
      updateColumnState(currentListId)
      updateColumnState(targetListId)
    }
    
    // Update dragged item ID to track the moved item
    draggedItemId = taskId
    
    return true
  }

  function moveListWithKeyboard(listId, direction) {
    const column = getColumnForList(listId)
    if (!column) return false
    
    const sourceIndex = getListIndex(listId, column.element)
    if (sourceIndex === -1) return false
    
    let targetColumn = column
    let targetIndex = sourceIndex
    
    // Calculate target position
    if (direction === 'up' && sourceIndex > 0) {
      targetIndex = sourceIndex - 1
    } else if (direction === 'down' && sourceIndex < column.lists.length - 1) {
      targetIndex = sourceIndex + 1
    } else if (direction === 'left' && column.columnNum === 2) {
      // Move to column 1
      targetColumn = { element: column1Element, lists: column1Lists, columnNum: 1 }
      targetIndex = Math.min(sourceIndex, column1Lists.length)
    } else if (direction === 'right' && column.columnNum === 1) {
      // Move to column 2
      targetColumn = { element: column2Element, lists: column2Lists, columnNum: 2 }
      targetIndex = Math.min(sourceIndex, column2Lists.length)
    } else {
      // Can't move in this direction
      return false
    }
    
    // Update state
    const movedList = column.lists[sourceIndex]
    if (!movedList) return false
    
    if (column.columnNum === targetColumn.columnNum) {
      // Same column reordering
      const newLists = [...column.lists]
      newLists.splice(sourceIndex, 1)
      newLists.splice(targetIndex, 0, movedList)
      if (column.columnNum === 1) {
        column1Lists = newLists
      } else {
        column2Lists = newLists
      }
    } else {
      // Cross-column movement
      if (column.columnNum === 1) {
        column1Lists = column1Lists.filter((_, i) => i !== sourceIndex)
        column2Lists = [
          ...column2Lists.slice(0, targetIndex),
          movedList,
          ...column2Lists.slice(targetIndex)
        ]
      } else {
        column2Lists = column2Lists.filter((_, i) => i !== sourceIndex)
        column1Lists = [
          ...column1Lists.slice(0, targetIndex),
          movedList,
          ...column1Lists.slice(targetIndex)
        ]
      }
      
      // Reinitialize task sortables after cross-column move
      reinitializeTaskSortablesAfterListMove()
    }
    
    // Update dragged item ID to track the moved item
    draggedItemId = listId
    
    return true
  }

  function applyDropZoneStyles(element) {
    if (element instanceof HTMLElement) {
      element.classList.add('keyboard-drop-zone')
      // Use box-shadow inset instead of border to avoid layout shift
      // This matches the UI kit pattern and doesn't affect element size
      element.style.boxShadow = 'inset 0 0 0 2px rgba(107, 143, 217, 0.4)'
      element.style.backgroundColor = 'rgba(107, 143, 217, 0.04)'
    }
  }
  
  function removeDropZoneStyles(element) {
    if (element instanceof HTMLElement) {
      element.classList.remove('keyboard-drop-zone')
      element.style.removeProperty('box-shadow')
      element.style.removeProperty('background-color')
    }
  }
  
  function updateMouseDragDropZones() {
    if (!isMouseDragging || !mouseDragType) return
    
    if (mouseDragType === 'task') {
      // All task lists are valid drop zones
      getAllLists().forEach(list => {
        const listContainer = findListContainer(list.id)
        if (listContainer) {
          applyDropZoneStyles(listContainer)
        }
      })
    } else if (mouseDragType === 'list') {
      // Both columns are valid drop zones
      if (column1Element) applyDropZoneStyles(column1Element)
      if (column2Element) applyDropZoneStyles(column2Element)
    }
  }
  
  function clearMouseDragDropZones() {
    document.querySelectorAll('.keyboard-drop-zone').forEach(el => {
      removeDropZoneStyles(el)
    })
  }
  
  function updateVisualFeedback() {
    // Remove all visual feedback
    document.querySelectorAll('.keyboard-drag-active').forEach(el => {
      el.classList.remove('keyboard-drag-active')
      // Remove inline styles if any
      if (el instanceof HTMLElement) {
        el.style.removeProperty('border')
        el.style.removeProperty('background-color')
      }
    })
    // Only clear drop zones if not mouse dragging (mouse drag has its own cleanup)
    if (!isMouseDragging) {
      clearMouseDragDropZones()
    }
    
    if (!isKeyboardDragging || !draggedItemId || !draggedItemType) return
    
    // Highlight dragged item
    const draggedElement = draggedItemType === 'task' 
      ? findTaskElement(draggedItemId)
      : findListElement(draggedItemId)
    
    if (draggedElement) {
      draggedElement.classList.add('keyboard-drag-active')
      // Ensure the element maintains focus so the ring stays visible
      if (document.activeElement !== draggedElement && draggedElement instanceof HTMLElement) {
        draggedElement.focus()
      }
    }
    
    // Highlight valid drop zones
    if (draggedItemType === 'task') {
      // All task lists are valid drop zones
      getAllLists().forEach(list => {
        const listContainer = findListContainer(list.id)
        if (listContainer) {
          applyDropZoneStyles(listContainer)
        }
      })
    } else if (draggedItemType === 'list') {
      // Both columns are valid drop zones
      if (column1Element) applyDropZoneStyles(column1Element)
      if (column2Element) applyDropZoneStyles(column2Element)
    }
  }

  // Keyboard event handlers
  function handleItemKeydown(event, itemId, itemType) {
    const key = event.key
    
    if (key === 'Enter' || key === ' ') {
      event.preventDefault()
      event.stopPropagation()
      
      if (!isKeyboardDragging) {
        // Start keyboard drag
        isKeyboardDragging = true
        draggedItemId = itemId
        draggedItemType = itemType
        draggedItemElement = event.currentTarget
        updateVisualFeedback()
      } else if (draggedItemId === itemId && draggedItemType === itemType) {
        // Drop at current position
        isKeyboardDragging = false
        lastBlurredElement = event.currentTarget
        shouldRefocusOnNextTab = true
        draggedItemId = null
        draggedItemType = null
        draggedItemElement = null
        updateVisualFeedback()
        // Blur after drop
        if (event.currentTarget instanceof HTMLElement) {
          event.currentTarget.blur()
        }
      }
    } else if (key === 'Escape') {
      // Only handle Escape here if document handler didn't already handle it
      // (document handler runs in capture phase and will stop propagation if dragging)
      if (!isKeyboardDragging) {
        // Just blur if item is not grabbed
        event.preventDefault()
        event.stopPropagation()
        if (event.currentTarget instanceof HTMLElement) {
          event.currentTarget.blur()
        }
      }
      // If dragging, let document handler take care of it (it runs first in capture phase)
    }
  }

  function handleDocumentKeydown(event) {
    const key = event.key
    
    // Tab resume behavior (only when not dragging)
    if (!isKeyboardDragging && key === 'Tab' && shouldRefocusOnNextTab && lastBlurredElement) {
      event.preventDefault()
      lastBlurredElement.focus()
      shouldRefocusOnNextTab = false
      lastBlurredElement = null
      return
    }
    
    // Escape key handling
    if (key === 'Escape') {
      if (isKeyboardDragging) {
        // Drop and blur if item is grabbed
        event.preventDefault()
        event.stopPropagation()
        event.stopImmediatePropagation() // Prevent item handler from running
        
        // Save reference before clearing
        const elementToBlur = draggedItemElement
        
        isKeyboardDragging = false
        lastBlurredElement = elementToBlur
        shouldRefocusOnNextTab = true
        draggedItemId = null
        draggedItemType = null
        draggedItemElement = null
        updateVisualFeedback()
        
        // Blur the dragged element
        if (elementToBlur instanceof HTMLElement) {
          elementToBlur.blur()
        }
      } else {
        // If not dragging, blur the currently focused item if it's a draggable item
        const activeElement = document.activeElement
        if (activeElement && (
          activeElement.hasAttribute('data-task-id') || 
          activeElement.classList.contains('list-container')
        )) {
          event.preventDefault()
          event.stopPropagation()
          if (activeElement instanceof HTMLElement) {
            activeElement.blur()
          }
        }
        // Otherwise, let Escape propagate normally
      }
      return
    }
    
    // Only handle other keys when dragging
    if (!isKeyboardDragging) {
      return
    }
    
    // Arrow keys to move during drag
    if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight') {
      event.preventDefault()
      event.stopPropagation()
      
      const direction = key === 'ArrowUp' ? 'up' 
        : key === 'ArrowDown' ? 'down'
        : key === 'ArrowLeft' ? 'left'
        : 'right'
      
      if (draggedItemType === 'task') {
        const moved = moveTaskWithKeyboard(draggedItemId, direction)
        if (moved) {
          // Update dragged element reference after move
          tick().then(() => {
            const newElement = findTaskElement(draggedItemId)
            if (newElement) {
              draggedItemElement = newElement
            }
            updateVisualFeedback()
          })
        }
      } else if (draggedItemType === 'list') {
        const moved = moveListWithKeyboard(draggedItemId, direction)
        if (moved) {
          // Update dragged element reference after move
          tick().then(() => {
            const newElement = findListElement(draggedItemId)
            if (newElement) {
              draggedItemElement = newElement
            }
            updateVisualFeedback()
          })
        }
      }
    } else if (key === 'Tab' || key === 'Enter' || key === ' ') {
      // Drop
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation() // Prevent item handler from running
      
      // Save reference before clearing
      const elementToBlur = draggedItemElement
      
      isKeyboardDragging = false
      lastBlurredElement = elementToBlur
      shouldRefocusOnNextTab = true
      draggedItemId = null
      draggedItemType = null
      draggedItemElement = null
      updateVisualFeedback()
      
      // Blur after drop
      if (elementToBlur instanceof HTMLElement) {
        elementToBlur.blur()
      }
    }
  }

  // Set up document-level keyboard handler
  onMount(() => {
    document.addEventListener('keydown', handleDocumentKeydown, true)
  })

  onDestroy(() => {
    document.removeEventListener('keydown', handleDocumentKeydown, true)
  })

  // Update visual feedback when drag state changes
  $effect(() => {
    updateVisualFeedback()
  })

  // Cleanup
  $effect(() => {
    return () => {
      columnSortables.forEach(sortable => sortable.destroy())
      taskSortables.forEach(sortable => sortable.destroy())
    }
  })
</script>

<div class="min-h-screen bg-grey-10 p-8">
  <div class="max-w-7xl mx-auto">
    <h1 class="text-3xl font-bold mb-4">SortableJS Nested Containers Prototype</h1>
    <p class="mb-6 text-grey-100">Testing nested drag-and-drop: Columns → Lists → Tasks</p>
    <div class="mb-4 p-3 bg-blue-50 rounded text-sm">
      <p class="font-semibold mb-2">Keyboard Controls:</p>
      <ul class="list-disc list-inside space-y-1">
        <li><strong>Enter/Space</strong> on item: Start/End keyboard drag</li>
        <li><strong>Arrow Keys</strong>: Move item during drag</li>
        <li><strong>Tab/Enter/Space/Escape</strong>: Drop item</li>
        <li><strong>Tab</strong> after drop: Resume focus on dropped item</li>
      </ul>
    </div>
    
    <div class="grid grid-cols-2 gap-8">
      <!-- Column 1 -->
      <div class="bg-white p-4 rounded shadow">
        <h2 class="text-xl font-semibold mb-4">Column 1</h2>
        <div 
          bind:this={column1Element}
          id="column1"
          class="space-y-4"
        >
          {#each column1Lists as list (list.id)}
            <div 
              class="list-container border-2 border-grey-50 rounded p-4 bg-grey-20"
              data-list-id={list.id}
              tabindex="0"
              role="button"
              aria-grabbed={isKeyboardDragging && draggedItemId === list.id && draggedItemType === 'list'}
              onkeydown={(e) => handleItemKeydown(e, list.id, 'list')}
            >
              <h3 class="font-semibold mb-2 cursor-move">{list.name}</h3>
              <ul 
                use:bindTaskListElement={list.id}
                data-list-id={list.id}
                class="space-y-2 min-h-[50px]"
              >
                {#each list.tasks as task (task.id)}
                  <li 
                    data-task-id={task.id}
                    class="p-2 bg-white rounded cursor-move hover:bg-grey-30"
                    tabindex="0"
                    role="button"
                    aria-grabbed={isKeyboardDragging && draggedItemId === task.id && draggedItemType === 'task'}
                    onkeydown={(e) => handleItemKeydown(e, task.id, 'task')}
                  >
                    {task.text}
                  </li>
                {/each}
              </ul>
            </div>
          {/each}
        </div>
      </div>

      <!-- Column 2 -->
      <div class="bg-white p-4 rounded shadow">
        <h2 class="text-xl font-semibold mb-4">Column 2</h2>
        <div 
          bind:this={column2Element}
          id="column2"
          class="space-y-4"
        >
          {#each column2Lists as list (list.id)}
            <div 
              class="list-container border-2 border-grey-50 rounded p-4 bg-grey-20"
              data-list-id={list.id}
              tabindex="0"
              role="button"
              aria-grabbed={isKeyboardDragging && draggedItemId === list.id && draggedItemType === 'list'}
              onkeydown={(e) => handleItemKeydown(e, list.id, 'list')}
            >
              <h3 class="font-semibold mb-2 cursor-move">{list.name}</h3>
              <ul 
                use:bindTaskListElement={list.id}
                data-list-id={list.id}
                class="space-y-2 min-h-[50px]"
              >
                {#each list.tasks as task (task.id)}
                  <li 
                    data-task-id={task.id}
                    class="p-2 bg-white rounded cursor-move hover:bg-grey-30"
                    tabindex="0"
                    role="button"
                    aria-grabbed={isKeyboardDragging && draggedItemId === task.id && draggedItemType === 'task'}
                    onkeydown={(e) => handleItemKeydown(e, task.id, 'task')}
                  >
                    {task.text}
                  </li>
                {/each}
              </ul>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <div class="mt-8 p-4 bg-grey-20 rounded">
      <h3 class="font-semibold mb-2">State:</h3>
      <pre class="text-sm overflow-auto max-h-96">{JSON.stringify({ column1Lists, column2Lists }, null, 2)}</pre>
    </div>
  </div>
</div>

<style>
  .sortable-ghost {
    opacity: 0.4;
    background-color: #c8ebfb;
  }
  
  .list-container.sortable-ghost {
    border-color: #6b8fd9;
  }

  /* Keyboard drag visual feedback - grabbed state */
  .keyboard-drag-active {
    /* Keep focus ring visible even when grabbed */
    outline: none !important;
    box-shadow: 0 0 0 2px #6B8FD9 !important; /* blue-500 focus ring */
    background-color: rgba(219, 234, 254, 0.5) !important; /* light blue background */
    z-index: 1000;
  }

  /* Ensure focus ring stays visible on grabbed items */
  .keyboard-drag-active:focus {
    outline: none !important;
    box-shadow: 0 0 0 2px #6B8FD9 !important;
  }

  /* Drop zone styling - matches UI kit Option 2 (Light Blue) */
  /* Use box-shadow inset instead of border to avoid layout shift */
  /* Use very specific selectors to override Tailwind */
  div.keyboard-drop-zone,
  ul.keyboard-drop-zone,
  #column1.keyboard-drop-zone,
  #column2.keyboard-drop-zone {
    background-color: rgba(107, 143, 217, 0.04) !important; /* blue-500 with 4% opacity */
    /* Use inset box-shadow instead of border to avoid layout shift */
    box-shadow: inset 0 0 0 2px rgba(107, 143, 217, 0.4) !important; /* blue-500 with 40% opacity */
    outline: none !important;
  }
  
  /* Override any Tailwind border utilities */
  [class*="border-"].keyboard-drop-zone {
    box-shadow: inset 0 0 0 2px rgba(107, 143, 217, 0.4) !important;
  }

  /* Standard focus ring for interactive elements */
  li:focus,
  .list-container:focus {
    outline: none;
    box-shadow: 0 0 0 2px #6B8FD9; /* blue-500 focus ring */
  }

  /* Ensure focus ring is visible even when item is grabbed */
  li.keyboard-drag-active:focus,
  .list-container.keyboard-drag-active:focus {
    outline: none;
    box-shadow: 0 0 0 2px #6B8FD9 !important;
  }
</style>

