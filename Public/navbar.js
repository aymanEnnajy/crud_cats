// navbar.js - Gestion dynamique de la navbar avec authentification

class NavbarManager {
    constructor() {
        this.user = JSON.parse(localStorage.getItem('user') || 'null');
        this.token = localStorage.getItem('authToken');
        this.init();
    }

    async init() {
        await this.loadNavbar();
        this.setupNavbar();
        this.updateAuthUI();
        this.setupMobileMenu();
        this.setActiveLink();
        if (this.user && this.token) {
            this.updateAdoptionCount();
        }
    }

    async loadNavbar() {
        // Créer la navbar directement dans le DOM
        this.createNavbar();
    }

    createNavbar() {
        const navbarHTML = `
            <nav class="navbar">
                <div class="nav-container">
                    <!-- Logo -->
                    <a href="index.html" class="nav-logo">
                        <i class="fas fa-cat"></i>
                        <div class="nav-logo-text">
                            <span class="nav-logo-title">ChatManager</span>
                            <span class="nav-logo-subtitle">Gestion Féline</span>
                        </div>
                    </a>

                    <!-- Menu mobile toggle -->
                    <button class="nav-toggle" id="navToggle">
                        <i class="fas fa-bars"></i>
                    </button>

                    <!-- Menu principal -->
                    <div class="nav-menu" id="navMenu">
                        <div class="nav-links">
                            <a href="index.html" class="nav-link">
                                <i class="fas fa-home"></i>
                                <span>Accueil</span>
                            </a>
                            ${this.user && this.token ? `
                            <a href="adoptions.html" class="nav-link">
                                <i class="fas fa-heart"></i>
                                <span>Mes Adoptions</span>
                                <span id="adoptionBadge" class="nav-badge" style="display: none;">0</span>
                            </a>
                            ` : ''}
                            <a href="about.html" class="nav-link">
                                <i class="fas fa-info-circle"></i>
                                <span>À Propos</span>
                            </a>
                            <a href="contact.html" class="nav-link">
                                <i class="fas fa-envelope"></i>
                                <span>Contact</span>
                            </a>
                        </div>

                        <!-- Section authentification -->
                        <div id="authSection">
                            ${this.getAuthHTML()}
                        </div>
                    </div>
                </div>
            </nav>
        `;

        // Insérer la navbar au début du body
        document.body.insertAdjacentHTML('afterbegin', navbarHTML);
    }

    getAuthHTML() {
        if (this.user && this.token) {
            // Utilisateur connecté
            return `
                <div class="user-nav-info">
                    <div class="user-avatar-nav">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="user-details-nav">
                        <div class="user-name-nav">${this.user.username || 'Utilisateur'}</div>
                        <div class="user-email-nav">${this.user.email || ''}</div>
                    </div>
                    <button class="logout-btn-nav" onclick="navbarManager.logout()" title="Déconnexion">
                        <i class="fas fa-sign-out-alt"></i>
                    </button>
                </div>
            `;
        } else {
            // Utilisateur non connecté
            return `
                <div class="auth-buttons">
                    <a href="login.html" class="btn btn-outline">
                        <i class="fas fa-sign-in-alt"></i>
                        <span>Connexion</span>
                    </a>
                    <a href="register.html" class="btn btn-primary">
                        <i class="fas fa-user-plus"></i>
                        <span>Inscription</span>
                    </a>
                </div>
            `;
        }
    }

    setupNavbar() {
        // Ajouter les styles CSS pour la navbar
        this.addNavbarStyles();
    }

    addNavbarStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* navbar.css - Navigation professionnelle mobile-first */
            
            :root {
                --nav-primary: #3b82f6;
                --nav-primary-dark: #2563eb;
                --nav-light: #f8fafc;
                --nav-dark: #1e293b;
                --nav-gray: #64748b;
                --shadow-sm: 0 1px 3px rgba(0,0,0,0.12);
                --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.1);
            }

            /* Barre de navigation principale */
            .navbar {
                background: white;
                box-shadow: var(--shadow-sm);
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                z-index: 1000;
                padding: 0 20px;
            }

            /* Prévoir l'espace pour la navbar afin qu'elle ne recouvre pas le contenu */
            body {
                padding-top: 70px;
            }

            .nav-container {
                max-width: 1200px;
                margin: 0 auto;
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px 0;
            }

            /* Logo */
            .nav-logo {
                display: flex;
                align-items: center;
                gap: 12px;
                text-decoration: none;
            }

            .nav-logo i {
                font-size: 28px;
                color: var(--nav-primary);
            }

            .nav-logo-text {
                display: flex;
                flex-direction: column;
                line-height: 1.2;
            }

            .nav-logo-title {
                font-size: 1.5rem;
                font-weight: 700;
                color: var(--nav-dark);
                background: linear-gradient(90deg, var(--nav-primary), #7c3aed);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }

            .nav-logo-subtitle {
                font-size: 0.75rem;
                color: var(--nav-gray);
                font-weight: 500;
            }

            /* Navigation desktop */
            .nav-menu {
                display: flex;
                align-items: center;
                gap: 30px;
            }

            .nav-links {
                display: flex;
                gap: 25px;
                margin-right: 20px;
            }

            .nav-link {
                color: var(--nav-dark);
                text-decoration: none;
                font-weight: 500;
                font-size: 1rem;
                padding: 8px 0;
                position: relative;
                transition: color 0.3s ease;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .nav-link:hover {
                color: var(--nav-primary);
            }

            .nav-link.active {
                color: var(--nav-primary);
                font-weight: 600;
            }

            .nav-link.active::after {
                content: '';
                position: absolute;
                bottom: 0;
                left: 0;
                width: 100%;
                height: 2px;
                background: var(--nav-primary);
                border-radius: 2px;
            }

            /* Boutons d'authentification */
            .auth-buttons {
                display: flex;
                gap: 15px;
                align-items: center;
            }

            .btn {
                padding: 10px 20px;
                border-radius: 8px;
                font-weight: 500;
                text-decoration: none;
                display: inline-flex;
                align-items: center;
                gap: 8px;
                transition: all 0.3s ease;
                font-size: 0.9rem;
            }

            .btn-primary {
                background: linear-gradient(90deg, var(--nav-primary), var(--nav-primary-dark));
                color: white;
            }

            .btn-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(37, 99, 235, 0.3);
            }

            .btn-outline {
                background: transparent;
                color: var(--nav-primary);
                border: 2px solid var(--nav-primary);
            }

            .btn-outline:hover {
                background: var(--nav-primary);
                color: white;
            }

            /* Utilisateur connecté */
            .user-nav-info {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 8px 15px;
                background: #f1f5f9;
                border-radius: 25px;
                border: 1px solid #e2e8f0;
            }

            .user-avatar-nav {
                width: 36px;
                height: 36px;
                border-radius: 50%;
                background: linear-gradient(135deg, var(--nav-primary), #7c3aed);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 1rem;
            }

            .user-details-nav {
                display: flex;
                flex-direction: column;
            }

            .user-name-nav {
                font-weight: 600;
                font-size: 0.9rem;
                color: var(--nav-dark);
            }

            .user-email-nav {
                font-size: 0.75rem;
                color: var(--nav-gray);
            }

            .logout-btn-nav {
                background: none;
                border: none;
                color: var(--nav-gray);
                cursor: pointer;
                padding: 6px;
                border-radius: 50%;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .logout-btn-nav:hover {
                color: #ef4444;
                background: #fee2e2;
            }

            /* Badge Styles */
            .nav-badge {
                position: absolute;
                top: -5px;
                right: -12px;
                background: #ef4444;
                color: white;
                font-size: 0.65rem;
                padding: 2px 6px;
                border-radius: 10px;
                font-weight: 700;
                min-width: 18px;
                text-align: center;
                box-shadow: 0 2px 5px rgba(239, 68, 68, 0.4);
                border: 2px solid white;
            }

            @media (max-width: 768px) {
                .nav-badge {
                    position: static;
                    margin-left: 10px;
                    border: none;
                    box-shadow: none;
                }
            }

            /* Bouton hamburger (mobile) */
            .nav-toggle {
                display: none;
                background: none;
                border: none;
                font-size: 1.5rem;
                color: var(--nav-dark);
                cursor: pointer;
                padding: 5px;
                border-radius: 5px;
                transition: background 0.3s ease;
            }

            .nav-toggle:hover {
                background: #f1f5f9;
            }

            /* Mobile menu */
            @media (max-width: 768px) {
                .nav-container {
                    padding: 12px 0;
                }
                
                .nav-logo-title {
                    font-size: 1.3rem;
                }
                
                .nav-toggle {
                    display: block;
                }
                
                .nav-menu {
                    position: fixed;
                    top: 70px;
                    left: -100%;
                    width: 100%;
                    height: calc(100vh - 70px);
                    background: white;
                    flex-direction: column;
                    align-items: stretch;
                    padding: 20px;
                    transition: left 0.3s ease;
                    box-shadow: var(--shadow-md);
                    overflow-y: auto;
                    gap: 20px;
                }
                
                .nav-menu.active {
                    left: 0;
                }
                
                .nav-links {
                    flex-direction: column;
                    gap: 0;
                    margin-right: 0;
                    width: 100%;
                }
                
                .nav-link {
                    padding: 15px 0;
                    border-bottom: 1px solid #e2e8f0;
                    font-size: 1.1rem;
                }
                
                .nav-link:last-child {
                    border-bottom: none;
                }
                
                .auth-buttons {
                    flex-direction: column;
                    width: 100%;
                    gap: 10px;
                }
                
                .btn {
                    width: 100%;
                    justify-content: center;
                }
                
                .user-nav-info {
                    margin-top: 20px;
                    padding: 15px;
                    flex-direction: column;
                    text-align: center;
                    background: #f8fafc;
                    width: 100%;
                }
                
                .user-avatar-nav {
                    width: 50px;
                    height: 50px;
                    font-size: 1.3rem;
                }
            }

            /* Animation pour les liens */
            @keyframes fadeInDown {
                from {
                    opacity: 0;
                    transform: translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .nav-link {
                animation: fadeInDown 0.5s ease backwards;
            }

            .nav-link:nth-child(1) { animation-delay: 0.1s; }
            .nav-link:nth-child(2) { animation-delay: 0.2s; }
            .nav-link:nth-child(3) { animation-delay: 0.3s; }
        `;

        document.head.appendChild(style);
    }

    setupMobileMenu() {
        const navToggle = document.getElementById('navToggle');
        const navMenu = document.getElementById('navMenu');

        if (navToggle && navMenu) {
            navToggle.addEventListener('click', () => {
                navMenu.classList.toggle('active');
                navToggle.innerHTML = navMenu.classList.contains('active')
                    ? '<i class="fas fa-times"></i>'
                    : '<i class="fas fa-bars"></i>';
            });

            // Fermer le menu en cliquant sur un lien
            document.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', () => {
                    navMenu.classList.remove('active');
                    if (navToggle) {
                        navToggle.innerHTML = '<i class="fas fa-bars"></i>';
                    }
                });
            });

            // Fermer le menu en cliquant à l'extérieur
            document.addEventListener('click', (e) => {
                if (!navMenu.contains(e.target) && !navToggle.contains(e.target) && navMenu.classList.contains('active')) {
                    navMenu.classList.remove('active');
                    navToggle.innerHTML = '<i class="fas fa-bars"></i>';
                }
            });
        }
    }

    setActiveLink() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        document.querySelectorAll('.nav-link').forEach(link => {
            const href = link.getAttribute('href');
            if (href === currentPage) {
                link.classList.add('active');
            }
        });
    }

    updateAuthUI() {
        // Mettre à jour la section d'authentification si nécessaire
        const authSection = document.getElementById('authSection');
        if (authSection) {
            authSection.innerHTML = this.getAuthHTML();
        }
    }

    logout() {
        // Supprimer les données d'authentification
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');

        // Rediriger vers la page de login
        window.location.href = 'login.html';
    }

    // Méthode pour forcer la mise à jour de la navbar
    updateUserInfo() {
        this.user = JSON.parse(localStorage.getItem('user') || 'null');
        this.token = localStorage.getItem('authToken');
        this.updateAuthUI();
        if (this.user && this.token) {
            this.updateAdoptionCount();
        }
    }

    async updateAdoptionCount() {
        if (!this.user || !this.token) return;
        try {
            const res = await fetch('/api/adoptions', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            if (res.ok) {
                const data = await res.json();
                const count = data.length;
                const badge = document.getElementById('adoptionBadge');
                if (badge) {
                    badge.textContent = count;
                    badge.style.display = count > 0 ? 'inline-block' : 'none';
                }
            }
        } catch (error) {
            console.error('Erreur lors de la mise à jour du badge:', error);
        }
    }
}

// Initialiser la navbar
document.addEventListener('DOMContentLoaded', () => {
    window.navbarManager = new NavbarManager();
});