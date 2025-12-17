<script>
  import { liveQuery } from 'dexie';
  import { tick } from 'svelte';
  import { dndzone } from 'svelte-dnd-action';
  import { getAllLists, createList, createTask, updateTaskOrderCrossList, updateListOrder, updateListOrderWithColumn } from './lib/dataAccess.js';
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
      
      // Log when draggableLists changes (for debugging drag operations) - only log count to avoid performance issues
      if (newDraggableLists.length !== previousDraggableListsCount) {
        console.log('[DRAG] draggableLists updated from liveQuery:', {
          previousCount: previousDraggableListsCount,
          newCount: newDraggableLists.length
        });
        previousDraggableListsCount = newDraggableLists.length;
      }
      
      draggableLists = newDraggableLists;
    } else {
      if (previousDraggableListsCount > 0) {
        console.log('[DRAG] draggableLists cleared (no lists)');
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

  /**
   * Find the current column index and position index for a list ID
   * using the derived listsByColumn structure.
   */
  function findListPosition(listId) {
    const columns = listsByColumn();
    if (!columns || columns.length === 0) {
      return null;
    }
    for (let columnIndex = 0; columnIndex < columns.length; columnIndex++) {
      const columnLists = columns[columnIndex];
      if (!Array.isArray(columnLists)) continue;
      const index = columnLists.findIndex(list => list.id === listId);
      if (index !== -1) {
        return { columnIndex, index };
      }
    }
    return null;
  }

  /**
   * Apply a keyboard-driven move for a list (up/down/left/right).
   * This updates local draggableLists for immediate feedback and
   * persists the change via updateListOrderWithColumn.
   */
  async function moveListWithKeyboard(listId, direction) {
    const columns = listsByColumn();
    if (!columns || columns.length === 0) {
      return;
    }

    const position = findListPosition(listId);
    if (!position) {
      return;
    }

    const { columnIndex: currentColumnIndex, index: currentIndex } = position;
    let targetColumnIndex = currentColumnIndex;
    let targetIndex = currentIndex;

    if (direction === 'up') {
      if (currentIndex === 0) return; // Already at top
      targetIndex = currentIndex - 1;
    } else if (direction === 'down') {
      const currentColumnLists = columns[currentColumnIndex] || [];
      if (currentIndex === currentColumnLists.length - 1) return; // Already at bottom
      targetIndex = currentIndex + 1;
    } else if (direction === 'left') {
      if (currentColumnIndex === 0) return; // Already at first column
      targetColumnIndex = currentColumnIndex - 1;
      const targetColumnLists = columns[targetColumnIndex] || [];
      targetIndex = targetColumnLists.length; // Move to end of target column
    } else if (direction === 'right') {
      if (currentColumnIndex === COLUMN_COUNT - 1) return; // Already at last column
      targetColumnIndex = currentColumnIndex + 1;
      const targetColumnLists = columns[targetColumnIndex] || [];
      targetIndex = targetColumnLists.length; // Move to end of target column
    } else {
      return;
    }

    // Clone columns to avoid mutating derived data directly
    const newColumns = columns.map(col => Array.isArray(col) ? [...col] : []);

    const sourceColumnLists = newColumns[currentColumnIndex];
    if (!sourceColumnLists || sourceColumnLists.length === 0) {
      return;
    }

    const [movingItem] = sourceColumnLists.splice(currentIndex, 1);
    if (!movingItem) {
      return;
    }

    const targetColumnLists = newColumns[targetColumnIndex];
    if (!targetColumnLists) {
      return;
    }

    // Clamp target index to valid range
    const safeTargetIndex = Math.min(Math.max(targetIndex, 0), targetColumnLists.length);

    if (direction === 'left' || direction === 'right') {
      // When moving across columns, update columnIndex for the moved item
      targetColumnLists.splice(safeTargetIndex, 0, { ...movingItem, columnIndex: targetColumnIndex });
    } else {
      // Same-column reordering
      targetColumnLists.splice(safeTargetIndex, 0, movingItem);
    }

    // Update local draggableLists for immediate UI feedback
    const updatedDraggableLists = [];
    for (let colIndex = 0; colIndex < newColumns.length; colIndex++) {
      const columnLists = newColumns[colIndex] || [];
      for (let i = 0; i < columnLists.length; i++) {
        const listItem = columnLists[i];
        updatedDraggableLists.push({
          ...listItem,
          columnIndex: colIndex,
          order: i
        });
      }
    }

    draggableLists = updatedDraggableLists;

    // Persist changes for the affected column using existing helper
    const targetColumnItems = (newColumns[targetColumnIndex] || []).map(item => ({ id: item.id }));

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

  async function focusListCardForKeyboardDrag(listId) {
    if (typeof document === 'undefined') return;

    await tick();

    // Find all elements with this data-id and pick the list card wrapper.
    const candidates = Array.from(document.querySelectorAll(`[data-id="${listId}"]`));
    let card = candidates.find(
      (el) => el instanceof HTMLElement && el.getAttribute('role') === 'group'
    );
    if (!card) {
      // Fallback: first DIV with this data-id (lists use div[data-id], tasks use li[data-id])
      card = candidates.find(
        (el) => el instanceof HTMLElement && el.tagName === 'DIV'
      );
    }
    if (card instanceof HTMLElement) {
      card.focus();
    }
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
      }
      return;
    }
  }

  // Document-level handler for all keydown events during list keyboard drag
  $effect(() => {
    if (typeof document === 'undefined') return;

    function handleDocumentKeydownForListDrag(e) {
      const key = e.key;
      const isActive = keyboardListDrag.active === true;
      const activeListId = keyboardListDrag.listId;

      // After a blur-on-drop via Tab, treat the very next Tab as
      // "refocus the last dragged list card", then let Tab behave normally.
      if (
        !isActive &&
        key === 'Tab' &&
        shouldRefocusListOnNextTab &&
        lastKeyboardDraggedListId != null
      ) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        shouldRefocusListOnNextTab = false;
        focusListCardForKeyboardDrag(lastKeyboardDraggedListId);
        return;
      }

      if (!isActive || activeListId == null) {
        return;
      }

      // Movement keys while in keyboard list drag mode
      if (key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        moveListWithKeyboard(activeListId, 'up');
        return;
      }

      if (key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        moveListWithKeyboard(activeListId, 'down');
        return;
      }

      if (key === 'ArrowLeft') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        moveListWithKeyboard(activeListId, 'left');
        return;
      }

      if (key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        moveListWithKeyboard(activeListId, 'right');
        return;
      }

      // End drag mode and commit at current position
      if (key === 'Escape' || key === 'Enter' || key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        stopKeyboardListDrag();
        blurActiveElement();
        return;
      }

      if (key === 'Tab') {
        // Tab should drop the list and then blur (no focused element).
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        stopKeyboardListDrag();
        blurActiveElement();
        return;
      }
    }

    document.addEventListener('keydown', handleDocumentKeydownForListDrag, true);

    return () => {
      document.removeEventListener('keydown', handleDocumentKeydownForListDrag, true);
    };
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
  
  function handleCreateListClick(columnIndex) {
    createListColumnIndex = columnIndex;
  }
  
  function handleCreateListKeydown(event, columnIndex) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      handleCreateListClick(columnIndex);
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
  
  // Helper function to check if an item is a placeholder
  function isPlaceholderItem(item) {
    return item && (item.isDndShadowItem === true || 
                    (typeof item.id === 'string' && item.id.startsWith('id:dnd-shadow-placeholder-')));
  }
  
  // Handle list drag events - consider event for visual reordering
  // The drag library REQUIRES the items array to match DOM structure during drag
  // We MUST update draggableLists here to provide visual feedback
  function handleListConsider(event, columnIndex) {
    console.log('[DRAG] ===== CONSIDER EVENT =====');
    console.log('[DRAG] consider - column:', columnIndex);
    console.log('[DRAG] consider - event.detail.items count:', event.detail.items?.length || 0);
    
    // Get items for this column (includes placeholders for visual feedback)
    const newColumnItems = event.detail.items || [];
    
    // Detect placeholders
    const placeholders = newColumnItems.filter(item => isPlaceholderItem(item));
    const validItems = newColumnItems.filter(item => !isPlaceholderItem(item));
    
    console.log('[DRAG] consider - placeholders detected:', placeholders.length);
    if (placeholders.length > 0) {
      console.log('[DRAG] consider - placeholder items:', placeholders.map(p => ({ id: p.id, isDndShadowItem: p.isDndShadowItem })));
    }
    console.log('[DRAG] consider - valid items:', validItems.length);
    
    // Track which lists are moving and their column changes (before update)
    const currentColumnLists = draggableLists.filter(list => {
      const listColumnIndex = list.columnIndex ?? 0;
      return listColumnIndex === columnIndex;
    });
    
    console.log('[DRAG] consider - current lists in column', columnIndex + ' (before update):', currentColumnLists.map(l => ({ id: l.id, name: l.name, columnIndex: l.columnIndex })));
    console.log('[DRAG] consider - newColumnItems IDs:', newColumnItems.map(item => ({ id: item.id, isPlaceholder: isPlaceholderItem(item) })));
    
    // Detect if this is same-column reordering vs cross-column move
    const isSameColumnReorder = validItems.every(item => {
      const existingList = draggableLists.find(l => l.id === item.id);
      return existingList && (existingList.columnIndex ?? 0) === columnIndex;
    });
    console.log('[DRAG] consider - isSameColumnReorder:', isSameColumnReorder);
    
    // Detect cross-column moves (before update)
    for (const item of validItems) {
      const existingList = draggableLists.find(l => l.id === item.id);
      if (existingList) {
        const oldColumnIndex = existingList.columnIndex ?? 0;
        if (oldColumnIndex !== columnIndex) {
          console.log('[DRAG] consider - CROSS-COLUMN MOVE DETECTED:', {
            listId: item.id,
            listName: item.name,
            oldColumn: oldColumnIndex,
            newColumn: columnIndex
          });
        }
      } else {
        console.log('[DRAG] consider - NEW ITEM IN COLUMN (possibly from another column):', {
          listId: item.id,
          listName: item.name,
          column: columnIndex
        });
      }
    }
    
    // Update draggableLists:
    // 1. Remove items that were in this column (based on current columnIndex)
    // 2. Add new items for this column (with columnIndex set correctly)
    // 3. Keep items from other columns unchanged
    const updatedLists = draggableLists.filter(list => {
      const listColumnIndex = list.columnIndex ?? 0;
      return listColumnIndex !== columnIndex;
    });
    
    // Add new items for this column, setting columnIndex and order based on position
    for (let i = 0; i < newColumnItems.length; i++) {
      const item = newColumnItems[i];
      // Preserve existing properties if item already exists, otherwise use item as-is
      const existingItem = draggableLists.find(l => l.id === item.id);
      // Set order based on position in array (for same-column reordering)
      // The drag library uses array position to determine order
      const listItem = existingItem 
        ? { ...existingItem, ...item, columnIndex, order: i } // Merge and set order based on position
        : { ...item, columnIndex, order: i }; // New item, set columnIndex and order
      updatedLists.push(listItem);
    }
    
    console.log('[DRAG] consider - updated draggableLists count:', updatedLists.length);
    console.log('[DRAG] consider - updated lists in column', columnIndex + ':', updatedLists.filter(l => (l.columnIndex ?? 0) === columnIndex).map(l => ({ id: l.id, name: l.name, columnIndex: l.columnIndex })));
    
    // Update the state
    draggableLists = updatedLists;
    
    // Log listsByColumn state for debugging (after update)
    try {
      const columnsState = listsByColumn().map((col, idx) => ({
        columnIndex: idx,
        listCount: col.length,
        listIds: col.map(l => l.id)
      }));
      console.log('[DRAG] consider - listsByColumn state (after update):', columnsState);
    } catch (e) {
      console.warn('[DRAG] consider - error logging listsByColumn:', e);
    }
    
    console.log('[DRAG] ===== END CONSIDER EVENT =====');
  }
  
  // Handle list drag events - finalize event for database updates
  // columnIndex indicates which column the lists were dropped into
  async function handleListFinalize(event, columnIndex) {
    console.log('[DRAG] ===== FINALIZE EVENT =====');
    console.log('[DRAG] finalize - column where drop occurred:', columnIndex);
    console.log('[DRAG] finalize - event.detail.items count:', event.detail.items?.length || 0);
    
    // Update draggableLists - placeholders should be gone by finalize, but filter just in case
    const validItems = (event.detail.items || []).filter(item => !isPlaceholderItem(item));
    const filteredPlaceholders = (event.detail.items || []).filter(item => isPlaceholderItem(item));
    
    console.log('[DRAG] finalize - placeholders filtered out:', filteredPlaceholders.length);
    if (filteredPlaceholders.length > 0) {
      console.warn('[DRAG] finalize - WARNING: Placeholders still present in finalize!', filteredPlaceholders.length);
    }
    console.log('[DRAG] finalize - valid items (after filtering placeholders):', validItems.length);
    console.log('[DRAG] finalize - valid items details:', validItems.map(item => ({
      id: item.id,
      name: item.name,
      order: item.order,
      columnIndex: item.columnIndex
    })));
    
    // Track column changes for logging - check against $lists (source of truth) not draggableLists
    const columnChanges = [];
    let hasItemsFromOtherColumns = false;
    for (const item of validItems) {
      // Check against $lists (source of truth) to see original columnIndex
      const originalList = ($lists || []).find(l => l.id === item.id);
      if (originalList) {
        const oldColumnIndex = originalList.columnIndex ?? 0;
        if (oldColumnIndex !== columnIndex) {
          hasItemsFromOtherColumns = true;
          columnChanges.push({
            listId: item.id,
            listName: item.name,
            oldColumn: oldColumnIndex,
            newColumn: columnIndex
          });
        }
      } else {
        // Item not found in $lists - might be a new item or from another column
        // Check if it exists in draggableLists with different columnIndex
        const existingInDraggable = draggableLists.find(l => l.id === item.id);
        if (existingInDraggable && (existingInDraggable.columnIndex ?? 0) !== columnIndex) {
          hasItemsFromOtherColumns = true;
        }
      }
    }
    
    if (columnChanges.length > 0) {
      console.log('[DRAG] finalize - COLUMN CHANGES DETECTED:', columnChanges);
    }
    
    // Check if this column lost items by comparing with original state
    const originalColumnLists = ($lists || []).filter(list => (list.columnIndex ?? 0) === columnIndex);
    const originalColumnCount = originalColumnLists.length;
    const currentColumnCount = validItems.length;
    const columnLostItems = currentColumnCount < originalColumnCount;
    
    // Determine if this is a target column (receiving items) or source column (losing items)
    // Skip update if: column lost items AND no items came from other columns (source column that only lost items)
    // This ensures only the target column (which received items) updates the database
    if (columnLostItems && !hasItemsFromOtherColumns) {
      console.log('[DRAG] finalize - SKIPPING database update (source column that lost items)', {
        originalCount: originalColumnCount,
        currentCount: currentColumnCount,
        hasItemsFromOtherColumns: hasItemsFromOtherColumns
      });
      console.log('[DRAG] ===== END FINALIZE EVENT =====');
      return;
    }
    
    // Also skip if column is empty and wasn't receiving items (edge case: all items moved away)
    if (validItems.length === 0 && !hasItemsFromOtherColumns && originalColumnCount > 0) {
      console.log('[DRAG] finalize - SKIPPING database update (empty column that lost all items)');
      console.log('[DRAG] ===== END FINALIZE EVENT =====');
      return;
    }
    
    // Update database with new order and columnIndex values
    try {
      console.log('[DRAG] finalize - updating database with updateListOrderWithColumn...');
      await updateListOrderWithColumn(columnIndex, validItems);
      console.log('[DRAG] finalize - database update successful');
      
      // Note: liveQuery will automatically update the UI after database changes
      // The $effect will sync draggableLists from liveQuery
      console.log('[DRAG] finalize - waiting for $effect to sync draggableLists from liveQuery...');
    } catch (error) {
      console.error('[DRAG] finalize - ERROR updating list order:', error);
      // On error, revert draggableLists to match database state
      // The $effect will sync it back from liveQuery
    }
    
    console.log('[DRAG] ===== END FINALIZE EVENT =====');
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
        {:else if Array.isArray($lists)}
          <!-- 5-column grid layout with column containers -->
          <div class="grid grid-cols-5 gap-4 w-full">
            {#each listsByColumn() as columnLists, columnIndex}
              <div class="flex flex-col min-w-0 border-r border-gray-300 last:border-r-0 pt-0" data-column-index={columnIndex}>
                <div
                  use:dndzone={{
                    items: columnLists,
                    type: 'list', // Shared type enables cross-column dragging
                    zoneTabIndex: -1 // Prevent entire column container from being focusable
                  }}
                  onconsider={(e) => handleListConsider(e, columnIndex)}
                  onfinalize={(e) => handleListFinalize(e, columnIndex)}
                  class="flex flex-col pt-0"
                >
                  <!-- Render lists in this column -->
                  {#each columnLists as dragItem, index (dragItem.id)}
                    {@const isPlaceholder = isPlaceholderItem(dragItem)}
                    {@const realList = stableLists.find(list => list.id === dragItem.id)}
                    {@const fallbackList = !realList && !isPlaceholder ? dragItem : null}
                    {@const listToRender = realList || fallbackList}
                    {#if listToRender}
                      <div
                        data-id={dragItem.id}
                        class="flex flex-col mb-6"
                        tabindex="0"
                        role="group"
                        aria-label={`List: ${listToRender.name ?? 'Unnamed list'}`}
                        aria-roledescription="Draggable list"
                        aria-pressed={keyboardListDrag.active && keyboardListDrag.listId === listToRender.id ? 'true' : 'false'}
                        onkeydowncapture={(e) => handleListKeyboardKeydown(e, listToRender.id)}
                      >
                        <TaskList
                          listId={listToRender.id}
                          listName={listToRender.name ?? 'Unnamed list'}
                          newTaskInput={newTaskInputs[listToRender.id] || ''}
                          onInputChange={(value) => handleInputChange(listToRender.id, value)}
                          allLists={$lists}
                          stableLists={stableLists}
                        />
                      </div>
                    {:else}
                      <div data-id={dragItem.id} class="flex flex-col mb-6">
                        <!-- Placeholder item for drag feedback - not focusable for keyboard drag -->
                      </div>
                    {/if}
                  {/each}
                  
                  <!-- Empty drop zone for empty columns -->
                  {#if columnLists.length === 0}
                    <div class="empty-drop-zone min-h-[48px]"></div>
                  {/if}
                </div>
                
                <!-- Create List button/input - per column, appears in all columns (outside dndzone) -->
                {#if createListColumnIndex === columnIndex}
                  <h2 class="print:hidden m-0 p-0 create-list-wrapper {columnLists.length === 0 ? 'create-list-empty-column' : ''}">
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
                            handleCreateList(columnIndex);
                          } else if (e.key === 'Escape') {
                            handleCreateListInputEscape(e);
                          } else if (e.key === 'Tab') {
                            // When tabbing away, close empty input or create + close when it has content.
                            // Let the browser move focus naturally; creation/close happens in the background.
                            handleCreateListOnTab(columnIndex);
                          }
                        }}
                        aria-label="Enter list name"
                      />
                      <button
                        onclick={() => handleCreateList(columnIndex)}
                        class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                        aria-label="Create list"
                      >
                        Save
                      </button>
                    </div>
                  </h2>
                {:else}
                  <h2 
                    onclick={() => handleCreateListClick(columnIndex)}
                    onkeydown={(e) => handleCreateListKeydown(e, columnIndex)}
                    role="button"
                    tabindex="0"
                    class="cursor-pointer hover:underline print:hidden m-0 p-0 create-list-wrapper {columnLists.length === 0 ? 'create-list-empty-column' : ''}"
                    aria-label="Create new list"
                  >
                    Create new list
                  </h2>
                {/if}
              </div>
            {/each}
          </div>
          
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
  
  /* Explicitly reset h2 margins for "Create new list" in columns */
  [data-column-index] h2 {
    margin: 0;
  }
  
  /* Position "Create new list" to cover empty drop zone space (only for empty columns) */
  [data-column-index] .create-list-empty-column {
    margin-top: -48px; /* Shift up to cover min-h-[48px] from empty drop zone */
  }
  
  /* Ensure list wrapper margins are applied even with dndzone inline styles */
  [data-column-index] [data-id] {
    margin-bottom: 1.5rem !important;
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
