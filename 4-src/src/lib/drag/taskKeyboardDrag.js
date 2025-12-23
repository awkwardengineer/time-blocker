/**
 * Composable for keyboard-based task dragging
 * Handles keyboard navigation for dragging tasks within and between lists
 * 
 * This composable provides helper functions and handlers for task keyboard drag.
 * State management remains in the component.
 */

import { isDragActive, hasActiveDropZone } from './dragDetectionUtils.js';
import { findNeighborListId, moveTaskToNextList, moveTaskToPreviousList } from './taskDragHandlers.js';

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
 * @param {Array} draggableTasks - Current draggable tasks for boundary detection
 * @param {HTMLElement} addTaskContainerElement - Add task container for fallback focus
 * @returns {() => void} Cleanup function to be returned from $effect
 */
export function setupTaskKeyboardDragDocumentHandler(
  state,
  ulElement,
  listId,
  allLists,
  draggableTasks,
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
        // Dispatch Escape event to cancel drag mode in svelte-dnd-action
        // We need to dispatch it on the ulElement (dndzone) so svelte-dnd-action can handle it
        if (ulElement && ulElement instanceof HTMLElement) {
          const escapeEvent = new KeyboardEvent('keydown', {
            key: 'Escape',
            code: 'Escape',
            keyCode: 27,
            which: 27,
            bubbles: true,
            cancelable: true,
            composed: true
          });
          ulElement.dispatchEvent(escapeEvent);
        }
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
}

