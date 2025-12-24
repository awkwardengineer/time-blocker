<script>
  import { onMount, tick } from 'svelte'
  import Sortable from 'sortablejs'

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
  
  // Svelte action to bind task list elements
  function bindTaskListElement(node, listId) {
    if (node) {
      taskListElements.set(listId, node)
      console.log(`Task list element bound for list ${listId}`)
      // Try to initialize sortable for this list if not already done
      setTimeout(() => {
        if (!taskSortables.has(listId) && taskListElements.has(listId)) {
          initializeTaskSortableForList(listId)
        }
      }, 10)
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
      animation: 150,
      ghostClass: 'sortable-ghost',
      group: 'tasks', // Enable cross-list task dragging
      onEnd: (evt) => {
        handleTaskDragEnd(evt, listId)
      }
    })
    
    taskSortables.set(listId, taskSortable)
    console.log(`Task sortable initialized for list ${listId}`)
  }

  onMount(() => {
    console.log('SortableJSNestedPrototype onMount called')
    
    // Initialize column-level dragging (lists between columns)
    if (column1Element && column2Element) {
      // Column 1 - lists can be dragged
      const col1Sortable = new Sortable(column1Element, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        group: 'lists', // Enable cross-column list dragging
        draggable: '.list-container', // Only drag list containers
        filter: 'ul, li', // Prevent dragging tasks (ul and li elements)
        preventOnFilter: false, // Allow default behavior for filtered elements
        onEnd: (evt) => {
          handleListDragEnd(evt, 1, 2)
        }
      })
      columnSortables.set(column1Element, col1Sortable)

      // Column 2 - lists can be dragged
      const col2Sortable = new Sortable(column2Element, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        group: 'lists', // Enable cross-column list dragging
        draggable: '.list-container', // Only drag list containers
        filter: 'ul, li', // Prevent dragging tasks (ul and li elements)
        preventOnFilter: false, // Allow default behavior for filtered elements
        onEnd: (evt) => {
          handleListDragEnd(evt, 2, 1)
        }
      })
      columnSortables.set(column2Element, col2Sortable)

      console.log('Column sortables initialized')
    }

    // Initialize task-level dragging (tasks within and between lists)
    // We'll do this in a $effect or after a small delay to ensure DOM is ready
    setTimeout(() => {
      initializeTaskSortables()
    }, 100)
  })

  function initializeTaskSortables() {
    // Get all lists from both columns
    const allLists = [...column1Lists, ...column2Lists]
    
    // Clear existing sortables for lists that no longer exist
    const existingListIds = new Set(allLists.map(l => l.id))
    taskSortables.forEach((sortable, listId) => {
      if (!existingListIds.has(listId)) {
        sortable.destroy()
        taskSortables.delete(listId)
      }
    })
    
    // Initialize sortables for all lists that have bound elements
    allLists.forEach(list => {
      initializeTaskSortableForList(list.id)
    })
  }

  function handleListDragEnd(evt, fromColumn, toColumn) {
    const { oldIndex, newIndex, from, to } = evt
    
    console.log('List drag ended:', { oldIndex, newIndex, fromColumn, toColumn, from: from.id, to: to.id })
    
    if (from === to) {
      // Same column reordering
      if (fromColumn === 1) {
        const items = Array.from(column1Element.children)
        const reordered = items.map(item => {
          const listId = parseInt(item.dataset.listId)
          return column1Lists.find(l => l.id === listId)
        }).filter(Boolean)
        column1Lists = reordered
      } else {
        const items = Array.from(column2Element.children)
        const reordered = items.map(item => {
          const listId = parseInt(item.dataset.listId)
          return column2Lists.find(l => l.id === listId)
        }).filter(Boolean)
        column2Lists = reordered
      }
    } else {
      // Cross-column movement
      const fromLists = fromColumn === 1 ? column1Lists : column2Lists
      const toLists = toColumn === 1 ? column1Lists : column2Lists
      
      const movedList = fromLists[oldIndex]
      const newFromLists = fromLists.filter((_, i) => i !== oldIndex)
      const newToLists = [
        ...toLists.slice(0, newIndex),
        movedList,
        ...toLists.slice(newIndex)
      ]
      
      if (fromColumn === 1) {
        column1Lists = newFromLists
        column2Lists = newToLists
      } else {
        column2Lists = newFromLists
        column1Lists = newToLists
      }
      
      // Reinitialize task sortables after list move (DOM structure changed)
      // Wait for Svelte to finish re-rendering and action bindings to complete
      (async () => {
        // Destroy all task sortables first
        taskSortables.forEach(sortable => sortable.destroy())
        taskSortables.clear()
        
        // Wait for Svelte to update DOM
        await tick()
        await tick()
        
        // Wait for action bindings to complete (bindTaskListElement actions)
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Reinitialize - the bindTaskListElement actions should have re-bound elements
        initializeTaskSortables()
        
        // If some are still missing, try one more time after a delay
        setTimeout(() => {
          const allLists = [...column1Lists, ...column2Lists]
          allLists.forEach(list => {
            if (!taskSortables.has(list.id)) {
              console.log(`Retrying initialization for list ${list.id}`)
              initializeTaskSortableForList(list.id)
            }
          })
        }, 200)
      })()
    }
  }

  function handleTaskDragEnd(evt, sourceListId) {
    const { oldIndex, newIndex, from, to } = evt
    
    console.log('Task drag ended:', { oldIndex, newIndex, sourceListId, from: from.id, to: to.id })
    
    // Find which list the task came from and which it went to
    const targetListId = parseInt(to.dataset.listId)
    const allLists = [...column1Lists, ...column2Lists]
    const sourceList = allLists.find(l => l.id === sourceListId)
    const targetList = allLists.find(l => l.id === targetListId)
    
    if (!sourceList || !targetList) {
      console.error('Could not find source or target list')
      return
    }
    
    if (sourceListId === targetListId) {
      // Same list reordering
      const items = Array.from(to.children)
      const reordered = items.map(item => {
        const taskId = parseInt(item.dataset.taskId)
        return sourceList.tasks.find(t => t.id === taskId)
      }).filter(Boolean)
      sourceList.tasks = reordered
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
    
    // Update state (trigger reactivity)
    if (column1Lists.find(l => l.id === sourceListId)) {
      column1Lists = [...column1Lists]
    } else {
      column2Lists = [...column2Lists]
    }
    
    if (column1Lists.find(l => l.id === targetListId)) {
      column1Lists = [...column1Lists]
    } else {
      column2Lists = [...column2Lists]
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

