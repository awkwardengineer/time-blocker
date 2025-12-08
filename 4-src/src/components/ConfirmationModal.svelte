<script>
  let { isOpen, title, message, onConfirm, onCancel, confirmButtonText = 'Delete' } = $props();
  
  function handleConfirm() {
    onConfirm();
  }
  
  function handleCancel() {
    onCancel();
  }
  
  function handleBackdropClick(e) {
    // Only close if clicking the backdrop itself, not the modal content
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  }
  
  function handleBackdropKeydown(e) {
    // Close modal on Escape key
    if (e.key === 'Escape') {
      handleCancel();
    }
  }
</script>

{#if isOpen}
  <div 
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
    tabindex="-1"
    class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
    onclick={handleBackdropClick}
    onkeydown={handleBackdropKeydown}
  >
    <div class="bg-white text-gray-900 p-6 rounded-xl shadow-2xl border border-gray-200 max-w-md w-full mx-4">
      <h3 id="modal-title" class="text-lg font-semibold mb-4">{title}</h3>
      <p class="mb-6 text-sm text-gray-600">{message}</p>
      <div class="flex justify-end gap-3">
        <button
          onclick={handleCancel}
          class="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onclick={handleConfirm}
          class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          {confirmButtonText}
        </button>
      </div>
    </div>
  </div>
{/if}

