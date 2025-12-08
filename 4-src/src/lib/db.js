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

// Version 3: Add archivedAt timestamp field to tasks
db.version(3).stores({
  lists: '++id, name, order',
  tasks: '++id, text, listId, order, status, archivedAt',
  preferences: 'key',
  calendarSyncState: 'key'
}).upgrade(tx => {
  // Migration: Set archivedAt to current time for existing archived tasks
  return tx.tasks
    .where('status')
    .equals('archived')
    .modify(task => {
      task.archivedAt = Date.now();
    });
});

// Version 4: Add archivedAt timestamp field to lists
db.version(4).stores({
  lists: '++id, name, order, archivedAt',
  tasks: '++id, text, listId, order, status, archivedAt',
  preferences: 'key',
  calendarSyncState: 'key'
}).upgrade(tx => {
  // Migration: Set archivedAt to null for all existing lists (they are active)
  return tx.lists.toCollection().modify(list => {
    if (list.archivedAt === undefined) {
      list.archivedAt = null;
    }
  });
});

export default db;


