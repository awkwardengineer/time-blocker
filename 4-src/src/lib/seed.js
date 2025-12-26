import db from './db.js';
import { mockLists, mockTasks } from './mockData.js';

/**
 * Seeds the database with mock data if it's empty
 * Only inserts data if no lists exist (prevents duplicates on refresh)
 */
export async function seedDatabase() {
  try {
    // Check if database already has data
    const existingLists = await db.lists.count();
    
    if (existingLists > 0) {
      // Database already has data, skip seeding
      return;
    }
    
    // Insert lists first (they'll get auto-incremented IDs: 1, 2, 3)
    // Since database is empty (checked above), IDs are guaranteed to be 1, 2, 3
    await db.lists.bulkAdd(mockLists);
    
    // Insert tasks with the correct listId references
    // mockTasks use listId: 1, 2, 3 which matches the IDs assigned above
    await db.tasks.bulkAdd(mockTasks);
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}

