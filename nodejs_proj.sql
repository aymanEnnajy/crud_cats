-- Converted for Cloudflare D1 (SQLite)

-- 1. Drop child tables first to avoid FK constraints
DROP TABLE IF EXISTS adoptions;
DROP TABLE IF EXISTS cats;
DROP TABLE IF EXISTS users;

-- 2. Create parent tables first
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(username),
  UNIQUE(email)
);

INSERT INTO users (id, username, email, password_hash, created_at, updated_at) VALUES
(1, 'ayman', 'ayman93011@gmail.com', 'Azerty123', '2025-12-17 14:15:02', '2025-12-17 14:15:02'),
(2, 'user1', 'user@gmail.com', 'Azerty123', '2025-12-17 14:15:02', '2025-12-17 14:15:02');

-- 3. Create cats table with FK to users
CREATE TABLE IF NOT EXISTS cats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  id_user INTEGER NOT NULL,
  name_cats TEXT NOT NULL,
  tag TEXT DEFAULT NULL,
  description TEXT,
  images TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_user) REFERENCES users(id)
);

INSERT INTO cats (id, id_user, name_cats, tag, description, images, created_at, updated_at) VALUES
(1,1, 'Whiskers', 'Playful', 'A very playful cat who loves toys and attention', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRyaS9dW15PMOAWf9oneAPmq-Fys0W8w3nPXC7wZ36CROlJ3tkNFb0_9uz5CI7h98cHIzOUupljRsENdsXzDLtFfJ-mMB_KHcl7TjZGD8qoXg&s=10', '2025-12-15 02:00:59', '2025-12-16 21:27:01'),
(3,1, 'Simba', 'Adventurous', 'Always exploring and curious about everything', 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=400', '2025-12-15 02:00:59', '2025-12-15 02:00:59'),
(4,2, 'moon', 'dddd', 'dddd', 'https://images.unsplash.com/photo-1514888286974-6d03bde4ba42?w=600', '2025-12-15 03:05:33', '2025-12-15 03:05:56'),
(5,2, 'luna', 'oscar', 'mata', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRlOYId9yAzW4d7oOb1__QztJahf8hZ_d6naMsnqeBXGry2n-dRxc-X_zhiodnnXxccOs0oXWVBDne7touXKfGOXV-HbH2cZ3TgRfb-fWeQ&s=10', '2025-12-16 21:26:31', '2025-12-16 21:26:31'),
(6,1, 'a', 'a', 'a', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRyaS9dW15PMOAWf9oneAPmq-Fys0W8w3nPXC7wZ36CROlJ3tkNFb0_9uz5CI7h98cHIzOUupljRsENdsXzDLtFfJ-mMB_KHcl7TjZGD8qoXg&s=10', '2025-12-16 21:27:20', '2025-12-16 21:27:20');

-- 4. Create adoptions table with FK to users and cats
CREATE TABLE IF NOT EXISTS adoptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  cat_id INTEGER NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, confirmed
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (cat_id) REFERENCES cats(id)
);
