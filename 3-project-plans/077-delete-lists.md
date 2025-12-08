# 077: Delete Lists & Tasks

## Goal
Enable users to delete lists and tasks using soft delete (setting `deletedAt` timestamp). Handle orphaned tasks when lists are deleted. **No formatting focus** - focus purely on functionality.

## User Stories

| As a user... | I need... | So that... |
|--------------|-----------|------------|
| **List Deletor** | A way to delete archived lists | I can permanently remove lists I don't need |
| **Task Deletor** | A way to delete tasks | I can permanently remove tasks I don't need |
| **Task Manager** | Graceful handling of orphaned tasks | Tasks don't get lost when their list is deleted |

## Delete Approach (Soft Delete with Day-Based Grouping)

> **Deleting a list:**
> - Set `deletedAt` timestamp on the list
> - Show confirmation modal with warning:
>   - "This will delete X tasks from [date] (when list was archived)"
>   - "Y associated tasks (from other dates) may be orphaned"
> - User chooses:
>   - **Option 1: Delete only tasks from that day** - Delete list + tasks archived on same calendar day as list's `archivedAt`
>     - Pre-archived tasks (different day) become orphaned → move to "Orphaned" list
>   - **Option 2: Delete all tasks** - Delete list + all tasks with that `listId`
>     - No orphaned tasks
>
> **Orphaned tasks:**
> - Tasks that lose their list (list deleted but task not deleted) have their `listId` updated to point to the "Orphaned" list
> - "Orphaned" list is created automatically if it doesn't exist (or use a special system list ID)
> - Orphaned tasks are visible in main view under the "Orphaned" list
> - Orphaned tasks can be moved to other lists or deleted individually
>
> **Deleting a task:**
> - Set `deletedAt` timestamp on the task
> - Task is hidden from UI (not visible in main view or archived view)
> - Data remains in database but is filtered out from queries
>
> **Filtering:**
> - All queries filter out items where `deletedAt` is not null
> - Archived view only shows tasks where `status = 'archived'` AND `deletedAt` is null
> - Main view only shows lists where `deletedAt` is null
> - Orphaned list is a normal list (not deleted) and is visible in main view
> - Tasks in Orphaned list have `listId` pointing to Orphaned list (not the deleted list)

## Build Sequence

1. Delete Lists (Soft Delete with Day-Based Grouping)
2. Delete Tasks
3. Filtering Deleted Items
4. Verify All Tests Pass

## Implementation Steps

1. **Delete Lists (Soft Delete with Day-Based Grouping)**
   - **Description:** Delete a list by setting `deletedAt` timestamp. Show confirmation modal with warning about tasks that will be deleted or orphaned. User chooses to delete only tasks from that day (orphaning pre-archived tasks) or delete all tasks.
   - **Acceptance Criteria:**
     - Users can delete lists
     - Confirmation modal shows warning: "This will delete X tasks from [date]" and "Y associated tasks may be orphaned"
     - User can choose: delete only tasks from that day, or delete all tasks
     - Deleted lists are hidden from UI
     - Deleted tasks are hidden from UI
     - Orphaned tasks are moved to "Orphaned" list
     - Deletion persists in IndexedDB
   - **Technical Work:**
     - Add `deletedAt` field to lists table (database migration)
     - Add `deletedAt` field to tasks table (database migration)
     - Add delete button/action for lists
     - Implement function to count tasks by day for warning message
     - Create confirmation modal with warning and options
     - Implement delete function: set `deletedAt` on list and selected tasks
     - Implement orphan handling: update `listId` of orphaned tasks to "Orphaned" list
     - Create/get "Orphaned" list automatically
     - Filter out deleted items from all queries
     - Update UI reactively after deletion
     - Write tests: unit tests for delete functions and orphan handling, integration tests for confirmation modal and day-based options

2. **Delete Tasks**
   - **Description:** Delete a task by setting `deletedAt` timestamp. Task is hidden from UI but data remains in database.
   - **Acceptance Criteria:**
     - Users can delete tasks
     - Deleted tasks are hidden from UI (main view and archived view)
     - Data remains in database
     - Deletion persists in IndexedDB
   - **Technical Work:**
     - Add delete button/action for tasks
     - Implement function to set `deletedAt` timestamp on task
     - Filter out deleted tasks from all queries
     - Update UI reactively after deletion
     - Write tests: unit tests for delete task function, integration tests for UI interaction

3. **Filtering Deleted Items**
   - **Description:** All queries filter out items where `deletedAt` is not null. Archived view only shows tasks where `status = 'archived'` AND `deletedAt` is null. Main view only shows lists where `deletedAt` is null.
   - **Acceptance Criteria:**
     - Deleted lists are not visible in main view
     - Deleted tasks are not visible in main view or archived view
     - Orphaned list is visible in main view (not deleted)
     - All queries properly filter deleted items
   - **Technical Work:**
     - Update all data access functions to filter by `deletedAt` is null
     - Update archived view query to include `deletedAt` is null filter
     - Update main view query to include `deletedAt` is null filter
     - Ensure Orphaned list is not filtered out
     - Write tests: unit tests for filtering logic, integration tests to verify deleted items are hidden

4. **Verify All Tests Pass**
   - **Description:** Ensure all tests written during implementation pass and provide comprehensive coverage
   - **Acceptance Criteria:**
     - All unit tests pass
     - All integration tests pass
     - Test coverage is comprehensive for all features
     - Edge cases are covered
   - **Technical Work:**
     - Run test suite and verify all tests pass
     - Review test coverage and add any missing test cases
     - Fix any failing tests
     - Verify edge cases are properly tested

## Quick Notes

