<script>
  import { liveQuery } from 'dexie';
  import { getArchivedTasks, restoreTask, getAllListsIncludingArchived } from '../lib/dataAccess.js';
  import { PRINT_CONTAINER_WIDTH } from '../lib/constants.js';
  
  // Create liveQuery for archived tasks
  let archivedTasksQuery = $state(null);
  let listsQuery = $state(null);
  
  $effect(() => {
    archivedTasksQuery = liveQuery(() => getArchivedTasks());
    listsQuery = liveQuery(() => getAllListsIncludingArchived());
  });
  
  // Helper function to get list by listId
  function getList(listId) {
    if (!$listsQuery) return null;
    return $listsQuery.find(l => l.id === listId) || null;
  }
  
  // Helper function to get list name by listId
  function getListName(listId) {
    const list = getList(listId);
    if (!list) return 'Unknown List';
    return list.name ?? 'Unnamed list';
  }
  
  // Helper function to check if a list is archived
  function isListArchived(listId) {
    const list = getList(listId);
    return list ? list.archivedAt != null : false;
  }
  
  // Helper function to get list archive date (calendar day only)
  function getListArchiveDate(listId) {
    const list = getList(listId);
    if (!list || !list.archivedAt) return null;
    const date = new Date(list.archivedAt);
    return date.toDateString(); // Returns format like "Mon Jan 15 2024"
  }
  
  // Helper function to get calendar day from timestamp (date only, no time)
  function getCalendarDay(timestamp) {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    return date.toDateString(); // Returns format like "Mon Jan 15 2024"
  }
  
  // Helper function to format date nicely
  function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }
  
  // Build list of lists to show: archived lists OR lists with archived tasks
  // Group tasks by list, then by archive date
  let listsToShow = $derived.by(() => {
    const tasks = archivedTasksQuery ? $archivedTasksQuery : null;
    const lists = listsQuery ? $listsQuery : null;
    
    if (!lists || !Array.isArray(lists)) {
      return [];
    }
    
    // Group archived tasks by listId
    const tasksByListId = {};
    if (tasks && Array.isArray(tasks)) {
      for (const task of tasks) {
        if (!tasksByListId[task.listId]) {
          tasksByListId[task.listId] = [];
        }
        tasksByListId[task.listId].push(task);
      }
    }
    
    // Build result: include lists that are archived OR have archived tasks
    const result = [];
    for (const list of lists) {
      const isListArchived = list.archivedAt != null;
      const hasArchivedTasks = tasksByListId[list.id] && tasksByListId[list.id].length > 0;
      
      // Include if list is archived OR has archived tasks
      if (isListArchived || hasArchivedTasks) {
        const listTasks = tasksByListId[list.id] || [];
        
        // Group tasks by their archive date (calendar day)
        const byDate = {};
        for (const task of listTasks) {
          const dateKey = getCalendarDay(task.archivedAt) || 'Unknown';
          if (!byDate[dateKey]) {
            byDate[dateKey] = [];
          }
          byDate[dateKey].push(task);
        }
        
        result.push({
          list,
          listArchiveDate: list.archivedAt ? getCalendarDay(list.archivedAt) : null,
          tasksByDate: byDate,
          hasTasks: listTasks.length > 0
        });
      }
    }
    
    // Sort by list order, then by name
    result.sort((a, b) => {
      if (a.list.order !== b.list.order) {
        return a.list.order - b.list.order;
      }
      const nameA = a.list.name ?? 'Unnamed list';
      const nameB = b.list.name ?? 'Unnamed list';
      return nameA.localeCompare(nameB);
    });
    
    return result;
  });
  
  // Helper function to sort date keys (newest first, Unknown last)
  function sortDateKeys(dates) {
    return dates.sort((a, b) => {
      if (a === 'Unknown') return 1;
      if (b === 'Unknown') return -1;
      const dateA = new Date(a).getTime();
      const dateB = new Date(b).getTime();
      return dateB - dateA;
    });
  }
  
  async function handleRestore(taskId) {
    try {
      const result = await restoreTask(taskId);
      // No need to reload - liveQuery will update automatically!
      if (result.listRestored) {
        // List was also restored - user will see it appear in main view
        console.log('Task and its list have been restored');
      }
    } catch (error) {
      console.error('Error restoring task:', error);
    }
  }
</script>

<div class="mt-8 print:hidden" style="width: {PRINT_CONTAINER_WIDTH}px;">
  <h2 class="text-xl font-semibold mb-4">Archived Tasks</h2>
  {#if !archivedTasksQuery || !listsQuery}
    <p>Loading...</p>
  {:else if !$archivedTasksQuery || !$listsQuery}
    <p>Loading data...</p>
  {:else if listsToShow.length === 0}
    <p>No archived lists or tasks</p>
  {:else}
    <div class="grid grid-cols-2 gap-4">
      {#each listsToShow as item}
        {@const list = item.list}
        {@const listName = list.name ?? 'Unnamed list'}
        {@const isArchived = list.archivedAt != null}
        {@const listArchiveDate = item.listArchiveDate}
        
        <!-- Row: List Name (Column 1) -->
        <div class="border-b border-gray-200 pb-4">
          <div class="flex items-center gap-2 flex-wrap">
            <h3 class="text-lg font-semibold">{listName}</h3>
            {#if isArchived}
              <span class="text-xs bg-gray-200 px-2 py-1 rounded">[List Archived]</span>
              {#if listArchiveDate}
                <span class="text-sm text-gray-500">- {formatDate(listArchiveDate)}</span>
              {/if}
            {:else}
              <span class="text-xs bg-green-100 px-2 py-1 rounded">[List Active]</span>
            {/if}
          </div>
        </div>
        
        <!-- Row: Tasks (Column 2) -->
        <div class="border-b border-gray-200 pb-4">
          {#if !item.hasTasks}
            <p class="text-sm text-gray-500 italic">No archived tasks</p>
          {:else}
            {#each sortDateKeys(Object.keys(item.tasksByDate)) as dateKey}
              {@const tasks = item.tasksByDate[dateKey]}
              <div class="mb-4">
                <h4 class="text-sm font-medium text-gray-600 mb-2">
                  {dateKey === 'Unknown' ? 'Unknown Date' : formatDate(dateKey)}
                </h4>
                <ul class="space-y-2">
                  {#each tasks as task}
                    <li class="flex items-center gap-3 flex-wrap">
                      <span class="line-through">{task.text}</span>
                      <button
                        onclick={() => handleRestore(task.id)}
                        class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                      >
                        Restore
                      </button>
                    </li>
                  {/each}
                </ul>
              </div>
            {/each}
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

