import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbDir = path.join(process.cwd(), 'data');
const dbPath = path.join(dbDir, 'recipes.db');

// Ensure data directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS households (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    inviteCode TEXT UNIQUE NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS user_households (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    householdId INTEGER NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    isActive INTEGER NOT NULL DEFAULT 0,
    joinedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (householdId) REFERENCES households(id) ON DELETE CASCADE,
    UNIQUE(userId, householdId)
  );

  CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    jsonldSource TEXT NOT NULL,
    userOverrides TEXT,
    dateAdded TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS grocery_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    quantities TEXT NOT NULL,
    original TEXT NOT NULL,
    normalized INTEGER NOT NULL DEFAULT 0,
    totalQuantity TEXT,
    checked INTEGER NOT NULL DEFAULT 0,
    sortOrder INTEGER NOT NULL DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS recipe_day_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipeId INTEGER NOT NULL,
    dayOfWeek INTEGER NOT NULL,
    mealType TEXT NOT NULL DEFAULT 'lunch',
    plannedServings INTEGER NOT NULL DEFAULT 2,
    eatingOut INTEGER NOT NULL DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipeId) REFERENCES recipes(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    familySize INTEGER NOT NULL DEFAULT 2,
    enableBreakfast INTEGER NOT NULL DEFAULT 0,
    enableLunch INTEGER NOT NULL DEFAULT 1,
    enableDinner INTEGER NOT NULL DEFAULT 1,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS saved_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS saved_plan_recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    planId INTEGER NOT NULL,
    originalRecipeId INTEGER NOT NULL,
    recipeJsonld TEXT NOT NULL,
    recipeOverrides TEXT,
    FOREIGN KEY (planId) REFERENCES saved_plans(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS saved_plan_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    planId INTEGER NOT NULL,
    recipeId INTEGER NOT NULL,
    dayOfWeek INTEGER NOT NULL,
    mealType TEXT NOT NULL,
    plannedServings INTEGER NOT NULL DEFAULT 2,
    FOREIGN KEY (planId) REFERENCES saved_plans(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS saved_plan_eating_out (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    planId INTEGER NOT NULL,
    dayOfWeek INTEGER NOT NULL,
    mealType TEXT NOT NULL,
    FOREIGN KEY (planId) REFERENCES saved_plans(id) ON DELETE CASCADE,
    UNIQUE(planId, dayOfWeek, mealType)
  );

  CREATE TABLE IF NOT EXISTS eating_out_meals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dayOfWeek INTEGER NOT NULL,
    mealType TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(dayOfWeek, mealType, householdId)
  );

  CREATE TABLE IF NOT EXISTS household_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    householdId INTEGER NOT NULL,
    userId INTEGER NOT NULL,
    taskType TEXT NOT NULL,
    completedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (householdId) REFERENCES households(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_assignments_recipeId ON recipe_day_assignments(recipeId);
  CREATE INDEX IF NOT EXISTS idx_assignments_dayOfWeek ON recipe_day_assignments(dayOfWeek);
  CREATE INDEX IF NOT EXISTS idx_saved_plan_assignments_planId ON saved_plan_assignments(planId);
  CREATE INDEX IF NOT EXISTS idx_saved_plan_recipes_planId ON saved_plan_recipes(planId);
  CREATE INDEX IF NOT EXISTS idx_user_households_userId ON user_households(userId);
  CREATE INDEX IF NOT EXISTS idx_user_households_householdId ON user_households(householdId);
`);

// Run migrations to add householdId columns
try {
  // Add householdId to recipes
  try {
    db.exec(`ALTER TABLE recipes ADD COLUMN householdId INTEGER REFERENCES households(id);`);
    console.log('✅ Added householdId to recipes table');
  } catch (e) {
    // Column already exists
  }

  // Add householdId to grocery_items
  try {
    db.exec(`ALTER TABLE grocery_items ADD COLUMN householdId INTEGER REFERENCES households(id);`);
    console.log('✅ Added householdId to grocery_items table');
  } catch (e) {
    // Column already exists
  }

  // Add householdId to recipe_day_assignments
  try {
    db.exec(`ALTER TABLE recipe_day_assignments ADD COLUMN householdId INTEGER REFERENCES households(id);`);
    console.log('✅ Added householdId to recipe_day_assignments table');
  } catch (e) {
    // Column already exists
  }

  // Add householdId to settings
  try {
    db.exec(`ALTER TABLE settings ADD COLUMN householdId INTEGER REFERENCES households(id);`);
    console.log('✅ Added householdId to settings table');
  } catch (e) {
    // Column already exists
  }

  // Recreate settings table to support multiple households
  try {
    // Check if settings table needs migration (has the old single-row structure)
    const tableInfo = db.prepare("PRAGMA table_info(settings)").all() as any[];
    const hasOldStructure = tableInfo.some((col: any) => col.name === 'id' && col.pk === 1);
    
    if (hasOldStructure) {
      // Backup existing data
      const oldSettings = db.prepare('SELECT * FROM settings WHERE id = 1').get() as any;
      
      // Drop old table
      db.exec('DROP TABLE IF EXISTS settings');
      
      // Recreate with householdId as key
      db.exec(`
        CREATE TABLE settings (
          householdId INTEGER PRIMARY KEY,
          familySize INTEGER NOT NULL DEFAULT 2,
          enableBreakfast INTEGER NOT NULL DEFAULT 0,
          enableLunch INTEGER NOT NULL DEFAULT 1,
          enableDinner INTEGER NOT NULL DEFAULT 1,
          currentPlanName TEXT DEFAULT 'Piano Settimanale',
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (householdId) REFERENCES households(id) ON DELETE CASCADE
        );
      `);
      
      // Migrate old settings to all households if they existed
      if (oldSettings) {
        const households = db.prepare('SELECT id FROM households').all() as any[];
        const insertSettings = db.prepare(`
          INSERT OR IGNORE INTO settings (householdId, familySize, enableBreakfast, enableLunch, enableDinner)
          VALUES (?, ?, ?, ?, ?)
        `);
        
        for (const household of households) {
          insertSettings.run(
            household.id,
            oldSettings.familySize || 2,
            oldSettings.enableBreakfast || 0,
            oldSettings.enableLunch !== undefined ? oldSettings.enableLunch : 1,
            oldSettings.enableDinner !== undefined ? oldSettings.enableDinner : 1
          );
        }
      }
      
      console.log('✅ Migrated settings table to household-based structure');
    }
  } catch (e: any) {
    console.log('Settings table migration skipped or already done:', e.message);
  }

  // Add householdId to saved_plans
  try {
    db.exec(`ALTER TABLE saved_plans ADD COLUMN householdId INTEGER REFERENCES households(id);`);
    console.log('✅ Added householdId to saved_plans table');
  } catch (e) {
    // Column already exists
  }

  // Add householdId to eating_out_meals
  try {
    db.exec(`ALTER TABLE eating_out_meals ADD COLUMN householdId INTEGER REFERENCES households(id);`);
    console.log('✅ Added householdId to eating_out_meals table');
  } catch (e) {
    // Column already exists
  }

  // Add indexes for householdId columns
  try {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_recipes_householdId ON recipes(householdId);
      CREATE INDEX IF NOT EXISTS idx_grocery_items_householdId ON grocery_items(householdId);
      CREATE INDEX IF NOT EXISTS idx_assignments_householdId ON recipe_day_assignments(householdId);
      CREATE INDEX IF NOT EXISTS idx_saved_plans_householdId ON saved_plans(householdId);
      CREATE INDEX IF NOT EXISTS idx_eating_out_householdId ON eating_out_meals(householdId);
    `);
    console.log('✅ Created householdId indexes');
  } catch (e) {
    // Indexes already exist
  }

  // Migrate existing data: Create households for users with data and link them
  try {
    const usersWithData = db.prepare(`
      SELECT DISTINCT userId FROM recipes WHERE userId IS NOT NULL
      UNION
      SELECT DISTINCT userId FROM grocery_items WHERE userId IS NOT NULL
      UNION
      SELECT DISTINCT userId FROM recipe_day_assignments WHERE userId IS NOT NULL
    `).all() as any[];

    for (const { userId } of usersWithData) {
      // Check if user already has a household
      const existingHousehold = db.prepare(`
        SELECT householdId FROM user_households WHERE userId = ? LIMIT 1
      `).get(userId) as any;

      if (!existingHousehold) {
        // Generate unique invite code
        const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
        
        // Create household for this user
        const user = db.prepare('SELECT username FROM users WHERE id = ?').get(userId) as any;
        const householdName = user ? `${user.username}'s Household` : `Household ${userId}`;
        
        const result = db.prepare(`
          INSERT INTO households (name, inviteCode) VALUES (?, ?)
        `).run(householdName, inviteCode);
        
        const householdId = result.lastInsertRowid;

        // Link user to household
        db.prepare(`
          INSERT INTO user_households (userId, householdId, role, isActive)
          VALUES (?, ?, 'owner', 1)
        `).run(userId, householdId);

        // Migrate user's data to household
        db.prepare('UPDATE recipes SET householdId = ? WHERE userId = ?').run(householdId, userId);
        db.prepare('UPDATE grocery_items SET householdId = ? WHERE userId = ?').run(householdId, userId);
        db.prepare('UPDATE recipe_day_assignments SET householdId = ? WHERE userId = ?').run(householdId, userId);
        db.prepare('UPDATE settings SET householdId = ? WHERE userId = ?').run(householdId, userId);
        db.prepare('UPDATE saved_plans SET householdId = ? WHERE userId = ?').run(householdId, userId);
        db.prepare('UPDATE eating_out_meals SET householdId = ? WHERE userId = ?').run(householdId, userId);

        console.log(`✅ Migrated user ${userId} to household ${householdId}`);
      }
    }
  } catch (e) {
    console.log('Migration already complete or no data to migrate');
  }

  // Legacy migrations
  try {
    db.exec(`ALTER TABLE recipe_day_assignments ADD COLUMN eatingOut INTEGER NOT NULL DEFAULT 0;`);
  } catch (e) {}

  try {
    db.exec(`ALTER TABLE saved_plan_recipes ADD COLUMN originalRecipeId INTEGER;`);
  } catch (e) {}

  // Keep userId columns for backward compatibility during transition
  try {
    db.exec(`ALTER TABLE recipes ADD COLUMN userId INTEGER REFERENCES users(id);`);
  } catch (e) {}

  try {
    db.exec(`ALTER TABLE grocery_items ADD COLUMN userId INTEGER REFERENCES users(id);`);
  } catch (e) {}

  try {
    db.exec(`ALTER TABLE recipe_day_assignments ADD COLUMN userId INTEGER REFERENCES users(id);`);
  } catch (e) {}

  try {
    db.exec(`ALTER TABLE saved_plans ADD COLUMN userId INTEGER REFERENCES users(id);`);
  } catch (e) {}

  try {
    db.exec(`ALTER TABLE eating_out_meals ADD COLUMN userId INTEGER REFERENCES users(id);`);
  } catch (e) {}

  // Fix eating_out_meals unique constraint to include householdId
  try {
    // Check if the constraint needs fixing
    const tableInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='eating_out_meals'").get() as any;
    if (tableInfo && tableInfo.sql && !tableInfo.sql.includes('UNIQUE(dayOfWeek, mealType, householdId)')) {
      // Backup data
      const existingData = db.prepare('SELECT * FROM eating_out_meals').all();
      
      // Drop and recreate table with correct constraint
      db.exec('DROP TABLE IF EXISTS eating_out_meals');
      db.exec(`
        CREATE TABLE eating_out_meals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          dayOfWeek INTEGER NOT NULL,
          mealType TEXT NOT NULL,
          userId INTEGER REFERENCES users(id),
          householdId INTEGER REFERENCES households(id),
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(dayOfWeek, mealType, householdId)
        );
        CREATE INDEX IF NOT EXISTS idx_eating_out_householdId ON eating_out_meals(householdId);
      `);
      
      // Restore data
      if (existingData.length > 0) {
        const insert = db.prepare(`
          INSERT INTO eating_out_meals (id, dayOfWeek, mealType, userId, householdId, createdAt)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        for (const row of existingData as any[]) {
          insert.run(row.id, row.dayOfWeek, row.mealType, row.userId || null, row.householdId || null, row.createdAt);
        }
      }
      
      console.log('✅ Fixed eating_out_meals UNIQUE constraint to include householdId');
    }
  } catch (e: any) {
    console.log('eating_out_meals constraint migration skipped or already done:', e.message);
  }

} catch (error) {
  console.error('Error running migrations:', error);
}

console.log('✅ Database initialized at:', dbPath);

export default db;
