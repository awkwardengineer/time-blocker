<script>
  import { onMount } from 'svelte'
  import Sortable from 'sortablejs'

  // Simple test data - 2 lists with tasks
  let list1Tasks = $state([
    { id: 1, text: 'Task 1' },
    { id: 2, text: 'Task 2' },
    { id: 3, text: 'Task 3' },
    { id: 4, text: 'Task 4' },
    { id: 5, text: 'Task 5' }
  ])

  let list2Tasks = $state([
    { id: 6, text: 'Task 6' },
    { id: 7, text: 'Task 7' },
    { id: 8, text: 'Task 8' }
  ])

  let list1Element = $state(null)
  let list2Element = $state(null)
  let sortable1 = $state(null)
  let sortable2 = $state(null)

  onMount(() => {
    if (!list1Element || !list2Element) return

    // Initialize SortableJS for list 1
    sortable1 = new Sortable(list1Element, {
      animation: 150,
      ghostClass: 'sortable-ghost',
      group: 'tasks', // Enable cross-list dragging
      onEnd: (evt) => {
        // Handle drag end - update state based on new order
        const { oldIndex, newIndex, from, to } = evt
        
        if (from === to) {
          // Same list reordering
          if (from === list1Element) {
            const items = Array.from(list1Element.children)
            list1Tasks = items.map((item, index) => {
              const id = parseInt(item.dataset.id)
              return list1Tasks.find(t => t.id === id) || { id, text: `Task ${id}` }
            })
          } else if (from === list2Element) {
            const items = Array.from(list2Element.children)
            list2Tasks = items.map((item, index) => {
              const id = parseInt(item.dataset.id)
              return list2Tasks.find(t => t.id === id) || { id, text: `Task ${id}` }
            })
          }
        } else {
          // Cross-list movement
          if (from === list1Element && to === list2Element) {
            // Moving from list 1 to list 2
            const movedTask = list1Tasks[oldIndex]
            list1Tasks = list1Tasks.filter((_, i) => i !== oldIndex)
            list2Tasks = [
              ...list2Tasks.slice(0, newIndex),
              movedTask,
              ...list2Tasks.slice(newIndex)
            ]
          } else if (from === list2Element && to === list1Element) {
            // Moving from list 2 to list 1
            const movedTask = list2Tasks[oldIndex]
            list2Tasks = list2Tasks.filter((_, i) => i !== oldIndex)
            list1Tasks = [
              ...list1Tasks.slice(0, newIndex),
              movedTask,
              ...list1Tasks.slice(newIndex)
            ]
          }
        }
        
        console.log('Drag ended:', { oldIndex, newIndex, from: from.id, to: to.id })
        console.log('List 1 tasks:', list1Tasks)
        console.log('List 2 tasks:', list2Tasks)
      }
    })

    // Initialize SortableJS for list 2
    sortable2 = new Sortable(list2Element, {
      animation: 150,
      ghostClass: 'sortable-ghost',
      group: 'tasks', // Enable cross-list dragging
      onEnd: (evt) => {
        // Same handler logic as list 1 (could be extracted)
        const { oldIndex, newIndex, from, to } = evt
        
        if (from === to) {
          // Same list reordering
          if (from === list1Element) {
            const items = Array.from(list1Element.children)
            list1Tasks = items.map((item, index) => {
              const id = parseInt(item.dataset.id)
              return list1Tasks.find(t => t.id === id) || { id, text: `Task ${id}` }
            })
          } else if (from === list2Element) {
            const items = Array.from(list2Element.children)
            list2Tasks = items.map((item, index) => {
              const id = parseInt(item.dataset.id)
              return list2Tasks.find(t => t.id === id) || { id, text: `Task ${id}` }
            })
          }
        } else {
          // Cross-list movement
          if (from === list1Element && to === list2Element) {
            const movedTask = list1Tasks[oldIndex]
            list1Tasks = list1Tasks.filter((_, i) => i !== oldIndex)
            list2Tasks = [
              ...list2Tasks.slice(0, newIndex),
              movedTask,
              ...list2Tasks.slice(newIndex)
            ]
          } else if (from === list2Element && to === list1Element) {
            const movedTask = list2Tasks[oldIndex]
            list2Tasks = list2Tasks.filter((_, i) => i !== oldIndex)
            list1Tasks = [
              ...list1Tasks.slice(0, newIndex),
              movedTask,
              ...list1Tasks.slice(newIndex)
            ]
          }
        }
        
        console.log('Drag ended:', { oldIndex, newIndex, from: from.id, to: to.id })
        console.log('List 1 tasks:', list1Tasks)
        console.log('List 2 tasks:', list2Tasks)
      }
    })

    return () => {
      // Cleanup
      if (sortable1) sortable1.destroy()
      if (sortable2) sortable2.destroy()
    }
  })
</script>

<div class="min-h-screen bg-grey-10 p-8">
  <div class="max-w-6xl mx-auto">
    <h1 class="text-3xl font-bold mb-4">SortableJS Prototype</h1>
    <p class="mb-6 text-grey-100">Testing SortableJS integration with Svelte 5</p>
    <p class="mb-4 text-sm text-grey-80">Component loaded successfully!</p>
    
    <div class="grid grid-cols-2 gap-8">
      <!-- List 1 -->
      <div class="bg-white p-4 rounded shadow">
        <h2 class="text-xl font-semibold mb-4">List 1</h2>
        <ul 
          bind:this={list1Element}
          id="list1"
          class="space-y-2"
        >
          {#each list1Tasks as task (task.id)}
            <li 
              data-id={task.id}
              class="p-3 bg-grey-20 rounded cursor-move hover:bg-grey-30"
            >
              {task.text}
            </li>
          {/each}
        </ul>
      </div>

      <!-- List 2 -->
      <div class="bg-white p-4 rounded shadow">
        <h2 class="text-xl font-semibold mb-4">List 2</h2>
        <ul 
          bind:this={list2Element}
          id="list2"
          class="space-y-2"
        >
          {#each list2Tasks as task (task.id)}
            <li 
              data-id={task.id}
              class="p-3 bg-grey-20 rounded cursor-move hover:bg-grey-30"
            >
              {task.text}
            </li>
          {/each}
        </ul>
      </div>
    </div>

    <div class="mt-8 p-4 bg-grey-20 rounded">
      <h3 class="font-semibold mb-2">State:</h3>
      <pre class="text-sm overflow-auto">{JSON.stringify({ list1Tasks, list2Tasks }, null, 2)}</pre>
    </div>
  </div>
</div>

<style>
  .sortable-ghost {
    opacity: 0.4;
    background-color: #c8ebfb;
  }
</style>

