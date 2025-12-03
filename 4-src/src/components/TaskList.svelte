<script>
  import { liveQuery } from 'dexie';
  import { dndzone } from 'svelte-dnd-action';
  import { getTasksForList, createTask, updateTaskStatus } from '../lib/dataAccess.js';
  
  let { listId, listName, newTaskInput, onInputChange } = $props();
  
  // Create liveQuery at top level - capture listId in closure
  // This creates the query once and it will automatically update when database changes
  let tasksQuery = $state(null);
  
  // Local state for drag-and-drop - synced from liveQuery
  // Only includes unchecked/checked tasks (archived excluded)
  let draggableTasks = $state([]);
  
  $effect(() => {
    // Create query once when listId is available
    if (listId && !tasksQuery) {
      tasksQuery = liveQuery(() => getTasksForList(listId));
    }
  });
  
  // Sync liveQuery results to draggableTasks for drag-and-drop
  $effect(() => {
    if ($tasksQuery && Array.isArray($tasksQuery)) {
      // Filter to only unchecked/checked tasks and create a new array
      // This ensures drag-and-drop only works on non-archived tasks
      draggableTasks = $tasksQuery.filter(task => 
        task.status === 'unchecked' || task.status === 'checked'
      );
    }
  });
  
  // Handle drag events - consider event for visual reordering only
  function handleConsider(event) {
    // Update local state for visual feedback during drag
    // No database updates here - prevents liveQuery interference
    draggableTasks = event.detail.items;
  }
  
  // Handle drag events - finalize event for database updates
  function handleFinalize(event) {
    // Update local state
    draggableTasks = event.detail.items;
    // TODO: Update database with new order values (step 3)
    // This will be implemented in the next step
    console.log('Drag finalized, new order:', event.detail.items.map(t => ({ id: t.id, order: t.order })));
  }
  
  async function handleCreateTask() {
    const taskText = newTaskInput?.trim();
    if (!taskText) {
      return;
    }
    
    try {
      await createTask(listId, taskText);
      onInputChange('');
      // No need to reload - liveQuery will update automatically!
    } catch (error) {
      console.error('Error creating task:', error);
    }
  }
  
  async function handleToggleTaskStatus(taskId, currentStatus) {
    try {
      const newStatus = currentStatus === 'unchecked' ? 'checked' : 'unchecked';
      await updateTaskStatus(taskId, newStatus);
      // No need to reload - liveQuery will update automatically!
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  }
  
  async function handleArchiveTask(taskId) {
    try {
      await updateTaskStatus(taskId, 'archived');
      // No need to reload - liveQuery will update automatically!
    } catch (error) {
      console.error('Error archiving task:', error);
    }
  }
</script>

<div>
  <h2>{listName}</h2>
  {#if tasksQuery && $tasksQuery !== undefined}
    {#if $tasksQuery.length === 0}
      <p>No tasks yet for {listName}. Add your first task.</p>
    {:else}
      <ul 
        use:dndzone={{ 
          items: draggableTasks,
          type: `list-${listId}` // Unique type per list - prevents cross-list dragging
          // TODO (milestone 050): Remove type or use shared type to enable cross-list dragging
        }}
        onconsider={handleConsider}
        onfinalize={handleFinalize}
        class="space-y-2"
      >
        {#each draggableTasks as task (task.id)}
          <li data-id={task.id} class="flex items-center gap-2 p-2 border rounded cursor-move hover:bg-gray-50">
            <span 
              class="drag-handle text-gray-400 cursor-grab active:cursor-grabbing select-none" 
              title="Drag to reorder"
            >
              ⋮⋮
            </span>
            <input
              type="checkbox"
              checked={task.status === 'checked'}
              onchange={() => handleToggleTaskStatus(task.id, task.status)}
              class="cursor-pointer"
            />
            <span class={task.status === 'checked' ? 'line-through flex-1' : 'flex-1'}>
              {task.text}
            </span>
            {#if task.status === 'checked'}
              <button 
                onclick={() => handleArchiveTask(task.id)}
                class="px-2 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded"
              >
                Archive
              </button>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  {:else}
    <p>Loading tasks...</p>
  {/if}
  <div>
    <input
      type="text"
      placeholder="Add new task..."
      value={newTaskInput}
      oninput={(e) => onInputChange(e.target.value)}
      onkeydown={(e) => {
        if (e.key === 'Enter') {
          handleCreateTask();
        }
      }}
    />
    <button onclick={handleCreateTask}>Add</button>
  </div>
</div>

