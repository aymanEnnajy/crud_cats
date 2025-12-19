
// Helper functions
function parseCookies(request) {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return {};
  return Object.fromEntries(cookieHeader.split("; ").map(x => x.split("=")));
}

async function getSession(request, env) {
  const cookies = parseCookies(request);
  const sessionId = cookies['session_id'];
  if (!sessionId) return null;

  // Clean up expired sessions (optional lazy cleanup)
  // await env.DB.prepare("DELETE FROM user_sessions WHERE expires_at < CURRENT_TIMESTAMP").run();

  const { results } = await env.DB.prepare("SELECT * FROM user_sessions WHERE session_token = ? AND expires_at > CURRENT_TIMESTAMP").bind(sessionId).all();
  return results[0] || null;
}

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
        const session = await getSession(request, env);
        if (!session) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
        }

        const body = await request.json();
        const { name_cats, tag, description, images } = body;

        const { lastInsertRowid } = await env.DB
          .prepare(
            "INSERT INTO cats (user_id, name_cats, tag, description, images, created_at, updated_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
          )
          .bind(session.user_id, name_cats, tag, description, images)
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
        const session = await getSession(request, env);
        if (!session) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
        }

        const id = url.pathname.split("/").pop();
        const body = await request.json();
        const { name_cats, tag, description, images } = body;

        const result = await env.DB
          .prepare(
            "UPDATE cats SET name_cats=?, tag=?, description=?, images=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?"
          )
          .bind(name_cats, tag, description, images, id, session.user_id)
          .run();

        // Check if any row was updated (if 0, implies cat not found or not owned by user)
        if (result.meta.changes === 0) {
          return new Response(JSON.stringify({ error: "Not found or permission denied" }), { status: 403, headers: { "Content-Type": "application/json" } });
        }

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
        const session = await getSession(request, env);
        if (!session) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
        }

        const id = url.pathname.split("/").pop();
        const result = await env.DB.prepare("DELETE FROM cats WHERE id=? AND user_id=?").bind(id, session.user_id).run();

        if (result.meta.changes === 0) {
          return new Response(JSON.stringify({ error: "Not found or permission denied" }), { status: 403, headers: { "Content-Type": "application/json" } });
        }

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

        // INSERT USER
        const { lastInsertRowid } = await env.DB
          .prepare("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)")
          .bind(username, email, password)
          .run();

        // CREATE SESSION
        const sessionToken = crypto.randomUUID();
        // Expires in 7 days
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

        await env.DB.prepare("INSERT INTO user_sessions (user_id, session_token, expires_at) VALUES (?, ?, ?)")
          .bind(lastInsertRowid, sessionToken, expiresAt)
          .run();

        // Set Cookie
        const cookie = `session_id=${sessionToken}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax`;

        return new Response(
          JSON.stringify({
            message: "Inscription réussie",
            token: sessionToken, // Keep sending token for frontend state if needed
            user: { id: lastInsertRowid, username, email }
          }),
          {
            status: 201,
            headers: {
              "Content-Type": "application/json",
              "Set-Cookie": cookie
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

        // CREATE SESSION
        const sessionToken = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);

        await env.DB.prepare("INSERT INTO user_sessions (user_id, session_token, expires_at) VALUES (?, ?, ?)")
          .bind(user.id, sessionToken, expiresAt)
          .run();

        // Set Cookie
        const cookie = `session_id=${sessionToken}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax`;

        return new Response(
          JSON.stringify({ message: "Connexion réussie", token: sessionToken, user: { id: user.id, username: user.username, email: user.email } }),
          {
            headers: {
              "Content-Type": "application/json",
              "Set-Cookie": cookie
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
    // -----------------------
    // ROUTE GET /api/auth/verify
    // -----------------------
    if (url.pathname === "/api/auth/verify" && method === "GET") {
      try {
        // First try session cookie
        let session = await getSession(request, env);

        // If no cookie session, fallback to Bearer token (for compatibility if needed, but user emphasized cookies)
        // Leaving legacy token check might be useful but we should rely on session table if we use tokens.
        // For now, let's stick to the new session mechanism as primary.

        // If we want to support the frontend sending "Bearer simple-token-...", we need to keep that logic OR 
        // update frontend to use cookies. Since I want minimal frontend changes, I will check if "session" is found.

        // However, the frontend sends a `simple-token`. That token is NOT in `user_sessions` because I just changed Login to store UUIDs.
        // So I MUST break the `simple-token` verification if I want to enforce the new system.
        // OR I can support the OLD token just for "reading" but I don't want to encourage it.
        // I will rely on the COOKIE. The frontend call to verify will fail if it sends the old token format?
        // Actually, the frontend sends whatever it got from Login. 
        // Login now returns `sessionToken` (UUID).
        // Frontend stores UUID in localStorage.
        // Frontend sends UUID as Bearer.
        // So I should check if the Bearer token matches a session in DB too!

        let userId = null;

        if (session) {
          userId = session.user_id;
        } else {
          // Check Bearer token against DB (in case no cookie like non-browser client?)
          const authHeader = request.headers.get("Authorization");
          if (authHeader) {
            const token = authHeader.split(' ')[1];
            if (token) {
              const { results } = await env.DB.prepare("SELECT * FROM user_sessions WHERE session_token = ? AND expires_at > CURRENT_TIMESTAMP").bind(token).all();
              if (results.length > 0) userId = results[0].user_id;
            }
          }
        }

        if (!userId) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
        }

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
      // Clear session from DB
      const cookies = parseCookies(request);
      const sessionId = cookies['session_id'];
      if (sessionId) {
        try {
          await env.DB.prepare("DELETE FROM user_sessions WHERE session_token = ?").bind(sessionId).run();
        } catch (e) { console.error(e); }
      }

      // Clear Cookie
      return new Response(JSON.stringify({
        message: 'Déconnexion réussie',
        success: true
      }), {
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": "session_id=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax"
        }
      });
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
