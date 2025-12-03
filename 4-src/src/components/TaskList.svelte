<script>
  import { liveQuery } from 'dexie';
  import { dndzone } from 'svelte-dnd-action';
  import { getTasksForList, createTask, updateTaskStatus, updateTaskOrder } from '../lib/dataAccess.js';
  
  let { listId, listName, newTaskInput, onInputChange } = $props();
  
  // Create liveQuery at top level - capture listId in closure
  // This creates the query once and it will automatically update when database changes
  let tasksQuery = $state(null);
  
  // Local state for drag-and-drop - synced from liveQuery
  // Only includes unchecked/checked tasks (archived excluded)
  let draggableTasks = $state([]);
  
  // State for Add Task button/input toggle
  let isInputActive = $state(false);
  let inputElement = $state(null);
  
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
  async function handleFinalize(event) {
    // Update local state for immediate visual feedback
    draggableTasks = event.detail.items;
    
    // Update database with new order values
    // Calculate sequential order values (0, 1, 2, 3...) based on new positions
    try {
      await updateTaskOrder(listId, event.detail.items);
      // liveQuery will automatically update the UI after database changes
    } catch (error) {
      console.error('Error updating task order:', error);
      // On error, revert draggableTasks to match database state
      // The $effect will sync it back from liveQuery
    }
  }
  
  function handleAddTaskClick() {
    isInputActive = true;
    // Focus will be handled by $effect after input is rendered
  }
  
  function handleInputEscape(e) {
    if (e.key === 'Escape') {
      isInputActive = false;
      onInputChange('');
    }
  }
  
  // Handle click outside input to close it (only if no content)
  $effect(() => {
    if (!isInputActive) return;
    
    function handleDocumentClick(e) {
      const container = document.querySelector(`[data-list-id="${listId}"] .task-input-container`);
      if (!container) return;
      
      // Check if click is on the Save button - don't close, let Save handle it
      const saveButton = container.querySelector('button');
      if (saveButton && saveButton.contains(e.target)) {
        return; // Let Save button handle the click
      }
      
      // Check if click is outside the input field itself (even if inside container)
      const inputField = container.querySelector('input');
      if (inputField && inputField.contains(e.target)) {
        return; // Click is on input, don't close
      }
      
      // Click is outside input (could be in container but not on input or Save button)
      // Only close if input hasn't changed (no content)
      if (!newTaskInput || newTaskInput.trim() === '') {
        isInputActive = false;
        onInputChange('');
      }
    }
    
    // Add click listener after a brief delay to avoid immediate trigger
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleDocumentClick);
    }, 0);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleDocumentClick);
    };
  });
  
  // Focus input when it becomes active
  $effect(() => {
    if (isInputActive && inputElement) {
      // Small delay to ensure input is rendered
      setTimeout(() => {
        inputElement?.focus();
      }, 0);
    }
  });
  
  async function handleCreateTask() {
    const taskText = newTaskInput?.trim();
    if (!taskText) {
      return;
    }
    
    try {
      await createTask(listId, taskText);
      onInputChange('');
      // Keep input active for sequential creation (will be handled in step 3)
      // Input will remain focused for next task
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

<div data-list-id={listId}>
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
  <div class="task-input-container">
    {#if isInputActive}
      <div class="flex gap-2">
        <input
          bind:this={inputElement}
          type="text"
          placeholder="Add new task..."
          value={newTaskInput}
          oninput={(e) => onInputChange(e.target.value)}
          onkeydown={(e) => {
            if (e.key === 'Enter') {
              handleCreateTask();
            } else if (e.key === 'Escape') {
              handleInputEscape(e);
            }
          }}
          class="print:hidden"
        />
        <button
          onclick={handleCreateTask}
          class="print:hidden"
        >
          Save
        </button>
      </div>
    {:else}
      <button
        onclick={handleAddTaskClick}
        class="add-task-button"
        style="visibility: visible;"
      >
        Add Task
      </button>
    {/if}
  </div>
</div>

<style>
  .add-task-button {
    /* Button styles */
  }
  
  @media print {
    .add-task-button {
      visibility: hidden;
    }
    
    .task-input-container input {
      visibility: hidden;
    }
  }
</style>

