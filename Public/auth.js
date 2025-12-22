// auth.js - Gestion de l'authentification

class AuthManager {
    constructor() {
        // Le token est maintenant géré via des cookies HttpOnly par le serveur.
        // localStorage n'est utilisé que pour stocker les informations non sensibles de l'utilisateur (affichage).
        this.user = JSON.parse(localStorage.getItem('user')) || null;
        this.init();
    }

    init() {
        const path = window.location.pathname.toLowerCase();
        const isLoginPage = path.includes('login') || !!document.getElementById('loginForm');
        const isRegisterPage = path.includes('register') || !!document.getElementById('registerForm');

        if (isLoginPage || isRegisterPage) {
            this.setupAuthPages();
        } else {
            this.checkAuth();
        }
    }

    setupAuthPages() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) this.setupLogin();

        const registerForm = document.getElementById('registerForm');
        if (registerForm) this.setupRegister();

        this.setupPasswordToggles();
    }

    setupLogin() {
        const loginForm = document.getElementById('loginForm');
        const loginBtn = document.getElementById('loginBtn');
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = emailInput.value.trim();
            const password = passwordInput.value;

            if (!email || !password) {
                this.showAlert('Veuillez remplir tous les champs', 'danger');
                return;
            }

            const originalText = loginBtn.innerHTML;
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connexion...';
            loginBtn.disabled = true;

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Erreur de connexion');

                // On ne stocke plus de token manuellement, c'est dans le cookie
                localStorage.setItem('user', JSON.stringify(data.user));
                this.user = data.user;

                this.showAlert('Connexion réussie !', 'success');
                setTimeout(() => window.location.href = 'index.html', 1500);
            } catch (error) {
                this.showAlert(error.message, 'danger');
                loginBtn.innerHTML = originalText;
                loginBtn.disabled = false;
            }
        });
    }

    setupRegister() {
        const registerForm = document.getElementById('registerForm');
        const registerBtn = document.getElementById('registerBtn');
        const usernameInput = document.getElementById('username');
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const confirmPasswordInput = document.getElementById('confirmPassword');

        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = usernameInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            if (!username || !email || !password || !confirmPassword) {
                this.showAlert('Veuillez remplir tous les champs', 'danger');
                return;
            }

            if (password !== confirmPassword) {
                this.showAlert('Les mots de passe ne correspondent pas', 'danger');
                return;
            }

            const originalText = registerBtn.innerHTML;
            registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Inscription...';
            registerBtn.disabled = true;

            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password })
                });

                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Erreur d\'inscription');

                localStorage.setItem('user', JSON.stringify(data.user));
                this.user = data.user;

                this.showAlert('Inscription réussie !', 'success');
                setTimeout(() => window.location.href = 'index.html', 1500);
            } catch (error) {
                this.showAlert(error.message, 'danger');
                registerBtn.innerHTML = originalText;
                registerBtn.disabled = false;
            }
        });
    }

    async checkAuth() {
        try {
            const response = await fetch('/api/auth/verify');
            if (!response.ok) throw new Error('Non autorisé');

            const data = await response.json();
            this.user = data.user;
            localStorage.setItem('user', JSON.stringify(this.user));
            this.updateUIWithUserInfo();
        } catch (error) {
            console.error('Erreur d\'authentification:', error);
            this.clearLocalData();
            // Rediriger vers login si on n'y est pas déjà
            if (!window.location.pathname.includes('login')) {
                window.location.href = 'login.html';
            }
        }
    }

    updateUIWithUserInfo() {
        const userElements = document.querySelectorAll('.user-info');
        userElements.forEach(el => {
            if (el.id === 'userName') el.textContent = this.user.username;
            else if (el.id === 'userEmail') el.textContent = this.user.email;
        });
        this.addLogoutButton();
    }

    addLogoutButton() {
        let logoutBtn = document.getElementById('logoutBtn');
        if (!logoutBtn) {
            logoutBtn = document.createElement('button');
            logoutBtn.id = 'logoutBtn';
            logoutBtn.className = 'btn btn-danger';
            logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Déconnexion';
            logoutBtn.onclick = () => this.logout();

            const header = document.querySelector('header') || document.body;
            header.appendChild(logoutBtn);
        }
    }

    async logout() {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
        } catch (e) {
            console.error('Logout error:', e);
        }
        this.clearLocalData();
        window.location.href = 'login.html';
    }

    clearLocalData() {
        localStorage.removeItem('user');
        this.user = null;
    }

    async fetchWithAuth(url, options = {}) {
        // Avec les cookies, fetchWithAuth devient un simple fetch 
        // car le navigateur gère les cookies automatiquement.
        return fetch(url, { ...options });
    }

    showAlert(message, type = 'info') {
        const alertDiv = document.getElementById('alert');
        const alertMessage = document.getElementById('alertMessage');
        if (!alertDiv || !alertMessage) return;

        alertDiv.className = `alert alert-${type}`;
        alertMessage.textContent = message;
        alertDiv.style.display = 'flex';
        setTimeout(() => alertDiv.style.display = 'none', 5000);
    }
}

const auth = new AuthManager();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = auth;
} else {
    window.auth = auth;
}