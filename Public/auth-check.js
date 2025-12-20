(function () {
  console.log("Auth-Check starting...");

  // 1. Détection de la page courante (Double Check: DOM + URL)
  // On regarde si on est sur Login ou Register
  const domLogin = document.getElementById('loginForm');
  const domRegister = document.getElementById('registerForm');
  const urlPath = window.location.href.toLowerCase();

  const isLoginPage = !!domLogin || urlPath.includes('login');
  const isRegisterPage = !!domRegister || urlPath.includes('register');
  const isPublicPage = isLoginPage || isRegisterPage;

  console.log("Page Detection:", { isLoginPage, isRegisterPage, url: window.location.pathname });

  // 2. Récupération du Token
  const token = localStorage.getItem('authToken');
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  // 3. Logique de protection
  if (isPublicPage) {
    console.log("We are on a PUBLIC page. Staying here using fallback logic.");

    // Si on est sur une page publique, ON ARRETE TOUT DE SUITE.
    // On ne redirige JAMAIS vers login depuis une page publique.
    // Cela empêche la boucle 100%.

    // Optionnel: Si l'utilisateur est connecté, on peut proposer d'aller à l'accueil
    // Mais on vérifie d'abord que le token est valide pour ne pas faire de ping-pong.
    if (token) {
      verifyTokenAndRedirect();
    }
    return;
  }

  // 4. Si on est sur une page protégée (Index, etc.)
  if (!token) {
    console.log("Protected page + No Token -> Redirecting to Login.");
    window.location.href = 'login.html';
    return;
  }

  // --- Fonctions Helper ---

  function verifyTokenAndRedirect() {
    // On vérifie le token activement
    fetch('/api/auth/verify', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (res.ok) {
          // Token bon -> Go Dashboard
          console.log("Token verified. Redirecting to Dashboard.");
          window.location.href = '/';
        } else {
          // Token pourri -> On le supprime et ON RESTE ICI.
          console.log("Token invalid. Clearing storage. staying on login.");
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          // Pas de reload, juste on vide.
        }
      })
      .catch(err => {
        console.error("Token verification failed (network). Ignoring.", err);
      });
  }

  // Globals for Navbar
  window.logout = function () {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
  };

})();