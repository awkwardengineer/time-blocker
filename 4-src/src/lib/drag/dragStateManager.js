/**
 * Event-driven drag state manager - decoupled from Svelte reactivity
 * 
 * This manages drag state separately from Svelte's reactive system,
 * preventing conflicts between SortableJS, Svelte, and liveQuery.
 * 
 * Architecture:
 * - Independent state (not Svelte reactive)
 * - Event-driven updates (not reactive syncing)
 * - Clear boundaries between drag operations and liveQuery updates
 */

class DragStateManager {
  constructor() {
    // Independent state (not Svelte reactive)
    this.state = {
      lists: [],
      isDragActive: false,
      pendingUpdates: new Map(), // Map<columnIndex, {items, timestamp}>
      version: 0 // Increment on each update to track state changes
    };
    
    // Event listeners for state changes
    this.listeners = new Set();
  }
  
  /**
   * Subscribe to state changes
   * Returns unsubscribe function
   * @param {Function} callback - Called with state snapshot on each change
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this.listeners.add(callback);
    // Immediately call with current state
    callback(this.getState());
    return () => this.listeners.delete(callback);
  }
  
  /**
   * Get current state snapshot
   * @returns {Object} State snapshot
   */
  getState() {
    return {
      lists: [...this.state.lists],
      isDragActive: this.state.isDragActive,
      version: this.state.version
    };
  }
  
  /**
   * Initialize from liveQuery (one-time sync, not reactive)
   * Only syncs when not actively dragging
   * @param {Array} lists - Lists from liveQuery
   */
  initializeFromQuery(lists) {
    if (this.state.isDragActive) {
      // Don't overwrite during drag - liveQuery will sync after drag completes
      return;
    }
    
    if (!Array.isArray(lists)) {
      return;
    }
    
    // Transform lists to drag-friendly format
    this.state.lists = lists.map(list => ({
      id: list.id,
      name: list.name,
      order: list.order,
      columnIndex: list.columnIndex ?? 0
    }));
    
    this.state.version++;
    this.notify();
  }
  
  /**
   * Start drag operation - prevents liveQuery from overwriting
   */
  startDrag() {
    if (this.state.isDragActive) {
      // Already dragging, ignore
      return;
    }
    
    this.state.isDragActive = true;
    this.state.pendingUpdates.clear(); // Clear any stale pending updates
    this.state.version++;
    this.notify();
  }
  
  /**
   * Update state during drag (optimistic update)
   * @param {number} columnIndex - Target column index
   * @param {Array} items - Items in new order for the column
   */
  updateDragState(columnIndex, items) {
    if (!this.state.isDragActive) {
      console.warn('[DRAG STATE] updateDragState called but drag is not active');
      return;
    }
    
    if (!Array.isArray(items)) {
      console.warn('[DRAG STATE] updateDragState called with invalid items');
      return;
    }
    
    // Store pending update
    this.state.pendingUpdates.set(columnIndex, {
      items: items.map(item => ({ ...item })), // Deep copy
      timestamp: Date.now()
    });
    
    // Apply update to state
    this.applyPendingUpdates();
    this.state.version++;
    this.notify();
  }
  
  /**
   * Apply all pending updates to state
   * Removes items from all columns that are in pending updates,
   * then adds items from pending updates to their target columns
   */
  applyPendingUpdates() {
    // Collect all item IDs that are being moved
    const pendingItemIds = new Set();
    this.state.pendingUpdates.forEach(({ items }) => {
      items.forEach(item => pendingItemIds.add(item.id));
    });
    
    // Filter out items that are being moved (they'll be re-added in new positions)
    // Also filter out items in columns that have pending updates (columns being replaced)
    const columnsWithPendingUpdates = new Set(this.state.pendingUpdates.keys());
    
    let filtered = this.state.lists.filter(list => {
      const listColumnIndex = list.columnIndex ?? 0;
      // Keep item if: (1) not being moved, AND (2) not in a column with pending update
      return !pendingItemIds.has(list.id) && !columnsWithPendingUpdates.has(listColumnIndex);
    });
    
    // Add items from pending updates to their target columns
    this.state.pendingUpdates.forEach(({ items }, columnIndex) => {
      const newItems = items.map((item, index) => {
        // Find existing item to preserve properties
        const existing = this.state.lists.find(l => l.id === item.id);
        return {
          ...(existing || item),
          columnIndex,
          order: index
        };
      });
      filtered = [...filtered, ...newItems];
    });
    
    this.state.lists = filtered;
  }
  
  /**
   * Complete drag operation - allows liveQuery to sync again
   * @param {boolean} success - Whether the drag operation succeeded
   */
  completeDrag(success = true) {
    if (!this.state.isDragActive) {
      // Not dragging, ignore
      return;
    }
    
    if (success) {
      // Clear pending updates - they're now persisted to database
      // liveQuery will sync back the persisted state
      this.state.pendingUpdates.clear();
    } else {
      // Rollback: clear pending updates without applying
      // State will be restored by next liveQuery sync
      this.state.pendingUpdates.clear();
    }
    
    this.state.isDragActive = false;
    this.state.version++;
    this.notify();
  }
  
  /**
   * Notify all listeners of state change
   */
  notify() {
    const snapshot = this.getState();
    this.listeners.forEach(callback => {
      try {
        callback(snapshot);
      } catch (error) {
        console.error('[DRAG STATE] Error in state change listener:', error);
      }
    });
  }
  
  /**
   * Get lists for a specific column
   * @param {number} columnIndex - Column index
   * @returns {Array} Lists in that column
   */
  getListsForColumn(columnIndex) {
    return this.state.lists.filter(list => (list.columnIndex ?? 0) === columnIndex);
  }
  
  /**
   * Check if drag is currently active
   * @returns {boolean}
   */
  isDragActive() {
    return this.state.isDragActive;
  }
}

// Singleton instance
export const dragStateManager = new DragStateManager();

