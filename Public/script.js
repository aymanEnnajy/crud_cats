// Éléments DOM
const catsList = document.getElementById('catsList');
const addBtn = document.getElementById('addBtn');
const searchInput = document.getElementById('search');
const catCount = document.getElementById('catCount');
const catsCount = document.getElementById('catsCount');
const emptyState = document.getElementById('emptyState');
const formSection = document.querySelector('.form-section');
const tagFilter = document.getElementById('tagFilter');

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

// ============================================
// VARIABLES DE PAGINATION
// ============================================
let allCats = []; // Tous les chats
let currentPage = 1;
const catsPerPage = 3;
let filteredCats = [];
let showMoreContainer = null;

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
        await deleteCatFromDB(currentCatId);
        confirmationModal.classList.remove('show');
        // Recharger tous les chats après suppression
        allCats = await getAllCatsFromDB();
        await fetchCats(searchInput.value);
        populateTagFilter();
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

// ============================================
// FONCTIONS API
// ============================================

// Récupérer tous les chats
async function getAllCatsFromDB(search = '') {
    const res = await fetch('/api/cats');
    let cats = await res.json();
    if (search.trim()) {
        const searchLower = search.toLowerCase();
        cats = cats.filter(cat =>
            cat.name_cats.toLowerCase().includes(searchLower) ||
            cat.tag.toLowerCase().includes(searchLower) ||
            cat.description.toLowerCase().includes(searchLower)
        );
    }
    return cats;
}

// Ajouter un chat
async function addCatToDB(cat) {
    const res = await fetch('/api/cats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cat)
    });
    return await res.json();
}

// Modifier un chat
async function updateCatInDB(id, cat) {
    const token = localStorage.getItem('authToken');
    const res = await fetch(`/api/cats/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(cat)
    });
    return await res.json();
}

// Supprimer un chat
async function deleteCatFromDB(id) {
    const token = localStorage.getItem('authToken');
    await fetch(`/api/cats/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
}

// Récupérer un chat par ID
async function getCatFromDB(id) {
    const cats = await getAllCatsFromDB();
    return cats.find(cat => cat.id === id);
}

// Adopter un chat
async function adoptCat(catId) {
    const token = localStorage.getItem('authToken');
    if (!token) {
        showAlert("Utilisateur non trouvé. Veuillez vous reconnecter.", "danger");
        return;
    }

    try {
        const res = await fetch('/api/adoptions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ cat_id: catId })
        });

        const data = await res.json();
        if (res.ok) {
            showAlert("Demande d'adoption envoyée ! Retrouvez-la dans 'Mes Adoptions'.", "success");
            // Recharger pour mettre à jour les boutons
            allCats = await getAllCatsFromDB();
            await fetchCats(searchInput.value || '');
            // Mettre à jour le badge de la navbar
            if (window.navbarManager) {
                window.navbarManager.updateAdoptionCount();
            }
        } else {
            // Utiliser le message spécifique demandé si c'est un problème d'utilisateur/auth
            if (res.status === 401) {
                showAlert("Utilisateur non trouvé. Veuillez vous reconnecter.", "danger");
            } else {
                showAlert(data.error || "Erreur lors de l'adoption", "danger");
            }
        }
    } catch (error) {
        showAlert("Erreur réseau", "danger");
    }
}

// ============================================
// FONCTIONS DE PAGINATION
// ============================================

// Obtenir les chats pour la page courante
function getCatsForCurrentPage() {
    const startIndex = (currentPage - 1) * catsPerPage;
    const endIndex = startIndex + catsPerPage;
    return filteredCats.slice(startIndex, endIndex);
}

// Créer le bouton "Show More"
function createShowMoreButton() {
    const showMoreBtn = document.createElement('button');
    showMoreBtn.id = 'showMoreBtn';
    showMoreBtn.className = 'btn-primary';
    showMoreBtn.innerHTML = '<i class="fas fa-chevron-down"></i> Afficher plus de chats';
    showMoreBtn.style.cssText = `
        margin: 30px auto;
        display: block;
        max-width: 300px;
        width: 100%;
        padding: 15px;
        font-size: 1.1rem;
    `;

    showMoreBtn.addEventListener('click', loadMoreCats);

    return showMoreBtn;
}

// Charger plus de chats
function loadMoreCats() {
    currentPage++;
    const showMoreBtn = document.getElementById('showMoreBtn');

    // Animation du bouton pendant le chargement
    if (showMoreBtn) {
        const originalHTML = showMoreBtn.innerHTML;
        showMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Chargement...';
        showMoreBtn.disabled = true;

        // Simuler un délai pour l'animation
        setTimeout(() => {
            // Ajouter les nouveaux chats
            const newCats = getCatsForCurrentPage();
            displayAdditionalCats(newCats);

            // Mettre à jour l'interface
            updateShowMoreButton();
            updatePageIndicator();

            // Restaurer le bouton
            showMoreBtn.innerHTML = originalHTML;
            showMoreBtn.disabled = false;

            // Scroller légèrement vers les nouveaux éléments
            const lastCatCard = document.querySelector('.cat-card:last-child');
            if (lastCatCard) {
                lastCatCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }, 500);
    }
}

// Afficher des chats supplémentaires
function displayAdditionalCats(cats) {
    cats.forEach((cat, index) => {
        const div = document.createElement('div');
        div.classList.add('cat-card');
        div.style.animationDelay = `${index * 0.1}s`;
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const currentUserId = user.id;

        div.innerHTML = `
            <div class="cat-card-image-container">
                <img src="${cat.images || 'https://images.unsplash.com/photo-1514888286974-6d03bde4ba42?w=600'}" 
                     alt="${cat.name_cats}" 
                     onerror="this.src='https://images.unsplash.com/photo-1514888286974-6d03bde4ba42?w=600'">
                <div class="cat-card-overlay">
                    ${cat.adoption_status === 'confirmed' ? `
                        <span class="adoption-badge-overlay confirmed" style="background: rgba(16, 185, 129, 0.9); color: white;">
                            <i class="fas fa-check-circle"></i> Adopté
                        </span>
                    ` : cat.adoption_status === 'pending' ? `
                        <span class="adoption-badge-overlay pending" style="background: rgba(245, 158, 11, 0.9); color: white;">
                            <i class="fas fa-clock"></i> Réservé
                        </span>
                    ` : `
                        <button class="btn-success-overlay" onclick="adoptCat(${cat.id})">
                            <i class="fas fa-heart"></i> Adopter
                        </button>
                    `}
                </div>
            </div>
            <div class="cat-card-content">
                <h3>${cat.name_cats}</h3>
                <div class="cat-tag">${cat.tag}</div>
                <p>${cat.description}</p>
                <div class="cat-card-actions">
                    ${cat.id_user == currentUserId ? `
                        <button class="btn-primary" onclick="editCat(${cat.id})">
                            <i class="fas fa-edit"></i> Modifier
                        </button>
                        <button class="btn-danger" onclick="deleteCat(${cat.id})">
                            <i class="fas fa-trash"></i> Supprimer
                        </button>
                    ` : `
                        <span class="owner-only-badge"><i class="fas fa-lock"></i> Consultable</span>
                    `}
                </div>
            </div>
        `;

        // Animation d'apparition
        div.style.opacity = '0';
        div.style.transform = 'translateY(20px)';
        catsList.appendChild(div);

        // Animation
        setTimeout(() => {
            div.style.transition = 'all 0.5s ease';
            div.style.opacity = '1';
            div.style.transform = 'translateY(0)';
        }, 10);
    });
}

// Mettre à jour l'affichage du bouton "Show More"
function updateShowMoreButton() {
    const totalPages = Math.ceil(filteredCats.length / catsPerPage);
    const showMoreBtn = document.getElementById('showMoreBtn');

    if (currentPage >= totalPages) {
        // Masquer le bouton si on a tout affiché
        if (showMoreBtn) {
            showMoreBtn.style.display = 'none';

            // Afficher un message "Fin des résultats" si nécessaire
            if (filteredCats.length > catsPerPage && !document.getElementById('endMessage')) {
                const endDiv = document.createElement('div');
                endDiv.id = 'endMessage';
                endDiv.className = 'end-message';
                endDiv.innerHTML = `
                    <i class="fas fa-check-circle"></i>
                    <span>Tous les chats sont affichés</span>
                `;

                // Ajouter après le bouton
                if (showMoreContainer) {
                    showMoreContainer.appendChild(endDiv);
                }
            }
        }
    } else {
        // Afficher le bouton s'il y a plus de résultats
        if (!showMoreBtn) {
            const newShowMoreBtn = createShowMoreButton();
            if (showMoreContainer) {
                showMoreContainer.appendChild(newShowMoreBtn);
            } else {
                // Créer le conteneur si nécessaire
                showMoreContainer = document.createElement('div');
                showMoreContainer.id = 'showMoreContainer';
                showMoreContainer.style.textAlign = 'center';
                showMoreContainer.style.marginTop = '30px';
                catsList.parentNode.appendChild(showMoreContainer);
                showMoreContainer.appendChild(newShowMoreBtn);
            }
        } else {
            showMoreBtn.style.display = 'block';
        }

        // Supprimer le message de fin si présent
        const endMessage = document.getElementById('endMessage');
        if (endMessage) endMessage.remove();
    }
}

// Mettre à jour l'indicateur de page
function updatePageIndicator() {
    const totalPages = Math.ceil(filteredCats.length / catsPerPage);
    const displayedCount = Math.min(currentPage * catsPerPage, filteredCats.length);

    // Mettre à jour le compteur de chats
    if (catsCount) {
        catsCount.textContent = `${displayedCount}/${filteredCats.length}`;
    }

    // Créer ou mettre à jour l'indicateur de page
    let pageIndicator = document.getElementById('pageIndicator');
    if (!pageIndicator && filteredCats.length > catsPerPage) {
        pageIndicator = document.createElement('div');
        pageIndicator.id = 'pageIndicator';
        pageIndicator.className = 'page-indicator';
        pageIndicator.style.cssText = `
            text-align: center;
            margin: 15px 0;
            color: var(--gray-color);
            font-size: 0.9rem;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            background: #f8fafc;
            padding: 10px 20px;
            border-radius: 20px;
            border: 1px solid #e2e8f0;
            display: inline-block;
        `;

        // Ajouter après le titre
        const catsSection = document.querySelector('.cats-section h2');
        if (catsSection && catsSection.parentNode) {
            catsSection.parentNode.insertBefore(pageIndicator, catsSection.nextSibling);
        }
    }

    if (pageIndicator) {
        pageIndicator.innerHTML = `
            Page <strong>${currentPage}</strong> sur <strong>${totalPages}</strong>
            <span style="margin: 0 10px">•</span>
            <span style="color: var(--primary-color); font-weight: 600;">
                ${displayedCount} sur ${filteredCats.length} chats
            </span>
        `;

        // Afficher/masquer selon le nombre de pages
        pageIndicator.style.display = totalPages > 1 ? 'block' : 'none';
    }
}

// Réinitialiser la pagination
function resetPagination() {
    currentPage = 1;
}

// Filtrer les chats (recherche + tag)
function filterCats(cats, search = '', tag = '') {
    let filtered = [...cats];

    // Filtre par recherche
    if (search.trim()) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(cat =>
            cat.name_cats.toLowerCase().includes(searchLower) ||
            cat.tag.toLowerCase().includes(searchLower) ||
            cat.description.toLowerCase().includes(searchLower)
        );
    }

    // Filtre par tag
    if (tag) {
        filtered = filtered.filter(cat => cat.tag === tag);
    }

    return filtered;
}

// ============================================
// FONCTIONS PRINCIPALES MODIFIÉES
// ============================================

// Afficher tous les chats avec pagination
async function fetchCats(search = '') {
    if (search.trim() !== '') {
        formSection.style.display = 'none';
    } else {
        formSection.style.display = 'block';
    }

    // Charger tous les chats si nécessaire
    if (allCats.length === 0) {
        allCats = await getAllCatsFromDB();
    }

    // Appliquer les filtres
    const selectedTag = tagFilter ? tagFilter.value : '';
    filteredCats = filterCats(allCats, search, selectedTag);

    // Réinitialiser la pagination
    resetPagination();

    // Effacer la liste actuelle
    catsList.innerHTML = '';

    if (filteredCats.length === 0) {
        emptyState.style.display = 'block';
        catsList.appendChild(emptyState);
        catCount.textContent = '0';
        catsCount.textContent = '0';

        // Cacher le bouton "Show More" et l'indicateur
        const showMoreBtn = document.getElementById('showMoreBtn');
        if (showMoreBtn) showMoreBtn.style.display = 'none';
        const pageIndicator = document.getElementById('pageIndicator');
        if (pageIndicator) pageIndicator.style.display = 'none';
        return;
    }

    emptyState.style.display = 'none';
    catCount.textContent = filteredCats.length;

    // Afficher les chats de la page courante
    const catsToDisplay = getCatsForCurrentPage();
    catsCount.textContent = `${catsToDisplay.length}/${filteredCats.length}`;

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const currentUserId = user.id;

    catsToDisplay.forEach((cat, index) => {
        const div = document.createElement('div');
        div.classList.add('cat-card');
        div.style.animationDelay = `${index * 0.1}s`;
        div.innerHTML = `
            <div class="cat-card-image-container">
                <img src="${cat.images || 'https://images.unsplash.com/photo-1514888286974-6d03bde4ba42?w=600'}" 
                     alt="${cat.name_cats}" 
                     onerror="this.src='https://images.unsplash.com/photo-1514888286974-6d03bde4ba42?w=600'">
                <div class="cat-card-overlay">
                    ${cat.adoption_status === 'confirmed' ? `
                        <span class="adoption-badge-overlay confirmed" style="background: rgba(16, 185, 129, 0.9); color: white;">
                            <i class="fas fa-check-circle"></i> Adopté
                        </span>
                    ` : cat.adoption_status === 'pending' ? `
                        <span class="adoption-badge-overlay pending" style="background: rgba(245, 158, 11, 0.9); color: white;">
                            <i class="fas fa-clock"></i> Réservé
                        </span>
                    ` : `
                        <button class="btn-success-overlay" onclick="adoptCat(${cat.id})">
                            <i class="fas fa-heart"></i> Adopter
                        </button>
                    `}
                </div>
            </div>
            <div class="cat-card-content">
                <h3>${cat.name_cats}</h3>
                <div class="cat-tag">${cat.tag}</div>
                <p>${cat.description}</p>
                <div class="cat-card-actions">
                    ${cat.id_user == currentUserId ? `
                        <button class="btn-primary" onclick="editCat(${cat.id})">
                            <i class="fas fa-edit"></i> Modifier
                        </button>
                        <button class="btn-danger" onclick="deleteCat(${cat.id})">
                            <i class="fas fa-trash"></i> Supprimer
                        </button>
                    ` : `
                        <span class="owner-only-badge"><i class="fas fa-lock"></i> Consultable</span>
                    `}
                </div>
            </div>
        `;
        catsList.appendChild(div);
    });

    // Afficher/masquer le bouton "Show More"
    updateShowMoreButton();

    // Mettre à jour l'indicateur de page
    updatePageIndicator();
}

// Ajouter chat (modifié pour recharger tous les chats)
addBtn.addEventListener('click', async () => {
    if (!nameInput.value || !tagInput.value || !descInput.value || !imgInput.value) {
        showAlert("Veuillez remplir tous les champs !");
        return;
    }

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const id_user = user.id;

    if (!id_user) {
        showAlert("Session expirée. Veuillez vous reconnecter.", "danger");
        return;
    }

    const newCat = {
        id_user: id_user,
        name_cats: nameInput.value,
        tag: tagInput.value,
        description: descInput.value,
        images: imgInput.value
    };

    const originalText = addBtn.innerHTML;
    addBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ajout...';
    addBtn.disabled = true;

    try {
        await addCatToDB(newCat);

        nameInput.value = '';
        tagInput.value = '';
        descInput.value = '';
        imgInput.value = '';

        addBtn.innerHTML = '<i class="fas fa-check"></i> Ajouté !';
        addBtn.style.backgroundColor = '#10b981';
        setTimeout(() => {
            addBtn.innerHTML = originalText;
            addBtn.style.backgroundColor = '';
            addBtn.disabled = false;
        }, 1500);

        // Recharger tous les chats après ajout
        allCats = await getAllCatsFromDB();
        await fetchCats(searchInput.value);
        populateTagFilter();
    } catch (error) {
        showAlert('Erreur lors de l\'ajout du chat', 'danger');
        addBtn.innerHTML = originalText;
        addBtn.disabled = false;
    }
});

// Supprimer chat
function deleteCat(id) {
    currentCatId = id;
    confirmationModal.classList.add('show');
}

// Modifier chat (modifié pour recharger après modification)
async function editCat(id) {
    const cat = await getCatFromDB(id);
    if (!cat) {
        showAlert('Chat non trouvé dans la base de données', 'danger');
        return;
    }

    document.getElementById('editName').value = cat.name_cats;
    document.getElementById('editTag').value = cat.tag;
    document.getElementById('editDesc').value = cat.description;
    document.getElementById('editImg').value = cat.images;

    currentCatId = id;
    editModal.classList.add('show');

    const saveHandler = async () => {
        const updatedCat = {
            name_cats: document.getElementById('editName').value,
            tag: document.getElementById('editTag').value,
            description: document.getElementById('editDesc').value,
            images: document.getElementById('editImg').value
        };

        if (!updatedCat.name_cats || !updatedCat.tag || !updatedCat.description || !updatedCat.images) {
            showAlert('Veuillez remplir tous les champs !');
            return;
        }

        const saveBtn = document.getElementById('editSave');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enregistrement...';
        saveBtn.disabled = true;

        try {
            await updateCatInDB(id, updatedCat);
            editModal.classList.remove('show');

            // Recharger tous les chats après modification
            allCats = await getAllCatsFromDB();
            await fetchCats(searchInput.value);
            populateTagFilter();
            showAlert('Chat modifié avec succès !', 'success');
        } catch (error) {
            showAlert('Erreur lors de la modification', 'danger');
        }

        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    };

    const cancelHandler = () => editModal.classList.remove('show');

    const saveBtn = document.getElementById('editSave');
    const cancelBtn = document.getElementById('editCancel');

    const newSaveBtn = saveBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);

    saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    newSaveBtn.addEventListener('click', saveHandler);
    newCancelBtn.addEventListener('click', cancelHandler);
}

// Recherche en direct
let searchTimeout;
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    if (e.target.value.trim() !== '') formSection.style.display = 'none';
    else formSection.style.display = 'block';

    searchTimeout = setTimeout(() => {
        const selectedTag = tagFilter ? tagFilter.value : '';
        fetchCats(e.target.value, selectedTag);
    }, 300);
});

// Remplir la sélection des tags
async function populateTagFilter() {
    if (!tagFilter) return;
    const cats = await getAllCatsFromDB();
    const tags = Array.from(new Set(cats.map(c => c.tag).filter(Boolean)));
    // conserver la sélection courante si possible
    const current = tagFilter.value || '';
    tagFilter.innerHTML = '<option value="">Tous les tags</option>';
    tags.sort().forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t;
        tagFilter.appendChild(opt);
    });
    if (current) tagFilter.value = current;
}

if (tagFilter) {
    tagFilter.addEventListener('change', () => {
        fetchCats(searchInput.value, tagFilter.value);
    });
}

// Fonction d'alerte
function showAlert(message, type = 'info') {
    const alertMessage = document.getElementById('alertMessage');
    alertMessage.textContent = message;
    const header = alertModal.querySelector('.modal-header');
    const icon = header.querySelector('i');

    if (type === 'success') {
        header.style.background = 'linear-gradient(90deg, #10b981, #059669)';
        icon.className = 'fas fa-check-circle';
    } else if (type === 'danger') {
        header.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
        icon.className = 'fas fa-exclamation-triangle';
    } else {
        header.style.background = 'linear-gradient(90deg, var(--primary-color), var(--primary-dark))';
        icon.className = 'fas fa-info-circle';
    }

    alertModal.classList.add('show');
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    fetchCats();
    populateTagFilter();
    const title = document.querySelector('.header h1');
    if (title) title.style.animation = 'fadeInDown 0.8s ease';

    // Ajouter les styles CSS pour la pagination
    addPaginationStyles();
});

// ============================================
// STYLES CSS POUR LA PAGINATION
// ============================================

function addPaginationStyles() {
    const style = document.createElement('style');
    style.textContent = `
            /* Styles pour la pagination */
            .end - message {
                background: linear - gradient(90deg, #f0f9ff, #e0f2fe);
                border: 1px solid #bae6fd;
                border- radius: 12px;
    padding: 20px;
    margin: 30px auto;
    max - width: 400px;
    text - align: center;
    color: #0369a1;
    display: flex;
    align - items: center;
    justify - content: center;
    gap: 15px;
    animation: fadeInUp 0.5s ease;
}
        
        .end - message i {
    font - size: 1.5rem;
    color: #0ea5e9;
}
        
        .end - message span {
    font - weight: 500;
    font - size: 1rem;
}
        
        .page - indicator {
    background: var(--light - color);
    padding: 12px 25px;
    border - radius: 25px;
    border: 2px solid var(--light - gray);
    display: inline - flex;
    align - items: center;
    gap: 15px;
    font - size: 0.95rem;
    color: var(--gray - color);
    margin: 20px 0;
    box - shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}
        
        .page - indicator strong {
    color: var(--primary - color);
    font - weight: 700;
}

#showMoreBtn {
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
}

#showMoreBtn:hover {
    transform: translateY(-3px);
    box - shadow: 0 10px 20px rgba(79, 70, 229, 0.3);
}

#showMoreBtn:disabled {
    opacity: 0.7;
    cursor: not - allowed;
    transform: none!important;
}

@keyframes fadeInUp {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
}

        .owner - only - badge {
    display: inline - flex;
    align - items: center;
    gap: 8px;
    padding: 8px 16px;
    background: #f1f5f9;
    color: #64748b;
    border - radius: 20px;
    font - size: 0.85rem;
    font - weight: 500;
    border: 1px solid #e2e8f0;
}

        .btn - success {
    background: linear - gradient(90deg, #10b981, #059669);
    color: white;
    padding: 8px 16px;
    border - radius: 8px;
    border: none;
    cursor: pointer;
    font - weight: 500;
    display: inline - flex;
    align - items: center;
    gap: 8px;
    transition: all 0.3s ease;
}

        .btn - success:hover {
    transform: translateY(-2px);
    box - shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
}

        .adoption - badge {
    display: inline - flex;
    align - items: center;
    gap: 8px;
    padding: 8px 16px;
    border - radius: 20px;
    font - size: 0.85rem;
    font - weight: 600;
}

        .adoption - badge.adopted {
    background: #fef2f2;
    color: #ef4444;
    border: 1px solid #fee2e2;
}
`;
    document.head.appendChild(style);
}