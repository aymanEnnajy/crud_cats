export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;

    // -----------------------
    // ROUTE GET /api/cats
    // -----------------------
    if (url.pathname === "/api/cats" && method === "GET") {
      try {
        const { results } = await env.DB.prepare("SELECT * FROM cats").all();
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
        const { name_cats, tag, description, images } = body;

        const { lastInsertRowid } = await env.DB
          .prepare(
            "INSERT INTO cats (id_user,name_cats, tag, description, images, created_at, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
          )
          .bind(name_cats, tag, description, images)
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

        await env.DB
          .prepare(
            "UPDATE cats SET name_cats=?, tag=?, description=?, images=?, updated_at=CURRENT_TIMESTAMP WHERE id=?"
          )
          .bind(name_cats, tag, description, images, id)
          .run();

        const { results } = await env.DB.prepare("SELECT * FROM cats WHERE id=?").bind(id).all();

        return new Response(JSON.stringify(results[0]), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    }

    // -----------------------
    // ROUTE DELETE /api/cats/:id
    // -----------------------
    if (url.pathname.startsWith("/api/cats/") && method === "DELETE") {
      try {
        const id = url.pathname.split("/").pop();
        await env.DB.prepare("DELETE FROM cats WHERE id=?").bind(id).run();
        return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
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
    // ROUTE par défaut
    // -----------------------
    // -----------------------
    // ROUTE par défaut : Servir les fichiers statiques (Frontend)
    // -----------------------
    // Si la requête n'a pas été traitée par l'API, on laisse Cloudflare servir les assets
    return env.ASSETS.fetch(request);
  }
};
