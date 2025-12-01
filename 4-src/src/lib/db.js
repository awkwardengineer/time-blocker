import Dexie from 'dexie';

const db = new Dexie('TaskPlannerDB');
db.version(1).stores({
  lists: '++id, name, order',
  tasks: '++id, text, listId, order',
  preferences: 'key',
  calendarSyncState: 'key'
});

export default db;


