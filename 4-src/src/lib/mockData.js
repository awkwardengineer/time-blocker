// Mock data for initial database seeding
// This will be replaced by user actions in later milestones

export const mockLists = [
  { name: 'Work', order: 0 },
  { name: 'Personal', order: 1 },
  { name: 'Shopping', order: 2 }
];

// Note on listId values (1, 2, 3):
// These hardcoded IDs are safe because:
// 1. The seed function checks that the database is empty before seeding
// 2. Dexie's ++id auto-increment starts at 1 for the first record
// 3. Lists are inserted in order, so they get IDs 1, 2, 3 sequentially
// 4. Therefore, we can safely use listId: 1, 2, 3 in mockTasks
// The 'order' field (0, 1, 2) is for display ordering and doesn't need to match IDs
export const mockTasks = [
  // Work tasks (listId: 1 - first list gets ID 1)
  { text: 'Review project proposal', listId: 1, order: 0, status: 'unchecked' },
  { text: 'Team meeting prep', listId: 1, order: 1, status: 'unchecked' },
  { text: 'Update documentation', listId: 1, order: 2, status: 'unchecked' },
  
  // Personal tasks (listId: 2 - second list gets ID 2)
  { text: 'Call dentist', listId: 2, order: 0, status: 'unchecked' },
  { text: 'Exercise', listId: 2, order: 1, status: 'unchecked' },
  
  // Shopping tasks (listId: 3 - third list gets ID 3)
  { text: 'Buy groceries', listId: 3, order: 0, status: 'unchecked' },
  { text: 'Pick up dry cleaning', listId: 3, order: 1, status: 'unchecked' }
];

