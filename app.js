export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;

    // -----------------------
    // ROUTE GET /api/cats
    // -----------------------
    if (url.pathname === "/api/cats" && method === "GET") {
      try {
        // Retourne les chats avec l'information d'adoption
        const { results } = await env.DB.prepare(`
          SELECT c.*, a.user_id as adopted_by_user_id, a.status as adoption_status 
          FROM cats c 
          LEFT JOIN adoptions a ON c.id = a.cat_id
        `).all();

        return new Response(JSON.stringify(results), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    }

    // -----------------------
    // ROUTE POST /api/cats
    // -----------------------
    if (url.pathname === "/api/cats" && method === "POST") {
      try {
        const body = await request.json();
        const { id_user, name_cats, tag, description, images } = body;

        const { lastInsertRowid } = await env.DB
          .prepare(
            "INSERT INTO cats (id_user, name_cats, tag, description, images, created_at, updated_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
          )
          .bind(id_user, name_cats, tag, description, images)
          .run();

        const { results } = await env.DB.prepare("SELECT * FROM cats WHERE id=?").bind(lastInsertRowid).all();

        return new Response(JSON.stringify(results[0]), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    }

    // -----------------------
    // ROUTE PUT /api/cats/:id
    // -----------------------
    if (url.pathname.startsWith("/api/cats/") && method === "PUT") {
      try {
        const id = url.pathname.split("/").pop();
        const body = await request.json();
        const { name_cats, tag, description, images } = body;

        // Extraire userId depuis le token
        const authHeader = request.headers.get("Authorization");
        if (!authHeader) return new Response(JSON.stringify({ error: "Token manquant" }), { status: 401, headers: { "Content-Type": "application/json" } });
        const token = authHeader.split(' ')[1];
        const userId = token.split('-')[2];

        // Vérifier propriétaire
        const { results: cats } = await env.DB.prepare("SELECT id_user FROM cats WHERE id=?").bind(id).all();
        if (cats.length === 0) return new Response(JSON.stringify({ error: "Cat non trouvé" }), { status: 404, headers: { "Content-Type": "application/json" } });
        if (cats[0].id_user != userId) return new Response(JSON.stringify({ error: "Action impossible : vous n'êtes pas le propriétaire" }), { status: 403, headers: { "Content-Type": "application/json" } });

        // Mise à jour
        await env.DB.prepare(
          "UPDATE cats SET name_cats=?, tag=?, description=?, images=?, updated_at=CURRENT_TIMESTAMP WHERE id=?"
        ).bind(name_cats, tag, description, images, id).run();

        const { results } = await env.DB.prepare("SELECT * FROM cats WHERE id=?").bind(id).all();
        return new Response(JSON.stringify({ message: "Cat modifiée avec succès", cat: results[0] }), { headers: { "Content-Type": "application/json" } });

      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
      }
    }


    // -----------------------
    // ROUTE DELETE /api/cats/:id
    // -----------------------
    if (url.pathname.startsWith("/api/cats/") && method === "DELETE") {
      try {
        const id = url.pathname.split("/").pop();

        // Extraire userId depuis le token
        const authHeader = request.headers.get("Authorization");
        if (!authHeader) return new Response(JSON.stringify({ error: "Token manquant" }), { status: 401, headers: { "Content-Type": "application/json" } });
        const token = authHeader.split(' ')[1];
        const userId = token.split('-')[2];

        // Vérifier propriétaire
        const { results: cats } = await env.DB.prepare("SELECT id_user FROM cats WHERE id=?").bind(id).all();
        if (cats.length === 0) return new Response(JSON.stringify({ error: "Cat non trouvé" }), { status: 404, headers: { "Content-Type": "application/json" } });
        if (cats[0].id_user != userId) return new Response(JSON.stringify({ error: "Action impossible : vous n'êtes pas le propriétaire" }), { status: 403, headers: { "Content-Type": "application/json" } });

        // Suppression
        await env.DB.prepare("DELETE FROM cats WHERE id=?").bind(id).run();
        return new Response(JSON.stringify({ message: "Cat supprimée avec succès" }), { headers: { "Content-Type": "application/json" } });

      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
      }
    }


    // -----------------------
    // ROUTE POST /api/auth/register
    // -----------------------
    if (url.pathname === "/api/auth/register" && method === "POST") {
      try {
        const body = await request.json();
        const { username, email, password } = body;

        if (!username || !email || !password) {
          return new Response(JSON.stringify({ error: "Tous les champs sont requis" }), { status: 400 });
        }

        const { results: existingUsers } = await env.DB
          .prepare("SELECT id FROM users WHERE username=? OR email=?")
          .bind(username, email)
          .all();

        if (existingUsers.length > 0) {
          return new Response(JSON.stringify({ error: "Nom d'utilisateur ou email déjà utilisé" }), { status: 400 });
        }

        // Stockage du mot de passe en clair pour l'instant
        const { lastInsertRowid } = await env.DB
          .prepare("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)")
          .bind(username, email, password)
          .run();

        const token = `simple-token-${lastInsertRowid}-${Date.now()}`;

        return new Response(
          JSON.stringify({
            message: "Inscription réussie",
            token,
            user: { id: lastInsertRowid, username, email }
          }),
          { status: 201, headers: { "Content-Type": "application/json" } }
        );
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    }

    // -----------------------
    // ROUTE POST /api/auth/login
    // -----------------------
    if (url.pathname === "/api/auth/login" && method === "POST") {
      try {
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
          return new Response(JSON.stringify({ error: "Email et mot de passe requis" }), { status: 400 });
        }

        const { results: users } = await env.DB
          .prepare("SELECT id, username, email, password_hash FROM users WHERE email=?")
          .bind(email)
          .all();

        if (users.length === 0 || users[0].password_hash !== password) {
          return new Response(JSON.stringify({ error: "Email ou mot de passe incorrect" }), { status: 401 });
        }

        const user = users[0];
        const token = `simple-token-${user.id}-${Date.now()}`;

        return new Response(
          JSON.stringify({ message: "Connexion réussie", token, user: { id: user.id, username: user.username, email: user.email } }),
          { headers: { "Content-Type": "application/json" } }
        );
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    }

    // -----------------------
    // ROUTE GET /api/auth/verify
    // -----------------------
    if (url.pathname === "/api/auth/verify" && method === "GET") {
      const authHeader = request.headers.get("Authorization");

      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Token manquant" }), { status: 401, headers: { "Content-Type": "application/json" } });
      }

      const token = authHeader.split(' ')[1]; // Format: "Bearer token"

      if (!token) {
        return new Response(JSON.stringify({ error: "Token mal formaté" }), { status: 401, headers: { "Content-Type": "application/json" } });
      }

      // Vérification simple du token
      const tokenParts = token.split('-');
      if (tokenParts.length < 3 || tokenParts[0] !== 'simple' || tokenParts[1] !== 'token') {
        return new Response(JSON.stringify({ error: "Token invalide" }), { status: 403, headers: { "Content-Type": "application/json" } });
      }

      const userId = tokenParts[2];

      try {
        const { results: users } = await env.DB
          .prepare("SELECT id, username, email FROM users WHERE id = ?")
          .bind(userId)
          .all();

        if (users.length === 0) {
          return new Response(JSON.stringify({ error: "Utilisateur non trouvé" }), { status: 404, headers: { "Content-Type": "application/json" } });
        }

        return new Response(JSON.stringify({
          valid: true,
          user: users[0]
        }), { headers: { "Content-Type": "application/json" } });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    }

    // -----------------------
    // ROUTE POST /api/auth/logout
    // -----------------------
    if (url.pathname === "/api/auth/logout" && method === "POST") {
      return new Response(JSON.stringify({
        message: 'Déconnexion réussie',
        success: true
      }), { headers: { "Content-Type": "application/json" } });
    }

    // -----------------------
    // ROUTE GET /api/adoptions
    // -----------------------
    if (url.pathname === "/api/adoptions" && method === "GET") {
      try {
        const authHeader = request.headers.get("Authorization");
        if (!authHeader) return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401 });
        const token = authHeader.split(' ')[1];
        const userId = token.split('-')[2];

        const { results } = await env.DB.prepare(`
          SELECT c.*, a.id as adoption_record_id, a.status as adoption_status 
          FROM cats c 
          JOIN adoptions a ON c.id = a.cat_id 
          WHERE a.user_id = ?
        `).bind(userId).all();

        return new Response(JSON.stringify(results), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    }

    // -----------------------
    // ROUTE POST /api/adoptions
    // -----------------------
    if (url.pathname === "/api/adoptions" && method === "POST") {
      try {
        const body = await request.json();
        const { cat_id } = body;
        const authHeader = request.headers.get("Authorization");
        if (!authHeader) return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401 });
        const token = authHeader.split(' ')[1];
        const userId = token.split('-')[2];

        // Vérifier si l'utilisateur existe (pour éviter D1_ERROR: FOREIGN KEY constraint failed)
        const { results: userExists } = await env.DB.prepare("SELECT id FROM users WHERE id = ?").bind(userId).all();
        if (userExists.length === 0) {
          return new Response(JSON.stringify({ error: "Utilisateur non trouvé. Veuillez vous reconnecter." }), { status: 401 });
        }

        // Vérifier si déjà adopté par quelqu'un d'autre
        const { results: existing } = await env.DB.prepare("SELECT id FROM adoptions WHERE cat_id = ?").bind(cat_id).all();
        if (existing.length > 0) {
          return new Response(JSON.stringify({ error: "Ce chat est déjà en cours d'adoption" }), { status: 400 });
        }

        await env.DB.prepare("INSERT INTO adoptions (user_id, cat_id, status) VALUES (?, ?, 'pending')").bind(userId, cat_id).run();

        return new Response(JSON.stringify({ success: true, message: "Demande d'adoption enregistrée" }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    }

    // -----------------------
    // ROUTE DELETE /api/adoptions/:cat_id
    // -----------------------
    if (url.pathname.startsWith("/api/adoptions/") && method === "DELETE") {
      try {
        const catId = url.pathname.split("/").pop();
        const authHeader = request.headers.get("Authorization");
        if (!authHeader) return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401 });
        const token = authHeader.split(' ')[1];
        const userId = token.split('-')[2];

        await env.DB.prepare("DELETE FROM adoptions WHERE cat_id = ? AND user_id = ?").bind(catId, userId).run();

        return new Response(JSON.stringify({ success: true, message: "Adoption annulée" }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    }

    // -----------------------
    // ROUTE PUT /api/adoptions/:cat_id/status
    // -----------------------
    if (url.pathname.startsWith("/api/adoptions/") && url.pathname.endsWith("/status") && method === "PUT") {
      try {
        const parts = url.pathname.split("/");
        const catId = parts[parts.length - 2];
        const body = await request.json();
        const { status } = body;

        const authHeader = request.headers.get("Authorization");
        if (!authHeader) return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401 });
        const token = authHeader.split(' ')[1];
        const userId = token.split('-')[2];

        // Vérifier que l'adoption appartient à l'utilisateur
        const { results: adoption } = await env.DB.prepare("SELECT * FROM adoptions WHERE cat_id = ? AND user_id = ?")
          .bind(catId, userId).all();

        if (adoption.length === 0) {
          return new Response(JSON.stringify({ error: "Adoption non trouvée" }), { status: 404 });
        }

        await env.DB.prepare("UPDATE adoptions SET status = ? WHERE cat_id = ? AND user_id = ?")
          .bind(status, catId, userId).run();

        return new Response(JSON.stringify({ success: true, message: "Statut de l'adoption mis à jour" }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    }

    // -----------------------
    // ROUTE par défaut
    // -----------------------
    // -----------------------
    // ROUTE par défaut : Servir les fichiers statiques (Frontend)
    // -----------------------
    // Si la requête n'a pas été traitée par l'API, on laisse Cloudflare servir les assets
    return env.ASSETS.fetch(request);
  }
};
