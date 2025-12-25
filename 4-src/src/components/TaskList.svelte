<script>
  import { liveQuery } from 'dexie';
  import { tick, onMount, onDestroy } from 'svelte';
  import Sortable from 'sortablejs';
  import { taskDragStateManager } from '../lib/drag/taskDragStateManager.js';
  import { getTasksForList, createTask, updateTaskStatus, updateTaskOrder, updateTaskText, updateTaskOrderCrossList, updateListName, archiveList, archiveAllTasksInList } from '../lib/dataAccess.js';
  import { filterValidTaskItems } from '../lib/drag/taskDragHandlers.js';
  import { getTaskSortableConfig } from '../lib/drag/taskMouseDrag.js';
  import { createTaskItemKeydownCaptureHandler, createTaskItemBlurHandler, setupTaskKeyboardDragDocumentHandler } from '../lib/drag/taskKeyboardDrag.js';
  import { setupListTitleKeydownCapture, setupAddTaskButtonKeydownCapture, setupTaskTextKeydownCapture } from '../lib/drag/capturePhaseHandlers.js';
  import TaskEditModal from './TaskEditModal.svelte';
  import ListEditModal from './ListEditModal.svelte';
  import AddTaskInput from './AddTaskInput.svelte';
  import Button from './Button.svelte';
  import { useClickOutside } from '../lib/useClickOutside.js';
  import { isEmpty, normalizeInput } from '../lib/inputValidation.js';
  import { TASK_WIDTH, FOCUS_RETRY_ATTEMPTS, FOCUS_RETRY_INTERVAL, FOCUS_RETRY_ATTEMPTS_EXTENDED, DOM_UPDATE_DELAY_MS, DOM_UPDATE_DELAY_SHORT_MS, DOM_UPDATE_DELAY_MEDIUM_MS } from '../lib/constants.js';
  import { findNextFocusTarget as findNextFocusTargetUtil, focusElementWithRetry } from '../lib/focusUtils.js';
  import { useModal } from '../lib/useModal.svelte.js';
  
  let { listId, listName, newTaskInput, onInputChange, allLists = [], stableLists = [] } = $props();
  
  // Create liveQuery at top level - capture listId in closure
  // This creates the query once and it will automatically update when database changes
  let tasksQuery = $state(null);
  
  // Local state for drag-and-drop - synced from liveQuery
  // Only includes unchecked/checked tasks (archived excluded)
  let draggableTasks = $state([]);
  
  // State for Add Task button/input toggle
  let isInputActive = $state(false);
  
  // Modal management using composable
  const taskModal = useModal();
  const listModal = useModal();
  
  // Task modal-specific state (not handled by composable)
  let editingTaskId = $state(null);
  let editingTaskText = $state('');
  
  let ulElement = $state(null); // Reference to the ul element for capture-phase handler
  
  // Reactive references to DOM elements (replaces document.querySelector calls)
  let listSectionElement = $state(null); // Reference to the main list section div
  let addTaskContainerElement = $state(null); // Reference to the add-task-container
  let addTaskTextareaElement = $state(null); // Reference to the add-task textarea
  let listTitleContainerElement = $state(null); // Reference to the list title container
  
  // Measure dimensions for debugging
  $effect(() => {
    if (typeof window === 'undefined') return;
    setTimeout(() => {
      if (ulElement) {
        const ulStyle = getComputedStyle(ulElement);
        const rootStyle = getComputedStyle(document.documentElement);
        const paddingY = rootStyle.getPropertyValue('--task-item-padding-y');
        const lineHeight = rootStyle.getPropertyValue('--line-height-body');
        const ulHeight = ulStyle.height;
        const ulPaddingTop = ulStyle.paddingTop;
        const ulPaddingBottom = ulStyle.paddingBottom;
        const ulTotal = parseFloat(ulHeight) + parseFloat(ulPaddingTop) + parseFloat(ulPaddingBottom);
        if (draggableTasks.length === 0) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/6a91a8db-109e-459e-bb3e-5dc44dceea1f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TaskList.svelte:effect',message:'Empty drop zone dimensions',data:{ulHeight,ulPaddingTop,ulPaddingBottom,ulTotal,paddingY,lineHeight,expectedTotal:parseFloat(paddingY) + parseFloat(lineHeight) + parseFloat(paddingY)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
        } else if (draggableTasks.length > 0) {
          const firstTask = ulElement.querySelector('li[data-id]');
          if (firstTask && firstTask instanceof HTMLElement) {
            const taskStyle = getComputedStyle(firstTask);
            const taskHeight = taskStyle.height;
            const taskPaddingTop = taskStyle.paddingTop;
            const taskPaddingBottom = taskStyle.paddingBottom;
            const taskTotal = parseFloat(taskHeight) + parseFloat(taskPaddingTop) + parseFloat(taskPaddingBottom);
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/6a91a8db-109e-459e-bb3e-5dc44dceea1f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TaskList.svelte:effect',message:'Task vs Drop zone comparison',data:{taskHeight,taskPaddingTop,taskPaddingBottom,taskTotal,ulHeight,ulPaddingTop,ulPaddingBottom,ulTotal,expectedTaskTotal:parseFloat(paddingY) + parseFloat(lineHeight) + parseFloat(paddingY),difference:taskTotal - ulTotal},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
          }
        }
      }
    }, 200);
  });
  
  // Track last blurred task-related element and whether the next Tab
  // should refocus it (mirrors list behavior in App.svelte).
  let lastBlurredTaskElement = $state(null);
  let shouldRefocusTaskOnNextTab = $state(false);
  
  // Track keyboard-based drag state for tasks so we can restore focus
  // on the next Tab after a keyboard drop (mirrors list behavior in App.svelte).
  let isKeyboardTaskDragging = $state(false);
  let lastKeyboardDraggedTaskId = $state(null);
  
  let previousListId = $state(null);
  
  // SortableJS instance for task dragging
  let taskSortable = $state(null);
  
  // Track if a drag just occurred to prevent click handlers from firing
  let dragJustEnded = $state(false);
  
  // Extract items from DOM order (like prototype)
  // For cross-list drags, tasks from other lists may not be in draggableTasks yet,
  // so we create minimal objects with just the id - the database update function will fetch full data
  function extractItemsFromDOM(container, targetListId = null) {
    if (!container) return [];
    const children = Array.from(container.children);
    
    // Determine which list's state to check (target list if provided, otherwise current list)
    const checkListId = targetListId || listId;
    const currentState = taskDragStateManager.getState(checkListId);
    const currentTasks = currentState.tasks;
    
    // Also check current list's state for cross-list drags
    const sourceState = listId !== checkListId ? taskDragStateManager.getState(listId) : null;
    const sourceTasks = sourceState ? sourceState.tasks : [];
    
    return children
      .map(child => {
        const idAttr = child.getAttribute('data-id');
        if (!idAttr) return null;
        const id = parseInt(idAttr, 10);
        // Try to find in target list's state manager state first
        let task = currentTasks.find(t => t.id === id);
        // If not found and cross-list, try source list's state
        if (!task && sourceTasks.length > 0) {
          task = sourceTasks.find(t => t.id === id);
        }
        // Fallback to draggableTasks if not in state manager
        if (!task) {
          task = draggableTasks.find(t => t.id === id);
        }
        // If still not found (cross-list drag), create minimal object with just id
        // The database update function will fetch full task data via bulkGet
        return task || { id };
      })
      .filter(Boolean);
  }
  
  // Handle task drag end with optimistic updates via state manager
  async function handleTaskDragEnd(evt) {
    const { oldIndex, newIndex, from, to } = evt;
    
    // Determine source and target lists
    const sourceListId = listId; // Current list is source
    const targetListId = to?.dataset?.listId ? parseInt(to.dataset.listId) : listId;
    
    // Extract items from target container
    // Use a small delay to ensure DOM has fully updated after SortableJS move
    await tick();
    const targetContainer = to || ulElement;
    const newOrder = extractItemsFromDOM(targetContainer, targetListId);
    const validItems = filterValidTaskItems(newOrder);
    
    if (validItems.length === 0) {
      return;
    }
    
    // Start drag operation in state manager (prevents liveQuery from overwriting)
    taskDragStateManager.startDrag(sourceListId, targetListId);
    
    // Update state manager with optimistic update for target list
    taskDragStateManager.updateDragState(targetListId, validItems);
    
    // If cross-list drag, also update source list (remove moved task)
    if (sourceListId !== targetListId) {
      const sourceState = taskDragStateManager.getState(sourceListId);
      const sourceTasks = sourceState.tasks.filter(t => 
        !validItems.some(v => v.id === t.id)
      );
      taskDragStateManager.updateDragState(sourceListId, sourceTasks);
    }
    
    // Wait for Svelte to update DOM after state change
    await tick();
    
    // Persist to database
    try {
      await updateTaskOrderCrossList(targetListId, validItems);
      // Success: state manager will allow liveQuery to sync back
      taskDragStateManager.completeDrag(sourceListId, targetListId, true);
    } catch (error) {
      console.error('[TASK DRAG] Failed to save task order:', error);
      // Error: state manager will allow liveQuery to restore previous state
      taskDragStateManager.completeDrag(sourceListId, targetListId, false);
    }
  }
  
  // Initialize SortableJS for tasks
  function initializeTaskSortable() {
    if (!ulElement || taskSortable) return;
    
    const sortableConfig = getTaskSortableConfig({
      onDragEnd: handleTaskDragEnd,
      setDragJustEnded: (value) => { dragJustEnded = value; }
    });
    
    taskSortable = new Sortable(ulElement, sortableConfig);
  }
  
  // Initialize SortableJS when ulElement is ready or listId changes
  // Initialize even when list is empty so empty lists can accept drops
  $effect(() => {
    // Destroy existing instance if listId changed
    if (taskSortable && previousListId !== null && previousListId !== listId) {
      taskSortable.destroy();
      taskSortable = null;
    }
    
    // Initialize SortableJS even for empty lists (so they can accept drops)
    if (ulElement && !taskSortable) {
      // Small delay to ensure DOM is ready
      const timeoutId = setTimeout(() => {
        if (!taskSortable && ulElement) {
          initializeTaskSortable();
        }
      }, 10);
      
      return () => {
        clearTimeout(timeoutId);
      };
    }
  });
  
  // Cleanup SortableJS on destroy
  onDestroy(() => {
    if (taskSortable) {
      taskSortable.destroy();
      taskSortable = null;
    }
  });
  
  $effect(() => {
    // Validate that listId exists in stableLists before creating query
    // This prevents queries from being created with placeholder IDs during drag operations
    const isValid = stableLists.some(list => list.id === listId);
    
    // Recreate query if listId changed from invalid to valid, or if listId actually changed
    if (isValid && listId) {
      if (!tasksQuery || previousListId !== listId) {
        // Only clear draggableTasks when listId actually changes (not when recreating query for same list)
        if (previousListId !== listId) {
          draggableTasks = [];
        }
        tasksQuery = liveQuery(() => getTasksForList(listId));
        previousListId = listId;
      }
    } else {
      // Invalid listId - clear query and previousListId
      tasksQuery = null;
      previousListId = null;
      draggableTasks = [];
    }
  });
  
  // Sync draggableTasks from taskDragStateManager (event-driven, not reactive)
  // This subscribes to state manager changes and updates Svelte state
  $effect(() => {
    if (!listId) return;
    
    const unsubscribe = taskDragStateManager.subscribe(listId, (state) => {
      // Only update if state actually changed to prevent infinite loops
      // Compare IDs, statuses, and text to detect status changes (checkbox toggles) and text edits
      const stateTaskSignature = state.tasks.map(t => `${t.id}:${t.status}:${t.text || ''}`).join(',');
      const currentTaskSignature = draggableTasks.map(t => `${t.id}:${t.status}:${t.text || ''}`).join(',');
      if (stateTaskSignature !== currentTaskSignature) {
        draggableTasks = state.tasks;
      }
    });
    
    return () => {
      unsubscribe();
    };
  });
  
  // Sync liveQuery → taskDragStateManager (one-way, only when not dragging)
  // The state manager prevents overwriting during drag operations
  $effect(() => {
    if (!listId) return;
    
    if ($tasksQuery && Array.isArray($tasksQuery)) {
      taskDragStateManager.initializeFromQuery(listId, $tasksQuery);
    }
  });

  // Optimistic state: show content if listId is valid (even if query hasn't resolved yet)
  // This prevents loading flicker when creating new lists
  // We check both stableLists and allLists - allLists might update faster
  const isListValid = $derived(
    listId && (
      stableLists.some(list => list.id === listId) ||
      allLists.some(list => list.id === listId)
    )
  );
  
  // Add capture-phase keyboard handler to prevent drag library from intercepting Enter/Space on list title
  $effect(() => {
    return setupListTitleKeydownCapture(listSectionElement, listModal);
  });
  
  // Add capture-phase keyboard handler to prevent drag library from intercepting Enter/Space on Add Task button
  $effect(() => {
    return setupAddTaskButtonKeydownCapture(addTaskContainerElement, handleAddTaskClick);
  });
  
  // Add capture-phase keyboard handler to prevent drag library from intercepting Enter on task text
  // Also handles cross-list movement when tasks are at boundaries
  $effect(() => {
    return setupTaskTextKeydownCapture(ulElement, draggableTasks, listId, allLists, {
      onTaskTextEdit: (taskId, taskText, targetElement) => {
        // Open the modal directly
        editingTaskId = taskId;
        editingTaskText = taskText;
        taskModal.openModal(targetElement);
      }
    });
  });
  
  // Create state getters/setters for keyboard drag handlers
  const keyboardDragState = {
    getIsKeyboardTaskDragging: () => isKeyboardTaskDragging,
    setIsKeyboardTaskDragging: (value) => { isKeyboardTaskDragging = value; },
    getLastKeyboardDraggedTaskId: () => lastKeyboardDraggedTaskId,
    setLastKeyboardDraggedTaskId: (value) => { lastKeyboardDraggedTaskId = value; },
    getLastBlurredTaskElement: () => lastBlurredTaskElement,
    setLastBlurredTaskElement: (value) => { lastBlurredTaskElement = value; },
    getShouldRefocusTaskOnNextTab: () => shouldRefocusTaskOnNextTab,
    setShouldRefocusTaskOnNextTab: (value) => { shouldRefocusTaskOnNextTab = value; }
  };

  // Create keyboard drag handlers using extracted composable
  // Use getter function to access current ulElement value (avoids closure warning)
  const handleTaskItemKeydownCapture = createTaskItemKeydownCaptureHandler(keyboardDragState, () => ulElement);
  const handleTaskItemBlur = createTaskItemBlurHandler(keyboardDragState);
  
  // Set up document-level keyboard handler for cross-list boundary movement and Tab resume
  // This runs before svelte-dnd-action handlers
  $effect(() => {
    if (!ulElement) return;
    
    return setupTaskKeyboardDragDocumentHandler(
      keyboardDragState,
      ulElement,
      listId,
      allLists,
      () => draggableTasks, // Getter function
      (newTasks) => { draggableTasks = newTasks; }, // Setter function
      addTaskContainerElement
    );
  });
  
  
  function handleAddTaskClick() {
    isInputActive = true;
    // Focus will be handled by $effect after input is rendered
  }
  
  async function handleInputEscape(e, inputValue = '') {
    if (e.key === 'Escape') {
      // Read value from DOM element if available (more reliable)
      let currentValue = inputValue || '';
      if (addTaskTextareaElement) {
        currentValue = (addTaskTextareaElement.value || '').toString();
      } else if (newTaskInput) {
        currentValue = (newTaskInput || '').toString();
      }
      
      // Unified behavior: If there's content (whitespace or text), create task
      // This works the same for both empty state and regular Add Task button
      if (currentValue.length > 0) {
        // Create task with the current input value
        await handleCreateTask({ closeAfterSave: true });
        return;
      }
      
      // If input is empty, cancel (close input without creating task)
      // This applies to both empty state and regular Add Task button
      shouldRefocusTaskOnNextTab = true;
      if (addTaskContainerElement) {
        const addTaskButton = addTaskContainerElement.querySelector('span[role="button"]');
        if (addTaskButton && addTaskButton instanceof HTMLElement) {
          lastBlurredTaskElement = addTaskButton;
        } else {
          lastBlurredTaskElement = null;
        }
      } else {
        lastBlurredTaskElement = null;
      }

      isInputActive = false;
      onInputChange('');
      // Wait for Svelte's reactive updates to complete
      await tick();
      await tick();
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => setTimeout(resolve, DOM_UPDATE_DELAY_MS));
    }
  }
  
  // Handle click outside input to close it (only if no content)
  $effect(() => {
    if (!isInputActive) return;
    
    return useClickOutside(
      // Function that returns the textarea element (using reactive reference)
      () => {
        return addTaskTextareaElement;
      },
      () => {
        // Only close if still active (prevents race conditions with programmatic closes)
        if (isInputActive) {
          isInputActive = false;
          onInputChange('');
        }
      },
      {
        ignoreElements: [],
        shouldClose: () => {
          // Only close if input hasn't changed (no content)
          // Check both reactive state and actual DOM element value for reliability
          if (addTaskTextareaElement && addTaskTextareaElement.value.trim() !== '') {
            return false; // Has content, don't close
          }
          return !newTaskInput || newTaskInput.trim() === '';
        }
      }
    );
  });
  
  async function handleCreateTask(options = {}) {
    const closeAfterSave = options && typeof options === 'object' && options.closeAfterSave === true;
    // Read value directly from DOM element (more reliable than prop)
    // Similar to how useClickOutside checks the value
    let inputValue = newTaskInput || '';
    
    if (addTaskTextareaElement) {
      inputValue = (addTaskTextareaElement.value || '').toString();
    }
    
    // Ensure inputValue is a string
    inputValue = (inputValue || '').toString();
    
    // Check if input is empty string "" - exit task creation
    if (isEmpty(inputValue)) {
      isInputActive = false;
      onInputChange('');
      // Wait for Svelte's reactive updates to complete
      // Use multiple ticks to ensure all reactive updates propagate
      await tick();
      await tick();
      // Wait for DOM to actually update (similar to waitFor in tests)
      // tick() schedules updates, but DOM updates happen in next microtask
      // Use requestAnimationFrame to ensure DOM has updated, then add a delay
      // This is especially important in test environments where timing can be different
      // Increased delay to account for test environment timing differences
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => setTimeout(resolve, DOM_UPDATE_DELAY_MS));
      return;
    }
    
    // Normalize input (handles whitespace-only input by trimming)
    // Even if normalized text is empty (whitespace-only), we still create a task
    // as per the new behavior: whitespace should create a task
    const { text: taskText } = normalizeInput(inputValue);
    
    try {
      // Create task with normalized text (may be empty string for whitespace-only input)
      const taskId = await createTask(listId, taskText);
      
      // Optimistically add task to draggableTasks to prevent flicker
      // Calculate order: use max order from current tasks + 1, or 0 if empty
      const maxOrder = draggableTasks.length > 0 
        ? Math.max(...draggableTasks.map(t => t.order || 0))
        : -1;
      const optimisticOrder = maxOrder + 1;
      
      // Create optimistic task object matching database structure
      const optimisticTask = {
        id: taskId,
        text: taskText,
        listId: listId,
        order: optimisticOrder,
        status: 'unchecked'
      };
      
      // Add to end of draggableTasks (since it has the highest order)
      draggableTasks = [...draggableTasks, optimisticTask];
      
      onInputChange('');
      // For normal Enter/Save flows, keep input active and focused for sequential creation.
      // When invoked from a Tab-out flow, close the input after creating the task.
      if (closeAfterSave) {
        isInputActive = false;
      }
    } catch (error) {
      console.error('Error creating task:', error);
      // If creation failed, remove optimistic task if it was added
      // (though it shouldn't be added if createTask throws)
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
  
  /**
   * Pure archiving logic - just archives the task.
   * @param {number} taskId - The ID of the task to archive
   * @returns {Promise<void>}
   */
  async function archiveTask(taskId) {
    await updateTaskStatus(taskId, 'archived');
    // No need to reload - liveQuery will update automatically!
  }
  
  /**
   * Finds the next logical focus target after archiving a task.
   * Tries to find the first remaining task in the list.
   * Uses reactive reference to ulElement instead of querying DOM.
   * @returns {HTMLElement|null} The next focus target, or null if none found
   */
  function findNextFocusTarget() {
    if (!ulElement) {
      return null;
    }
    
    return findNextFocusTargetUtil(ulElement, 'li[data-id]', 'span[role="button"]');
  }
  
  /**
   * Focuses the "Add Task" button with retry logic.
   * Useful when list becomes empty and button needs time to appear in DOM.
   * Uses reactive reference instead of querying DOM.
   * @param {number} maxAttempts - Maximum number of retry attempts (default: FOCUS_RETRY_ATTEMPTS)
   * @param {number} retryInterval - Milliseconds between retry attempts (default: FOCUS_RETRY_INTERVAL)
   * @returns {Promise<void>}
   */
  async function focusAddTaskButton(maxAttempts = FOCUS_RETRY_ATTEMPTS, retryInterval = FOCUS_RETRY_INTERVAL) {
    if (!listSectionElement) {
      return;
    }
    
    await focusElementWithRetry(
      () => {
        if (addTaskContainerElement) {
          const addTaskSpan = addTaskContainerElement.querySelector('span[role="button"]');
          if (addTaskSpan && addTaskSpan instanceof HTMLElement) {
            return addTaskSpan;
          }
        }
        return null;
      },
      { maxAttempts, retryInterval, waitForTick: false }
    );
  }
  
  async function handleArchiveTask(taskId) {
    try {
      // Archive the task
      await archiveTask(taskId);
      
      // Close modal if this task was being edited
      if (editingTaskId === taskId) {
        editingTaskId = null;
        editingTaskText = '';
        taskModal.closeModalWithoutFocus(); // Focus handled below
        
        // Focus management: after archiving, focus should go to next logical element
        // Wait for Svelte's reactive updates to complete (especially important when list becomes empty)
        await tick();
        // Additional small delay to ensure DOM has updated (especially when list becomes empty)
        await new Promise(resolve => setTimeout(resolve, DOM_UPDATE_DELAY_SHORT_MS));
        
        setTimeout(() => {
          // Try to find next task to focus (first remaining task in list)
          // Use retry logic to handle DOM updates after archiving
          const tryFocusNextTask = (attempts = 0) => {
            const nextTarget = findNextFocusTarget();
            if (nextTarget) {
              nextTarget.focus();
            } else if (attempts < FOCUS_RETRY_ATTEMPTS) {
              // Retry up to FOCUS_RETRY_ATTEMPTS times to wait for DOM updates
              setTimeout(() => tryFocusNextTask(attempts + 1), FOCUS_RETRY_INTERVAL);
            } else {
              // Fallback: focus the "Add Task" button
              // Use more retries when list becomes empty (DOM structure changes)
              focusAddTaskButton(FOCUS_RETRY_ATTEMPTS_EXTENDED, FOCUS_RETRY_INTERVAL);
            }
          };
          tryFocusNextTask();
        }, DOM_UPDATE_DELAY_MEDIUM_MS);
      }
    } catch (error) {
      console.error('Error archiving task:', error);
    }
  }
  
  function handleTaskTextClick(taskId, taskText, event) {
    // Don't open modal if a drag just ended (prevents accidental modal opening after drag)
    if (dragJustEnded) {
      return;
    }
    const clickedElement = event?.currentTarget || event?.target;
    editingTaskId = taskId;
    editingTaskText = taskText;
    taskModal.openModal(clickedElement);
  }
  
  function handleTaskTextKeydown(taskId, taskText, event) {
    if (event.key === 'Enter' || event.key === ' ') {
      editingTaskId = taskId;
      editingTaskText = taskText;
      taskModal.handleKeydown(event);
    } else if (event.key === 'Escape') {
      // Treat Escape on the task text as a "blur/close" action for this task.
      // The *next* Tab press should resume on this task element (mirrors list behavior).
      event.preventDefault();
      event.stopImmediatePropagation();

      const spanElement = event.currentTarget;
      if (spanElement && spanElement instanceof HTMLElement) {
        lastBlurredTaskElement = spanElement;
        shouldRefocusTaskOnNextTab = true;
        spanElement.blur();
      }
    }
  }
  
  async function handleTaskSave(taskId, newText) {
    try {
      await updateTaskText(taskId, newText);
      editingTaskId = null;
      editingTaskText = '';
      taskModal.closeModal();
      // No need to reload - liveQuery will update automatically!
    } catch (error) {
      console.error('Error updating task text:', error);
    }
  }
  
  function handleTaskEditCancel() {
    editingTaskId = null;
    editingTaskText = '';
    taskModal.closeModal();
  }
  
  async function handleTaskEditArchive(taskId) {
    // handleArchiveTask will close the modal and handle focus
    await handleArchiveTask(taskId);
    
    // If focus wasn't handled by handleArchiveTask (e.g., modal already closed),
    // handle it here by finding the Add Task button
    setTimeout(() => {
      // Check if document exists (may not be available in test environments after cleanup)
      if (typeof document === 'undefined') return;
      const activeElement = document.activeElement;
      if (listSectionElement && (!activeElement || !listSectionElement.contains(activeElement))) {
        // Focus wasn't set, so focus the Add Task button
        // Use more retries to account for DOM updates when list becomes empty
        focusAddTaskButton(FOCUS_RETRY_ATTEMPTS, FOCUS_RETRY_INTERVAL);
      }
    }, DOM_UPDATE_DELAY_SHORT_MS);
  }
  
  function handleListNameClick(event) {
    listModal.handleClick(event);
  }
  
  function handleListNameKeydown(event) {
    listModal.handleKeydown(event);
  }
  
  async function handleListSave(listId, newName) {
    try {
      await updateListName(listId, newName);
      listModal.closeModal();
      // No need to reload - liveQuery in App.svelte will update automatically!
    } catch (error) {
      console.error('Error updating list name:', error);
    }
  }
  
  function handleListEditCancel() {
    listModal.closeModal();
  }
  
  async function handleListArchive(listId) {
    try {
      // Archive all tasks in the list first
      await archiveAllTasksInList(listId);
      // Then archive the list itself
      await archiveList(listId);
      // No need to reload - liveQuery in App.svelte will update automatically!
    } catch (error) {
      console.error('Error archiving list:', error);
    }
  }
</script>

<div bind:this={listSectionElement} data-list-id={listId} class="flex flex-col w-full">
  <!-- 
    Outer wrapper for focus ring - always square/rectangular
    The focus border must be on this outer container to avoid tracing child element shapes.
    The h2 inside has rounded corners and negative margin, which would cause box-shadow/outline
    to follow its shape. By using a border on this outer wrapper with explicit square corners,
    we ensure a clean rectangular focus indicator.
  -->
  <div 
    bind:this={listTitleContainerElement}
    class="border-2 border-transparent focus-within:border-blue-500 focus-within:rounded box-border"
  >
    <!-- Inner wrapper for content with hover/rounded styles -->
    <div 
      class="flex items-center transition-colors hover:bg-grey-20 hover:rounded py-1"
    >
      <h2 
        onclick={handleListNameClick}
        onkeydown={handleListNameKeydown}
        role="button"
        tabindex="0"
        class="list-title cursor-pointer m-0 leading-none text-grey-110 font-gilda rounded -my-1 transition-colors flex-1 min-w-0 focus:outline-none"
        style="font-size: var(--font-size-heading); padding: var(--list-title-padding-y) var(--list-title-padding-x); line-height: var(--line-height-heading);"
        aria-label={`Rename list: ${listName}`}
      >
        {listName}
      </h2>
    </div>
  </div>
  {#if isListValid}
    <div class="task-list-wrapper m-0 p-0">
      <ul 
        bind:this={ulElement}
        data-list-id={listId}
        class="space-y-0 m-0 p-0 list-none w-full {draggableTasks.length === 0 ? 'empty-drop-zone' : ''}"
        style={draggableTasks.length === 0 ? (() => {
          // #region agent log
          if (typeof window !== 'undefined' && ulElement) {
            setTimeout(() => {
              const rootStyle = getComputedStyle(document.documentElement);
              const ulStyle = getComputedStyle(ulElement);
              const paddingY = rootStyle.getPropertyValue('--task-item-padding-y');
              const lineHeight = rootStyle.getPropertyValue('--line-height-body');
              const actualUlHeight = ulStyle.height;
              const actualUlPaddingTop = ulStyle.paddingTop;
              const actualUlPaddingBottom = ulStyle.paddingBottom;
              const actualUlTotal = parseFloat(actualUlPaddingTop) + parseFloat(actualUlHeight) + parseFloat(actualUlPaddingBottom);
              fetch('http://127.0.0.1:7242/ingest/6a91a8db-109e-459e-bb3e-5dc44dceea1f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TaskList.svelte:707',message:'Drop zone actual rendered dimensions',data:{paddingY,lineHeight,actualUlHeight,actualUlPaddingTop,actualUlPaddingBottom,actualUlTotal,expectedTotal:`${paddingY} + ${lineHeight} + ${paddingY} = ${parseFloat(paddingY) + parseFloat(lineHeight) + parseFloat(paddingY)}px`,usingMinHeight:'calc(2*padding + line-height)'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            }, 100);
          }
          // #endregion
          return `height: var(--line-height-body); padding-top: var(--task-item-padding-y); padding-bottom: var(--task-item-padding-y); box-sizing: content-box;`;
        })() : ''}
      >
        {#each draggableTasks as task (task.id)}
          <li
            data-id={task.id}
            tabindex="0"
            role="listitem"
            aria-label={`Task: ${task.text || 'blank task'}`}
            class="flex items-center gap-2 border-b border-grey-50 cursor-move hover:bg-grey-20 w-full m-0 list-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            style="padding-top: var(--task-item-padding-y); padding-bottom: var(--task-item-padding-y); gap: var(--task-item-gap);"
            onkeydowncapture={(e) => handleTaskItemKeydownCapture(e, task.id)}
            onblur={(e) => handleTaskItemBlur(e, task.id)}
          >
            <input
              type="checkbox"
              checked={task.status === 'checked'}
              onchange={() => handleToggleTaskStatus(task.id, task.status)}
              onkeydown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  e.stopImmediatePropagation(); // Prevent drag library from intercepting
                  handleToggleTaskStatus(task.id, task.status);
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  e.stopPropagation();
                  e.stopImmediatePropagation();
                  // Blur the checkbox itself
                  const checkbox = e.currentTarget;
                  if (checkbox && checkbox instanceof HTMLElement) {
                    // Find the parent task item (li) for Tab-resume behavior
                    const taskItem = checkbox.closest('li[data-id]');
                    if (taskItem && taskItem instanceof HTMLElement) {
                      lastBlurredTaskElement = taskItem;
                      shouldRefocusTaskOnNextTab = true;
                    }
                    checkbox.blur();
                  }
                }
              }}
              class="cursor-pointer"
              aria-label={`Mark task "${task.text || 'blank task'}" as ${task.status === 'checked' ? 'unchecked' : 'checked'}`}
            />
            <span 
              class={task.status === 'checked' ? 'line-through cursor-pointer hover:underline break-words flex-1 font-urbanist text-grey-100' : 'cursor-pointer hover:underline break-words flex-1 font-urbanist text-grey-100'}
              style="font-size: var(--font-size-body); line-height: var(--line-height-body);"
              onclick={(e) => handleTaskTextClick(task.id, task.text, e)}
              role="button"
              tabindex="0"
              contenteditable="false"
              aria-label={`Edit task: ${task.text || 'blank task'}`}
              onkeydown={(e) => handleTaskTextKeydown(task.id, task.text, e)}
            >
              {task.text || '\u00A0'}
            </span>
            {#if task.status === 'checked'}
              <Button 
                variant="secondary"
                size="small"
                onclick={() => handleArchiveTask(task.id)}
                class="print:hidden"
                aria-label={`Archive task: ${task.text || 'blank task'}`}
              >
                Archive
              </Button>
            {/if}
          </li>
        {/each}
      </ul>
      {#if draggableTasks.length === 0}
        <div style="margin-top: calc((var(--task-item-padding-y) + var(--line-height-body) + var(--task-item-padding-y)) * -1);">
          <AddTaskInput
            bind:isInputActive={isInputActive}
            bind:containerElement={addTaskContainerElement}
            bind:textareaElement={addTaskTextareaElement}
            inputValue={newTaskInput}
            onInputChange={onInputChange}
            onSave={handleCreateTask}
            onEscape={handleInputEscape}
            onActivate={handleAddTaskClick}
            buttonText="Add your first task"
            placeholder="start typing..."
            ariaLabel="Add your first task to {listName}"
            marginLeft={false}
          />
        </div>
      {:else}
        <AddTaskInput
          bind:isInputActive={isInputActive}
          bind:containerElement={addTaskContainerElement}
          bind:textareaElement={addTaskTextareaElement}
          inputValue={newTaskInput}
          onInputChange={onInputChange}
          onSave={handleCreateTask}
          onEscape={handleInputEscape}
          onActivate={handleAddTaskClick}
          buttonText="Add Task"
          placeholder="start typing..."
          ariaLabel="Add new task to {listName}"
          marginLeft={false}
        />
      {/if}
    </div>
  {:else}
    <p>Loading tasks...</p>
    <!-- Add Task button - show during loading too -->
    <AddTaskInput
      bind:isInputActive={isInputActive}
      bind:containerElement={addTaskContainerElement}
      bind:textareaElement={addTaskTextareaElement}
      inputValue={newTaskInput}
      onInputChange={onInputChange}
      onSave={handleCreateTask}
      onEscape={handleInputEscape}
      onActivate={handleAddTaskClick}
      buttonText="Add Task"
      placeholder="Add new task..."
      ariaLabel="Add new task to {listName}"
      marginLeft={false}
    />
  {/if}
</div>


<TaskEditModal
  isOpen={taskModal.isOpen}
  taskId={editingTaskId}
  taskText={editingTaskText}
  taskPosition={taskModal.position}
  onSave={handleTaskSave}
  onCancel={handleTaskEditCancel}
  onArchive={handleTaskEditArchive}
/>

<ListEditModal
  isOpen={listModal.isOpen}
  listId={listId}
  listName={listName}
  listPosition={listModal.position}
  onSave={handleListSave}
  onCancel={handleListEditCancel}
  onArchive={handleListArchive}
/>


