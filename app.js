export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;

    // Helper to get cookies
    const getCookie = (name) => {
      const value = `; ${request.headers.get("Cookie") || ""}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
    };

    // Helper to verify session
    const getSession = async () => {
      const sessionId = getCookie("session_id");
      if (!sessionId) return null;

      try {
        const { results } = await env.DB.prepare(
          "SELECT user_id FROM user_sessions WHERE id = ? AND expires_at > CURRENT_TIMESTAMP"
        ).bind(sessionId).all();

        if (results.length === 0) return null;
        return results[0].user_id;
      } catch (e) {
        console.error("Error in getSession (maybe table missing?):", e.message);
        return null;
      }
    };

    // -----------------------
    // ROUTE GET /api/cats
    // -----------------------
    if (url.pathname === "/api/cats" && method === "GET") {
      try {
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
        const userId = await getSession();
        if (!userId) return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401 });

        const body = await request.json();
        const { name_cats, tag, description, images } = body;

        console.log("Attempting to insert cat:", { userId, name_cats, tag, description, images });
        const result = await env.DB
          .prepare(
            "INSERT INTO cats (id_user, name_cats, tag, description, images, created_at, updated_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
          )
          .bind(userId, name_cats, tag, description, images)
          .run();

        const catId = result.meta.last_row_id;
        console.log("Cat inserted with id:", catId);

        const { results } = await env.DB.prepare("SELECT * FROM cats WHERE id=?").bind(catId).all();

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
        const userId = await getSession();
        if (!userId) return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401 });

        const body = await request.json();
        const { name_cats, tag, description, images } = body;

        // Vérifier propriétaire
        const { results: cats } = await env.DB.prepare("SELECT id_user FROM cats WHERE id=?").bind(id).all();
        if (cats.length === 0) return new Response(JSON.stringify({ error: "Cat non trouvé" }), { status: 404 });
        if (cats[0].id_user != userId) return new Response(JSON.stringify({ error: "Action impossible : vous n'êtes pas le propriétaire" }), { status: 403 });

        // Mise à jour
        await env.DB.prepare(
          "UPDATE cats SET name_cats=?, tag=?, description=?, images=?, updated_at=CURRENT_TIMESTAMP WHERE id=?"
        ).bind(name_cats, tag, description, images, id).run();

        const { results } = await env.DB.prepare("SELECT * FROM cats WHERE id=?").bind(id).all();
        return new Response(JSON.stringify({ message: "Cat modifiée avec succès", cat: results[0] }), { headers: { "Content-Type": "application/json" } });

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
        const userId = await getSession();
        if (!userId) return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401 });

        // Vérifier propriétaire
        const { results: cats } = await env.DB.prepare("SELECT id_user FROM cats WHERE id=?").bind(id).all();
        if (cats.length === 0) return new Response(JSON.stringify({ error: "Cat non trouvé" }), { status: 404 });
        if (cats[0].id_user != userId) return new Response(JSON.stringify({ error: "Action impossible : vous n'êtes pas le propriétaire" }), { status: 403 });

        // Suppression
        await env.DB.prepare("DELETE FROM cats WHERE id=?").bind(id).run();
        return new Response(JSON.stringify({ message: "Cat supprimée avec succès" }), { headers: { "Content-Type": "application/json" } });

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

        console.log("Attempting to register user:", { username, email });
        const userResult = await env.DB
          .prepare("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)")
          .bind(username, email, password)
          .run();

        const newUserId = userResult.meta.last_row_id;
        console.log("User registered with id:", newUserId);

        const sessionId = crypto.randomUUID();

        // Supprimer les anciennes sessions
        try {
          await env.DB.prepare("DELETE FROM user_sessions WHERE user_id = ?").bind(newUserId).run();
        } catch (e) {
          console.error("Failed to delete old sessions:", e.message);
        }

        console.log("Attempting to insert session for user:", newUserId);
        await env.DB.prepare(
          "INSERT INTO user_sessions (id, user_id, expires_at) VALUES (?, ?, datetime('now', '+30 days'))"
        ).bind(sessionId, newUserId).run();
        console.log("Session inserted successfully");

        return new Response(
          JSON.stringify({
            message: "Inscription réussie",
            user: { id: newUserId, username, email }
          }),
          {
            status: 201,
            headers: {
              "Content-Type": "application/json",
              "Set-Cookie": `session_id=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`
            }
          }
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
        const sessionId = crypto.randomUUID();

        // Supprimer les anciennes sessions
        try {
          await env.DB.prepare("DELETE FROM user_sessions WHERE user_id = ?").bind(user.id).run();
        } catch (e) {
          console.error("Failed to delete old sessions in login:", e.message);
        }

        console.log("Attempting to insert session for user:", user.id);
        await env.DB.prepare(
          "INSERT INTO user_sessions (id, user_id, expires_at) VALUES (?, ?, datetime('now', '+30 days'))"
        ).bind(sessionId, user.id).run();
        console.log("Session inserted successfully for login");

        return new Response(
          JSON.stringify({ message: "Connexion réussie", user: { id: user.id, username: user.username, email: user.email } }),
          {
            headers: {
              "Content-Type": "application/json",
              "Set-Cookie": `session_id=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`
            }
          }
        );
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    }

    // -----------------------
    // ROUTE GET /api/auth/verify
    // -----------------------
    if (url.pathname === "/api/auth/verify" && method === "GET") {
      try {
        const userId = await getSession();
        if (!userId) {
          return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401 });
        }

        const { results: users } = await env.DB
          .prepare("SELECT id, username, email FROM users WHERE id = ?")
          .bind(userId)
          .all();

        if (users.length === 0) {
          return new Response(JSON.stringify({ error: "Utilisateur non trouvé" }), { status: 404 });
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
      const sessionId = getCookie("session_id");
      if (sessionId) {
        await env.DB.prepare("DELETE FROM user_sessions WHERE id = ?").bind(sessionId).run();
      }
      return new Response(JSON.stringify({
        message: 'Déconnexion réussie',
        success: true
      }), {
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": "session_id=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
        }
      });
    }

    // -----------------------
    // ROUTE GET /api/adoptions
    // -----------------------
    if (url.pathname === "/api/adoptions" && method === "GET") {
      try {
        const userId = await getSession();
        if (!userId) return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401 });

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
        const userId = await getSession();
        if (!userId) return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401 });

        const body = await request.json();
        const { cat_id } = body;

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
        const userId = await getSession();
        if (!userId) return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401 });

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

        const userId = await getSession();
        if (!userId) return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401 });

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

    return env.ASSETS.fetch(request);
  }
};

