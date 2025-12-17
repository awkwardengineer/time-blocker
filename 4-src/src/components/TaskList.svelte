<script>
  import { liveQuery } from 'dexie';
  import { tick } from 'svelte';
  import { dndzone } from 'svelte-dnd-action';
  import { getTasksForList, createTask, updateTaskStatus, updateTaskOrder, updateTaskOrderCrossList, updateTaskText, updateListName, createUnnamedList, archiveList, archiveAllTasksInList } from '../lib/dataAccess.js';
  import TaskEditModal from './TaskEditModal.svelte';
  import ListEditModal from './ListEditModal.svelte';
  import AddTaskInput from './AddTaskInput.svelte';
  import { useClickOutside } from '../lib/useClickOutside.js';
  import { isEmpty, normalizeInput } from '../lib/inputValidation.js';
  import { TASK_WIDTH } from '../lib/constants.js';
  
  let { listId, listName, newTaskInput, onInputChange, allLists = [], stableLists = [] } = $props();
  
  // Create liveQuery at top level - capture listId in closure
  // This creates the query once and it will automatically update when database changes
  let tasksQuery = $state(null);
  
  // Local state for drag-and-drop - synced from liveQuery
  // Only includes unchecked/checked tasks (archived excluded)
  let draggableTasks = $state([]);
  
  // State for Add Task button/input toggle
  let isInputActive = $state(false);
  
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
  
  // Reactive references to DOM elements (replaces document.querySelector calls)
  let listSectionElement = $state(null); // Reference to the main list section div
  let addTaskContainerElement = $state(null); // Reference to the add-task-container
  let addTaskTextareaElement = $state(null); // Reference to the add-task textarea
  
  let previousListId = $state(null);
  
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
          const rect = target.getBoundingClientRect();
          editingListPosition = {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height
          };
          listNameElement = target;
          listEditModalOpen = true;
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
          // Move to next list - prevent default and handle cross-list movement
          e.preventDefault();
          e.stopImmediatePropagation();
          
          const currentListIndex = allLists.findIndex(l => l.id === listId);
          if (currentListIndex < allLists.length - 1) {
            // Move to next list
            const nextListId = allLists[currentListIndex + 1].id;
            await moveTaskToNextList(taskId, nextListId);
          } else {
            // Last list - create new unnamed list
            await moveTaskToNewList(taskId);
          }
        } else if (e.key === 'ArrowUp' && isFirst) {
          // Move to previous list - prevent default and handle cross-list movement
          e.preventDefault();
          e.stopImmediatePropagation();
          
          const currentListIndex = allLists.findIndex(l => l.id === listId);
          if (currentListIndex > 0) {
            // Move to previous list
            const prevListId = allLists[currentListIndex - 1].id;
            await moveTaskToPreviousList(taskId, prevListId);
          }
          // If at first list, do nothing (already at top)
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
  
  // Move task to new unnamed list
  async function moveTaskToNewList(taskId) {
    try {
      const newListId = await createUnnamedList();
      // New list is empty, so just this task
      await updateTaskOrderCrossList(newListId, [{ id: taskId }]);
    } catch (error) {
      console.error('Error moving task to new list:', error);
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
  
  // Add document-level keyboard listener for cross-list boundary movement
  // This runs before svelte-dnd-action handlers
  $effect(() => {
    if (!ulElement) return;
    
    async function handleDocumentKeydown(e) {
      // Only handle arrow keys
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      
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
      if (e.key === 'ArrowDown' && isLast) {
        // Move to next list
        e.preventDefault();
        e.stopImmediatePropagation();
        e.stopPropagation();
        
        const currentListIndex = allLists.findIndex(l => l.id === listId);
        if (currentListIndex < allLists.length - 1) {
          const nextListId = allLists[currentListIndex + 1].id;
          await moveTaskToNextList(taskId, nextListId);
        } else {
          await moveTaskToNewList(taskId);
        }
      } else if (e.key === 'ArrowUp' && isFirst) {
        // Move to previous list
        e.preventDefault();
        e.stopImmediatePropagation();
        e.stopPropagation();
        
        const currentListIndex = allLists.findIndex(l => l.id === listId);
        if (currentListIndex > 0) {
          const prevListId = allLists[currentListIndex - 1].id;
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
  
  async function handleInputEscape(e) {
    if (e.key === 'Escape') {
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
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => setTimeout(resolve, 200));
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
        checkIgnoreClick: (e) => {
          // Use reactive reference to the add-task container
          if (!addTaskContainerElement) return false;
          
          // Check if click is on the Save button - don't close, let Save handle it
          const saveButton = addTaskContainerElement.querySelector('button');
          if (saveButton && saveButton.contains(e.target)) {
            return true; // Ignore this click
          }
          
          return false;
        },
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
  
  async function handleCreateTask() {
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
      await new Promise(resolve => setTimeout(resolve, 200));
      return;
    }
    
    // Check if input contains only whitespace (e.g., " ", "      ")
    const { text: taskText } = normalizeInput(inputValue);
    
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
    
    // Find the first remaining task in the list
    const firstTaskCard = ulElement.querySelector('li[data-id]');
    if (firstTaskCard) {
      const firstTaskText = firstTaskCard.querySelector('span[role="button"]');
      if (firstTaskText && firstTaskText instanceof HTMLElement) {
        return firstTaskText;
      }
    }
    
    return null;
  }
  
  /**
   * Focuses the "Add Task" button with retry logic.
   * Useful when list becomes empty and button needs time to appear in DOM.
   * Uses reactive reference instead of querying DOM.
   * @param {number} maxAttempts - Maximum number of retry attempts (default: 20)
   * @param {number} retryInterval - Milliseconds between retry attempts (default: 10)
   * @returns {Promise<void>}
   */
  function focusAddTaskButton(maxAttempts = 20, retryInterval = 10) {
    if (!listSectionElement) {
      return;
    }
    
    const tryFocus = (attempts = 0) => {
      if (addTaskContainerElement) {
        const addTaskSpan = addTaskContainerElement.querySelector('span[role="button"]');
        if (addTaskSpan && addTaskSpan instanceof HTMLElement) {
          addTaskSpan.focus();
          return;
        }
      }
      
      // Retry if we haven't exceeded max attempts
      if (attempts < maxAttempts) {
        setTimeout(() => tryFocus(attempts + 1), retryInterval);
      }
    };
    
    tryFocus();
  }
  
  async function handleArchiveTask(taskId) {
    try {
      // Archive the task
      await archiveTask(taskId);
      
      // Close modal if this task was being edited
      if (editingTaskId === taskId) {
        const taskElement = editingTaskElement; // Store reference before clearing
        editModalOpen = false;
        editingTaskId = null;
        editingTaskText = '';
        editingTaskPosition = null;
        editingTaskElement = null;
        
        // Focus management: after archiving, focus should go to next logical element
        // Wait for Svelte's reactive updates to complete (especially important when list becomes empty)
        await tick();
        // Additional small delay to ensure DOM has updated (especially when list becomes empty)
        await new Promise(resolve => setTimeout(resolve, 10));
        
        setTimeout(() => {
          // Try to find next task to focus (first remaining task in list)
          // Use retry logic to handle DOM updates after archiving
          const tryFocusNextTask = (attempts = 0) => {
            const nextTarget = findNextFocusTarget();
            if (nextTarget) {
              nextTarget.focus();
            } else if (attempts < 20) {
              // Retry up to 20 times (200ms total) to wait for DOM updates
              setTimeout(() => tryFocusNextTask(attempts + 1), 10);
            } else {
              // Fallback: focus the "Add Task" button
              // Use more retries when list becomes empty (DOM structure changes)
              focusAddTaskButton(40, 10);
            }
          };
          tryFocusNextTask();
        }, 20);
      }
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
    // Store task element reference before archiving (in case modal closes)
    const taskElement = editingTaskElement;
    await handleArchiveTask(taskId);
    
    // If focus wasn't handled by handleArchiveTask (e.g., modal already closed),
    // handle it here by finding the Add Task button
    setTimeout(() => {
      // Check if document exists (may not be available in test environments after cleanup)
      if (typeof document === 'undefined') return;
      const activeElement = document.activeElement;
      if (listSectionElement && (!activeElement || !listSectionElement.contains(activeElement))) {
        // Focus wasn't set, so focus the Add Task button
        // Use more retries (20) to account for DOM updates when list becomes empty
        focusAddTaskButton(20, 10);
      }
    }, 10);
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
      event.stopImmediatePropagation(); // Prevent dndzone from intercepting
      
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

<div bind:this={listSectionElement} data-list-id={listId} class="flex flex-col gap-1 m-0 p-0">
  <div class="flex items-center gap-2 m-0 p-0">
    <span 
      class="drag-handle text-gray-400 cursor-grab active:cursor-grabbing select-none" 
      title="Drag to reorder list"
      tabindex="-1"
      aria-hidden="true"
    >
      ⋮⋮
    </span>
    <h2 
      onclick={handleListNameClick}
      onkeydown={handleListNameKeydown}
      role="button"
      tabindex="0"
      class="cursor-pointer hover:underline m-0 p-0 leading-none"
      aria-label={`Rename list: ${listName}`}
    >
      {listName}
    </h2>
  </div>
  {#if tasksQuery && $tasksQuery !== undefined}
    <div class="task-list-wrapper m-0 p-0">
      <ul 
        bind:this={ulElement}
        use:dndzone={{ 
          items: draggableTasks,
          type: 'task', // Shared type for all lists - enables cross-list dragging
          zoneTabIndex: -1 // Prevent entire task list <ul> from being focusable
        }}
        onconsider={handleConsider}
        onfinalize={handleFinalize}
        class="space-y-2 m-0 p-0 list-none {draggableTasks.length === 0 ? 'empty-drop-zone min-h-[24px]' : ''}"
      >
        {#each draggableTasks as task (task.id)}
          <li data-id={task.id} class="flex items-center gap-2 p-2 border rounded cursor-move hover:bg-gray-50 w-full m-0 list-none">
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
              onkeydown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  handleToggleTaskStatus(task.id, task.status);
                }
              }}
              class="cursor-pointer"
              aria-label={`Mark task "${task.text || 'blank task'}" as ${task.status === 'checked' ? 'unchecked' : 'checked'}`}
            />
            <span 
              class={task.status === 'checked' ? 'line-through cursor-pointer hover:underline break-words flex-1' : 'cursor-pointer hover:underline break-words flex-1'}
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
      
      <!-- Add Task button - styled like a task item, positioned to align with list items -->
      {#if draggableTasks.length === 0}
        <div class="empty-list-add-task-wrapper">
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
            placeholder="Add new task..."
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
          placeholder="Add new task..."
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

<style>
  .task-list-wrapper ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  
  .task-list-wrapper li {
    margin: 0;
    padding: 0;
    list-style: none;
    box-sizing: border-box; /* Include borders in width calculation */
  }
  
  /* Position "Add your first task" to cover empty drop zone space */
  .empty-list-add-task-wrapper {
    margin-top: -24px; /* Shift up to cover min-h-[24px] from empty ul */
  }
  
  /* Explicitly reset h2 margins to ensure no browser defaults */
  [data-list-id] h2 {
    margin: 0;
  }
  
  @media print {
    .drag-handle {
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
  onArchive={handleListArchive}
/>

