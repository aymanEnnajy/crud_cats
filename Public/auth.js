// auth.js - Gestion de l'authentification

class AuthManager {
    constructor() {
        this.token = localStorage.getItem('authToken');
        this.user = JSON.parse(localStorage.getItem('user')) || null;
        this.init();
    }

    init() {
        // Fix: Cloudflare serves pages without .html extension
        const path = window.location.pathname.toLowerCase();

        // Vérifier si on est sur la page login ou register (avec ou sans .html)
        const isLoginPage = path.includes('login') || !!document.getElementById('loginForm');
        const isRegisterPage = path.includes('register') || !!document.getElementById('registerForm');

        if (isLoginPage || isRegisterPage) {
            this.setupAuthPages();
        } else {
            this.checkAuth();
        }
    }

    setupAuthPages() {
        // Configuration pour la page de login
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            this.setupLogin();
        }

        // Configuration pour la page d'inscription
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            this.setupRegister();
        }

        // Toggle de visibilité des mots de passe
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

            // Animation du bouton
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

                if (!response.ok) {
                    throw new Error(data.error || 'Erreur de connexion');
                }

                // Sauvegarder le token et les infos utilisateur
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));

                this.showAlert('Connexion réussie !', 'success');

                // Rediriger vers la page principale après un court délai
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);

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

        // Validation en temps réel
        passwordInput.addEventListener('input', () => this.validatePassword());
        confirmPasswordInput.addEventListener('input', () => this.validatePassword());

        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = usernameInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            // Validation
            if (!username || !email || !password || !confirmPassword) {
                this.showAlert('Veuillez remplir tous les champs', 'danger');
                return;
            }

            if (password !== confirmPassword) {
                this.showAlert('Les mots de passe ne correspondent pas', 'danger');
                return;
            }

            if (password.length < 6) {
                this.showAlert('Le mot de passe doit contenir au moins 6 caractères', 'danger');
                return;
            }

            // Animation du bouton
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

                if (!response.ok) {
                    throw new Error(data.error || 'Erreur d\'inscription');
                }

                // Sauvegarder le token et les infos utilisateur
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));

                this.showAlert('Inscription réussie !', 'success');

                // Rediriger vers la page principale après un court délai
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);

            } catch (error) {
                this.showAlert(error.message, 'danger');
                registerBtn.innerHTML = originalText;
                registerBtn.disabled = false;
            }
        });
    }

    validatePassword() {
        const password = document.getElementById('password')?.value || '';
        const confirmPassword = document.getElementById('confirmPassword')?.value || '';

        // Validation de la longueur
        const reqLength = document.getElementById('reqLength');
        if (reqLength) {
            reqLength.className = password.length >= 6 ? 'requirement valid' : 'requirement invalid';
        }

        // Validation majuscule
        const reqUppercase = document.getElementById('reqUppercase');
        if (reqUppercase) {
            reqUppercase.className = /[A-Z]/.test(password) ? 'requirement valid' : 'requirement invalid';
        }

        // Validation chiffre
        const reqNumber = document.getElementById('reqNumber');
        if (reqNumber) {
            reqNumber.className = /\d/.test(password) ? 'requirement valid' : 'requirement invalid';
        }

        // Validation correspondance
        const reqMatch = document.getElementById('reqMatch');
        if (reqMatch) {
            reqMatch.className = password === confirmPassword && password !== '' ? 'requirement valid' : 'requirement invalid';
        }
    }

    setupPasswordToggles() {
        // Toggle pour le mot de passe
        const togglePassword = document.getElementById('togglePassword');
        const passwordInput = document.getElementById('password');

        if (togglePassword && passwordInput) {
            togglePassword.addEventListener('click', () => {
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                togglePassword.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
            });
        }

        // Toggle pour la confirmation du mot de passe
        const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
        const confirmPasswordInput = document.getElementById('confirmPassword');

        if (toggleConfirmPassword && confirmPasswordInput) {
            toggleConfirmPassword.addEventListener('click', () => {
                const type = confirmPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                confirmPasswordInput.setAttribute('type', type);
                toggleConfirmPassword.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
            });
        }
    }

    showAlert(message, type = 'info') {
        const alertDiv = document.getElementById('alert');
        const alertMessage = document.getElementById('alertMessage');

        if (!alertDiv || !alertMessage) return;

        alertDiv.className = `alert alert-${type}`;
        alertMessage.textContent = message;
        alertDiv.style.display = 'flex';

        // Masquer l'alerte après 5 secondes
        setTimeout(() => {
            alertDiv.style.display = 'none';
        }, 5000);
    }

    async checkAuth() {
        // Si pas de token, rediriger vers login
        if (!this.token) {
            window.location.href = 'login.html';
            return;
        }

        try {
            // Vérifier la validité du token
            const response = await fetch('/api/auth/verify', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) {
                throw new Error('Token invalide');
            }

            // Charger les données utilisateur
            const data = await response.json();
            this.user = data.user;
            this.updateUIWithUserInfo();

        } catch (error) {
            console.error('Erreur d\'authentification:', error);
            this.logout();
        }
    }

    updateUIWithUserInfo() {
        // Ajouter les infos utilisateur dans l'interface
        const userElements = document.querySelectorAll('.user-info');
        userElements.forEach(el => {
            if (el.id === 'userName') {
                el.textContent = this.user.username;
            } else if (el.id === 'userEmail') {
                el.textContent = this.user.email;
            }
        });

        // Ajouter un bouton de déconnexion si nécessaire
        this.addLogoutButton();
    }

    addLogoutButton() {
        // Chercher si un bouton de déconnexion existe déjà
        let logoutBtn = document.getElementById('logoutBtn');

        if (!logoutBtn) {
            logoutBtn = document.createElement('button');
            logoutBtn.id = 'logoutBtn';
            logoutBtn.className = 'btn btn-danger';
            logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Déconnexion';
            logoutBtn.onclick = () => this.logout();

            // Ajouter le bouton dans le header ou une section appropriée
            const header = document.querySelector('header');
            if (header) {
                header.appendChild(logoutBtn);
            }
        }
    }

    logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    }

    // Méthode utilitaire pour ajouter le token aux requêtes
    async fetchWithAuth(url, options = {}) {
        if (!this.token) {
            await this.checkAuth();
        }

        const defaultOptions = {
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            }
        };

        return fetch(url, { ...defaultOptions, ...options });
    }
}

// Initialiser l'authentification
const auth = new AuthManager();

// Fonctions globales pour les pages HTML
function showForgotPassword() {
    const email = prompt('Entrez votre email pour réinitialiser votre mot de passe:');
    if (email) {
        // Ici vous pouvez ajouter la logique pour réinitialiser le mot de passe
        alert('Un email de réinitialisation a été envoyé à ' + email);
    }
}

// Exporter pour utilisation dans d'autres fichiers
if (typeof module !== 'undefined' && module.exports) {
    module.exports = auth;
} else {
    window.auth = auth;
}