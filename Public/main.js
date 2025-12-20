
// Éléments DOM
const catsList = document.getElementById('catsList');
const addBtn = document.getElementById('addBtn');
const searchInput = document.getElementById('search');
const catCount = document.getElementById('catCount');
const catsCount = document.getElementById('catsCount');
const emptyState = document.getElementById('emptyState');
const formSection = document.querySelector('.form-section');

// Champs du formulaire
const nameInput = document.getElementById('name_cats');
const tagInput = document.getElementById('tag');
const descInput = document.getElementById('description');
const imgInput = document.getElementById('images');

// Modales
const confirmationModal = document.getElementById('confirmationModal');
const editModal = document.getElementById('editModal');
const alertModal = document.getElementById('alertModal');
const modalConfirm = document.getElementById('modalConfirm');
const modalCancel = document.getElementById('modalCancel');
const alertOk = document.getElementById('alertOk');

// Variables pour la gestion
let currentCatId = null;

// Initialiser les modales
document.querySelectorAll('.close-modal').forEach(button => {
    button.addEventListener('click', () => {
        confirmationModal.classList.remove('show');
        editModal.classList.remove('show');
        alertModal.classList.remove('show');
    });
});

modalCancel.addEventListener('click', () => {
    confirmationModal.classList.remove('show');
});

modalConfirm.addEventListener('click', async () => {
    if (currentCatId) {
        await fetch(`/api/cats/${currentCatId}`, { method: 'DELETE' });
        confirmationModal.classList.remove('show');
        fetchCats(searchInput.value);
        showAlert('Chat supprimé avec succès !', 'success');
    }
});

alertOk.addEventListener('click', () => {
    alertModal.classList.remove('show');
});

// Fermer modales en cliquant à l'extérieur
window.addEventListener('click', (e) => {
    if (e.target === confirmationModal || e.target === editModal || e.target === alertModal) {
        e.target.classList.remove('show');
    }
});

// Afficher tous les chats
async function fetchCats(search = '') {
    try {
        // Masquer/afficher le formulaire selon la recherche
        if (search.trim() !== '') {
            formSection.style.display = 'none';
        } else {
            formSection.style.display = 'block';
        }
        
        const res = await fetch(`/api/cats?search=${search}`);
        const data = await res.json();
        catsList.innerHTML = '';

        if (data.length === 0) {
            emptyState.style.display = 'block';
            catsList.appendChild(emptyState);
            catCount.textContent = '0';
            catsCount.textContent = '0';
            return;
        }

        emptyState.style.display = 'none';
        catCount.textContent = data.length;
        catsCount.textContent = data.length;

        data.forEach((cat, index) => {
            const div = document.createElement('div');
            div.classList.add('cat-card');
            div.style.animationDelay = `${index * 0.1}s`;
            div.innerHTML = `
                <img src="${cat.images || 'https://images.unsplash.com/photo-1514888286974-6d03bde4ba42?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'}" 
                     alt="${cat.name_cats}" 
                     onerror="this.src='https://images.unsplash.com/photo-1514888286974-6d03bde4ba42?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'">
                <div class="cat-card-content">
                    <h3>${cat.name_cats}</h3>
                    <div class="cat-tag">${cat.tag}</div>
                    <p>${cat.description}</p>
                    <div class="cat-card-actions">
                        <button class="btn-primary" onclick="editCat(${cat.id})">
                            <i class="fas fa-edit"></i> Modifier
                        </button>
                        <button class="btn-danger" onclick="deleteCat(${cat.id})">
                            <i class="fas fa-trash"></i> Supprimer
                        </button>
                    </div>
                </div>
            `;
            catsList.appendChild(div);
        });
    } catch (error) {
        console.error('Erreur:', error);
        catsList.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle error-icon"></i>
                <h3>Erreur de connexion</h3>
                <p>Vérifiez votre connexion internet</p>
                <button class="btn-primary" onclick="fetchCats()">
                    <i class="fas fa-redo"></i> Réessayer
                </button>
            </div>
        `;
    }
}

// Ajouter chat
addBtn.addEventListener('click', async () => {
    if (!nameInput.value || !tagInput.value || !descInput.value || !imgInput.value) {
        showAlert("Veuillez remplir tous les champs !");
        return;
    }

    const newCat = {
        name_cats: nameInput.value,
        tag: tagInput.value,
        description: descInput.value,
        images: imgInput.value
    };

    // Animation du bouton
    const originalText = addBtn.innerHTML;
    addBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ajout...';
    addBtn.disabled = true;

    try {
        await fetch('/api/cats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newCat)
        });

        // Réinitialiser
        nameInput.value = '';
        tagInput.value = '';
        descInput.value = '';
        imgInput.value = '';

        // Succès visuel
        addBtn.innerHTML = '<i class="fas fa-check"></i> Ajouté !';
        addBtn.style.backgroundColor = '#10b981';
        
        setTimeout(() => {
            addBtn.innerHTML = originalText;
            addBtn.style.backgroundColor = '';
            addBtn.disabled = false;
        }, 1500);

        fetchCats(searchInput.value);
    } catch (error) {
        console.error('Erreur:', error);
        showAlert("Erreur lors de l'ajout");
        addBtn.innerHTML = originalText;
        addBtn.disabled = false;
    }
});

// Supprimer chat
async function deleteCat(id) {
    currentCatId = id;
    confirmationModal.classList.add('show');
}

// Modifier chat
async function editCat(id) {
    try {
        const res = await fetch(`/api/cats/${id}`);
        const cat = await res.json();
        
        // Remplir la modale
        document.getElementById('editName').value = cat.name_cats;
        document.getElementById('editTag').value = cat.tag;
        document.getElementById('editDesc').value = cat.description;
        document.getElementById('editImg').value = cat.images;
        
        currentCatId = id;
        editModal.classList.add('show');
        
        // Configurer le bouton Enregistrer
        const editSave = document.getElementById('editSave');
        const newEditSave = editSave.cloneNode(true);
        editSave.parentNode.replaceChild(newEditSave, editSave);
        
        newEditSave.addEventListener('click', async () => {
            const name = document.getElementById('editName').value;
            const tag = document.getElementById('editTag').value;
            const desc = document.getElementById('editDesc').value;
            const img = document.getElementById('editImg').value;
            
            if (name && tag && desc && img) {
                // Animation
                newEditSave.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enregistrement...';
                newEditSave.disabled = true;
                
                await fetch(`/api/cats/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name_cats: name, tag, description: desc, images: img })
                });
                
                editModal.classList.remove('show');
                fetchCats(searchInput.value);
                showAlert('Chat modifié avec succès !', 'success');
            } else {
                showAlert('Veuillez remplir tous les champs !');
            }
        });
    } catch (error) {
        console.error('Erreur:', error);
        showAlert('Erreur lors du chargement des données');
    }
}

// Recherche en direct
let searchTimeout;
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    
    // Masquer/afficher le formulaire
    if (e.target.value.trim() !== '') {
        formSection.style.display = 'none';
    } else {
        formSection.style.display = 'block';
    }
    
    searchTimeout = setTimeout(() => {
        fetchCats(e.target.value);
    }, 300);
});

// Fonction d'alerte personnalisée
function showAlert(message, type = 'info') {
    const alertMessage = document.getElementById('alertMessage');
    alertMessage.textContent = message;
    
    // Couleur selon le type
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


// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    fetchCats();
});

