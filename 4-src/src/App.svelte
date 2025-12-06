<script>
  import { liveQuery } from 'dexie';
  import { tick } from 'svelte';
  import { getAllLists, createList, createTask } from './lib/dataAccess.js';
  import db from './lib/db.js';
  import TaskList from './components/TaskList.svelte';
  import ArchivedView from './components/ArchivedView.svelte';
  
  // Constants for retry mechanism
  const MAX_RETRY_ATTEMPTS = 20; // Maximum attempts to find element
  const RETRY_INTERVAL = 10; // Milliseconds between retry attempts
  
  // Reactive query for lists - automatically updates when lists change
  let lists = liveQuery(() => getAllLists());
  
  // Track new task inputs per list
  let newTaskInputs = $state({});
  
  // State for creating new list (happy path)
  let isCreateListInputActive = $state(false);
  let createListInput = $state('');
  let createListInputElement = $state(null);
  
  // State for creating task in unnamed list (task 3b)
  let isUnnamedListInputActive = $state(false);
  let unnamedListTaskInput = $state('');
  let unnamedListInputElement = $state(null);
  
  // Initialize inputs when lists first load (only once)
  $effect(() => {
    if ($lists && Array.isArray($lists) && $lists.length > 0) {
      // Only initialize if we don't have inputs yet
      if (Object.keys(newTaskInputs).length === 0) {
        const inputs = {};
        for (const list of $lists) {
          inputs[list.id] = '';
        }
        newTaskInputs = inputs;
      }
    }
  });
  
  // Update inputs when new lists are added
  $effect(() => {
    if ($lists && Array.isArray($lists) && $lists.length > 0) {
      const inputs = { ...newTaskInputs };
      let hasChanges = false;
      for (const list of $lists) {
        if (!(list.id in inputs)) {
          inputs[list.id] = '';
          hasChanges = true;
        }
      }
      if (hasChanges) {
        newTaskInputs = inputs;
      }
    }
  });
  
  function handleInputChange(listId, value) {
    newTaskInputs[listId] = value;
  }
  
  function handlePrint() {
    window.print();
  }
  
  /**
   * Activates the "Add Task" input for a newly created list.
   * Uses retry mechanism to wait for component initialization instead of fixed delays.
   */
  async function activateAddTaskInput(listId) {
    // Wait for Svelte to process reactive updates (component added to DOM)
    await tick();
    
    // Retry mechanism to find the element (waits for component to fully initialize)
    for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
      const listSection = document.querySelector(`[data-list-id="${listId}"]`);
      if (!listSection) {
        await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL));
        continue;
      }
      
      const addTaskContainer = listSection.querySelector('.add-task-container');
      if (!addTaskContainer) {
        await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL));
        continue;
      }
      
      const addTaskSpan = addTaskContainer.querySelector('span[role="button"]');
      if (!addTaskSpan || !(addTaskSpan instanceof HTMLElement)) {
        await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL));
        continue;
      }
      
      // Element found and ready - click it immediately
      addTaskSpan.click();
      return; // Success!
    }
    
    // If we get here, we couldn't find the element
    console.warn(`Could not activate Add Task input for list ${listId} after ${MAX_RETRY_ATTEMPTS} attempts`);
  }
  
  function handleCreateListClick() {
    isCreateListInputActive = true;
  }
  
  function handleCreateListKeydown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      handleCreateListClick();
    }
  }
  
  function handleCreateListInputEscape(e) {
    if (e.key === 'Escape') {
      isCreateListInputActive = false;
      createListInput = '';
    }
  }
  
  // Handle click outside input to close it (only if no content)
  $effect(() => {
    if (!isCreateListInputActive) return;
    
    function handleDocumentClick(e) {
      // Check if click is on the input field itself
      if (createListInputElement && createListInputElement.contains(e.target)) {
        return; // Click is on input, don't close
      }
      
      // Check if click is on a Save button (if we add one)
      const saveButton = e.target.closest('button');
      if (saveButton && saveButton.textContent?.trim() === 'Save') {
        return; // Let Save button handle the click
      }
      
      // Click is outside input
      // Only close if input hasn't changed (no content)
      if (!createListInput || createListInput.trim() === '') {
        isCreateListInputActive = false;
        createListInput = '';
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
    if (isCreateListInputActive && createListInputElement) {
      setTimeout(() => {
        createListInputElement?.focus();
      }, 0);
    }
  });
  
  async function handleCreateList() {
    const inputValue = createListInput || '';
    
    // Check if input is empty string "" - exit list creation
    if (inputValue === '') {
      isCreateListInputActive = false;
      createListInput = '';
      return;
    }
    
    // Check if input contains only whitespace (e.g., " ", "      ")
    const trimmedValue = inputValue.trim();
    if (trimmedValue === '') {
      // Whitespace-only, don't create
      isCreateListInputActive = false;
      createListInput = '';
      return;
    }
    
    try {
      const listId = await createList(trimmedValue);
      createListInput = '';
      isCreateListInputActive = false;
      
      // Focus moves to creating the first task in that list
      // Lists will update automatically via liveQuery
      await activateAddTaskInput(listId);
    } catch (error) {
      console.error('Error creating list:', error);
    }
  }
  
  // Unnamed list task creation handlers (task 3b)
  function handleUnnamedListAddTaskClick() {
    isUnnamedListInputActive = true;
  }
  
  function handleUnnamedListInputEscape(e) {
    if (e.key === 'Escape') {
      isUnnamedListInputActive = false;
      unnamedListTaskInput = '';
    }
  }
  
  // Handle click outside unnamed list input to close it (only if no content)
  $effect(() => {
    if (!isUnnamedListInputActive) return;
    
    function handleDocumentClick(e) {
      // Check if click is on the input field itself
      if (unnamedListInputElement && unnamedListInputElement.contains(e.target)) {
        return; // Click is on input, don't close
      }
      
      // Check if click is on a Save button
      const saveButton = e.target.closest('button');
      if (saveButton && saveButton.textContent?.trim() === 'Save') {
        return; // Let Save button handle the click
      }
      
      // Click is outside input
      // Only close if input hasn't changed (no content)
      if (!unnamedListTaskInput || unnamedListTaskInput.trim() === '') {
        isUnnamedListInputActive = false;
        unnamedListTaskInput = '';
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
    if (isUnnamedListInputActive && unnamedListInputElement) {
      setTimeout(() => {
        unnamedListInputElement?.focus();
        // Auto-resize textarea to fit content
        if (unnamedListInputElement instanceof HTMLTextAreaElement) {
          unnamedListInputElement.style.height = 'auto';
          unnamedListInputElement.style.height = `${Math.min(unnamedListInputElement.scrollHeight, 160)}px`;
        }
      }, 0);
    }
  });
  
  // Auto-resize textarea as content changes
  $effect(() => {
    if (unnamedListInputElement && unnamedListInputElement instanceof HTMLTextAreaElement) {
      const resizeTextarea = () => {
        unnamedListInputElement.style.height = 'auto';
        unnamedListInputElement.style.height = `${Math.min(unnamedListInputElement.scrollHeight, 160)}px`;
      };
      
      unnamedListInputElement.addEventListener('input', resizeTextarea);
      return () => {
        unnamedListInputElement.removeEventListener('input', resizeTextarea);
      };
    }
  });
  
  async function handleUnnamedListCreateTask() {
    const inputValue = unnamedListTaskInput || '';
    
    // Check if input is empty string "" - exit task creation
    if (inputValue === '') {
      isUnnamedListInputActive = false;
      unnamedListTaskInput = '';
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
      // Pass null as listId to create task in unnamed list (which will be created)
      const taskId = await createTask(null, taskText);
      unnamedListTaskInput = '';
      isUnnamedListInputActive = false;
      
      // Get the listId from the created task to focus the correct list
      const task = await db.tasks.get(taskId);
      const listId = task?.listId;
      
      if (listId) {
        // Focus moves to creating the next task in the newly created unnamed list
        await activateAddTaskInput(listId);
      }
    } catch (error) {
      console.error('Error creating task in unnamed list:', error);
    }
  }
</script>

<main class="min-h-screen flex flex-col items-center justify-center bg-gray-50 print:bg-white print:min-h-0 print:gap-0 print:py-0 gap-4 py-8">
  <div class="w-[1056px] flex justify-end print:hidden">
    <button
      onclick={handlePrint}
      class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
    >
      Print
    </button>
  </div>
  <div class="w-[1056px] h-[816px] bg-gray-400 print:bg-gray-400 border-2 border-gray-300 shadow-lg print:shadow-none print:border-0 print:mx-auto relative">
    <div class="absolute inset-[16px] border border-red-600" style="border-color: rgb(220, 38, 38);">
      <div class="w-full h-full p-4 overflow-auto">
        {#if $lists === undefined || $lists === null}
          <p>Loading...</p>
        {:else if Array.isArray($lists) && $lists.length === 0}
          <p>No lists found</p>
        {:else if Array.isArray($lists)}
          {#each $lists as list}
            <TaskList
              listId={list.id}
              listName={list.name ?? 'Unnamed list'}
              newTaskInput={newTaskInputs[list.id] || ''}
              onInputChange={(value) => handleInputChange(list.id, value)}
            />
          {/each}
          
          <!-- Create List button/input - styled to match h2 headings exactly -->
          {#if isCreateListInputActive}
            <h2 class="mt-4 print:hidden">
              <div class="flex items-center gap-2">
                <input
                  bind:this={createListInputElement}
                  bind:value={createListInput}
                  type="text"
                  class="create-list-input cursor-pointer hover:underline"
                  placeholder="List name..."
                  onkeydown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleCreateList();
                    } else if (e.key === 'Escape') {
                      handleCreateListInputEscape(e);
                    }
                  }}
                  aria-label="Enter list name"
                />
                <button
                  onclick={handleCreateList}
                  class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  aria-label="Create list"
                >
                  Save
                </button>
              </div>
            </h2>
          {:else}
            <h2 
              onclick={handleCreateListClick}
              onkeydown={handleCreateListKeydown}
              role="button"
              tabindex="0"
              class="cursor-pointer hover:underline print:hidden mt-4"
              aria-label="Create new list"
            >
              Create new list
            </h2>
          {/if}
          
          <!-- Add task button for creating unnamed list (task 3b) -->
          {#if isUnnamedListInputActive}
            <div class="flex items-center gap-2 p-2 border rounded hover:bg-gray-50 w-fit print:hidden mt-2" style="margin-left: 1.5rem;">
              <span class="drag-handle text-gray-400 select-none" aria-hidden="true" style="visibility: hidden;">
                ⋮⋮
              </span>
              <input
                type="checkbox"
                disabled
                class="cursor-pointer opacity-0"
                aria-hidden="true"
                tabindex="-1"
              />
              <div class="flex gap-2">
                <textarea
                  bind:this={unnamedListInputElement}
                  placeholder="Add new task..."
                  value={unnamedListTaskInput}
                  oninput={(e) => unnamedListTaskInput = e.currentTarget.value}
                  onkeydown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleUnnamedListCreateTask();
                    } else if (e.key === 'Escape') {
                      handleUnnamedListInputEscape(e);
                    }
                  }}
                  class="w-[150px] flex-none break-words resize-none min-h-[2.5rem] max-h-[10rem] overflow-y-auto"
                  rows="1"
                ></textarea>
                <button
                  onclick={handleUnnamedListCreateTask}
                  aria-label="Save new task"
                >
                  Save
                </button>
              </div>
            </div>
          {:else}
            <div class="flex items-center gap-2 p-2 border rounded hover:bg-gray-50 w-fit print:hidden mt-2" style="margin-left: 1.5rem;">
              <span class="drag-handle text-gray-400 select-none" aria-hidden="true" style="visibility: hidden;">
                ⋮⋮
              </span>
              <input
                type="checkbox"
                disabled
                class="cursor-pointer opacity-0"
                aria-hidden="true"
                tabindex="-1"
              />
              <span 
                class="w-[150px] cursor-pointer hover:underline break-words"
                onclick={handleUnnamedListAddTaskClick}
                onkeydown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleUnnamedListAddTaskClick();
                  }
                }}
                role="button"
                tabindex="0"
                aria-label="Add a task"
              >
                Add a task
              </span>
            </div>
          {/if}
        {/if}
      </div>
    </div>
  </div>
  <ArchivedView />
</main>

<style>
  /* Style the create list input to match h2 exactly */
  .create-list-input {
    font-size: inherit;
    font-weight: inherit;
    line-height: inherit;
    font-family: inherit;
    margin: 0;
    padding: 0;
    border: 0;
    border-bottom: 2px solid rgb(209, 213, 219); /* border-gray-300 */
    background: transparent;
    outline: none;
  }
  
  .create-list-input:focus {
    border-bottom-color: rgb(59, 130, 246); /* border-blue-500 */
  }
  
  .create-list-input::placeholder {
    opacity: 0.5;
  }
  
  @media print {
    @page {
      size: landscape;
      margin: 0;
    }
    main {
      box-sizing: border-box;
      border: 2px solid rgb(34, 197, 94);
      position: absolute;
      top: 0;
      left: 0;
    }
  }
</style>
