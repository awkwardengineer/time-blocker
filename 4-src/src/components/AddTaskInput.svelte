<script>
  import { MAX_TEXTAREA_HEIGHT, TASK_WIDTH } from '../lib/constants.js';
  
  let {
    isInputActive = $bindable(false),
    inputValue = '',
    onInputChange,
    onSave,
    onEscape,
    onActivate,
    buttonText = 'Add Task',
    placeholder = 'Add new task...',
    ariaLabel,
    marginLeft = false
  } = $props();
  
  let inputElement = $state(null);
  
  // Focus textarea when it becomes active and auto-resize
  $effect(() => {
    if (isInputActive && inputElement) {
      // Small delay to ensure textarea is rendered
      setTimeout(() => {
        inputElement?.focus();
        // Auto-resize textarea to fit content
        if (inputElement instanceof HTMLTextAreaElement) {
          inputElement.style.height = 'auto';
          inputElement.style.height = `${Math.min(inputElement.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`; // max-h-[10rem] = 160px
        }
      }, 0);
    }
  });
  
  // Auto-resize textarea as content changes
  $effect(() => {
    if (inputElement && inputElement instanceof HTMLTextAreaElement) {
      const resizeTextarea = () => {
        inputElement.style.height = 'auto';
        inputElement.style.height = `${Math.min(inputElement.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
      };
      
      inputElement.addEventListener('input', resizeTextarea);
      return () => {
        inputElement.removeEventListener('input', resizeTextarea);
      };
    }
  });
  
  function handleKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSave?.();
    } else if (e.key === 'Escape') {
      onEscape?.(e);
    }
  }
  
  function handleButtonKeydown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onActivate?.();
    }
  }
</script>

<div 
  class="flex items-center gap-2 p-2 border rounded hover:bg-gray-50 w-fit print:hidden add-task-container add-task-button mt-2"
  style={marginLeft ? "margin-left: 1.5rem;" : ""}
>
  {#if isInputActive}
    <span class="drag-handle text-gray-400 select-none" aria-hidden="true" style="visibility: hidden;">
      ⋮⋮
    </span>
    <input
      type="checkbox"
      disabled
      class="cursor-pointer opacity-0"
      aria-hidden="true"
      tabindex="-1"
    />
    <div class="flex gap-2">
      <textarea
        bind:this={inputElement}
        {placeholder}
        value={inputValue}
        oninput={(e) => onInputChange?.(e.currentTarget.value)}
        onkeydown={handleKeydown}
        class="flex-none break-words resize-none min-h-[2.5rem] max-h-[10rem] overflow-y-auto"
        style="width: {TASK_WIDTH}px;"
        rows="1"
      ></textarea>
      <button
        onclick={onSave}
        aria-label="Save new task"
      >
        Save
      </button>
    </div>
  {:else}
    <span class="drag-handle text-gray-400 select-none" aria-hidden="true" style="visibility: hidden;">
      ⋮⋮
    </span>
    <input
      type="checkbox"
      disabled
      class="cursor-pointer opacity-0"
      aria-hidden="true"
      tabindex="-1"
    />
    <span 
      class="cursor-pointer hover:underline break-words"
      style="width: {TASK_WIDTH}px;"
      onclick={onActivate}
      onkeydown={handleButtonKeydown}
      role="button"
      tabindex="0"
      aria-label={ariaLabel || buttonText}
    >
      {buttonText}
    </span>
  {/if}
</div>
