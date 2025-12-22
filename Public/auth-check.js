(function () {
  console.log("Auth-Check starting...");

  const domLogin = document.getElementById('loginForm');
  const domRegister = document.getElementById('registerForm');
  const urlPath = window.location.pathname.toLowerCase();

  const isLoginPage = !!domLogin || urlPath.includes('login');
  const isRegisterPage = !!domRegister || urlPath.includes('register');
  const isPublicPage = isLoginPage || isRegisterPage;

  // Verification du status d'authentification auprès du serveur
  fetch('/api/auth/verify')
    .then(res => {
      if (res.ok) {
        // Authentifié
        if (isPublicPage) {
          window.location.href = 'index.html';
        }
      } else {
        // Non authentifié
        if (!isPublicPage) {
          localStorage.removeItem('user');
          window.location.href = 'login.html';
        }
      }
    })
    .catch(err => {
      console.error("Auth check failed:", err);
      if (!isPublicPage) {
        window.location.href = 'login.html';
      }
    });

  window.logout = async function () {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout error:', e);
    }
    localStorage.removeItem('user');
    window.location.href = 'login.html';
  };
})();