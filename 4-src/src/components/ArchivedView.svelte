<script>
  import { liveQuery } from 'dexie';
  import { getArchivedTasks, restoreTask, deleteTask, getAllLists } from '../lib/dataAccess.js';
  import ConfirmationModal from './ConfirmationModal.svelte';
  
  // Create liveQuery for archived tasks
  let archivedTasksQuery = $state(null);
  let listsQuery = $state(null);
  
  // Modal state
  let showDeleteModal = $state(false);
  let taskToDelete = $state(null);
  
  $effect(() => {
    archivedTasksQuery = liveQuery(() => getArchivedTasks());
    listsQuery = liveQuery(() => getAllLists());
  });
  
  // Helper function to get list name by listId
  function getListName(listId) {
    if (!$listsQuery) return 'Unknown List';
    const list = $listsQuery.find(l => l.id === listId);
    return list ? list.name : 'Unknown List';
  }
  
  // Helper function to format archive time
  function formatArchiveTime(archivedAt) {
    if (!archivedAt) return 'Unknown';
    const date = new Date(archivedAt);
    return date.toLocaleString();
  }
  
  async function handleRestore(taskId) {
    try {
      await restoreTask(taskId);
      // No need to reload - liveQuery will update automatically!
    } catch (error) {
      console.error('Error restoring task:', error);
    }
  }
  
  function handleDeleteClick(taskId, taskText) {
    taskToDelete = { id: taskId, text: taskText };
    showDeleteModal = true;
  }
  
  async function handleConfirmDelete() {
    if (!taskToDelete) return;
    
    try {
      await deleteTask(taskToDelete.id);
      showDeleteModal = false;
      taskToDelete = null;
      // No need to reload - liveQuery will update automatically!
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  }
  
  function handleCancelDelete() {
    showDeleteModal = false;
    taskToDelete = null;
  }
</script>

<div class="w-[1056px] mt-8 print:hidden">
  <h2 class="text-xl font-semibold mb-4">Archived Tasks</h2>
  {#if archivedTasksQuery && $archivedTasksQuery}
    {#if $archivedTasksQuery.length === 0}
      <p>No archived tasks</p>
    {:else}
      <ul>
        {#each $archivedTasksQuery as task}
          <li class="flex items-center gap-3 mb-2">
            <span class="line-through">{task.text}</span>
            <span class="text-sm text-gray-500">
              ({getListName(task.listId)})
            </span>
            <span class="text-sm text-gray-400">
              Archived: {formatArchiveTime(task.archivedAt)}
            </span>
            <button
              onclick={() => handleRestore(task.id)}
              class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              Restore
            </button>
            <button
              onclick={() => handleDeleteClick(task.id, task.text)}
              class="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
            >
              Delete
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
</div>

<ConfirmationModal
  isOpen={showDeleteModal}
  title="Delete Task"
  message={taskToDelete ? `Are you sure you want to permanently delete "${taskToDelete.text}"? This action cannot be undone.` : ''}
  onConfirm={handleConfirmDelete}
  onCancel={handleCancelDelete}
/>

