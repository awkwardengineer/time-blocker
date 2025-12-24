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
        // Don't prevent the event - let it propagate to svelte-dnd-action so it can clear drop zones
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
      setIsKeyboardTaskDragging(false);
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

  async function handleDocumentKeydown(e) {
    const key = e.key;
    const isKeyboardTaskDragging = getIsKeyboardTaskDragging();
    const hasActiveDrag = isDragActive();

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
    if (!isKeyboardTaskDragging) return;
    if (key !== 'ArrowDown' && key !== 'ArrowUp' && key !== 'ArrowLeft' && key !== 'ArrowRight') return;
    
    // Check if focus is within this list
    const activeElement = document.activeElement;
    if (!activeElement) return;
    
    const focusedLi = activeElement.closest('li[data-id]');
    if (!focusedLi || !ulElement.contains(focusedLi)) return;
    
    const taskIdAttr = focusedLi.getAttribute('data-id');
    if (!taskIdAttr) return;
    
    const taskId = parseInt(taskIdAttr);
    const draggableTasks = getDraggableTasks();
    const task = draggableTasks.find(t => t.id === taskId);
    if (!task) return;
    
    const taskIndex = draggableTasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return; // Should not happen if task was found
    
    const isFirst = taskIndex === 0;
    const isLast = taskIndex === draggableTasks.length - 1;
    
    e.preventDefault();
    e.stopImmediatePropagation();
    e.stopPropagation();
    
    // Handle ArrowUp/ArrowDown for same-list movement or cross-list boundaries
    if (key === 'ArrowDown') {
      if (isLast) {
        // At end of list - move to next list (in visual column order)
        const nextListId = findNeighborListId(listId, allLists, 'next');
        if (nextListId != null) {
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
        // Make sure we're not at the last index (should be handled by isLast check, but double-check)
        if (taskIndex >= draggableTasks.length - 1) {
          // This shouldn't happen if isLast check is correct, but handle it anyway
          const nextListId = findNeighborListId(listId, allLists, 'next');
          if (nextListId != null) {
            await moveTaskToNextList(taskId, nextListId);
            await tick();
            const movedTaskElement = document.querySelector(`li[data-id="${taskId}"]`);
            if (movedTaskElement instanceof HTMLElement) {
              movedTaskElement.focus();
            }
          }
          return;
        }
        
        const newTasks = [...draggableTasks];
        const [movedTask] = newTasks.splice(taskIndex, 1);
        newTasks.splice(taskIndex + 1, 0, movedTask);
        setDraggableTasks(newTasks);
        // Update database
        await updateTaskOrderCrossList(listId, newTasks);
        // Wait for DOM update and refocus the moved task
        await tick();
        // Try to find the task in the current list's ul first
        let movedTaskElement = ulElement.querySelector(`li[data-id="${taskId}"]`);
        // If not found, search globally (for cross-list moves)
        if (!movedTaskElement) {
          movedTaskElement = document.querySelector(`li[data-id="${taskId}"]`);
        }
        if (movedTaskElement instanceof HTMLElement) {
          movedTaskElement.focus();
        }
      }
    } else if (key === 'ArrowUp') {
      if (isFirst) {
        // At start of list - move to previous list (in visual column order)
        const prevListId = findNeighborListId(listId, allLists, 'prev');
        if (prevListId != null) {
          await moveTaskToPreviousList(taskId, prevListId);
          // Wait for DOM update and refocus the moved task
          await tick();
          const movedTaskElement = document.querySelector(`li[data-id="${taskId}"]`);
          if (movedTaskElement instanceof HTMLElement) {
            movedTaskElement.focus();
          }
        }
      } else {
        // Move up within same list
        const newTasks = [...draggableTasks];
        const [movedTask] = newTasks.splice(taskIndex, 1);
        newTasks.splice(taskIndex - 1, 0, movedTask);
        setDraggableTasks(newTasks);
        // Update database
        await updateTaskOrderCrossList(listId, newTasks);
        // Wait for DOM update and refocus the moved task
        await tick();
        // Try to find the task in the current list's ul first
        let movedTaskElement = ulElement.querySelector(`li[data-id="${taskId}"]`);
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
  }

  // Use capture phase to intercept before svelte-dnd-action
  document.addEventListener('keydown', handleDocumentKeydown, true);
  
  return () => {
    document.removeEventListener('keydown', handleDocumentKeydown, true);
  };
}

