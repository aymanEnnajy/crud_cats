// auth-check.js - Placez ce fichier dans le dossier public/
(function () {
  // Vérifier si l'utilisateur est connecté
  const token = localStorage.getItem('authToken');
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  // Pages autorisées sans connexion (noms sans extension)
  const publicPages = ['login', 'register', 'auth-check', 'style.css'];

  // Récupérer le nom de la page courante (sans extension)
  let path = window.location.pathname;
  let currentPage = path.split('/').pop().split('?')[0]; // Enlever params

  // Enlever l'extension .html si présente pour la comparaison
  if (currentPage.endsWith('.html')) {
    currentPage = currentPage.slice(0, -5);
  }

  // Gérer la racine (homepage) -> index
  if (currentPage === '' || currentPage === 'index') {
    currentPage = 'index';
  }

  console.log('Auth check:', { token, currentPage });

  // Si on est sur une page publique, on arrête ici (pas de redirection vers login)
  if (publicPages.includes(currentPage)) {
    // Cas spécial: Si on est sur login/register et qu'on est déjà connecté -> rediriger ver l'accueil
    if (token && user && (currentPage === 'login' || currentPage === 'register')) {
      console.log('Redirection vers index (déjà connecté)');
      window.location.href = '/'; // Aller à la racine
    }
    return;
  }

  // Si on est ici, c'est une page protégée (comme index)
  // Si pas connecté, rediriger vers login
  if (!token) {
    console.log('Redirection vers login');
    window.location.href = 'login.html';
    return;
  }

  // Afficher les infos utilisateur si connecté


  // Fonction de déconnexion globale
  window.logout = function () {
    // Optionnel: Appeler l'API de déconnexion
    fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }).catch(err => console.log('Logout API error:', err));

    // Nettoyer le localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');

    // Rediriger vers login
    window.location.href = 'login.html';
  };

  // Fonction pour vérifier le token avec le serveur (optionnel)
  window.verifyToken = async function () {
    if (!token) return false;

    try {
      const response = await fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        console.log('Token invalide, déconnexion...');
        window.logout();
        return false;
      }

      const data = await response.json();
      console.log('Token valide:', data.user);
      return true;
    } catch (error) {
      console.error('Erreur vérification token:', error);
      return false;
    }
  };

  // Vérifier le token au chargement (optionnel)
  if (token && user) {
    setTimeout(() => verifyToken(), 1000);
  }
})();