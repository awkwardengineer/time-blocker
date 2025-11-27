# Milestone 020: Mock Data & Display

## Goal
Prove we can store and retrieve data from IndexedDB - establish data persistence layer.

## Acceptance Criteria
- [ ] Dexie.js installed and database schema defined
- [ ] Mock dataset (5+ tasks) saved to IndexedDB on first load
- [ ] Tasks read from IndexedDB and displayed as a list
- [ ] Data persists across page refreshes (no duplicates on refresh)

## Implementation Steps
1. **Install and Configure Dexie.js**
   - Install: `npm install dexie`
   - Create database file (e.g., `src/lib/db.js`)
   - Define schema: `tasks` table with `++id, text`
   - Export database instance

2. **Create Mock Data**
   - Define array of 5+ sample task objects with `text` property
   - Store in constant or separate file

3. **Implement Data Seeding**
   - Create function to seed database
   - Check if tasks exist (prevent duplicates)
   - Only insert if database is empty
   - Call on app initialization

4. **Implement Data Retrieval**
   - Create function to fetch all tasks: `db.tasks.toArray()`
   - Handle async/await properly

5. **Display Data in UI**
   - Create list component that accepts tasks array
   - Fetch tasks on component mount
   - Display tasks in list format
   - Use Svelte reactivity

6. **Test Data Persistence**
   - Load page, verify data appears
   - Refresh page, verify data persists (not re-seeded)
   - Check IndexedDB in DevTools

## Quick Notes
- Database table: `tasks` with `++id, text` (other fields later)
- Seed data only if database is empty
- Requires: [[milestone-010-static-print]]

