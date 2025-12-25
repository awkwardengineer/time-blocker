/**
 * Composable for keyboard-based task dragging
 * Handles keyboard navigation for dragging tasks within and between lists
 * 
 * This composable provides helper functions and handlers for task keyboard drag.
 * State management remains in the component.
 */

import { tick } from 'svelte';
import { isDragActive, hasActiveDropZone } from './dragDetectionUtils.js';
import { findNeighborListId, moveTaskToNextList, moveTaskToPreviousList } from './taskDragHandlers.js';
import { getTasksForList, updateTaskOrderCrossList } from '../dataAccess.js';
import { groupListsIntoColumns } from '../listDndUtils.js';
import { taskDragStateManager } from './taskDragStateManager.js';

/**
 * Create a capture-phase keydown handler for task list items.
 * Tracks keyboard drag state (start/stop) for Tab resume behavior.
 * 
 * @param {Object} state - Reactive state getters/setters
 * @param {Function} state.getIsKeyboardTaskDragging - Getter for isKeyboardTaskDragging
 * @param {Function} state.setIsKeyboardTaskDragging - Setter for isKeyboardTaskDragging
 * @param {Function} state.getLastKeyboardDraggedTaskId - Getter for lastKeyboardDraggedTaskId
 * @param {Function} state.setLastKeyboardDraggedTaskId - Setter for lastKeyboardDraggedTaskId
 * @param {Function} state.setLastBlurredTaskElement - Setter for lastBlurredTaskElement
 * @param {Function} state.setShouldRefocusTaskOnNextTab - Setter for shouldRefocusTaskOnNextTab
 * @param {Function} getUlElement - Getter function for the ul element (dndzone) for drop zone detection
 * @returns {Function} Handler function to be used as onkeydowncapture
 */
export function createTaskItemKeydownCaptureHandler(state, getUlElement) {
  const {
    getIsKeyboardTaskDragging,
    setIsKeyboardTaskDragging,
    getLastKeyboardDraggedTaskId,
    setLastKeyboardDraggedTaskId,
    setLastBlurredTaskElement,
    setShouldRefocusTaskOnNextTab
  } = state;

  return function handleTaskItemKeydownCapture(event, taskId) {
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
      const isKeyboardTaskDragging = getIsKeyboardTaskDragging();
      if (!isKeyboardTaskDragging) {
        // First Enter/Space while focused on the task item - keyboard drag starts.
        setIsKeyboardTaskDragging(true);
        setLastKeyboardDraggedTaskId(taskId);
      } else {
        // Second Enter/Space while dragging - keyboard drop.
        setIsKeyboardTaskDragging(false);
        setLastKeyboardDraggedTaskId(taskId);
        // Remember this task item so the *next* Tab can refocus it.
        setLastBlurredTaskElement(currentTarget);
        setShouldRefocusTaskOnNextTab(true);
        // Complete drag in state manager to allow liveQuery to sync
        const ulElement = getUlElement();
        if (ulElement) {
          const listIdAttr = ulElement.getAttribute('data-list-id');
          if (listIdAttr) {
            const listId = parseInt(listIdAttr);
            if (taskDragStateManager.globalDragActive) {
              taskDragStateManager.completeDrag(listId, listId, true);
            }
          }
        }
      }
    } else if (key === 'Escape') {
      const isKeyboardTaskDragging = getIsKeyboardTaskDragging();
      const ulElement = getUlElement();
      const hasActiveDrag = isDragActive() || (ulElement && hasActiveDropZone(ulElement));
      
      if (isKeyboardTaskDragging || hasActiveDrag) {
        // Escape also ends keyboard drag; treat it like a drop for
        // the purposes of Tab-resume focus behavior.
        // Clear our local state
        setIsKeyboardTaskDragging(false);
        setLastKeyboardDraggedTaskId(taskId);
        setLastBlurredTaskElement(currentTarget);
        setShouldRefocusTaskOnNextTab(true);
        // Complete drag in state manager to allow liveQuery to sync
        const ulElement = getUlElement();
        if (ulElement) {
          const listIdAttr = ulElement.getAttribute('data-list-id');
          if (listIdAttr) {
            const listId = parseInt(listIdAttr);
            if (taskDragStateManager.globalDragActive) {
              taskDragStateManager.completeDrag(listId, listId, false); // false = cancel
            }
          }
        }
        // Blur the element immediately after completing drag
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        if (currentTarget instanceof HTMLElement) {
          currentTarget.blur();
        }
      } else {
        // Escape when not in drag state - blur the task item
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        setLastBlurredTaskElement(currentTarget);
        setShouldRefocusTaskOnNextTab(true);
        if (currentTarget instanceof HTMLElement) {
          currentTarget.blur();
        }
      }
    }
  };
}

/**
 * Create a blur handler for task list items.
 * Tracks when keyboard-dragged task items blur for Tab resume behavior.
 * 
 * @param {Object} state - Reactive state getters/setters
 * @param {Function} state.getIsKeyboardTaskDragging - Getter for isKeyboardTaskDragging
 * @param {Function} state.getLastKeyboardDraggedTaskId - Getter for lastKeyboardDraggedTaskId
 * @param {Function} state.setIsKeyboardTaskDragging - Setter for isKeyboardTaskDragging
 * @param {Function} state.setLastBlurredTaskElement - Setter for lastBlurredTaskElement
 * @param {Function} state.setShouldRefocusTaskOnNextTab - Setter for shouldRefocusTaskOnNextTab
 * @returns {Function} Handler function to be used as onblur
 */
export function createTaskItemBlurHandler(state) {
  const {
    getIsKeyboardTaskDragging,
    getLastKeyboardDraggedTaskId,
    setIsKeyboardTaskDragging,
    setLastBlurredTaskElement,
    setShouldRefocusTaskOnNextTab
  } = state;

  return function handleTaskItemBlur(event, taskId) {
    const currentTarget = event.currentTarget;
    const isKeyboardTaskDragging = getIsKeyboardTaskDragging();
    const lastKeyboardDraggedTaskId = getLastKeyboardDraggedTaskId();

    if (isKeyboardTaskDragging && lastKeyboardDraggedTaskId === taskId) {
      // DON'T reset isKeyboardTaskDragging on blur - it will be reset when:
      // 1. User presses Enter/Space again (drop)
      // 2. User presses Escape (cancel)
      // 3. User presses Tab (move focus away)
      // Blur can happen during DOM updates after database operations, so we shouldn't
      // reset the drag state here - it would prevent subsequent arrow key presses
      // setIsKeyboardTaskDragging(false);
      setLastBlurredTaskElement(currentTarget);
      setShouldRefocusTaskOnNextTab(true);
    }
  };
}

/**
 * Set up document-level keyboard handler for task dragging.
 * Handles Tab resume behavior and cross-list boundary movement.
 * Designed to be used within Svelte's $effect
 * 
 * @param {Object} state - Reactive state getters/setters
 * @param {Function} state.getIsKeyboardTaskDragging - Getter for isKeyboardTaskDragging
 * @param {Function} state.getLastKeyboardDraggedTaskId - Getter for lastKeyboardDraggedTaskId
 * @param {Function} state.getLastBlurredTaskElement - Getter for lastBlurredTaskElement
 * @param {Function} state.getShouldRefocusTaskOnNextTab - Getter for shouldRefocusTaskOnNextTab
 * @param {Function} state.setIsKeyboardTaskDragging - Setter for isKeyboardTaskDragging
 * @param {Function} state.setLastKeyboardDraggedTaskId - Setter for lastKeyboardDraggedTaskId
 * @param {Function} state.setLastBlurredTaskElement - Setter for lastBlurredTaskElement
 * @param {Function} state.setShouldRefocusTaskOnNextTab - Setter for shouldRefocusTaskOnNextTab
 * @param {HTMLElement} ulElement - The ul element (dndzone) for this list
 * @param {number} listId - The current list ID
 * @param {Array} allLists - All lists for finding neighbors
 * @param {Function} getDraggableTasks - Getter function for current draggable tasks
 * @param {Function} setDraggableTasks - Setter function to update draggable tasks
 * @param {HTMLElement} addTaskContainerElement - Add task container for fallback focus
 * @returns {() => void} Cleanup function to be returned from $effect
 */
export function setupTaskKeyboardDragDocumentHandler(
  state,
  ulElement,
  listId,
  allLists,
  getDraggableTasks,
  setDraggableTasks,
  addTaskContainerElement
) {
  const {
    getIsKeyboardTaskDragging,
    getLastKeyboardDraggedTaskId,
    getLastBlurredTaskElement,
    getShouldRefocusTaskOnNextTab,
    setIsKeyboardTaskDragging,
    setLastKeyboardDraggedTaskId,
    setLastBlurredTaskElement,
    setShouldRefocusTaskOnNextTab
  } = state;

  // Lock to prevent concurrent keypress handling
  let isProcessing = false;
  
  async function handleDocumentKeydown(e) {
    const key = e.key;
    const isKeyboardTaskDragging = getIsKeyboardTaskDragging();
    const hasActiveDrag = isDragActive();
    
    // Prevent concurrent processing of arrow keys
    if ((key === 'ArrowDown' || key === 'ArrowUp' || key === 'ArrowLeft' || key === 'ArrowRight') && isProcessing) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Handle Tab during active drag mode - cancel drag first (similar to Escape)
    if (key === 'Tab') {
      if (hasActiveDrag || isKeyboardTaskDragging) {
        // Tab should cancel drag mode (like Escape does)
        // Prevent Tab from navigating - the NEXT Tab will refocus the dropped item
        e.preventDefault();
        e.stopImmediatePropagation();
        e.stopPropagation();
        
        // Clear our local state
        setIsKeyboardTaskDragging(false);
        if (typeof document !== 'undefined' && document.activeElement) {
          const activeElement = document.activeElement;
          const focusedLi = activeElement.closest('li[data-id]');
          if (focusedLi && focusedLi instanceof HTMLElement) {
            const taskIdAttr = focusedLi.getAttribute('data-id');
            if (taskIdAttr) {
              const taskId = parseInt(taskIdAttr);
              setLastKeyboardDraggedTaskId(taskId);
              setLastBlurredTaskElement(focusedLi);
              setShouldRefocusTaskOnNextTab(true);
            }
            // Complete drag in state manager to allow liveQuery to sync
            const taskUl = focusedLi.closest('ul[data-list-id]');
            if (taskUl) {
              const listIdAttr = taskUl.getAttribute('data-list-id');
              if (listIdAttr) {
                const listId = parseInt(listIdAttr);
                if (taskDragStateManager.globalDragActive) {
                  taskDragStateManager.completeDrag(listId, listId, true);
                }
              }
            }
          }
        }
        // With SortableJS, keyboard drag is handled entirely by our custom code
        // No need to dispatch events to cancel library drag mode
        return;
      }

      // Handle Tab resume after blur for tasks (mirrors list behavior in App.svelte)
      const shouldRefocusTaskOnNextTab = getShouldRefocusTaskOnNextTab();
      const lastBlurredTaskElement = getLastBlurredTaskElement();
      
      if (key === 'Tab' && shouldRefocusTaskOnNextTab && lastBlurredTaskElement) {
        e.preventDefault();
        e.stopImmediatePropagation();
        e.stopPropagation();

        setShouldRefocusTaskOnNextTab(false);

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
    }

    // Only handle Arrow keys when keyboard dragging is active
    if (!isKeyboardTaskDragging) {
      return;
    }
    if (key !== 'ArrowDown' && key !== 'ArrowUp' && key !== 'ArrowLeft' && key !== 'ArrowRight') return;
    
    // Check if focus is on a task element (can be in any list after cross-list moves)
    const activeElement = document.activeElement;
    if (!activeElement) {
      return;
    }
    
    const focusedLi = activeElement.closest('li[data-id]');
    if (!focusedLi) {
      return;
    }
    
    const taskIdAttr = focusedLi.getAttribute('data-id');
    if (!taskIdAttr) {
      return;
    }
    
    const taskId = parseInt(taskIdAttr);
    
    // Find which list this task belongs to by checking which ul contains it
    const taskUl = focusedLi.closest('ul[data-list-id]');
    if (!taskUl) {
      return;
    }
    
    const taskListIdAttr = taskUl.getAttribute('data-list-id');
    if (!taskListIdAttr) {
      return;
    }
    const taskListId = parseInt(taskListIdAttr);
    
    // After cross-list moves, the task may be in a different list
    // Use the task's current listId to read from the correct state
    const actualListId = taskListId; // Use the list where the task actually is
    
    // Read from state manager directly to get the latest state (not stale component state)
    // Use the task's current listId, not the handler's bound listId
    const stateManagerState = taskDragStateManager.getState(actualListId);
    const draggableTasks = stateManagerState.tasks;
    
    const task = draggableTasks.find(t => t.id === taskId);
    if (!task) {
      return;
    }
    
        const taskIndex = draggableTasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) {
          return; // Should not happen if task was found
        }
        
        const isFirst = taskIndex === 0;
        const isLast = taskIndex === draggableTasks.length - 1;
    
        e.preventDefault();
        e.stopImmediatePropagation();
        e.stopPropagation();
        
        // Set processing lock
        isProcessing = true;
        
        try {
          // Handle ArrowUp/ArrowDown for same-list movement or cross-list boundaries
          if (key === 'ArrowDown') {
      if (isLast) {
        // At end of list - move to next list (in visual column order)
        const nextListId = findNeighborListId(actualListId, allLists, 'next');
        if (nextListId != null) {
          // Start drag if not already active
          if (!taskDragStateManager.globalDragActive) {
            taskDragStateManager.startDrag(actualListId, nextListId);
          }
          
          // Get the full task object from source list before moving
          const taskToMove = draggableTasks.find(t => t.id === taskId);
          if (!taskToMove) {
            return;
          }
          
          // Update state manager: remove from source list, add to target list
          const sourceTasks = draggableTasks.filter(t => t.id !== taskId);
          taskDragStateManager.updateDragState(actualListId, sourceTasks);
          
          // Get target list's current state from state manager (not DB - DB might be stale)
          // If state manager doesn't have state for this list yet, initialize it from DB
          let nextListState = taskDragStateManager.getState(nextListId);
          let nextListTasks = nextListState?.tasks || [];
          // Check if state manager actually has this list initialized (version > 0 means it was initialized)
          if (nextListTasks.length === 0 && nextListState.version === 0 && !taskDragStateManager.state.has(nextListId)) {
            // State manager doesn't have this list - fetch from DB and initialize
            const dbTasks = await getTasksForList(nextListId);
            const activeTasks = dbTasks.filter(task => 
              task.status === 'unchecked' || task.status === 'checked'
            );
            taskDragStateManager.initializeFromQuery(nextListId, activeTasks);
            nextListState = taskDragStateManager.getState(nextListId);
            nextListTasks = nextListState?.tasks || [];
          }
          // Use full task object, but update listId to the new list
          const taskToMoveWithNewListId = { ...taskToMove, listId: nextListId };
          const targetTasks = [taskToMoveWithNewListId, ...nextListTasks];
          taskDragStateManager.updateDragState(nextListId, targetTasks);
          
          // Update database
          await moveTaskToNextList(taskId, nextListId);
          
          // Wait for DOM update and refocus the moved task
          await tick();
          const movedTaskElement = document.querySelector(`li[data-id="${taskId}"]`);
          if (movedTaskElement instanceof HTMLElement) {
            movedTaskElement.focus();
          }
        }
      } else {
        // Move down within same list
        const newTasks = [...draggableTasks];
        const [movedTask] = newTasks.splice(taskIndex, 1);
        newTasks.splice(taskIndex + 1, 0, movedTask);
        
        // Use state manager to prevent liveQuery from overwriting
        // Start drag if not already active (for first move in keyboard drag session)
        // Use actualListId, not the bound listId (task may have moved to different list)
        if (!taskDragStateManager.globalDragActive) {
          taskDragStateManager.startDrag(actualListId, actualListId);
        }
        taskDragStateManager.updateDragState(actualListId, newTasks);
        
        // Update database
        await updateTaskOrderCrossList(actualListId, newTasks);
        
        // Don't complete drag here - keep it active during keyboard drag session
        // It will be completed when keyboard drag ends (Enter/Space/Escape/Tab)
        // Wait for DOM update and refocus the moved task
        await tick();
        
        // Try to find the task in the current list's ul first
        let movedTaskElement = ulElement?.querySelector(`li[data-id="${taskId}"]`);
        // If not found, search globally (for cross-list moves)
        if (!movedTaskElement) {
          movedTaskElement = document.querySelector(`li[data-id="${taskId}"]`);
        }
        if (movedTaskElement instanceof HTMLElement) {
          movedTaskElement.focus();
          
          // Wait a bit longer for any liveQuery updates to complete, then verify focus is still there
          await tick();
          await new Promise(resolve => setTimeout(resolve, 50));
          
          // If focus was lost, try to refocus again
          const activeElementAfterDelay = document.activeElement;
          if (activeElementAfterDelay !== movedTaskElement) {
            const refoundElement = document.querySelector(`li[data-id="${taskId}"]`);
            if (refoundElement instanceof HTMLElement) {
              refoundElement.focus();
            }
          }
        }
      }
    } else if (key === 'ArrowUp') {
          if (isFirst) {
            // At start of list - check if we should move to previous list
            const prevListId = findNeighborListId(actualListId, allLists, 'prev');
            if (prevListId != null) {
              // Check if prevListId is in a different column (cross-column move)
              const currentList = allLists.find(l => l.id === actualListId);
              const prevList = allLists.find(l => l.id === prevListId);
              const isCrossColumn = currentList && prevList && (currentList.columnIndex ?? 0) !== (prevList.columnIndex ?? 0);
              if (isCrossColumn) {
                // Cross-column move: move to bottom of previous column
          // Start drag if not already active
          if (!taskDragStateManager.globalDragActive) {
            taskDragStateManager.startDrag(actualListId, prevListId);
          }
          
          // Get the full task object from source list before moving
          const taskToMove = draggableTasks.find(t => t.id === taskId);
          if (!taskToMove) {
            return;
          }
          
          // Update state manager: remove from source list, add to target list
          const sourceTasks = draggableTasks.filter(t => t.id !== taskId);
          taskDragStateManager.updateDragState(actualListId, sourceTasks);
          
          // Get target list's current state from state manager (not DB - DB might be stale)
          // If state manager doesn't have state for this list yet, initialize it from DB
          let prevListState = taskDragStateManager.getState(prevListId);
          let prevListTasks = prevListState?.tasks || [];
          // Check if state manager actually has this list initialized (version > 0 means it was initialized)
          if (prevListTasks.length === 0 && prevListState.version === 0 && !taskDragStateManager.state.has(prevListId)) {
            // State manager doesn't have this list - fetch from DB and initialize
            const dbTasks = await getTasksForList(prevListId);
            const activeTasks = dbTasks.filter(task => 
              task.status === 'unchecked' || task.status === 'checked'
            );
            taskDragStateManager.initializeFromQuery(prevListId, activeTasks);
            prevListState = taskDragStateManager.getState(prevListId);
            prevListTasks = prevListState?.tasks || [];
          }
          // Use full task object, but update listId to the new list
          const taskToMoveWithNewListId = { ...taskToMove, listId: prevListId };
          const targetTasks = [...prevListTasks, taskToMoveWithNewListId];
          taskDragStateManager.updateDragState(prevListId, targetTasks);
          
          // Update database
          await moveTaskToPreviousList(taskId, prevListId);
          
          // Wait for DOM update and refocus the moved task
          await tick();
          const movedTaskElement = document.querySelector(`li[data-id="${taskId}"]`);
          if (movedTaskElement instanceof HTMLElement) {
            movedTaskElement.focus();
          }
              } else {
                // Same column move: prevListId is the previous list in the same column
                // Start drag if not already active
                if (!taskDragStateManager.globalDragActive) {
                  taskDragStateManager.startDrag(actualListId, prevListId);
                }
                
                // Get the full task object from source list before moving
                const taskToMove = draggableTasks.find(t => t.id === taskId);
                if (!taskToMove) {
                  return;
                }
                
                // Update state manager: remove from source list, add to target list
                const sourceTasks = draggableTasks.filter(t => t.id !== taskId);
                taskDragStateManager.updateDragState(actualListId, sourceTasks);
                
                // Get target list's current state from state manager
                let prevListState = taskDragStateManager.getState(prevListId);
                let prevListTasks = prevListState?.tasks || [];
                if (prevListTasks.length === 0 && prevListState.version === 0 && !taskDragStateManager.state.has(prevListId)) {
                  const dbTasks = await getTasksForList(prevListId);
                  const activeTasks = dbTasks.filter(task => 
                    task.status === 'unchecked' || task.status === 'checked'
                  );
                  taskDragStateManager.initializeFromQuery(prevListId, activeTasks);
                  prevListState = taskDragStateManager.getState(prevListId);
                  prevListTasks = prevListState?.tasks || [];
                }
                
                // Move task to bottom of previous list in same column
                const taskToMoveWithNewListId = { ...taskToMove, listId: prevListId };
                const targetTasks = [...prevListTasks, taskToMoveWithNewListId];
                taskDragStateManager.updateDragState(prevListId, targetTasks);
                
                // Update database
                await moveTaskToPreviousList(taskId, prevListId);
                
                // Wait for DOM update and refocus the moved task
                await tick();
                const movedTaskElement = document.querySelector(`li[data-id="${taskId}"]`);
                if (movedTaskElement instanceof HTMLElement) {
                  movedTaskElement.focus();
                }
              }
            } else {
              // No previous list found - can't move up
              return;
            }
        } else {
        // Move up within same list
        const newTasks = [...draggableTasks];
        const [movedTask] = newTasks.splice(taskIndex, 1);
        newTasks.splice(taskIndex - 1, 0, movedTask);
        
        // Use state manager to prevent liveQuery from overwriting
        // Start drag if not already active (for first move in keyboard drag session)
        // Use actualListId, not the bound listId (task may have moved to different list)
        if (!taskDragStateManager.globalDragActive) {
          taskDragStateManager.startDrag(actualListId, actualListId);
        }
        taskDragStateManager.updateDragState(actualListId, newTasks);
        
        // Update database
        await updateTaskOrderCrossList(actualListId, newTasks);
        // Don't complete drag here - keep it active during keyboard drag session
        // It will be completed when keyboard drag ends (Enter/Space/Escape/Tab)
        // Wait for DOM update and refocus the moved task
        await tick();
        // Try to find the task in the current list's ul first
        let movedTaskElement = ulElement?.querySelector(`li[data-id="${taskId}"]`);
        // If not found, search globally (for cross-list moves)
        if (!movedTaskElement) {
          movedTaskElement = document.querySelector(`li[data-id="${taskId}"]`);
        }
        if (movedTaskElement instanceof HTMLElement) {
          movedTaskElement.focus();
        }
      }
    } else if (key === 'ArrowLeft' || key === 'ArrowRight') {
      // Cross-column movement - find list in adjacent column at same position
      const currentList = allLists.find(l => l.id === listId);
      if (!currentList) return;
      
      const currentColumnIndex = currentList.columnIndex ?? 0;
      const targetColumnIndex = key === 'ArrowLeft' ? currentColumnIndex - 1 : currentColumnIndex + 1;
      
      // Check if target column is valid (0-4)
      if (targetColumnIndex < 0 || targetColumnIndex >= 5) return;
      
      // Group lists into columns and find target list
      const columns = groupListsIntoColumns(allLists, 5);
      const targetColumn = columns[targetColumnIndex] || [];
      
      // Find list at same position in target column, or use first/last list
      let targetListId = null;
      if (targetColumn.length > 0) {
        // Use list at same position, or closest position
        const targetPosition = Math.min(taskIndex, targetColumn.length - 1);
        targetListId = targetColumn[targetPosition]?.id;
      }
      
      if (targetListId != null) {
        // Move to same position in target list, or end if position doesn't exist
        const targetListTasks = await getTasksForList(targetListId);
        const targetIndex = Math.min(taskIndex, targetListTasks.length);
        const newTasks = [...targetListTasks];
        newTasks.splice(targetIndex, 0, task);
        await updateTaskOrderCrossList(targetListId, newTasks);
      }
    }
        } finally {
          // Always release processing lock, even if an error occurs
          isProcessing = false;
        }
  }

  // Use capture phase to intercept before svelte-dnd-action
  document.addEventListener('keydown', handleDocumentKeydown, true);
  
  return () => {
    document.removeEventListener('keydown', handleDocumentKeydown, true);
  };
}

