<script>
  import { liveQuery } from 'dexie';
  import { tick } from 'svelte';
  import { handleDragConsider, handleDragFinalize } from '../lib/drag/dragAdapter.js';
  import { syncListsForDrag } from '../lib/drag/syncDragState.js';
  import { getAllLists, updateListOrderWithColumn } from '../lib/dataAccess.js';
  import { groupListsIntoColumns, findListPosition } from '../lib/listDndUtils.js';
  import { applyListMoveInColumns } from '../lib/listKeyboardDrag.js';
  import { processListConsider, processListFinalize } from '../lib/listDragHandlers.js';
  import { setupKeyboardListDragHandler } from '../lib/useKeyboardListDrag.js';
  import { focusListCardForKeyboardDrag, focusElementWithRetry } from '../lib/focusUtils.js';
  import { useListCreation } from '../lib/useListCreation.js';
  import TaskList from './TaskList.svelte';
  import ListColumn from './ListColumn.svelte';

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

  // State for keyboard-based list dragging
  let keyboardDrag = $state({
    active: false,
    listId: null,
    lastDraggedId: null,
    shouldRefocusOnNextTab: false
  });
  
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
  
  // Sync draggableLists from liveQuery
  // Uses utility function to protect liveQuery from mutation by drag library
  // See syncDragState.js for explanation of why this pattern exists
  // Note: Only syncs when query is ready - preserves draggableLists during loading/drag
  $effect(() => {
    if ($lists && Array.isArray($lists)) {
      draggableLists = syncListsForDrag($lists);
    }
    // If query is undefined/null (loading), don't update draggableLists
    // This preserves the current state during drag operations
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
    if (keyboardDrag.active && keyboardDrag.listId === listId) {
      await focusListCardForKeyboardDrag(listId);
    }
  }

  function isListInKeyboardDrag(listId) {
    return keyboardDrag.active === true && keyboardDrag.listId === listId;
  }


  function startKeyboardListDrag(listId) {
    // Starting a new drag clears any pending "refocus on next Tab" behavior
    keyboardDrag = {
      ...keyboardDrag,
      active: true,
      listId,
      shouldRefocusOnNextTab: false
    };
  }

  function stopKeyboardListDrag() {
    // Remember which list was just dragged so we can optionally refocus it
    if (keyboardDrag.listId != null) {
      keyboardDrag = {
        ...keyboardDrag,
        active: false,
        listId: null,
        lastDraggedId: keyboardDrag.listId,
        shouldRefocusOnNextTab: true
      };
    } else {
      keyboardDrag = {
        ...keyboardDrag,
        active: false,
        listId: null
      };
    }
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
            keyboardDrag = {
              ...keyboardDrag,
              lastDraggedId: listId,
              shouldRefocusOnNextTab: true
            };
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
      getKeyboardListDrag: () => ({ active: keyboardDrag.active, listId: keyboardDrag.listId }),
      getLastKeyboardDraggedListId: () => keyboardDrag.lastDraggedId,
      getShouldRefocusListOnNextTab: () => keyboardDrag.shouldRefocusOnNextTab,
      setShouldRefocusListOnNextTab: (value) => { 
        keyboardDrag = { ...keyboardDrag, shouldRefocusOnNextTab: value }; 
      }
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
    // Guard: return early if document is not available (e.g., in test environment)
    if (typeof document === 'undefined') {
      return;
    }
    
    // Use focusElementWithRetry with a custom getter that finds and clicks the button
    await focusElementWithRetry(
      () => {
        const listSection = document.querySelector(`[data-list-id="${listId}"]`);
        if (!listSection) return null;
        
        const addTaskContainer = listSection.querySelector('.add-task-container');
        if (!addTaskContainer) return null;
        
        const addTaskSpan = addTaskContainer.querySelector('span[role="button"]');
        if (addTaskSpan && addTaskSpan instanceof HTMLElement) {
          addTaskSpan.click();
          return addTaskSpan; // Return element to indicate success
        }
        return null;
      },
      { waitForTick: true }
    );
  }
  
  // Set up list creation composable
  const listCreation = useListCreation({
    getColumnIndex: () => createListColumnIndex,
    setColumnIndex: (value) => { createListColumnIndex = value; },
    getInput: () => createListInput,
    setInput: (value) => { createListInput = value; },
    getInputElement: () => createListInputElement
  });

  // Extract handlers from composable
  const {
    handleCreateListClick,
    handleCreateListKeydown,
    handleCreateListInputEscape,
    handleCreateList,
    handleCreateListOnTab,
    setupClickOutsideEffect,
    setupFocusEffect
  } = listCreation;

  // Handle click outside input to close it (only if no content)
  $effect(() => {
    return setupClickOutsideEffect();
  });
  
  // Focus input when it becomes active
  $effect(() => {
    return setupFocusEffect();
  });
  
  // Handle list drag events - consider event for visual reordering
  // The drag library REQUIRES the items array to match DOM structure during drag
  // We MUST update draggableLists here to provide visual feedback
  function handleListConsider(event, columnIndex) {
    // Get items for this column (includes placeholders for visual feedback)
    handleDragConsider(event, (newColumnItems) => {
      // Update draggableLists using extracted utility function
      draggableLists = processListConsider(newColumnItems, columnIndex, draggableLists);
    });
  }
  
  // Handle list drag events - finalize event for database updates
  // columnIndex indicates which column the lists were dropped into
  async function handleListFinalize(event, columnIndex) {
    try {
      // Process finalize event: filter placeholders, check if update should be skipped, update database
      handleDragFinalize(event, async (items) => {
        await processListFinalize(items || [], columnIndex, $lists, draggableLists);
        
        // Note: liveQuery will automatically update the UI after database changes
        // The $effect will sync draggableLists from liveQuery
      });
    } catch (error) {
      // On error, revert draggableLists to match database state
      // The $effect will sync it back from liveQuery
    }
  }
</script>

<div class="w-full h-full overflow-auto">
  {#if $lists === undefined || $lists === null}
    <p>Loading...</p>
  {:else if Array.isArray($lists)}
    <!-- 5-column grid layout with column containers -->
    <div class="grid grid-cols-5 w-full py-4 px-1">
      {#each listsByColumn as columnLists, columnIndex}
        <ListColumn
          {columnIndex}
          {columnLists}
          {stableLists}
          {newTaskInputs}
          {createListColumnIndex}
          keyboardListDrag={{ active: keyboardDrag.active, listId: keyboardDrag.listId }}
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
  {/if}
</div>

