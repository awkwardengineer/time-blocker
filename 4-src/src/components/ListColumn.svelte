<script>
  import { dndzone } from 'svelte-dnd-action';
  import TaskList from './TaskList.svelte';
  import { isPlaceholderItem } from '../lib/listDndUtils.js';
  import { DOM_UPDATE_DELAY_SHORT_MS } from '../lib/constants.js';

  let {
    columnIndex,
    columnLists,
    stableLists,
    newTaskInputs,
    createListColumnIndex,
    createListInput = $bindable(''),
    createListInputElement = $bindable(null),
    keyboardListDrag,
    allLists,
    onInputChange,
    onListKeyboardKeydown,
    onListConsider,
    onListFinalize,
    onCreateListClick,
    onCreateListKeydown,
    onCreateListInputEscape,
    onCreateList,
    onCreateListOnTab
  } = $props();

  let dndzoneElement = $state(null);
  let emptyDropZoneElement = $state(null);
  let createListButtonElement = $state(null);

  // Force empty drop zone to have tabindex="-1" after dndzone initializes
  // The dndzone library sets tabindex="0" on empty drop zones, so we override it
  $effect(() => {
    if (typeof document === 'undefined') return;
    if (columnLists.length !== 0) return;
    if (!emptyDropZoneElement) return;
    
    // Use a small delay to ensure dndzone has finished initializing
    const timeoutId = setTimeout(() => {
      if (emptyDropZoneElement && emptyDropZoneElement.getAttribute('tabindex') !== '-1') {
        emptyDropZoneElement.setAttribute('tabindex', '-1');
      }
    }, DOM_UPDATE_DELAY_SHORT_MS);
    
    return () => {
      clearTimeout(timeoutId);
    };
  });
</script>

<div class="flex flex-col min-w-0 border-r border-gray-300 last:border-r-0 pt-0" data-column-index={columnIndex}>
  <div
    bind:this={dndzoneElement}
    use:dndzone={{
      items: columnLists,
      type: 'list', // Shared type enables cross-column dragging
      zoneTabIndex: -1 // Prevent entire column container from being focusable
    }}
    onconsider={onListConsider}
    onfinalize={onListFinalize}
    class="flex flex-col pt-0"
  >
    <!-- Render lists in this column -->
    {#each columnLists as dragItem, index (dragItem.id)}
      {@const isPlaceholder = isPlaceholderItem(dragItem)}
      {@const realList = stableLists.find(list => list.id === dragItem.id)}
      {@const fallbackList = !realList && !isPlaceholder ? dragItem : null}
      {@const listToRender = realList || fallbackList}
      {#if listToRender}
        <div
          data-id={dragItem.id}
          class="flex flex-col mb-6"
          tabindex="0"
          role="group"
          aria-label={`List: ${listToRender.name ?? 'Unnamed list'}`}
          aria-roledescription="Draggable list"
          aria-pressed={keyboardListDrag?.active && keyboardListDrag?.listId === listToRender.id ? 'true' : 'false'}
          onkeydowncapture={(e) => onListKeyboardKeydown(e, listToRender.id)}
        >
          <TaskList
            listId={listToRender.id}
            listName={listToRender.name ?? 'Unnamed list'}
            newTaskInput={newTaskInputs[listToRender.id] || ''}
            onInputChange={(value) => onInputChange(listToRender.id, value)}
            {allLists}
            {stableLists}
          />
        </div>
      {:else}
        <div data-id={dragItem.id} class="flex flex-col mb-6">
          <!-- Placeholder item for drag feedback - not focusable for keyboard drag -->
        </div>
      {/if}
    {/each}
    
    <!-- Empty drop zone for empty columns -->
    {#if columnLists.length === 0}
      <div 
        bind:this={emptyDropZoneElement}
        class="empty-drop-zone min-h-[48px]"
        tabindex="-1"
      ></div>
    {/if}
  </div>
  
  <!-- Create List button/input - per column, appears in all columns (outside dndzone) -->
  {#if createListColumnIndex === columnIndex}
    <h2 class="print:hidden m-0 p-0 create-list-wrapper {columnLists.length === 0 ? 'create-list-empty-column' : ''}">
      <div class="flex items-center gap-2">
        <input
          bind:this={createListInputElement}
          bind:value={createListInput}
          type="text"
          class="create-list-input cursor-pointer hover:underline"
          placeholder="List name..."
          onkeydown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onCreateList(columnIndex);
            } else if (e.key === 'Escape') {
              onCreateListInputEscape(e);
            } else if (e.key === 'Tab') {
              // When tabbing away, close empty input or create + close when it has content.
              // Let the browser move focus naturally; creation/close happens in the background.
              onCreateListOnTab(columnIndex);
            }
          }}
          aria-label="Enter list name"
        />
        <button
          onclick={() => onCreateList(columnIndex)}
          class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          aria-label="Create list"
        >
          Save
        </button>
      </div>
    </h2>
  {:else}
    <h2 
      bind:this={createListButtonElement}
      onclick={() => onCreateListClick(columnIndex)}
      onkeydown={(e) => onCreateListKeydown(e, columnIndex)}
      role="button"
      tabindex="0"
      class="cursor-pointer hover:underline print:hidden m-0 p-0 create-list-wrapper {columnLists.length === 0 ? 'create-list-empty-column' : ''}"
      aria-label="Create new list"
    >
      Create new list
    </h2>
  {/if}
</div>

<style>
  /* Style the create list input to match h2 exactly */
  .create-list-input {
    font-size: inherit;
    font-weight: inherit;
    line-height: inherit;
    font-family: inherit;
    margin: 0;
    padding: 0;
    border: 0;
    border-bottom: 2px solid rgb(209, 213, 219); /* border-gray-300 */
    background: transparent;
    outline: none;
  }
  
  .create-list-input:focus {
    border-bottom-color: rgb(59, 130, 246); /* border-blue-500 */
  }
  
  .create-list-input::placeholder {
    opacity: 0.5;
  }
  
  /* Explicitly reset h2 margins for "Create new list" in columns */
  [data-column-index] h2 {
    margin: 0;
  }
  
  /* Position "Create new list" to cover empty drop zone space (only for empty columns) */
  [data-column-index] .create-list-empty-column {
    margin-top: -48px; /* Shift up to cover min-h-[48px] from empty drop zone */
  }
  
  /* Ensure list wrapper margins are applied even with dndzone inline styles */
  [data-column-index] [data-id] {
    margin-bottom: 1.5rem !important;
  }
</style>

