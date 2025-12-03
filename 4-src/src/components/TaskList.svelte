<script>
  import { liveQuery } from 'dexie';
  import { getTasksForList, createTask, updateTaskStatus } from '../lib/dataAccess.js';
  
  let { listId, listName, newTaskInput, onInputChange } = $props();
  
  // Create liveQuery at top level - capture listId in closure
  // This creates the query once and it will automatically update when database changes
  let tasksQuery = $state(null);
  
  $effect(() => {
    // Create query once when listId is available
    if (listId && !tasksQuery) {
      tasksQuery = liveQuery(() => getTasksForList(listId));
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
      <ul>
        {#each $tasksQuery as task}
          <li>
            <input
              type="checkbox"
              checked={task.status === 'checked'}
              onchange={() => handleToggleTaskStatus(task.id, task.status)}
            />
            <span class={task.status === 'checked' ? 'line-through' : ''}>
              {task.text}
            </span>
            {#if task.status === 'checked'}
              <button onclick={() => handleArchiveTask(task.id)}>Archive</button>
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

