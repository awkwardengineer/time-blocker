<script>
  import { liveQuery } from 'dexie';
  import { tick } from 'svelte';
  import { dndzone } from 'svelte-dnd-action';
  import { getTasksForList, createTask, updateTaskStatus, updateTaskOrder, updateTaskOrderCrossList, updateTaskText, updateListName, archiveList, archiveAllTasksInList } from '../lib/dataAccess.js';
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
  
  // Track last blurred task-related element and whether the next Tab
  // should refocus it (mirrors list behavior in App.svelte).
  let lastBlurredTaskElement = $state(null);
  let shouldRefocusTaskOnNextTab = $state(false);
  
  // Track keyboard-based drag state for tasks so we can restore focus
  // on the next Tab after a keyboard drop (mirrors list behavior in App.svelte).
  let isKeyboardTaskDragging = $state(false);
  let lastKeyboardDraggedTaskId = $state(null);
  
  let previousListId = $state(null);
  
  /**
   * Return all non-archived lists in visual column order.
   * Columns are ordered left-to-right by columnIndex, and within
   * each column lists are ordered top-to-bottom by their order.
   */
  function getListsInColumnOrder(lists) {
    if (!Array.isArray(lists)) return [];
    return [...lists].sort((a, b) => {
      const colA = a?.columnIndex ?? 0;
      const colB = b?.columnIndex ?? 0;
      if (colA !== colB) return colA - colB;

      const orderA = a?.order ?? 0;
      const orderB = b?.order ?? 0;
      if (orderA !== orderB) return orderA - orderB;

      const idA = a?.id ?? 0;
      const idB = b?.id ?? 0;
      return idA - idB;
    });
  }

  /**
   * Find the next/previous list ID relative to the current list,
   * using visual column order (left-to-right columns, top-to-bottom rows).
   */
  function findNeighborListId(currentListId, lists, direction) {
    const ordered = getListsInColumnOrder(lists);
    if (!ordered.length) return null;

    const index = ordered.findIndex((l) => l.id === currentListId);
    if (index === -1) return null;

    if (direction === 'next') {
      if (index >= ordered.length - 1) return null;
      return ordered[index + 1].id;
    }

    if (direction === 'prev') {
      if (index <= 0) return null;
      return ordered[index - 1].id;
    }

    return null;
  }
  
  $effect(() => {
    // Validate that listId exists in stableLists before creating query
    // This prevents queries from being created with placeholder IDs during drag operations
    const isValid = stableLists.some(list => list.id === listId);
    
    // Recreate query if listId changed from invalid to valid, or if listId actually changed
    if (isValid && listId) {
      if (!tasksQuery || previousListId !== listId) {
        tasksQuery = liveQuery(() => getTasksForList(listId));
        previousListId = listId;
      }
    } else {
      // Invalid listId - clear query and previousListId
      tasksQuery = null;
      previousListId = null;
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
  
  // Add capture-phase keyboard handler to prevent drag library from intercepting Enter/Space on list title
  $effect(() => {
    if (!listSectionElement) return;
    
    function handleListTitleKeydownCapture(e) {
      const target = e.target;
      
      // Handle Enter/Space on list title (h2 element) for editing
      if ((e.key === 'Enter' || e.key === ' ') && target instanceof HTMLElement && target.tagName === 'H2' && target.hasAttribute('role') && target.getAttribute('role') === 'button') {
        // Check if this is our list title (within this list section)
        const h2Element = listSectionElement?.querySelector('h2[role="button"]');
        if (h2Element && target === h2Element) {
          e.preventDefault();
          e.stopImmediatePropagation(); // Stop ALL handlers including drag library
          
          // Open the list edit modal
          listModal.openModal(target);
        }
      }
    }
    
    // Use capture phase to intercept before drag library
    listSectionElement.addEventListener('keydown', handleListTitleKeydownCapture, true);
    
    return () => {
      if (listSectionElement) {
        listSectionElement.removeEventListener('keydown', handleListTitleKeydownCapture, true);
      }
    };
  });
  
  // Add capture-phase keyboard handler to prevent drag library from intercepting Enter/Space on Add Task button
  $effect(() => {
    if (!addTaskContainerElement) return;
    
    function handleAddTaskButtonKeydownCapture(e) {
      const target = e.target;
      
      // Handle Enter/Space on Add Task button (span with role="button")
      if ((e.key === 'Enter' || e.key === ' ') && target instanceof HTMLElement && target.hasAttribute('role') && target.getAttribute('role') === 'button') {
        // Check if this is the Add Task button (within the add task container)
        const addTaskButton = addTaskContainerElement?.querySelector('span[role="button"]');
        if (addTaskButton && target === addTaskButton) {
          e.preventDefault();
          e.stopImmediatePropagation(); // Stop ALL handlers including drag library
          
          // Activate the input (same as clicking)
          handleAddTaskClick();
        }
      }
    }
    
    // Use capture phase to intercept before drag library
    addTaskContainerElement.addEventListener('keydown', handleAddTaskButtonKeydownCapture, true);
    
    return () => {
      if (addTaskContainerElement) {
        addTaskContainerElement.removeEventListener('keydown', handleAddTaskButtonKeydownCapture, true);
      }
    };
  });
  
  // Add capture-phase keyboard handler to prevent drag library from intercepting Enter on task text
  // Also handles cross-list movement when tasks are at boundaries
  $effect(() => {
    if (!ulElement) return;
    
    async function handleKeydownCapture(e) {
      const target = e.target;
      
      // Handle Enter/Space on task text for editing
      if ((e.key === 'Enter' || e.key === ' ') && target instanceof HTMLElement && target.hasAttribute('data-no-drag')) {
        e.preventDefault();
        e.stopImmediatePropagation(); // Stop ALL handlers including drag library
        
        // Find the task ID from the parent li element
        const liElement = target.closest('li[data-id]');
        if (liElement) {
          const taskId = parseInt(liElement.getAttribute('data-id'));
          const task = draggableTasks.find(t => t.id === taskId);
          if (task) {
            // Open the modal directly
            editingTaskId = taskId;
            editingTaskText = task.text;
            taskModal.openModal(target);
          }
        }
        return;
      }
      
      // Handle cross-list movement at boundaries
      // svelte-dnd-action uses Space to start dragging, then Arrow keys to move
      // We need to intercept when at boundaries
      // Check for any arrow key combination that might be used for navigation
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        // Find the focused task - check if any task element has focus
        const activeElement = document.activeElement;
        if (!activeElement) return;
        
        // Find the task li element that contains the focused element
        const focusedLi = activeElement.closest('li[data-id]');
        if (!focusedLi || !ulElement.contains(focusedLi)) return;
        
        const taskIdAttr = focusedLi.getAttribute('data-id');
        if (!taskIdAttr) return;
        
        const taskId = parseInt(taskIdAttr);
        const task = draggableTasks.find(t => t.id === taskId);
        if (!task) return;
        
        const taskIndex = draggableTasks.findIndex(t => t.id === taskId);
        const isFirst = taskIndex === 0;
        const isLast = taskIndex === draggableTasks.length - 1;
        
        // Check if we're at a boundary and trying to move in that direction
        // Only intercept if we're actually at the boundary
        if (e.key === 'ArrowDown' && isLast) {
          // Move to next list (in visual column order) - prevent default and handle cross-list movement
          e.preventDefault();
          e.stopImmediatePropagation();
          
          const nextListId = findNeighborListId(listId, allLists, 'next');
          if (nextListId != null) {
            // Move to next list in column order
            await moveTaskToNextList(taskId, nextListId);
          }
        } else if (e.key === 'ArrowUp' && isFirst) {
          // Move to previous list (in visual column order) - prevent default and handle cross-list movement
          e.preventDefault();
          e.stopImmediatePropagation();
          
          const prevListId = findNeighborListId(listId, allLists, 'prev');
          if (prevListId != null) {
            // Move to previous list in column order
            await moveTaskToPreviousList(taskId, prevListId);
          }
          // If at first list in first column, do nothing (already at top)
        }
      }
    }
    
    ulElement.addEventListener('keydown', handleKeydownCapture, true); // true = capture phase
    
    return () => {
      ulElement.removeEventListener('keydown', handleKeydownCapture, true);
    };
  });
  
  // Move task to next list (first position)
  async function moveTaskToNextList(taskId, nextListId) {
    try {
      // Get all tasks from next list
      const nextListTasks = await getTasksForList(nextListId);
      // Create new array with this task at the beginning
      const newTasks = [{ id: taskId }, ...nextListTasks];
      await updateTaskOrderCrossList(nextListId, newTasks);
    } catch (error) {
      console.error('Error moving task to next list:', error);
    }
  }
  
  // Move task to previous list (last position)
  async function moveTaskToPreviousList(taskId, prevListId) {
    try {
      // Get all tasks from previous list
      const prevListTasks = await getTasksForList(prevListId);
      // Create new array with this task at the end
      const newTasks = [...prevListTasks, { id: taskId }];
      await updateTaskOrderCrossList(prevListId, newTasks);
    } catch (error) {
      console.error('Error moving task to previous list:', error);
    }
  }
  
  // Handle drag events - consider event for visual reordering only
  function handleConsider(event) {
    // Update local state for visual feedback during drag
    // No database updates here - prevents liveQuery interference
    // Filter out any invalid items (only keep items with numeric IDs - real tasks)
    draggableTasks = event.detail.items.filter(item => 
      item && typeof item.id === 'number'
    );
  }
  
  /**
   * Capture-phase keydown handler for each task list item.
   *
   * We don't change the drag behavior provided by svelte-dnd-action;
   * instead we *observe* when keyboard drag starts/ends so that after
   * a keyboard drop (Space/Enter/Escape) we can resume focus on the
   * dragged task when the user presses Tab, instead of jumping to the
   * next tabbable child (e.g., the checkbox).
   */
  function handleTaskItemKeydownCapture(event, taskId) {
    const key = event.key;
    const currentTarget = event.currentTarget;
    const target = event.target;

    // Only track key events that originate on the <li> itself.
    // Inner controls (checkbox, text span, buttons) have their own
    // semantics and should not toggle keyboard drag tracking.
    if (!(currentTarget instanceof HTMLElement) || currentTarget !== target) {
      return;
    }

    if (key === 'Enter' || key === ' ') {
      if (!isKeyboardTaskDragging) {
        // First Enter/Space while focused on the task item - keyboard drag starts.
        isKeyboardTaskDragging = true;
        lastKeyboardDraggedTaskId = taskId;
      } else {
        // Second Enter/Space while dragging - keyboard drop.
        isKeyboardTaskDragging = false;
        lastKeyboardDraggedTaskId = taskId;
        // Remember this task item so the *next* Tab can refocus it.
        lastBlurredTaskElement = currentTarget;
        shouldRefocusTaskOnNextTab = true;
      }
    } else if (key === 'Escape') {
      const draggedElements = typeof document !== 'undefined' ? document.querySelectorAll('li[aria-grabbed="true"], li.svelte-dnd-action-dragged') : [];
      // Check if the ulElement (dndzone) has active drop zone styles
      let hasActiveDropZone = false;
      if (ulElement && ulElement instanceof HTMLElement) {
        const style = window.getComputedStyle(ulElement);
        // Check if box-shadow indicates an active drop zone (the library uses inset shadow)
        if (style.boxShadow && style.boxShadow !== 'none' && style.boxShadow.includes('inset')) {
          hasActiveDropZone = true;
        }
      }
      // Also check all ul elements in the document for drop zones (for cross-list drags)
      let allDropZonesCount = 0;
      if (typeof document !== 'undefined') {
        const allUls = document.querySelectorAll('ul');
        for (const ul of allUls) {
          if (ul instanceof HTMLElement && ul !== ulElement) {
            const style = window.getComputedStyle(ul);
            if (style.boxShadow && style.boxShadow !== 'none' && style.boxShadow.includes('inset')) {
              allDropZonesCount++;
            }
          }
        }
      }
      
      // Check if there's an active drag by looking for drop zones or dragged elements
      // This is more reliable than isKeyboardTaskDragging because the blur handler
      // may have already cleared that flag when svelte-dnd-action blurred the element
      const hasActiveDrag = draggedElements.length > 0 || hasActiveDropZone || allDropZonesCount > 0;
      
      if (isKeyboardTaskDragging || hasActiveDrag) {
        // Escape also ends keyboard drag; treat it like a drop for
        // the purposes of Tab-resume focus behavior.
        // Clear our local state
        isKeyboardTaskDragging = false;
        lastKeyboardDraggedTaskId = taskId;
        lastBlurredTaskElement = currentTarget;
        shouldRefocusTaskOnNextTab = true;
        // Don't prevent the event - let it propagate to svelte-dnd-action so it can clear drop zones
      } else {
        // Escape when not in drag state - blur the task item
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        lastBlurredTaskElement = currentTarget;
        shouldRefocusTaskOnNextTab = true;
        if (currentTarget instanceof HTMLElement) {
          currentTarget.blur();
        }
      }
    }
  }

  /**
   * When a keyboard-dragged task item blurs (svelte-dnd-action calls
   * `element.blur()` as part of its keyboard drop handling), remember
   * that element so the *next* Tab can refocus it instead of moving
   * directly into the checkbox.
   */
  function handleTaskItemBlur(event, taskId) {
    const currentTarget = event.currentTarget;

    if (isKeyboardTaskDragging && lastKeyboardDraggedTaskId === taskId) {
      isKeyboardTaskDragging = false;
      lastBlurredTaskElement = currentTarget;
      shouldRefocusTaskOnNextTab = true;
    }
  }
  
  // Add document-level keyboard listener for cross-list boundary movement
  // This runs before svelte-dnd-action handlers
  $effect(() => {
    if (!ulElement) return;
    
    async function handleDocumentKeydown(e) {
      const key = e.key;

      // Handle Tab resume after blur for tasks (mirrors list behavior in App.svelte)
      if (
        key === 'Tab' &&
        shouldRefocusTaskOnNextTab &&
        lastBlurredTaskElement
      ) {
        e.preventDefault();
        e.stopImmediatePropagation();
        e.stopPropagation();

        shouldRefocusTaskOnNextTab = false;

        // Try to refocus the previously blurred task-related element
        if (typeof document !== 'undefined') {
          let target = lastBlurredTaskElement;
          // If stored element is no longer in the DOM, fall back to the Add Task button
          if (
            !(target instanceof HTMLElement) ||
            !document.contains(target)
          ) {
            if (addTaskContainerElement) {
              const addTaskButton = addTaskContainerElement.querySelector(
                'span[role="button"]'
              );
              if (addTaskButton && addTaskButton instanceof HTMLElement) {
                target = addTaskButton;
              }
            }
          }

          if (target && target instanceof HTMLElement) {
            target.focus();
          }
        }
        return;
      }

      // Only handle ArrowUp/ArrowDown for cross-list movement below
      if (key !== 'ArrowDown' && key !== 'ArrowUp') return;
      
      // Check if focus is within this list
      const activeElement = document.activeElement;
      if (!activeElement) return;
      
      const focusedLi = activeElement.closest('li[data-id]');
      if (!focusedLi || !ulElement.contains(focusedLi)) return;
      
      const taskIdAttr = focusedLi.getAttribute('data-id');
      if (!taskIdAttr) return;
      
      const taskId = parseInt(taskIdAttr);
      const task = draggableTasks.find(t => t.id === taskId);
      if (!task) return;
      
      const taskIndex = draggableTasks.findIndex(t => t.id === taskId);
      const isFirst = taskIndex === 0;
      const isLast = taskIndex === draggableTasks.length - 1;
      
      // Check if we're at a boundary and trying to move in that direction
      if (key === 'ArrowDown' && isLast) {
        // Move to next list (in visual column order)
        e.preventDefault();
        e.stopImmediatePropagation();
        e.stopPropagation();
        
        const nextListId = findNeighborListId(listId, allLists, 'next');
        if (nextListId != null) {
          await moveTaskToNextList(taskId, nextListId);
        }
      } else if (key === 'ArrowUp' && isFirst) {
        // Move to previous list (in visual column order)
        e.preventDefault();
        e.stopImmediatePropagation();
        e.stopPropagation();
        
        const prevListId = findNeighborListId(listId, allLists, 'prev');
        if (prevListId != null) {
          await moveTaskToPreviousList(taskId, prevListId);
        }
      }
    }
    
    // Use capture phase to intercept before svelte-dnd-action
    document.addEventListener('keydown', handleDocumentKeydown, true);
    
    return () => {
      document.removeEventListener('keydown', handleDocumentKeydown, true);
    };
  });
  
  // Handle drag events - finalize event for database updates
  async function handleFinalize(event) {
    // Filter out any invalid items (only keep items with numeric IDs - real tasks)
    const validItems = event.detail.items.filter(item => 
      item && typeof item.id === 'number'
    );
    
    // Update local state for immediate visual feedback
    draggableTasks = validItems;
    
    // Update database with new order values
    // Supports both same-list reordering and cross-list moves
    try {
      await updateTaskOrderCrossList(listId, validItems);
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
  
  async function handleInputEscape(e, inputValue = '') {
    if (e.key === 'Escape') {
      // Check if list is empty
      const isListEmpty = draggableTasks.length === 0;
      
      // Read value from DOM element if available (more reliable)
      let currentValue = inputValue || '';
      if (addTaskTextareaElement) {
        currentValue = (addTaskTextareaElement.value || '').toString();
      } else if (newTaskInput) {
        currentValue = (newTaskInput || '').toString();
      }
      
      // If list is empty, cancel (close input without creating task)
      if (isListEmpty) {
        // Remember this task-related control as the point to resume from on the next Tab.
        shouldRefocusTaskOnNextTab = true;
        // Prefer to resume at the Add Task button when it reappears.
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
        return;
      }
      
      // If list is not empty and there's content (whitespace or text), create task
      // Check if input has any content (including whitespace)
      if (currentValue.length > 0) {
        // Create task with the current input value
        await handleCreateTask({ closeAfterSave: true });
        return;
      }
      
      // If list is not empty but input is empty, cancel
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
      await createTask(listId, taskText);
      onInputChange('');
      // For normal Enter/Save flows, keep input active and focused for sequential creation.
      // When invoked from a Tab-out flow, close the input after creating the task.
      if (closeAfterSave) {
        isInputActive = false;
      }
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

<div bind:this={listSectionElement} data-list-id={listId} class="flex flex-col mb-6 w-full">
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
        class="list-title cursor-pointer m-0 px-2 py-2 leading-none text-grey-110 font-gilda text-[24px] rounded -my-1 transition-colors flex-1 min-w-0 focus:outline-none"
        aria-label={`Rename list: ${listName}`}
      >
        {listName}
      </h2>
    </div>
  </div>
  {#if tasksQuery && $tasksQuery !== undefined}
    <div class="task-list-wrapper m-0 p-0">
      <ul 
        bind:this={ulElement}
        use:dndzone={{ 
          items: draggableTasks,
          type: 'task', // Shared type for all lists - enables cross-list dragging
          zoneTabIndex: -1, // Prevent entire task list <ul> from being focusable
          dropTargetStyle: {
            outline: 'none',
            boxShadow: 'inset 0 0 0 2px rgba(107, 143, 217, 0.4)', // blue-500 with 40% opacity - inset shadow acts like border without affecting layout
            backgroundColor: 'rgba(107, 143, 217, 0.04)', // blue-500 with 4% opacity
            borderRadius: '4px'
          }
        }}
        onconsider={handleConsider}
        onfinalize={handleFinalize}
        class="space-y-0 m-0 p-0 list-none w-full {draggableTasks.length === 0 ? 'empty-drop-zone min-h-[24px]' : ''}"
      >
        {#each draggableTasks as task (task.id)}
          <li
            data-id={task.id}
            class="flex items-center gap-2 py-1 border-b border-grey-50 cursor-move hover:bg-grey-20 w-full m-0 list-none"
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
              class={task.status === 'checked' ? 'line-through cursor-pointer hover:underline break-words flex-1 text-body font-urbanist text-grey-100' : 'cursor-pointer hover:underline break-words flex-1 text-body font-urbanist text-grey-100'}
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
      
      <!-- Add Task button - styled like a task item, positioned to align with list items -->
      {#if draggableTasks.length === 0}
        <div class="-mt-6">
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


