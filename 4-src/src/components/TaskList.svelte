<script>
  import { liveQuery } from 'dexie';
  import { dndzone } from 'svelte-dnd-action';
  import { getTasksForList, createTask, updateTaskStatus, updateTaskOrder, updateTaskText, updateListName } from '../lib/dataAccess.js';
  import TaskEditModal from './TaskEditModal.svelte';
  import ListEditModal from './ListEditModal.svelte';
  
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
  
  // State for task edit modal
  let editModalOpen = $state(false);
  let editingTaskId = $state(null);
  let editingTaskText = $state('');
  let editingTaskPosition = $state(null); // { top, left, width, height }
  let editingTaskElement = $state(null); // Reference to the task element for focus return
  let ulElement = $state(null); // Reference to the ul element for capture-phase handler
  
  // State for list edit modal
  let listEditModalOpen = $state(false);
  let editingListPosition = $state(null); // { top, left, width, height }
  let listNameElement = $state(null); // Reference to the h2 element for focus return
  
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
  
  // Add capture-phase keyboard handler to prevent drag library from intercepting Enter on task text
  $effect(() => {
    if (!ulElement) return;
    
    function handleKeydownCapture(e) {
      // If Enter/Space is pressed on task text span (has data-no-drag attribute), handle it here
      const target = e.target;
      if ((e.key === 'Enter' || e.key === ' ') && target instanceof HTMLElement && target.hasAttribute('data-no-drag')) {
        e.preventDefault();
        e.stopImmediatePropagation(); // Stop ALL handlers including drag library
        
        // Find the task ID from the parent li element
        const liElement = target.closest('li[data-id]');
        if (liElement) {
          const taskId = parseInt(liElement.getAttribute('data-id'));
          const task = draggableTasks.find(t => t.id === taskId);
          if (task) {
            // Get the element's position for modal positioning
            const rect = target.getBoundingClientRect();
            editingTaskPosition = {
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height
            };
            editingTaskElement = target;
            
            // Open the modal directly
            editingTaskId = taskId;
            editingTaskText = task.text;
            editModalOpen = true;
          }
        }
      }
    }
    
    ulElement.addEventListener('keydown', handleKeydownCapture, true); // true = capture phase
    
    return () => {
      ulElement.removeEventListener('keydown', handleKeydownCapture, true);
    };
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
      
      // Check if click is outside the textarea field itself (even if inside container)
      const textareaField = container.querySelector('textarea');
      if (textareaField && textareaField.contains(e.target)) {
        return; // Click is on textarea, don't close
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
  
  // Focus textarea when it becomes active and auto-resize
  $effect(() => {
    if (isInputActive && inputElement) {
      // Small delay to ensure textarea is rendered
      setTimeout(() => {
        inputElement?.focus();
        // Auto-resize textarea to fit content
        if (inputElement instanceof HTMLTextAreaElement) {
          inputElement.style.height = 'auto';
          inputElement.style.height = `${Math.min(inputElement.scrollHeight, 160)}px`; // max-h-[10rem] = 160px
        }
      }, 0);
    }
  });
  
  // Auto-resize textarea as content changes
  $effect(() => {
    if (inputElement && inputElement instanceof HTMLTextAreaElement) {
      const resizeTextarea = () => {
        inputElement.style.height = 'auto';
        inputElement.style.height = `${Math.min(inputElement.scrollHeight, 160)}px`;
      };
      
      inputElement.addEventListener('input', resizeTextarea);
      return () => {
        inputElement.removeEventListener('input', resizeTextarea);
      };
    }
  });
  
  async function handleCreateTask() {
    const inputValue = newTaskInput || '';
    
    // Check if input is empty string "" - exit task creation
    if (inputValue === '') {
      isInputActive = false;
      onInputChange('');
      return;
    }
    
    // Check if input contains only whitespace (e.g., " ", "      ")
    const trimmedValue = inputValue.trim();
    const isWhitespaceOnly = trimmedValue === '' && inputValue.length > 0;
    
    let taskText;
    if (isWhitespaceOnly) {
      // Create blank task (empty text)
      taskText = '';
    } else {
      // Create normal task with content
      taskText = trimmedValue;
    }
    
    try {
      await createTask(listId, taskText);
      onInputChange('');
      // Keep input active and focused for sequential creation
      // Input will remain active, focus will be handled by $effect
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
      // Close modal if this task was being edited
      if (editingTaskId === taskId) {
        const taskElement = editingTaskElement; // Store reference before clearing
        editModalOpen = false;
        editingTaskId = null;
        editingTaskText = '';
        editingTaskPosition = null;
        editingTaskElement = null;
        
        // Focus management: after archiving, focus should go to next logical element
        // Find the next task in the list, or the "Add Task" button if no tasks remain
        setTimeout(() => {
          if (taskElement && taskElement instanceof HTMLElement) {
            // Try to find the next task element (sibling or next in list)
            const taskCard = taskElement.closest('li');
            if (taskCard) {
              const nextTaskCard = taskCard.nextElementSibling;
              if (nextTaskCard) {
                const nextTaskText = nextTaskCard.querySelector('span[role="button"]');
                if (nextTaskText && nextTaskText instanceof HTMLElement) {
                  nextTaskText.focus();
                  return;
                }
              }
              // If no next task, try previous task
              const prevTaskCard = taskCard.previousElementSibling;
              if (prevTaskCard) {
                const prevTaskText = prevTaskCard.querySelector('span[role="button"]');
                if (prevTaskText && prevTaskText instanceof HTMLElement) {
                  prevTaskText.focus();
                  return;
                }
              }
            }
            // Fallback: focus the "Add Task" button
            const addTaskButton = document.querySelector(`[data-list-id="${listId}"] .add-task-button`);
            if (addTaskButton && addTaskButton instanceof HTMLElement) {
              addTaskButton.focus();
            }
          }
        }, 0);
      }
      // No need to reload - liveQuery will update automatically!
    } catch (error) {
      console.error('Error archiving task:', error);
    }
  }
  
  function handleTaskTextClick(taskId, taskText, event) {
    // Get the clicked text span's position - we want to align the input field with the text
    const clickedElement = event?.currentTarget || event?.target;
    if (clickedElement) {
      // Use the clicked element directly (the text span) for precise positioning
      const rect = clickedElement.getBoundingClientRect();
      // Store viewport coordinates (getBoundingClientRect returns viewport coordinates)
      editingTaskPosition = {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      };
      // Store reference to the clicked element for focus return
      editingTaskElement = clickedElement;
    }
    editingTaskId = taskId;
    editingTaskText = taskText;
    editModalOpen = true;
  }
  
  function handleTaskTextKeydown(taskId, taskText, event) {
    if (event.key === 'Enter' || event.key === ' ') {
      // Stop the event immediately to prevent drag library from intercepting
      event.preventDefault();
      event.stopImmediatePropagation();
      
      // Get the span element
      const spanElement = event.currentTarget;
      if (spanElement) {
        // Get the element's position for modal positioning
        const rect = spanElement.getBoundingClientRect();
        editingTaskPosition = {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        };
        editingTaskElement = spanElement;
        
        // Open the modal directly
        editingTaskId = taskId;
        editingTaskText = taskText;
        editModalOpen = true;
      }
    }
  }
  
  async function handleTaskSave(taskId, newText) {
    try {
      await updateTaskText(taskId, newText);
      editModalOpen = false;
      const taskElement = editingTaskElement; // Store reference before clearing
      editingTaskId = null;
      editingTaskText = '';
      editingTaskPosition = null;
      editingTaskElement = null;
      
      // Return focus to the task element after modal closes
      if (taskElement && taskElement instanceof HTMLElement) {
        setTimeout(() => {
          taskElement.focus();
        }, 0);
      }
      // No need to reload - liveQuery will update automatically!
    } catch (error) {
      console.error('Error updating task text:', error);
    }
  }
  
  function handleTaskEditCancel() {
    const taskElement = editingTaskElement; // Store reference before clearing
    editModalOpen = false;
    editingTaskId = null;
    editingTaskText = '';
    editingTaskPosition = null;
    editingTaskElement = null;
    
    // Return focus to the task element after modal closes
    if (taskElement && taskElement instanceof HTMLElement) {
      setTimeout(() => {
        taskElement.focus();
      }, 0);
    }
  }
  
  async function handleTaskEditArchive(taskId) {
    await handleArchiveTask(taskId);
  }
  
  function handleListNameClick(event) {
    // Get the clicked h2 element's position for modal positioning
    const clickedElement = event?.currentTarget || event?.target;
    if (clickedElement) {
      const rect = clickedElement.getBoundingClientRect();
      editingListPosition = {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      };
      listNameElement = clickedElement;
    }
    listEditModalOpen = true;
  }
  
  function handleListNameKeydown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      
      const h2Element = event.currentTarget;
      if (h2Element) {
        const rect = h2Element.getBoundingClientRect();
        editingListPosition = {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        };
        listNameElement = h2Element;
        listEditModalOpen = true;
      }
    }
  }
  
  async function handleListSave(listId, newName) {
    try {
      await updateListName(listId, newName);
      listEditModalOpen = false;
      const nameElement = listNameElement; // Store reference before clearing
      editingListPosition = null;
      listNameElement = null;
      
      // Return focus to the list name element after modal closes
      if (nameElement && nameElement instanceof HTMLElement) {
        setTimeout(() => {
          nameElement.focus();
        }, 0);
      }
      // No need to reload - liveQuery in App.svelte will update automatically!
    } catch (error) {
      console.error('Error updating list name:', error);
    }
  }
  
  function handleListEditCancel() {
    const nameElement = listNameElement; // Store reference before clearing
    listEditModalOpen = false;
    editingListPosition = null;
    listNameElement = null;
    
    // Return focus to the list name element after modal closes
    if (nameElement && nameElement instanceof HTMLElement) {
      setTimeout(() => {
        nameElement.focus();
      }, 0);
    }
  }
</script>

<div data-list-id={listId}>
  <h2 
    onclick={handleListNameClick}
    onkeydown={handleListNameKeydown}
    role="button"
    tabindex="0"
    class="cursor-pointer hover:underline"
    aria-label={`Rename list: ${listName}`}
  >
    {listName}
  </h2>
  {#if tasksQuery && $tasksQuery !== undefined}
    {#if $tasksQuery.length === 0}
      <p class="empty-state-message">No tasks yet for {listName}. Add your first task.</p>
    {:else}
      <ul 
        bind:this={ulElement}
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
          <li data-id={task.id} class="flex items-center gap-2 p-2 border rounded cursor-move hover:bg-gray-50 w-fit">
            <span 
              class="drag-handle text-gray-400 cursor-grab active:cursor-grabbing select-none" 
              title="Drag to reorder"
              tabindex="-1"
              aria-hidden="true"
            >
              ⋮⋮
            </span>
            <input
              type="checkbox"
              checked={task.status === 'checked'}
              onchange={() => handleToggleTaskStatus(task.id, task.status)}
              class="cursor-pointer"
              aria-label={`Mark task "${task.text || 'blank task'}" as ${task.status === 'checked' ? 'unchecked' : 'checked'}`}
            />
            <span 
              class={task.status === 'checked' ? 'line-through w-[150px] cursor-pointer hover:underline break-words' : 'w-[150px] cursor-pointer hover:underline break-words'}
              onclick={(e) => handleTaskTextClick(task.id, task.text, e)}
              role="button"
              tabindex="0"
              contenteditable="false"
              data-no-drag="true"
              aria-label={`Edit task: ${task.text || 'blank task'}`}
              onkeydown={(e) => handleTaskTextKeydown(task.id, task.text, e)}
            >
              {task.text || '\u00A0'}
            </span>
            {#if task.status === 'checked'}
              <button 
                onclick={() => handleArchiveTask(task.id)}
                class="px-2 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded"
                aria-label={`Archive task: ${task.text || 'blank task'}`}
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
        <textarea
          bind:this={inputElement}
          placeholder="Add new task..."
          value={newTaskInput}
          oninput={(e) => onInputChange(e.currentTarget.value)}
          onkeydown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault(); // Prevent form submission if inside a form
              handleCreateTask();
            } else if (e.key === 'Escape') {
              handleInputEscape(e);
            }
          }}
          class="print:hidden w-[150px] flex-none break-words resize-none min-h-[2.5rem] max-h-[10rem] overflow-y-auto"
          rows="1"
        ></textarea>
        <button
          onclick={handleCreateTask}
          class="print:hidden"
          aria-label="Save new task"
        >
          Save
        </button>
      </div>
    {:else}
      <button
        onclick={handleAddTaskClick}
        class="add-task-button"
        aria-label="Add new task to {listName}"
      >
        Add Task
      </button>
    {/if}
  </div>
</div>

<style>
  .add-task-button {
    padding: 0.5rem 1rem;
    background-color: #3b82f6;
    color: white;
    border-radius: 0.375rem;
    border: none;
    cursor: pointer;
  }
  
  .add-task-button:hover {
    background-color: #2563eb;
  }
  
  @media print {
    .add-task-button {
      visibility: hidden;
    }
    
    .task-input-container textarea {
      visibility: hidden;
    }
    
    .drag-handle {
      visibility: hidden;
    }
    
    .empty-state-message {
      visibility: hidden;
    }
  }
</style>

<TaskEditModal
  isOpen={editModalOpen}
  taskId={editingTaskId}
  taskText={editingTaskText}
  taskPosition={editingTaskPosition}
  onSave={handleTaskSave}
  onCancel={handleTaskEditCancel}
  onArchive={handleTaskEditArchive}
/>

<ListEditModal
  isOpen={listEditModalOpen}
  listId={listId}
  listName={listName}
  listPosition={editingListPosition}
  onSave={handleListSave}
  onCancel={handleListEditCancel}
/>

