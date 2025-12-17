const express = require('express');
const mysql = require('mysql2/promise');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public')); // fichiers front (HTML, JS, CSS)

// Connexion à la DB
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'nodejs_proj'
};

async function getConnection() {
  const connection = await mysql.createConnection(dbConfig);
  return connection;
}

// --------------------------------------
// API pour gérer les chats
// --------------------------------------

// GET all cats
app.get('/api/cats', async (req, res) => {
  try {
    const conn = await getConnection();
    const [rows] = await conn.execute('SELECT * FROM cats');
    await conn.end();
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST new cat
app.post('/api/cats', async (req, res) => {
  const { name_cats, tag, description, images } = req.body;
  try {
    const conn = await getConnection();
    const [result] = await conn.execute(
      'INSERT INTO cats (name_cats, tag, description, images, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
      [name_cats, tag, description, images]
    );
    const [rows] = await conn.execute('SELECT * FROM cats WHERE id = ?', [result.insertId]);
    await conn.end();
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT update cat
app.put('/api/cats/:id', async (req, res) => {
  const { id } = req.params;
  const { name_cats, tag, description, images } = req.body;
  try {
    const conn = await getConnection();
    await conn.execute(
      'UPDATE cats SET name_cats=?, tag=?, description=?, images=?, updated_at=NOW() WHERE id=?',
      [name_cats, tag, description, images, id]
    );
    const [rows] = await conn.execute('SELECT * FROM cats WHERE id=?', [id]);
    await conn.end();
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE cat
app.delete('/api/cats/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const conn = await getConnection();
    await conn.execute('DELETE FROM cats WHERE id=?', [id]);
    await conn.end();
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================================
// AJOUTEZ LES ROUTES D'AUTHENTIFICATION ICI (APRÈS LES ROUTES CHATS)
// ============================================================

// Route d'inscription
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Validation simple
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Tous les champs sont requis' });
    }

    if (password.length < 4) {
      return res.status(400).json({ error: 'Mot de passe trop court (min 4 caractères)' });
    }

    const conn = await getConnection();

    // Vérifier si l'utilisateur existe
    const [existingUsers] = await conn.execute(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUsers.length > 0) {
      await conn.end();
      return res.status(400).json({ error: 'Nom d\'utilisateur ou email déjà utilisé' });
    }

    // Stocker le mot de passe en clair (pour commencer)
    const passwordHash = password;

    // Créer l'utilisateur
    const [result] = await conn.execute(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, passwordHash]
    );

    // Créer un token simple
    const token = `simple-token-${result.insertId}-${Date.now()}`;

    await conn.end();

    res.status(201).json({
      message: 'Inscription réussie',
      token,
      user: { 
        id: result.insertId, 
        username: username, 
        email: email 
      }
    });

  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({ error: 'Erreur serveur lors de l\'inscription' });
  }
});

// Route de connexion
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    const conn = await getConnection();

    // Chercher l'utilisateur
    const [users] = await conn.execute(
      'SELECT id, username, email, password_hash FROM users WHERE email = ?',
      [email]
    );

    await conn.end();

    if (users.length === 0) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const user = users[0];

    // Vérifier le mot de passe (en clair pour le moment)
    const isValidPassword = (password === user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Créer un token simple
    const token = `simple-token-${user.id}-${Date.now()}`;

    res.json({
      message: 'Connexion réussie',
      token,
      user: { 
        id: user.id, 
        username: user.username, 
        email: user.email 
      }
    });

  } catch (error) {
    console.error('Erreur connexion:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la connexion' });
  }
});

// Route pour vérifier un token
app.get('/api/auth/verify', async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  const token = authHeader.split(' ')[1]; // Format: "Bearer token"
  
  if (!token) {
    return res.status(401).json({ error: 'Token mal formaté' });
  }

  // Vérification simple du token
  const tokenParts = token.split('-');
  if (tokenParts.length < 3 || tokenParts[0] !== 'simple' || tokenParts[1] !== 'token') {
    return res.status(403).json({ error: 'Token invalide' });
  }

  const userId = tokenParts[2];
  
  try {
    const conn = await getConnection();
    const [users] = await conn.execute(
      'SELECT id, username, email FROM users WHERE id = ?',
      [userId]
    );
    await conn.end();

    if (users.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json({ 
      valid: true,
      user: users[0] 
    });
  } catch (error) {
    console.error('Erreur vérification:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la vérification' });
  }
});

// Route de déconnexion (optionnelle)
app.post('/api/auth/logout', async (req, res) => {
  res.json({ 
    message: 'Déconnexion réussie',
    success: true 
  });
});

// ============================================================
// FIN DES ROUTES D'AUTHENTIFICATION
// ============================================================

// Lancement du serveur (TOUJOURS À LA FIN)
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));