// auth-check.js - Version corrigée via détection DOM (plus fiable)
document.addEventListener('DOMContentLoaded', function () {
  // Vérifier si l'utilisateur est connecté
  const token = localStorage.getItem('authToken');
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  // Détection fiable de la page via le DOM (évite les problèmes de parsing d'URL)
  // Si le formulaire de login existe, on est sur la page login.
  const isLoginPage = document.getElementById('loginForm');
  // Si le formulaire d'inscription existe, on est sur la page register.
  const isRegisterPage = document.getElementById('registerForm');

  const isPublicPage = isLoginPage || isRegisterPage;

  console.log('Auth check:', { token, isLoginPage: !!isLoginPage, isRegisterPage: !!isRegisterPage });

  // 1. GESTION DES PAGES PUBLIQUES (Login/Register)
  if (isPublicPage) {
    // Cas spécial: Si on est déjà connecté => redirection vers l'accueil
    if (token && user) {
      console.log('Redirection vers index (déjà connecté)');
      window.location.href = '/';
    }
    // Sinon, on reste sur la page. C'est TOUT. Pas de redirection vers login ici.
    return;
  }

  // 2. GESTION DES PAGES PROTÉGÉES (Toutes les autres pages)
  // Si pas connecté => redirection vers login
  if (!token) {
    console.log('Redirection vers login (Token manquant)');
    window.location.href = 'login.html';
    return;
  }

  // --- Fonctions globales ---

  // Fonction de déconnexion globale
  window.logout = function () {
    fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }).catch(err => console.log('Logout API error:', err));

    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
  };

  // Fonction pour vérifier le token avec le serveur
  window.verifyToken = async function () {
    if (!token) return false;
    try {
      const response = await fetch('/api/auth/verify', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        console.log('Token invalide (serveur), nettoyage...');
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        // Si on est sur une page protégée, on redirige vers login
        if (!isPublicPage) {
          window.location.href = 'login.html';
        }
        return false;
      }

      // Si le token EST valide
      console.log('Token vérifié et valide.');
      // Si on est sur une page publique (Login), on redirige MAINTENANT vers l'accueil
      if (isPublicPage) {
        console.log('Redirection vers Dashboard...');
        window.location.href = '/';
      }
      return true;

    } catch (error) {
      console.error('Erreur vérification token:', error);
      // En cas d'erreur réseau, on ne déconnecte pas forcément tout de suite, 
      // mais par sécurité pour stopper la boucle :
      return false;
    }
  };

  // Lance la vérification
  if (token) {
    verifyToken();
  }
});