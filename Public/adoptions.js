document.addEventListener('DOMContentLoaded', () => {
    fetchUserAdoptions();

    // Fermer la modale d'alerte
    const alertModal = document.getElementById('alertModal');
    const alertOk = document.getElementById('alertOk');
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => alertModal.classList.remove('show'));
    });
    alertOk.addEventListener('click', () => alertModal.classList.remove('show'));
});

async function fetchUserAdoptions() {
    const adoptionsList = document.getElementById('adoptionsList');
    const token = localStorage.getItem('authToken');

    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const res = await fetch('/api/adoptions', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        adoptionsList.innerHTML = '';

        if (data.length === 0) {
            adoptionsList.innerHTML = `
                <div class="no-adoptions" style="grid-column: 1 / -1;">
                    <i class="fas fa-heart-broken fa-4x" style="color: #cbd5e1; margin-bottom: 20px;"></i>
                    <h3>Aucune adoption pour le moment</h3>
                    <p>Parcourez l'accueil pour trouver votre futur compagnon !</p>
                    <a href="index.html" class="btn-primary" style="display: inline-flex; margin-top: 20px; text-decoration: none;">
                        <i class="fas fa-search"></i> Voir les chats
                    </a>
                </div>
            `;
            return;
        }

        data.forEach((cat, index) => {
            const isConfirmed = cat.adoption_status === 'confirmed';
            const div = document.createElement('div');
            div.classList.add('cat-card');
            div.style.animationDelay = `${index * 0.1}s`;

            // Badge style based on status
            const badgeText = isConfirmed ? 'Adopté' : 'En attente';
            const badgeClass = isConfirmed ? 'confirmed' : 'pending';
            const badgeStyle = isConfirmed
                ? 'background: rgba(236, 253, 245, 0.9); color: #059669;'
                : 'background: rgba(254, 243, 199, 0.9); color: #d97706;';

            div.innerHTML = `
                <div class="cat-card-image-container">
                    <img src="${cat.images || 'https://images.unsplash.com/photo-1514888286974-6d03bde4ba42?w=600'}" 
                         alt="${cat.name_cats}" 
                         onerror="this.src='https://images.unsplash.com/photo-1514888286974-6d03bde4ba42?w=600'">
                    <div class="cat-card-overlay" style="opacity: 1; background: rgba(0,0,0,0.2);">
                        <span class="adoption-badge-overlay ${badgeClass}" style="${badgeStyle}">
                            <i class="fas ${isConfirmed ? 'fa-check-circle' : 'fa-clock'}"></i> ${badgeText}
                        </span>
                    </div>
                </div>
                <div class="cat-card-content">
                    <h3>${cat.name_cats}</h3>
                    <div class="cat-tag">${cat.tag}</div>
                    <p>${cat.description}</p>
                    <div class="cat-card-actions" style="display: flex; gap: 10px; flex-direction: column;">
                        ${!isConfirmed ? `
                        <button class="btn-primary" style="width: 100%;" onclick="confirmAdoption(${cat.id})">
                            <i class="fas fa-check"></i> Confirmer l'adoption
                        </button>
                        ` : ''}
                        <button class="btn-danger" style="width: 100%;" onclick="cancelAdoption(${cat.id})">
                            <i class="fas fa-times"></i> ${isConfirmed ? 'Annuler et libérer' : "Annuler l'adoption"}
                        </button>
                    </div>
                </div>
            `;
            adoptionsList.appendChild(div);
        });
    } catch (error) {
        console.error('Erreur:', error);
        showAlert("Erreur lors du chargement de vos adoptions", "danger");
    }
}

async function confirmAdoption(catId) {
    const token = localStorage.getItem('authToken');
    try {
        const res = await fetch(`/api/adoptions/${catId}/status`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'confirmed' })
        });

        if (res.ok) {
            showAlert("Adoption confirmée ! Le chat est maintenant à vous.", "success");
            fetchUserAdoptions();
        } else {
            showAlert("Erreur lors de la confirmation", "danger");
        }
    } catch (error) {
        showAlert("Erreur réseau", "danger");
    }
}

async function cancelAdoption(catId) {
    const token = localStorage.getItem('authToken');
    try {
        const res = await fetch(`/api/adoptions/${catId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            showAlert("Adoption annulée avec succès", "success");
            fetchUserAdoptions();
            // Mettre à jour le badge de la navbar
            if (window.navbarManager) {
                window.navbarManager.updateAdoptionCount();
            }
        } else {
            showAlert("Erreur lors de l'annulation", "danger");
        }
    } catch (error) {
        showAlert("Erreur réseau", "danger");
    }
}

function showAlert(message, type = 'info') {
    const alertModal = document.getElementById('alertModal');
    const alertMessage = document.getElementById('alertMessage');
    alertMessage.textContent = message;

    const header = alertModal.querySelector('.modal-header');
    if (type === 'success') {
        header.style.background = 'linear-gradient(90deg, #10b981, #059669)';
    } else if (type === 'danger') {
        header.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
    } else {
        header.style.background = 'linear-gradient(90deg, var(--primary-color), var(--primary-dark))';
    }

    alertModal.classList.add('show');
}
