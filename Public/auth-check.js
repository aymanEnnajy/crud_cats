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
  if (user && document.body) {
    // Créer un badge utilisateur
    const existingBadge = document.getElementById('userBadge');
    if (existingBadge) existingBadge.remove();
    
    const userBadge = document.createElement('div');
    userBadge.id = 'userBadge';
    userBadge.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #3b82f6;
      color: white;
      padding: 8px 15px;
      border-radius: 20px;
      font-size: 14px;
      z-index: 1000;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      cursor: pointer;
      transition: all 0.3s ease;
    `;
    
    userBadge.innerHTML = `
      <i class="fas fa-user-circle" style="font-size: 16px;"></i>
      <span>${user.username}</span>
      <button onclick="logout()" style="
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        margin-left: 10px;
        padding: 4px;
        border-radius: 50%;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.3s ease;
      ">
        <i class="fas fa-sign-out-alt" style="font-size: 12px;"></i>
      </button>
    `;
    
    userBadge.onmouseover = () => {
      userBadge.style.transform = 'scale(1.05)';
      userBadge.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
    };
    
    userBadge.onmouseout = () => {
      userBadge.style.transform = 'scale(1)';
      userBadge.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    };
    
    document.body.appendChild(userBadge);
  }
  
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