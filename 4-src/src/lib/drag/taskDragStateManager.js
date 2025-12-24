/**
 * Event-driven task drag state manager - decoupled from Svelte reactivity
 * 
 * This manages task drag state separately from Svelte's reactive system,
 * preventing conflicts between SortableJS, Svelte, and liveQuery during
 * cross-list task drags.
 * 
 * Architecture:
 * - Independent state per list (not Svelte reactive)
 * - Event-driven updates (not reactive syncing)
 * - Global drag flag to prevent liveQuery conflicts
 */

class TaskDragStateManager {
  constructor() {
    // Independent state per list: Map<listId, {tasks, isDragActive, pendingUpdates, version}>
    this.state = new Map();
    
    // Global flag to track if any task drag is active
    this.globalDragActive = false;
    
    // Event listeners for state changes: Map<listId, Set<callback>>
    this.listeners = new Map();
  }
  
  /**
   * Subscribe to state changes for a specific list
   * Returns unsubscribe function
   * @param {number} listId - List ID to subscribe to
   * @param {Function} callback - Called with state snapshot on each change
   * @returns {Function} Unsubscribe function
   */
  subscribe(listId, callback) {
    if (!this.listeners.has(listId)) {
      this.listeners.set(listId, new Set());
    }
    this.listeners.get(listId).add(callback);
    
    // Immediately call with current state
    const currentState = this.getState(listId);
    callback(currentState);
    
    return () => {
      const callbacks = this.listeners.get(listId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(listId);
        }
      }
    };
  }
  
  /**
   * Get current state snapshot for a list
   * @param {number} listId - List ID
   * @returns {Object} State snapshot
   */
  getState(listId) {
    const listState = this.state.get(listId);
    if (!listState) {
      return {
        tasks: [],
        isDragActive: false,
        version: 0
      };
    }
    
    return {
      tasks: [...listState.tasks],
      isDragActive: listState.isDragActive || false,
      version: listState.version || 0
    };
  }
  
  /**
   * Initialize from liveQuery (one-time sync, not reactive)
   * Only syncs when not actively dragging
   * @param {number} listId - List ID
   * @param {Array} tasks - Tasks from liveQuery
   */
  initializeFromQuery(listId, tasks) {
    if (this.globalDragActive) {
      // Don't overwrite during drag - liveQuery will sync after drag completes
      return;
    }
    
    if (!Array.isArray(tasks)) {
      return;
    }
    
    // Filter out archived tasks (only include unchecked/checked)
    const activeTasks = tasks.filter(task => 
      task.status === 'unchecked' || task.status === 'checked'
    );
    
    // Get or create list state
    if (!this.state.has(listId)) {
      this.state.set(listId, {
        tasks: [],
        isDragActive: false,
        pendingUpdates: null,
        version: 0
      });
    }
    
    const listState = this.state.get(listId);
    
    // Only update if not actively dragging for this list
    if (!listState.isDragActive) {
      listState.tasks = activeTasks.map(task => ({ ...task }));
      listState.version++;
      this.notify(listId);
    }
  }
  
  /**
   * Start drag operation - prevents liveQuery from overwriting
   * @param {number} sourceListId - Source list ID
   * @param {number} targetListId - Target list ID (may be same as source)
   */
  startDrag(sourceListId, targetListId) {
    // Set global flag
    this.globalDragActive = true;
    
    // Mark both source and target lists as dragging
    [sourceListId, targetListId].forEach(listId => {
      if (!this.state.has(listId)) {
        this.state.set(listId, {
          tasks: [],
          isDragActive: false,
          pendingUpdates: null,
          version: 0
        });
      }
      
      const listState = this.state.get(listId);
      listState.isDragActive = true;
      listState.pendingUpdates = null;
      listState.version++;
      this.notify(listId);
    });
  }
  
  /**
   * Update state during drag (optimistic update)
   * @param {number} listId - Target list ID
   * @param {Array} tasks - Tasks in new order for the list
   */
  updateDragState(listId, tasks) {
    if (!this.globalDragActive) {
      console.warn('[TASK DRAG STATE] updateDragState called but drag is not active');
      return;
    }
    
    if (!Array.isArray(tasks)) {
      console.warn('[TASK DRAG STATE] updateDragState called with invalid tasks');
      return;
    }
    
    // Get or create list state
    if (!this.state.has(listId)) {
      this.state.set(listId, {
        tasks: [],
        isDragActive: false,
        pendingUpdates: null,
        version: 0
      });
    }
    
    const listState = this.state.get(listId);
    
    // Store pending update
    listState.pendingUpdates = {
      tasks: tasks.map(task => ({ ...task })),
      timestamp: Date.now()
    };
    
    // Apply update to state
    if (listState.pendingUpdates) {
      listState.tasks = [...listState.pendingUpdates.tasks];
      listState.pendingUpdates = null;
    }
    
    listState.version++;
    this.notify(listId);
  }
  
  /**
   * Complete drag operation - allows liveQuery to sync again
   * @param {number} sourceListId - Source list ID
   * @param {number} targetListId - Target list ID
   * @param {boolean} success - Whether the drag operation succeeded
   */
  completeDrag(sourceListId, targetListId, success = true) {
    // Clear global flag
    this.globalDragActive = false;
    
    // Clear drag flags for both lists
    [sourceListId, targetListId].forEach(listId => {
      const listState = this.state.get(listId);
      if (listState) {
        if (success) {
          // Clear pending updates - they're now persisted to database
          listState.pendingUpdates = null;
        } else {
          // Rollback: clear pending updates
          listState.pendingUpdates = null;
        }
        
        listState.isDragActive = false;
        listState.version++;
        this.notify(listId);
      }
    });
  }
  
  /**
   * Notify all listeners of state change for a list
   * @param {number} listId - List ID
   */
  notify(listId) {
    const snapshot = this.getState(listId);
    const callbacks = this.listeners.get(listId);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(snapshot);
        } catch (error) {
          console.error('[TASK DRAG STATE] Error in state change listener:', error);
        }
      });
    }
  }
  
  /**
   * Check if any task drag is currently active
   * @returns {boolean}
   */
  isDragActive() {
    return this.globalDragActive;
  }
  
  /**
   * Check if drag is active for a specific list
   * @param {number} listId - List ID
   * @returns {boolean}
   */
  isDragActiveForList(listId) {
    const listState = this.state.get(listId);
    return listState ? listState.isDragActive : false;
  }
}

// Singleton instance
export const taskDragStateManager = new TaskDragStateManager();

