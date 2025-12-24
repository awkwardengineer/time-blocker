<script>
  import { liveQuery } from 'dexie';
  import { tick, onMount, onDestroy } from 'svelte';
  import Sortable from 'sortablejs';
  import { dragStateManager } from '../lib/drag/dragStateManager.js';
  import { getAllLists, updateListOrderWithColumn } from '../lib/dataAccess.js';
  import { groupListsIntoColumns, findListPosition } from '../lib/listDndUtils.js';
  import { applyListMoveInColumns } from '../lib/listKeyboardDrag.js';
  import { filterValidListItems } from '../lib/listDragHandlers.js';
  import { applyDropZoneStyles, removeDropZoneStyles } from '../lib/drag/dropZoneUtils.js';
  import { setupKeyboardListDragHandler } from '../lib/useKeyboardListDrag.js';
  import { focusListCardForKeyboardDrag, focusElementWithRetry } from '../lib/focusUtils.js';
  import { useListCreation } from '../lib/useListCreation.js';
  import { FOCUS_RETRY_ATTEMPTS, FOCUS_RETRY_INTERVAL } from '../lib/constants.js';
  import TaskList from './TaskList.svelte';
  import ListColumn from './ListColumn.svelte';

  // Reactive query for lists - automatically updates when lists change
  let lists = liveQuery(() => getAllLists());
  
  // Stable lists derived from source of truth - never contains placeholders
  // Used for rendering TaskList components to prevent remounting during drag
  let stableLists = $derived($lists || []);
  
  // Local state for drag-and-drop lists - synced from dragStateManager (event-driven)
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
  
  // SortableJS instances for list columns
  let columnSortables = $state(new Map()); // Map<columnIndex, Sortable>
  
  // Extract items from DOM order for lists
  // Uses state manager's current state to ensure we get the latest data
  // CRITICAL: Sets columnIndex to target column for all extracted items (fixes cross-column drags)
  function extractListItemsFromDOM(container, columnIndex) {
    if (!container) return [];
    const children = Array.from(container.children);
    const seenIds = new Set();
    const items = [];
    
    // Get current state from state manager (not draggableLists which might be stale)
    const currentState = dragStateManager.getState();
    const currentLists = currentState.lists;
    
    for (const child of children) {
      const idAttr = child.getAttribute('data-id');
      if (!idAttr) continue;
      const id = parseInt(idAttr, 10);
      
      // Skip duplicates - if we've already seen this ID, skip it
      if (seenIds.has(id)) {
        continue;
      }
      
      seenIds.add(id);
      // Look up in state manager's current state (not draggableLists)
      const list = currentLists.find(l => l.id === id);
      if (list) {
        // CRITICAL FIX: Set columnIndex to target column (not the old one from state)
        // This ensures cross-column drags work correctly
        items.push({
          ...list,
          columnIndex: columnIndex
        });
      } else {
        // Fallback: if not in state manager, try draggableLists (shouldn't happen but safety)
        const fallbackList = draggableLists.find(l => l.id === id);
        if (fallbackList) {
          items.push({
            ...fallbackList,
            columnIndex: columnIndex
          });
        }
      }
    }
    
    return items;
  }
  
  // Get column index from a container element by traversing up the DOM
  function getColumnIndexFromContainer(container) {
    if (!container) return null;
    let element = container;
    // Traverse up to find parent with data-column-index
    while (element && element !== document.body) {
      if (element instanceof HTMLElement) {
        const columnIndexAttr = element.getAttribute('data-column-index');
        if (columnIndexAttr !== null) {
          return parseInt(columnIndexAttr, 10);
        }
      }
      element = element.parentElement;
    }
    return null;
  }
  
  
  // Handle list drag end with optimistic updates via state manager
  async function handleListDragEnd(evt, columnIndex) {
    const { to } = evt;
    const targetContainer = to;
    
    // Determine target column index from DOM (not source columnIndex)
    const targetColumnIndex = getColumnIndexFromContainer(targetContainer);
    if (targetColumnIndex === null) {
      console.error('[LIST DRAG] Could not determine target column index');
      return;
    }
    
    const isCrossColumn = targetColumnIndex !== columnIndex;
    
    // Wait for any pending DOM updates before extracting
    await tick();
    
    // CRITICAL FIX: Clean up duplicate DOM elements BEFORE extraction
    // SortableJS may leave moved elements in DOM that Svelte also renders
    // This causes duplicates when extracting. Clean them up first.
    if (isCrossColumn) {
      // Find and remove duplicate elements across all columns
      const allColumns = document.querySelectorAll('[data-column-index]');
      const seenIds = new Map(); // Map<id, firstElement>
      
      allColumns.forEach(column => {
        const columnIndexAttr = column.getAttribute('data-column-index');
        if (columnIndexAttr === null) return;
        
        // Get first direct child div (querySelector doesn't support > combinator)
        const columnContainer = column.firstElementChild;
        if (!columnContainer || !(columnContainer instanceof HTMLElement)) return;
        
        const children = Array.from(columnContainer.children);
        
        children.forEach((child) => {
          const idAttr = child.getAttribute('data-id');
          if (!idAttr) return;
          const id = parseInt(idAttr, 10);
          
          if (seenIds.has(id)) {
            // Duplicate found - remove this one (keep the first one we saw)
            child.remove();
          } else {
            seenIds.set(id, child);
          }
        });
      });
      
      // Wait for DOM cleanup to complete
      await tick();
    }
    
    // Extract items from target container (now clean of duplicates)
    const newOrder = extractListItemsFromDOM(targetContainer, targetColumnIndex);
    const validItems = filterValidListItems(newOrder);
    
    // Deduplicate validItems by ID (in case DOM extraction found duplicates)
    const seenIds = new Set();
    const finalValidItems = validItems.filter(item => {
      if (seenIds.has(item.id)) {
        return false;
      }
      seenIds.add(item.id);
      return true;
    });
    
    if (finalValidItems.length === 0) {
      return;
    }
    
    // Start drag operation in state manager (prevents liveQuery from overwriting)
    dragStateManager.startDrag();
    
    // Update state manager with optimistic update
    dragStateManager.updateDragState(targetColumnIndex, finalValidItems);
    
    // Wait for Svelte to update DOM after state change
    await tick();
    await tick();
    
    // For cross-column drags, check for duplicates after Svelte re-render and recreate SortableJS instances
    if (isCrossColumn) {
      // Check DOM for duplicates after Svelte re-render
      const allColumnsAfterRender = document.querySelectorAll('[data-column-index]');
      const seenIdsAfterRender = new Map();
      
      allColumnsAfterRender.forEach(column => {
        const columnIndexAttr = column.getAttribute('data-column-index');
        if (columnIndexAttr === null) return;
        
        const columnContainer = column.firstElementChild;
        if (!columnContainer || !(columnContainer instanceof HTMLElement)) return;
        
        const children = Array.from(columnContainer.children);
        
        children.forEach((child) => {
          const idAttr = child.getAttribute('data-id');
          if (!idAttr) return;
          const id = parseInt(idAttr, 10);
          
          if (seenIdsAfterRender.has(id)) {
            // Duplicate found after render - remove it
            child.remove();
          } else {
            seenIdsAfterRender.set(id, child);
          }
        });
      });
      // Wait for Svelte to fully re-render
      await tick();
      await tick();
      
      // Destroy SortableJS instances for both source and target columns
      const sourceSortable = columnSortables.get(columnIndex);
      const targetSortable = columnSortables.get(targetColumnIndex);
      
      if (sourceSortable) {
        sourceSortable.destroy();
        columnSortables.delete(columnIndex);
      }
      if (targetSortable) {
        targetSortable.destroy();
        columnSortables.delete(targetColumnIndex);
      }
      
      // Wait for DOM cleanup to complete
      await tick();
      
      // Re-initialize SortableJS for both columns
      const sourceColumnElement = document.querySelector(`[data-column-index="${columnIndex}"] .sortable-column-container`);
      const targetColumnElement = document.querySelector(`[data-column-index="${targetColumnIndex}"] .sortable-column-container`);
      
      if (sourceColumnElement) {
        setTimeout(() => {
          initializeColumnSortable(sourceColumnElement, columnIndex);
        }, 10);
      }
      if (targetColumnElement) {
        setTimeout(() => {
          initializeColumnSortable(targetColumnElement, targetColumnIndex);
        }, 10);
      }
    }
    
    // Persist to database
    try {
      await updateListOrderWithColumn(targetColumnIndex, finalValidItems);
      // Success: state manager will allow liveQuery to sync back
      dragStateManager.completeDrag(true);
      
      // If target column became empty, reinitialize SortableJS to ensure it can accept drops
      if (finalValidItems.length === 0) {
        const targetColumnElement = document.querySelector(`[data-column-index="${targetColumnIndex}"] .sortable-column-container`);
        if (targetColumnElement) {
          const existingSortable = columnSortables.get(targetColumnIndex);
          if (existingSortable) {
            existingSortable.destroy();
            columnSortables.delete(targetColumnIndex);
          }
          await tick();
          initializeColumnSortable(targetColumnElement, targetColumnIndex);
        }
      }
    } catch (error) {
      console.error('[LIST DRAG] Failed to save list order:', error);
      // Error: state manager will allow liveQuery to restore previous state
      dragStateManager.completeDrag(false);
      // TODO: Show user notification about the error
    }
  }
  
  // Apply drop zones to all columns
  function applyDropZonesToAllColumns() {
    if (typeof document === 'undefined') return;
    const allColumns = document.querySelectorAll('.sortable-column-container');
    allColumns.forEach(col => {
      if (col instanceof HTMLElement) {
        applyDropZoneStyles(col);
      }
    });
  }
  
  // Remove drop zones from all columns
  function removeDropZonesFromAllColumns() {
    if (typeof document === 'undefined') return;
    const allColumns = document.querySelectorAll('.sortable-column-container');
    allColumns.forEach(col => {
      if (col instanceof HTMLElement) {
        removeDropZoneStyles(col);
      }
    });
  }
  
  // Initialize SortableJS for a column
  function initializeColumnSortable(columnElement, columnIndex) {
    if (!columnElement || columnSortables.has(columnIndex)) return;
    
    const sortable = new Sortable(columnElement, {
      animation: 150,
      ghostClass: 'sortable-ghost-list',
      group: 'lists', // Enable cross-column list dragging
      draggable: '[data-id]', // Only drag list containers
      filter: 'ul, li, .create-list-container, .empty-drop-zone', // Prevent dragging tasks, button, and empty drop zone
      preventOnFilter: false,
      emptyInsertThreshold: 50, // Allow dropping into empty columns (distance in pixels from edge)
      forceFallback: true, // Use clone instead of moving element - prevents DOM manipulation conflicts with Svelte
      fallbackOnBody: true, // Clone appears at cursor position
      scroll: true, // Enable auto-scrolling when dragging near edges
      scrollSensitivity: 30, // Distance from edge to trigger scroll
      scrollSpeed: 10, // Scroll speed
      onStart: () => {
        // Hide create list buttons during drag
        if (typeof document !== 'undefined') {
          document.body.classList.add('list-dragging-active');
        }
        // Show drop zones on all columns
        applyDropZonesToAllColumns();
      },
      onMove: (evt) => {
        // Apply drop zone to target column when hovering over it
        if (evt.to && evt.to instanceof HTMLElement) {
          applyDropZoneStyles(evt.to);
        }
        // Also ensure source column has drop zone
        if (evt.from && evt.from instanceof HTMLElement) {
          applyDropZoneStyles(evt.from);
        }
      },
      onEnd: (evt) => {
        // Re-show create list buttons after drag
        if (typeof document !== 'undefined') {
          document.body.classList.remove('list-dragging-active');
        }
        // Remove drop zones from all columns
        removeDropZonesFromAllColumns();
        
        // Handle drag end (with optimistic updates)
        handleListDragEnd(evt, columnIndex);
      }
    });
    
    columnSortables.set(columnIndex, sortable);
  }
  
  // Cleanup SortableJS instances
  onDestroy(() => {
    columnSortables.forEach((sortable) => {
      if (sortable) {
        sortable.destroy();
      }
    });
    columnSortables.clear();
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
  
  // Sync draggableLists from dragStateManager (event-driven, not reactive)
  // This subscribes to state manager changes and updates Svelte state
  $effect(() => {
    const unsubscribe = dragStateManager.subscribe((state) => {
      draggableLists = state.lists;
    });
    
    return () => {
      unsubscribe();
    };
  });
  
  // Sync liveQuery → dragStateManager (one-way, only when not dragging)
  // The state manager prevents overwriting during drag operations
  $effect(() => {
    if ($lists && Array.isArray($lists)) {
      dragStateManager.initializeFromQuery($lists);
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
   * This updates dragStateManager for immediate feedback and
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

    const updatedDraggableLists = result.updatedDraggableLists;
    // TypeScript may not see these properties, but they exist at runtime
    const targetColumnIndex = ('targetColumnIndex' in result && result.targetColumnIndex !== undefined) ? Number(result.targetColumnIndex) : 0;
    const targetColumnItems = ('targetColumnItems' in result && result.targetColumnItems !== undefined && Array.isArray(result.targetColumnItems)) ? result.targetColumnItems : [];

    if (targetColumnItems.length === 0) {
      return;
    }

    // Update state manager (optimistic update)
    dragStateManager.startDrag();
    dragStateManager.updateDragState(targetColumnIndex, targetColumnItems);

    // Persist changes for the affected column using existing helper
    try {
      const itemsToUpdate = Array.isArray(targetColumnItems) ? targetColumnItems : [];
      await updateListOrderWithColumn(targetColumnIndex, itemsToUpdate);
      dragStateManager.completeDrag(true);
    } catch (error) {
      console.error('[KEYBOARD DRAG] Error moving list via keyboard:', error);
      dragStateManager.completeDrag(false);
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
      { waitForTick: true, maxAttempts: FOCUS_RETRY_ATTEMPTS, retryInterval: FOCUS_RETRY_INTERVAL }
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
  
</script>

<div class="w-full h-full overflow-hidden">
  {#if $lists === undefined || $lists === null}
    <p>Loading...</p>
  {:else if Array.isArray($lists)}
    <!-- 5-column grid layout with column containers -->
    <div class="grid grid-cols-5 w-full h-full py-4 px-1">
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
          onCreateListClick={handleCreateListClick}
          onCreateListKeydown={handleCreateListKeydown}
          onCreateListInputEscape={handleCreateListInputEscape}
          onCreateList={handleCreateList}
          onCreateListOnTab={handleCreateListOnTab}
          onColumnElementReady={(element, colIndex) => {
            // Initialize SortableJS when column element is ready
            if (element) {
              setTimeout(() => {
                initializeColumnSortable(element, colIndex);
              }, 10);
            }
          }}
          bind:createListInput
          bind:createListInputElement
          allLists={$lists}
        />
      {/each}
    </div>
  {/if}
</div>

