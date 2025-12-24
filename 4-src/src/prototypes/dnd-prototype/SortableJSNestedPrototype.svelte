<script>
  import { onMount, tick } from 'svelte'
  import Sortable from 'sortablejs'

  // Constants
  const ANIMATION_DURATION = 150
  const INIT_DELAY_MS = 100
  const BINDING_DELAY_MS = 100
  const RETRY_DELAY_MS = 200
  const ACTION_INIT_DELAY_MS = 10

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
      onEnd: (evt) => {
        handleTaskDragEnd(evt, listId)
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
      onEnd: onEndHandler
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
</style>

