<script>
  import { getTasksForList, createTask, updateTaskStatus } from '../lib/dataAccess.js';
  
  let { listId, listName, newTaskInput, onInputChange } = $props();
  
  // Use regular state and reload manually (avoiding liveQuery infinite loop issues)
  let tasks = $state([]);
  
  async function loadTasks() {
    try {
      tasks = await getTasksForList(listId);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  }
  
  // Load tasks when component mounts or listId changes
  $effect(() => {
    loadTasks();
  });
  
  async function handleCreateTask() {
    const taskText = newTaskInput?.trim();
    if (!taskText) {
      return;
    }
    
    try {
      await createTask(listId, taskText);
      onInputChange('');
      await loadTasks(); // Reload after creation
    } catch (error) {
      console.error('Error creating task:', error);
    }
  }
  
  async function handleToggleTaskStatus(taskId, currentStatus) {
    try {
      const newStatus = currentStatus === 'unchecked' ? 'checked' : 'unchecked';
      await updateTaskStatus(taskId, newStatus);
      await loadTasks(); // Reload after status change
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  }
  
  async function handleArchiveTask(taskId) {
    try {
      await updateTaskStatus(taskId, 'archived');
      await loadTasks(); // Reload after archiving
    } catch (error) {
      console.error('Error archiving task:', error);
    }
  }
</script>

<div>
  <h2>{listName}</h2>
  <ul>
    {#if tasks}
      {#each tasks as task}
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
    {/if}
  </ul>
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

