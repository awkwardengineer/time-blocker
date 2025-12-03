# 020: Mock Data & Display

## Goal
Prove we can store and retrieve data from IndexedDB using Dexie.js. Create mock dataset with tasks and lists, save to IndexedDB, and display the data. **No formatting concerns** - focus purely on functionality.

## Acceptance Criteria
- [x] Dexie.js installed and database schema defined
- [x] Mock dataset created (tasks and lists)
- [x] Mock data saved to IndexedDB on first load
- [x] Data read from IndexedDB and displayed
- [x] Data persists across page refreshes (no duplicates on refresh) - *Manually tested*
- [x] No formatting/styling focus - just functional display

## Implementation Steps

1. **Install and Configure Dexie.js** ✅
   - Install: `npm install dexie` ✅
   - Create database file (e.g., `src/lib/db.js`) ✅ Created `src/lib/db.js`
   - Define schema (see [[technical-architecture]] for details): ✅
     - `lists` table with `++id, name, order`
     - `tasks` table with `++id, text, listId, order`
   - Export database instance ✅

2. **Create Mock Data** ✅
   - Define array of sample list objects (e.g., 2-3 lists with `name` and `order`) ✅ Created 3 lists: Work, Personal, Shopping
   - Define array of sample task objects (e.g., 5+ tasks with `text`, `listId`, and `order`) ✅ Created 7 tasks
   - Assign tasks to lists via `listId` ✅
   - Store in constant or separate file ✅ Created `src/lib/mockData.js`

3. **Implement Data Seeding** ✅
   - Create function to seed database ✅ Created `src/lib/seed.js` with `seedDatabase()` function
   - Check if data exists (prevent duplicates) ✅ Checks `db.lists.count()` before seeding
   - Only insert if database is empty ✅
   - Call on app initialization ✅ Called in `src/main.js`

4. **Implement Data Retrieval** ✅
   - Fetch all lists: `db.lists.orderBy('order').toArray()` ✅ Implemented in `src/lib/dataAccess.js`
   - Fetch tasks for a list: `db.tasks.where('listId').equals(listId).orderBy('order').toArray()` ✅ Implemented `getTasksForList()`
   - Handle async/await properly ✅ All functions are async/await

5. **Display Data in UI** ✅
   - Fetch lists and tasks on component mount ✅ Using Svelte 5 `$effect` rune
   - Display lists in order (by `order` field) ✅ Lists displayed in order
   - Display tasks grouped under their parent list (by `order` field) ✅ Tasks grouped and ordered
   - Use Svelte reactivity ✅ Using `$state` runes for reactive data
   - **No formatting concerns** - basic HTML/list structure is fine ✅ Basic HTML structure implemented

6. **Test Data Persistence**

   **Manual Testing** (quick verification):
   - Load page, verify data appears in UI
   - Refresh page, verify data persists (not re-seeded)
   - Check IndexedDB in DevTools to verify data structure
   - Verify ordering is preserved (lists and tasks display in correct order)

   **Automated Tests** ✅ (write tests):
   - **Unit tests**: Database operations ✅
     - ~~Test seeding function: only seeds when database is empty~~ (seeding is temporary)
     - Test query functions return correctly ordered data: ✅
       - `getAllLists()` returns lists ordered by `order` field ✅
       - `getTasksForList(listId)` returns tasks for a list, ordered by `order` field ✅
   - **Integration tests**: Component and persistence ✅
     - Component displays lists and tasks after mounting ✅
     - ~~Data persists across page refresh (test IndexedDB state)~~ (complex to test properly, manual testing sufficient for this milestone)
     - ~~Ordering is preserved in queries~~ (covered by unit tests)

   **Temporary/Will Change**:
   - Display format is temporary (will be styled in milestone 060)
   - Mock data seeding is temporary (will be replaced by user actions in milestones 030-040)
   - Simple schema (version 1) will evolve to version 2 in later milestones

## Quick Notes
- Database schema: See [[technical-architecture]] for current schema (version 1)
- Query pattern: `db.tasks.where('listId').equals(listId).toArray()` to get tasks for a list
- Seed data only if database is empty
- Respect `order` fields when displaying (lists and tasks)
- Focus on functionality, not appearance
- Requires: [[010-static-print]]

## Implementation Status

**Completed:**
- ✅ Dexie.js installed (v4.2.1)
- ✅ Database schema defined in `src/lib/db.js`
- ✅ Mock data created in `src/lib/mockData.js` (3 lists, 7 tasks)
- ✅ Seeding function implemented in `src/lib/seed.js`
- ✅ Data access functions in `src/lib/dataAccess.js`
- ✅ UI display implemented in `App.svelte` using Svelte 5 runes

**Files Created:**
- `src/lib/db.js` - Database configuration and schema
- `src/lib/mockData.js` - Mock lists and tasks data
- `src/lib/seed.js` - Database seeding function
- `src/lib/dataAccess.js` - Data retrieval functions

**Files Modified:**
- `src/main.js` - Added seed function call on initialization
- `src/App.svelte` - Added data fetching and display logic
- `src/__tests__/setup.js` - Added fake-indexeddb for IndexedDB testing support

**Test Files Created:**
- `src/__tests__/lib/dataAccess.test.js` - Unit tests for query functions
- `src/__tests__/components/App.test.js` - Integration test for component display (updated existing file)

**Remaining:**
- ⏳ Manual testing (verify data appears, persists on refresh, check IndexedDB) - *Completed during development*

**Automated Tests Completed:**
- ✅ Unit test: Query functions return correctly ordered data (`src/__tests__/lib/dataAccess.test.js`)
- ✅ Integration test: Component displays lists and tasks after mounting (`src/__tests__/components/App.test.js`)
