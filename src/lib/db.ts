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
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipeId) REFERENCES recipes(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    familySize INTEGER NOT NULL DEFAULT 2,
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

  CREATE INDEX IF NOT EXISTS idx_assignments_recipeId ON recipe_day_assignments(recipeId);
  CREATE INDEX IF NOT EXISTS idx_assignments_dayOfWeek ON recipe_day_assignments(dayOfWeek);
  CREATE INDEX IF NOT EXISTS idx_saved_plan_assignments_planId ON saved_plan_assignments(planId);
  CREATE INDEX IF NOT EXISTS idx_saved_plan_recipes_planId ON saved_plan_recipes(planId);
`);

// Initialize settings table with default values if empty
try {
  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM settings').get() as any;
  if (settingsCount.count === 0) {
    db.prepare('INSERT INTO settings (id, familySize) VALUES (1, 2)').run();
    console.log('✅ Initialized settings with default familySize: 2');
  }
} catch (error) {
  console.error('Error initializing settings:', error);
}

console.log('✅ Database initialized at:', dbPath);

export default db;
