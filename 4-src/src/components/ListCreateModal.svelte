<script>
  import { SPACING_4 } from '../lib/constants.js';
  
  let { isOpen, buttonPosition, onSave, onCancel } = $props();
  
  let listName = $state('');
  let inputElement = $state(null);
  let modalElement = $state(null);
  
  // Calculate modal position - center it or position near the button
  let modalStyle = $derived(() => {
    if (!isOpen) {
      return 'background-color: white; z-index: 10000;';
    }
    
    // If we have button position, position modal near it
    if (buttonPosition) {
      const modalPaddingTop = 24; // p-6 = 1.5rem = 24px
      const titleHeight = 24; // Approximate h3 height
      const titleMarginBottom = SPACING_4; // mb-4 = 1rem = 16px
      const inputPaddingTop = 8; // py-2 = 0.5rem = 8px
      const offsetToInputTop = modalPaddingTop + titleHeight + titleMarginBottom + inputPaddingTop;
      
      const top = buttonPosition.top + buttonPosition.height + 10; // Position below button
      const left = buttonPosition.left;
      const width = Math.max(300, buttonPosition.width);
      
      return `background-color: white; z-index: 10000; top: ${top}px; left: ${left}px; width: ${width}px;`;
    }
    
    // Default: center the modal
    return 'background-color: white; z-index: 10000; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 400px;';
  });
  
  // Reset list name when modal opens
  $effect(() => {
    if (isOpen) {
      listName = '';
    }
  });
  
  // Focus input when modal opens
  $effect(() => {
    if (isOpen && inputElement) {
      setTimeout(() => {
        inputElement?.focus();
      }, 0);
    }
  });
  
  function handleSave() {
    // Get the raw input value
    const inputValue = listName ?? '';
    const trimmedValue = inputValue.trim();
    
    // Empty string is allowed (creates unnamed list)
    // Non-empty string creates named list
    const finalName = trimmedValue === '' ? null : trimmedValue;
    
    onSave(finalName);
    listName = '';
  }
  
  function handleCancel() {
    listName = '';
    onCancel();
  }
  
  function handleBackdropClick(e) {
    // Only close if clicking the backdrop itself, not the modal content
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  }
  
  function handleKeydown(e) {
    if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  }
</script>

{#if isOpen}
  <!-- Backdrop overlay - covers entire screen -->
  <div 
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
    tabindex="-1"
    class="modal-backdrop"
    onclick={handleBackdropClick}
    onkeydown={handleKeydown}
  >
    <!-- Modal -->
    <div 
      bind:this={modalElement}
      class="bg-white text-gray-900 p-6 rounded-xl shadow-2xl border-2 border-gray-300 fixed"
      style={modalStyle()}
      onclick={(e) => e.stopPropagation()}
      role="document"
    >
      <h3 id="modal-title" class="text-lg font-semibold mb-4">Create New List</h3>
      
      <div class="mb-4">
        <input
          bind:this={inputElement}
          bind:value={listName}
          type="text"
          class="list-input w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="List name (optional)..."
          onkeydown={handleKeydown}
          aria-label="Enter list name (optional)"
        />
        <p class="mt-2 text-sm text-gray-600">
          Leave empty to create an unnamed list. You can name it later.
        </p>
      </div>
      
      <div class="flex justify-end gap-3">
        <button
          onclick={handleCancel}
          class="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          aria-label="Cancel and close modal"
        >
          Cancel
        </button>
        <button
          onclick={handleSave}
          class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          aria-label="Create list"
        >
          Create
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    background-color: rgba(0, 0, 0, 0.7) !important;
    z-index: 9999 !important;
  }
  
  .list-input {
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
  }
</style>


