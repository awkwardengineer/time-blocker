import Dexie from 'dexie';

const db = new Dexie('TaskPlannerDB');

// Version 1: Initial schema
db.version(1).stores({
  lists: '++id, name, order',
  tasks: '++id, text, listId, order',
  preferences: 'key',
  calendarSyncState: 'key'
});

// Version 2: Add status field to tasks
db.version(2).stores({
  lists: '++id, name, order',
  tasks: '++id, text, listId, order, status',
  preferences: 'key',
  calendarSyncState: 'key'
}).upgrade(tx => {
  // Migration: Set all existing tasks to 'unchecked' status
  return tx.tasks.toCollection().modify(task => {
    task.status = 'unchecked';
  });
});

export default db;


