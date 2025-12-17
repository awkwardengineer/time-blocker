<script>
  import { liveQuery } from 'dexie';
  import { tick } from 'svelte';
  import { dndzone } from 'svelte-dnd-action';
  import { getAllLists, createList, updateListOrderWithColumn } from '../lib/dataAccess.js';
  import { useClickOutside } from '../lib/useClickOutside.js';
  import { isEmpty, normalizeInput } from '../lib/inputValidation.js';
  import { MAX_RETRY_ATTEMPTS, RETRY_INTERVAL_MS } from '../lib/constants.js';
  import { groupListsIntoColumns, findListPosition, isPlaceholderItem } from '../lib/listDndUtils.js';
  import { applyListMoveInColumns } from '../lib/listKeyboardDrag.js';
  import { processListConsider, shouldSkipFinalizeUpdate } from '../lib/listDragHandlers.js';
  import { focusListCardForKeyboardDrag, setupKeyboardListDragHandler } from '../lib/useKeyboardListDrag.js';
  import TaskList from './TaskList.svelte';
  import ListColumn from './ListColumn.svelte';
  import CreateListDropZone from './CreateListDropZone.svelte';

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
  
  // State for creating new list (happy path) - track which column
  let createListColumnIndex = $state(null); // null means not active, 0-4 means active for that column
  let createListInput = $state('');
  let createListInputElement = $state(null);
  
  // State for drop zone on "Create new list" section
  // Note: creating new unnamed lists from dropped tasks has been removed.
  // The drop zone remains for visual feedback only and no longer creates lists.
  let createListDropZoneItems = $state([]);
  let createListDropZoneElement = $state(null);

  // State for keyboard-based list dragging
  let keyboardListDrag = $state({
    active: false,
    listId: null
  });
  let lastKeyboardDraggedListId = $state(null);
  let shouldRefocusListOnNextTab = $state(false);
  
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
  let previousDraggableListsCount = $state(0);
  $effect(() => {
    if ($lists && Array.isArray($lists)) {
      const newDraggableLists = $lists.map(list => ({ id: list.id, name: list.name, order: list.order, columnIndex: list.columnIndex }));
      
      if (newDraggableLists.length !== previousDraggableListsCount) {
        previousDraggableListsCount = newDraggableLists.length;
      }
      
      draggableLists = newDraggableLists;
    } else {
      if (previousDraggableListsCount > 0) {
        previousDraggableListsCount = 0;
      }
      draggableLists = [];
    }
  });

  // Organize lists by column with overflow handling
  // Lists with columnIndex >= 5 are placed in the last column (index 4)
  const COLUMN_COUNT = 5;
  
  // Organize lists into columns for rendering
  // Returns an array of columns, each containing lists for that column
  let listsByColumn = $derived.by(() => {
    return groupListsIntoColumns(draggableLists, COLUMN_COUNT);
  });

  /**
   * Apply a keyboard-driven move for a list (up/down/left/right).
   * This updates local draggableLists for immediate feedback and
   * persists the change via updateListOrderWithColumn.
   */
  async function moveListWithKeyboard(listId, direction) {
    const columns = listsByColumn;
    if (!columns || columns.length === 0) {
      return;
    }

    const result = applyListMoveInColumns(columns, listId, direction, COLUMN_COUNT);
    if (!result) {
      return;
    }

    const { updatedDraggableLists, targetColumnIndex, targetColumnItems } = result;

    draggableLists = updatedDraggableLists;

    // Persist changes for the affected column using existing helper
    try {
      await updateListOrderWithColumn(targetColumnIndex, targetColumnItems);
    } catch (error) {
      console.error('[KEYBOARD DRAG] Error moving list via keyboard:', error);
    }

    // After updating state and DB, ensure the list card regains focus for visible keyboard feedback
    if (keyboardListDrag.active && keyboardListDrag.listId === listId) {
      await focusListCardForKeyboardDrag(listId);
    }
  }

  function isListInKeyboardDrag(listId) {
    return keyboardListDrag.active === true && keyboardListDrag.listId === listId;
  }


  function startKeyboardListDrag(listId) {
    // Starting a new drag clears any pending "refocus on next Tab" behavior
    shouldRefocusListOnNextTab = false;
    keyboardListDrag = {
      active: true,
      listId
    };
  }

  function stopKeyboardListDrag() {
    // Remember which list was just dragged so we can optionally refocus it
    if (keyboardListDrag.listId != null) {
      lastKeyboardDraggedListId = keyboardListDrag.listId;
      // Arm the "next Tab should refocus this list" behavior after any drop
      shouldRefocusListOnNextTab = true;
    }
    keyboardListDrag = {
      active: false,
      listId: null
    };
  }

  function blurActiveElement() {
    if (typeof document === 'undefined') return;
    const active = document.activeElement;
    if (active && active instanceof HTMLElement) {
      active.blur();
    }
  }

  function handleListKeyboardKeydown(event, listId) {
    const currentTarget = event.currentTarget;
    const target = event.target;
    const key = event.key;
    const isActive = isListInKeyboardDrag(listId);

    // Start keyboard drag mode with Enter/Space when the list card itself is focused.
    if (!isActive) {
      if (
        key === 'Enter' ||
        key === ' '
      ) {
        // Only start when focus is on the list wrapper itself, not inner controls.
        if (currentTarget instanceof HTMLElement && currentTarget === target) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          if (listId != null) {
            startKeyboardListDrag(listId);
          }
        }
      } else if (key === 'Escape') {
        // Escape when not in drag state - blur the list element
        // Only handle when focus is on the list wrapper itself, not inner controls.
        if (currentTarget instanceof HTMLElement && currentTarget === target) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          // Set up Tab-resume behavior (mirrors task behavior)
          if (listId != null) {
            lastKeyboardDraggedListId = listId;
            shouldRefocusListOnNextTab = true;
          }
          currentTarget.blur();
        }
      }
      return;
    }
  }

  // Document-level handler for all keydown events during list keyboard drag
  $effect(() => {
    if (typeof document === 'undefined') return;

    const state = {
      getKeyboardListDrag: () => keyboardListDrag,
      getLastKeyboardDraggedListId: () => lastKeyboardDraggedListId,
      getShouldRefocusListOnNextTab: () => shouldRefocusListOnNextTab,
      setShouldRefocusListOnNextTab: (value) => { shouldRefocusListOnNextTab = value; }
    };

    return setupKeyboardListDragHandler(
      state,
      (listId, direction) => moveListWithKeyboard(listId, direction),
      () => stopKeyboardListDrag(),
      () => blurActiveElement()
    );
  });
  
  function handleInputChange(listId, value) {
    newTaskInputs[listId] = value;
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
  
  function handleCreateListClick(columnIndex) {
    createListColumnIndex = columnIndex;
  }
  
  function handleCreateListKeydown(event, columnIndex) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      handleCreateListClick(columnIndex);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      // Blur the "Create new list" button
      const buttonElement = event.currentTarget;
      if (buttonElement && buttonElement instanceof HTMLElement) {
        buttonElement.blur();
      }
    }
  }
  
  function handleCreateListInputEscape(e) {
    if (e.key === 'Escape') {
      createListColumnIndex = null;
      createListInput = '';
    }
  }
  
  // Handle click outside input to close it (only if no content)
  $effect(() => {
    if (createListColumnIndex === null) return;
    
    return useClickOutside(
      createListInputElement,
      () => {
        // Only close if still active (prevents race conditions with programmatic closes)
        if (createListColumnIndex !== null) {
          createListColumnIndex = null;
          createListInput = '';
        }
      },
      {
        ignoreElements: [],
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
    if (createListColumnIndex !== null && createListInputElement) {
      setTimeout(() => {
        createListInputElement?.focus();
      }, 0);
    }
  });
  
  async function handleCreateList(columnIndex) {
    const inputValue = createListInput || '';
    
    // Check if input is empty string "" - exit list creation
    if (isEmpty(inputValue)) {
      createListColumnIndex = null;
      createListInput = '';
      return;
    }
    
    // Check if input contains only whitespace (e.g., " ", "      ")
    const { text: normalizedText, isBlank } = normalizeInput(inputValue);
    if (isBlank) {
      // Whitespace-only, don't create
      createListColumnIndex = null;
      createListInput = '';
      return;
    }
    
    try {
      await createList(normalizedText, columnIndex);
      // Clear input but keep it open for creating another list
      createListInput = '';
      // Keep createListColumnIndex set to columnIndex so input stays open
      // Lists will update automatically via liveQuery
      // The "add a new task" empty state will appear below the newly created list automatically
      
      // Refocus the create list input after the list is created
      await tick();
      if (createListInputElement) {
        setTimeout(() => {
          createListInputElement?.focus();
        }, 0);
      }
    } catch (error) {
      console.error('Error creating list:', error);
    }
  }

  /**
   * Handle "Tab" key from the create list input.
   * When tabbing away:
   * - If input is empty/whitespace-only, close the input (no list created).
   * - If input has content, create the list once, then close the input so focus can move on.
   */
  async function handleCreateListOnTab(columnIndex) {
    const inputValue = createListInput || '';
    
    // Empty string - just close the input
    if (isEmpty(inputValue)) {
      createListColumnIndex = null;
      createListInput = '';
      return;
    }
    
    // Whitespace-only - treat as invalid and close input without creating
    const { text: normalizedText, isBlank } = normalizeInput(inputValue);
    if (isBlank) {
      createListColumnIndex = null;
      createListInput = '';
      return;
    }
    
    try {
      await createList(normalizedText, columnIndex);
      // Clear and close input after creating the list so focus can move forward
      createListInput = '';
      createListColumnIndex = null;
    } catch (error) {
      console.error('Error creating list on Tab:', error);
    }
  }
  
  // Handle drag events for "Create new list" drop zone - consider event for visual feedback
  function handleCreateListConsider(event) {
    // Update local state for visual feedback during drag
    createListDropZoneItems = event.detail.items;
  }
  
  // Handle drag events for "Create new list" drop zone - finalize event
  // Creating new unnamed lists from dropped tasks has been removed; we now
  // only reset the drop zone items.
  async function handleCreateListFinalize(event) {
    // Update local state for immediate visual feedback
    createListDropZoneItems = event.detail.items;
    
    // Always reset the drop zone; do not create new lists from tasks.
    createListDropZoneItems = [];
  }
  
  // Handle list drag events - consider event for visual reordering
  // The drag library REQUIRES the items array to match DOM structure during drag
  // We MUST update draggableLists here to provide visual feedback
  function handleListConsider(event, columnIndex) {
    // Get items for this column (includes placeholders for visual feedback)
    const newColumnItems = event.detail.items || [];
    
    // Update draggableLists using extracted utility function
    draggableLists = processListConsider(newColumnItems, columnIndex, draggableLists);
  }
  
  // Handle list drag events - finalize event for database updates
  // columnIndex indicates which column the lists were dropped into
  async function handleListFinalize(event, columnIndex) {
    // Update draggableLists - placeholders should be gone by finalize, but filter just in case
    const validItems = (event.detail.items || []).filter(item => !isPlaceholderItem(item));
    const filteredPlaceholders = (event.detail.items || []).filter(item => isPlaceholderItem(item));
    
    if (filteredPlaceholders.length > 0) {
      console.warn('[DRAG] finalize - WARNING: Placeholders still present in finalize!', filteredPlaceholders.length);
    }
    
    // Check if we should skip the database update (source column that only lost items)
    if (shouldSkipFinalizeUpdate(validItems, columnIndex, $lists, draggableLists)) {
      return;
    }
    
    // Update database with new order and columnIndex values
    try {
      await updateListOrderWithColumn(columnIndex, validItems);
      
      // Note: liveQuery will automatically update the UI after database changes
      // The $effect will sync draggableLists from liveQuery
    } catch (error) {
      console.error('[DRAG] finalize - ERROR updating list order:', error);
      // On error, revert draggableLists to match database state
      // The $effect will sync it back from liveQuery
    }
  }
</script>

<div class="w-full h-full p-4 overflow-auto">
  {#if $lists === undefined || $lists === null}
    <p>Loading...</p>
  {:else if Array.isArray($lists)}
    <!-- 5-column grid layout with column containers -->
    <div class="grid grid-cols-5 gap-4 w-full">
      {#each listsByColumn as columnLists, columnIndex}
        <ListColumn
          {columnIndex}
          {columnLists}
          {stableLists}
          {newTaskInputs}
          {createListColumnIndex}
          keyboardListDrag={keyboardListDrag}
          onInputChange={handleInputChange}
          onListKeyboardKeydown={handleListKeyboardKeydown}
          onListConsider={(e) => handleListConsider(e, columnIndex)}
          onListFinalize={(e) => handleListFinalize(e, columnIndex)}
          onCreateListClick={handleCreateListClick}
          onCreateListKeydown={handleCreateListKeydown}
          onCreateListInputEscape={handleCreateListInputEscape}
          onCreateList={handleCreateList}
          onCreateListOnTab={handleCreateListOnTab}
          bind:createListInput
          bind:createListInputElement
          allLists={$lists}
        />
      {/each}
    </div>
    
    <!-- Drop zone for creating new list from dragged task -->
    <CreateListDropZone
      bind:createListDropZoneElement
      {createListDropZoneItems}
      onConsider={handleCreateListConsider}
      onFinalize={handleCreateListFinalize}
    />
  {/if}
</div>

