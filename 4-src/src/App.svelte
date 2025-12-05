<script>
  import { liveQuery } from 'dexie';
  import { getAllLists, createList } from './lib/dataAccess.js';
  import TaskList from './components/TaskList.svelte';
  import ArchivedView from './components/ArchivedView.svelte';
  
  // Reactive query for lists - automatically updates when lists change
  let lists = liveQuery(() => getAllLists());
  
  // Track new task inputs per list
  let newTaskInputs = $state({});
  
  // State for creating new list (happy path)
  let isCreateListInputActive = $state(false);
  let createListInput = $state('');
  let createListInputElement = $state(null);
  
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
      // Wait for the list to appear in the DOM and TaskList to render, then activate task input
      setTimeout(() => {
        const listSection = document.querySelector(`[data-list-id="${listId}"]`);
        if (listSection) {
          // Find the "Add Task" button and click it to activate the input
          const addTaskContainer = listSection.querySelector('.add-task-container');
          if (addTaskContainer) {
            const addTaskSpan = addTaskContainer.querySelector('span[role="button"]');
            if (addTaskSpan) {
              // Use a small delay to ensure TaskList component is fully rendered
              setTimeout(() => {
                addTaskSpan.click();
              }, 50);
            }
          }
        }
      }, 150);
      
      // Lists will update automatically via liveQuery
    } catch (error) {
      console.error('Error creating list:', error);
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
              listName={list.name}
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
