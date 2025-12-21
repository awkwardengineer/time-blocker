<script>
  import Button from './Button.svelte';
  
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
    <div class="bg-grey-10 text-grey-110 p-6 rounded-xl shadow-2xl border-2 border-grey-50 max-w-md w-full mx-4">
      <h3 id="modal-title" class="text-lg font-semibold mb-4">{title}</h3>
      <p class="mb-6 text-sm text-grey-100">{message}</p>
      <div class="flex justify-end gap-3">
        <Button variant="secondary" onclick={handleCancel}>
          Cancel
        </Button>
        <Button variant="primary" onclick={handleConfirm}>
          {confirmButtonText}
        </Button>
      </div>
    </div>
  </div>
{/if}

