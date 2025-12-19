-- nodejs_proj.sql
-- Optimized for Cloudflare D1 with Foreign Key safety

PRAGMA foreign_keys = OFF;

-- Clean start
DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS cats;
DROP TABLE IF EXISTS users;

-- Re-enable temporarily to create but keep off for inserts if needed
-- Actually, keep OFF for the whole script is safer for a reset.

-- 1. Users table
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Cats table
CREATE TABLE cats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  name_cats TEXT NOT NULL,
  tag TEXT DEFAULT NULL,
  description TEXT,
  images TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

-- 3. User sessions table
CREATE TABLE user_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

-- Data injection
INSERT INTO users (id, username, email, password_hash) VALUES
(1, 'ayman', 'ayman93011@gmail.com', 'Azerty123');

INSERT INTO cats (user_id, name_cats, tag, description, images) VALUES
(1, 'Whiskers', 'Playful', 'A very playful cat', 'https://images.unsplash.com/photo-1514888286974-6d03bde4ba42?w=600'),
(1, 'Simba', 'King', 'Loves to sleep', 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=400');

PRAGMA foreign_keys = ON;
