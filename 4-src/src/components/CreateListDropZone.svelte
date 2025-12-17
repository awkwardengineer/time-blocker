<script>
  import { dndzone } from 'svelte-dnd-action';
  import { TASK_WIDTH } from '../lib/constants.js';

  export let createListDropZoneElement;
  export let createListDropZoneItems;
  export let onConsider;
  export let onFinalize;
</script>

<div class="relative print:hidden">
  <ul
    bind:this={createListDropZoneElement}
    use:dndzone={{
      items: createListDropZoneItems,
      type: 'task' // Shared type for all lists - enables cross-list dragging
    }}
    onconsider={onConsider}
    onfinalize={onFinalize}
    class="m-0 p-0 list-none min-h-0 pb-2"
  >
    {#each createListDropZoneItems as task (task.id)}
      <li data-id={task.id} class="flex items-center gap-2 p-2 border rounded cursor-move hover:bg-gray-50 w-fit">
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
          disabled
          class="cursor-pointer opacity-50"
          aria-hidden="true"
          tabindex="-1"
        />
        <span 
          class={task.status === 'checked' ? 'line-through break-words' : 'break-words'}
          style="width: {TASK_WIDTH}px;"
        >
          {task.text || '\u00A0'}
        </span>
      </li>
    {/each}
  </ul>
</div>

