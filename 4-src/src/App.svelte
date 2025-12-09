<script>
  import { liveQuery } from 'dexie';
  import { tick } from 'svelte';
  import { dndzone } from 'svelte-dnd-action';
  import { getAllLists, createList, createTask, createUnnamedList, updateTaskOrderCrossList, updateListOrder } from './lib/dataAccess.js';
  import db from './lib/db.js';
  import TaskList from './components/TaskList.svelte';
  import ArchivedView from './components/ArchivedView.svelte';
  import { useClickOutside } from './lib/useClickOutside.js';
  import { isEmpty, normalizeInput } from './lib/inputValidation.js';
  import { MAX_RETRY_ATTEMPTS, RETRY_INTERVAL_MS, PRINT_CONTAINER_WIDTH, PRINT_CONTAINER_HEIGHT, SPACING_4, MAX_TEXTAREA_HEIGHT, TASK_WIDTH } from './lib/constants.js';
  
  // Reactive query for lists - automatically updates when lists change
  let lists = liveQuery(() => getAllLists());
  
  // Stable lists derived from source of truth - never contains placeholders
  // Used for rendering TaskList components to prevent remounting during drag
  let stableLists = $derived($lists || []);
  
  
  // Local state for drag-and-drop lists - synced from liveQuery
  // Used only by drag library for drag operations
  let draggableLists = $state([]);
  
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
  
  // State for drop zone on "Create new list" section
  let createListDropZoneItems = $state([]);
  let createListDropZoneElement = $state(null);
  
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
  
  // Sync draggableLists from liveQuery (similar to tasks)
  $effect(() => {
    if ($lists && Array.isArray($lists)) {
      draggableLists = $lists.map(list => ({ id: list.id, name: list.name, order: list.order, columnIndex: list.columnIndex }));
    } else {
      draggableLists = [];
    }
  });

  // Organize lists by column with overflow handling
  // Lists with columnIndex >= 5 are placed in the last column (index 4)
  const COLUMN_COUNT = 5;
  
  // Organize lists into columns for rendering
  // Returns an array of columns, each containing lists for that column
  let listsByColumn = $derived(() => {
    if (!draggableLists || draggableLists.length === 0) {
      return Array(COLUMN_COUNT).fill(null).map(() => []);
    }
    
    const columns = Array(COLUMN_COUNT).fill(null).map(() => []);
    const lastColumnIndex = COLUMN_COUNT - 1;
    
    for (const list of draggableLists) {
      let columnIndex = list.columnIndex ?? 0;
      // Handle overflow: if columnIndex >= COLUMN_COUNT, place in last column
      if (columnIndex >= COLUMN_COUNT) {
        columnIndex = lastColumnIndex;
      }
      columns[columnIndex].push(list);
    }
    
    // Sort lists within each column by their order
    for (let i = 0; i < columns.length; i++) {
      columns[i].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
    
    return columns;
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
        await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL_MS));
        continue;
      }
      
      const addTaskContainer = listSection.querySelector('.add-task-container');
      if (!addTaskContainer) {
        await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL_MS));
        continue;
      }
      
      const addTaskSpan = addTaskContainer.querySelector('span[role="button"]');
      if (!addTaskSpan || !(addTaskSpan instanceof HTMLElement)) {
        await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL_MS));
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
    
    return useClickOutside(
      createListInputElement,
      () => {
        // Only close if still active (prevents race conditions with programmatic closes)
        if (isCreateListInputActive) {
          isCreateListInputActive = false;
          createListInput = '';
        }
      },
      {
        checkIgnoreClick: (e) => {
          // Check if click is on a Save button
          const saveButton = e.target.closest('button');
          return saveButton && saveButton.textContent?.trim() === 'Save';
        },
        shouldClose: () => {
          // Only close if input hasn't changed (no content)
          return !createListInput || createListInput.trim() === '';
        }
      }
    );
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
    if (isEmpty(inputValue)) {
      isCreateListInputActive = false;
      createListInput = '';
      return;
    }
    
    // Check if input contains only whitespace (e.g., " ", "      ")
    const { text: normalizedText, isBlank } = normalizeInput(inputValue);
    if (isBlank) {
      // Whitespace-only, don't create
      isCreateListInputActive = false;
      createListInput = '';
      return;
    }
    
    try {
      const listId = await createList(normalizedText);
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
    
    return useClickOutside(
      unnamedListInputElement,
      () => {
        // Only close if still active (prevents race conditions with programmatic closes)
        if (isUnnamedListInputActive) {
          isUnnamedListInputActive = false;
          unnamedListTaskInput = '';
        }
      },
      {
        checkIgnoreClick: (e) => {
          // Check if click is on a Save button
          const saveButton = e.target.closest('button');
          return saveButton && saveButton.textContent?.trim() === 'Save';
        },
        shouldClose: () => {
          // Only close if input hasn't changed (no content)
          return !unnamedListTaskInput || unnamedListTaskInput.trim() === '';
        }
      }
    );
  });
  
  // Focus input when it becomes active
  $effect(() => {
    if (isUnnamedListInputActive && unnamedListInputElement) {
      setTimeout(() => {
        unnamedListInputElement?.focus();
        // Auto-resize textarea to fit content
        if (unnamedListInputElement instanceof HTMLTextAreaElement) {
          unnamedListInputElement.style.height = 'auto';
          unnamedListInputElement.style.height = `${Math.min(unnamedListInputElement.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
        }
      }, 0);
    }
  });
  
  // Auto-resize textarea as content changes
  $effect(() => {
    if (unnamedListInputElement && unnamedListInputElement instanceof HTMLTextAreaElement) {
      const resizeTextarea = () => {
        unnamedListInputElement.style.height = 'auto';
        unnamedListInputElement.style.height = `${Math.min(unnamedListInputElement.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
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
    if (isEmpty(inputValue)) {
      isUnnamedListInputActive = false;
      unnamedListTaskInput = '';
      return;
    }
    
    // Check if input contains only whitespace (e.g., " ", "      ")
    const { text: taskText } = normalizeInput(inputValue);
    
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
  
  // Handle drag events for "Create new list" drop zone - consider event for visual feedback
  function handleCreateListConsider(event) {
    // Update local state for visual feedback during drag
    createListDropZoneItems = event.detail.items;
  }
  
  // Handle drag events for "Create new list" drop zone - finalize event to create list and move task
  async function handleCreateListFinalize(event) {
    // Update local state for immediate visual feedback
    createListDropZoneItems = event.detail.items;
    
    // If a task was dropped, create an unnamed list and move the task to it
    if (event.detail.items && event.detail.items.length > 0) {
      try {
        // Create an unnamed list
        const newListId = await createUnnamedList();
        
        // Move the dropped task(s) to the new list
        await updateTaskOrderCrossList(newListId, event.detail.items);
        
        // Reset the drop zone items
        createListDropZoneItems = [];
      } catch (error) {
        console.error('Error creating list from dropped task:', error);
        // Reset on error
        createListDropZoneItems = [];
      }
    }
  }
  
  // Helper function to check if an item is a placeholder
  function isPlaceholderItem(item) {
    return item && (item.isDndShadowItem === true || 
                    (typeof item.id === 'string' && item.id.startsWith('id:dnd-shadow-placeholder-')));
  }
  
  // Handle list drag events - consider event for visual reordering only
  function handleListConsider(event) {
    // Update draggableLists with placeholders - drag library needs them for visual feedback
    draggableLists = event.detail.items;
  }
  
  // Handle list drag events - finalize event for database updates
  async function handleListFinalize(event) {
    // Update draggableLists - placeholders should be gone by finalize, but filter just in case
    const validItems = event.detail.items.filter(item => !isPlaceholderItem(item));
    draggableLists = validItems;
    
    // Update database with new order values
    try {
      await updateListOrder(validItems);
      // liveQuery will automatically update the UI after database changes
    } catch (error) {
      console.error('Error updating list order:', error);
      // On error, revert draggableLists to match database state
      // The $effect will sync it back from liveQuery
    }
  }
</script>

<main class="min-h-screen flex flex-col items-center justify-center bg-gray-50 print:bg-white print:min-h-0 print:gap-0 print:py-0 gap-4 py-8">
  <div class="flex justify-end print:hidden" style="width: {PRINT_CONTAINER_WIDTH}px;">
    <button
      onclick={handlePrint}
      class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
    >
      Print
    </button>
  </div>
  <div class="bg-gray-400 print:bg-gray-400 border-2 border-gray-300 shadow-lg print:shadow-none print:border-0 print:mx-auto relative" style="width: {PRINT_CONTAINER_WIDTH}px; height: {PRINT_CONTAINER_HEIGHT}px;">
    <div class="absolute inset-[16px] border border-red-600" style="border-color: rgb(220, 38, 38);">
      <div class="w-full h-full p-4 overflow-auto">
        {#if $lists === undefined || $lists === null}
          <p>Loading...</p>
        {:else if Array.isArray($lists) && $lists.length === 0}
          <!-- Empty State: Create Your First List -->
          <div class="print:hidden">
            {#if isCreateListInputActive}
              <h2>
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
                class="cursor-pointer hover:underline"
                aria-label="Create your first list"
              >
                Create Your First List
              </h2>
            {/if}
            
            <!-- Add your first task button -->
            {#if !isUnnamedListInputActive}
              <div class="mt-4">
                <span
                  class="inline-block px-4 py-2 bg-gray-100 border border-gray-300 rounded cursor-pointer hover:bg-gray-200 text-sm"
                  style="width: {TASK_WIDTH}px;"
                  onclick={handleUnnamedListAddTaskClick}
                  onkeydown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleUnnamedListAddTaskClick();
                    }
                  }}
                  role="button"
                  tabindex="0"
                  aria-label="Add your first task"
                >
                  Add your first task
                </span>
              </div>
            {:else}
              <div class="mt-4">
                <textarea
                  bind:this={unnamedListInputElement}
                  bind:value={unnamedListTaskInput}
                  class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  style="width: {TASK_WIDTH}px; max-height: {MAX_TEXTAREA_HEIGHT}px;"
                  placeholder="Add new task..."
                  onkeydown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleUnnamedListCreateTask();
                    } else if (e.key === 'Escape') {
                      handleUnnamedListInputEscape(e);
                    }
                  }}
                  aria-label="Enter task text"
                ></textarea>
              </div>
            {/if}
          </div>
        {:else if Array.isArray($lists)}
          <!-- 5-column grid layout with column containers -->
          <div class="grid grid-cols-5 gap-4 w-full">
            {#each listsByColumn() as columnLists, columnIndex}
              <div class="flex flex-col min-w-0 border-r border-gray-300 last:border-r-0 pt-0" data-column-index={columnIndex}>
                <div
                  use:dndzone={{
                    items: columnLists,
                    type: 'list' // Unique type for lists
                  }}
                  onconsider={handleListConsider}
                  onfinalize={handleListFinalize}
                  class="flex flex-col pt-0"
                >
                  <!-- Render lists in this column -->
                  {#each columnLists as dragItem, index (dragItem.id)}
                    {@const isPlaceholder = isPlaceholderItem(dragItem)}
                    {@const realList = isPlaceholder ? stableLists.find(list => list.id === dragItem.id) : dragItem}
                    {@const isLast = index === columnLists.length - 1}
                    <div data-id={dragItem.id} class="flex flex-col" style={isLast ? '' : 'margin-bottom: 1.5rem;'}>
                      {#if realList}
                        <TaskList
                          listId={realList.id}
                          listName={realList.name ?? 'Unnamed list'}
                          newTaskInput={newTaskInputs[realList.id] || ''}
                          onInputChange={(value) => handleInputChange(realList.id, value)}
                          allLists={$lists}
                          stableLists={stableLists}
                        />
                      {/if}
                    </div>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
          
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
          
          <!-- Drop zone for creating new list from dragged task -->
          <div class="relative print:hidden">
            <ul
              bind:this={createListDropZoneElement}
              use:dndzone={{
                items: createListDropZoneItems,
                type: 'task' // Shared type for all lists - enables cross-list dragging
              }}
              onconsider={handleCreateListConsider}
              onfinalize={handleCreateListFinalize}
              class="m-0 p-0 list-none min-h-0 pb-2"
            >
              {#each createListDropZoneItems as task (task.id)}
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
                    disabled
                    class="cursor-pointer opacity-50"
                    aria-hidden="true"
                    tabindex="-1"
                  />
                  <span 
                    class={task.status === 'checked' ? 'line-through break-words' : 'break-words'}
                    style="width: {TASK_WIDTH}px;"
                  >
                    {task.text || '\u00A0'}
                  </span>
                </li>
              {/each}
            </ul>
          </div>
          
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
                  class="flex-none break-words resize-none min-h-[2.5rem] max-h-[10rem] overflow-y-auto"
                  style="width: {TASK_WIDTH}px;"
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
                class="cursor-pointer hover:underline break-words"
                style="width: {TASK_WIDTH}px;"
                onclick={handleUnnamedListAddTaskClick}
                onkeydown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleUnnamedListAddTaskClick();
                  }
                }}
                role="button"
                tabindex="0"
                aria-label="Add your first task"
              >
                Add your first task
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
