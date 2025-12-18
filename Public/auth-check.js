// auth-check.js - Placez ce fichier dans le dossier public/
(function() {
  // Vérifier si l'utilisateur est connecté
  const token = localStorage.getItem('authToken');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  
  // Pages autorisées sans connexion
  const publicPages = ['login.html', 'register.html'];
  const currentPage = window.location.pathname.split('/').pop();
  
  console.log('Auth check:', { token, user, currentPage });
  
  // Si pas connecté ET pas sur une page publique, rediriger vers login
  if (!token && !publicPages.includes(currentPage)) {
    console.log('Redirection vers login');
    window.location.href = 'login.html';
    return;
  }
  
  // Si connecté ET sur une page de login/register, rediriger vers l'accueil
  if (token && user && publicPages.includes(currentPage)) {
    console.log('Redirection vers index (déjà connecté)');
    window.location.href = 'index.html';
    return;
  }
  
  // Afficher les infos utilisateur si connecté
 
  
  // Fonction de déconnexion globale
  window.logout = function() {
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
  window.verifyToken = async function() {
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