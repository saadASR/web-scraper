const form = document.getElementById('scraperForm');
const urlInput = document.getElementById('url');
const submitBtn = document.getElementById('submitBtn');
const btnText = submitBtn.querySelector('.btn-text');
const btnLoader = submitBtn.querySelector('.btn-loader');
const errorDiv = document.getElementById('error');
const successDiv = document.getElementById('success');
const resultsDiv = document.getElementById('results');
const clearCacheLink = document.getElementById('clearCache');

// État de l'application
let isLoading = false;

/**
 * Soumettre le formulaire
 */
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (isLoading) return;
    
    const url = urlInput.value.trim();
    
    // Validation côté client
    if (!url) {
        showError('Veuillez entrer une URL');
        return;
    }
    
    if (!isValidUrl(url)) {
        showError('URL invalide. Utilisez le format: https://example.com');
        return;
    }
    
    await scrapeUrl(url);
});

/**
 * Scraper une URL
 */
async function scrapeUrl(url) {
    setLoading(true);
    hideMessages();
    
    try {
        const response = await fetch('/api/scrape', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.details || data.error || 'Erreur lors du scraping');
        }
        
        displayResults(data);
        showSuccess('Scraping réussi ! 🎉');
        
    } catch (error) {
        console.error('Erreur:', error);
        showError(error.message);
    } finally {
        setLoading(false);
    }
}

/**
 * Afficher les résultats
 */
function displayResults(data) {
    const {
        url,
        title,
        meta,
        headings,
        paragraphs,
        links,
        images,
        stats,
        fromCache,
        scrapedAt
    } = data;
    
    let html = `
        <div class="results-header">
            <h2>📊 Résultats du scraping</h2>
            ${fromCache ? '<span class="cache-badge">📦 Depuis le cache</span>' : ''}
        </div>
    `;
    
    // Statistiques
    html += `
        <div class="result-card">
            <div class="result-title">📈 Statistiques</div>
            <div class="stats-grid">
                <div class="stat-item clickable-stat" data-type="headings">
                    <span class="stat-value">${stats.totalHeadings}</span>
                    <span class="stat-label">Titres</span>
                </div>
                <div class="stat-item clickable-stat" data-type="paragraphs">
                    <span class="stat-value">${stats.totalParagraphs}</span>
                    <span class="stat-label">Paragraphes</span>
                </div>
                <div class="stat-item clickable-stat" data-type="links">
                    <span class="stat-value">${stats.totalLinks}</span>
                    <span class="stat-label">Liens</span>
                </div>
                <div class="stat-item clickable-stat" data-type="images">
                    <span class="stat-value">${stats.totalImages}</span>
                    <span class="stat-label">Images</span>
                </div>
                <div class="stat-item clickable-stat" data-type="all">
                    <span class="stat-value">${stats.wordCount}</span>
                    <span class="stat-label">Tout</span>
                </div>
            </div>
        </div>
    `;
    
    // Titre de la page
    html += `
        <div class="result-card">
            <div class="result-title">📄 Titre de la page</div>
            <div class="result-content">
                <strong>${escapeHtml(title)}</strong>
            </div>
        </div>
    `;
    
    // Métadonnées
    if (meta && (meta.description || meta.keywords || meta.author)) {
        html += `
            <div class="result-card">
                <div class="result-title">🏷️ Métadonnées</div>
                <div class="meta-grid">
        `;
        
        if (meta.description) {
            html += `
                <div class="meta-item">
                    <div class="meta-label">Description</div>
                    <div class="meta-value">${escapeHtml(meta.description)}</div>
                </div>
            `;
        }
        
        if (meta.keywords) {
            html += `
                <div class="meta-item">
                    <div class="meta-label">Mots-clés</div>
                    <div class="meta-value">${escapeHtml(meta.keywords)}</div>
                </div>
            `;
        }
        
        if (meta.author) {
            html += `
                <div class="meta-item">
                    <div class="meta-label">Auteur</div>
                    <div class="meta-value">${escapeHtml(meta.author)}</div>
                </div>
            `;
        }
        
        html += `
                </div>
            </div>
        `;
    }
    
    // Titres
    if (headings && headings.length > 0) {
        html += `
            <div class="result-card" data-section="headings">
                <div class="result-title">
                    📑 Titres
                    <span class="badge">${headings.length}</span>
                </div>
                <div class="result-content" data-content="headings">
        `;
        
        const displayHeadings = headings.slice(0, 9);
        displayHeadings.forEach(h => {
            html += `
                <div class="heading-item ${h.level}">
                    <span class="heading-level">${h.level.toUpperCase()}</span>
                    ${escapeHtml(h.text)}
                </div>
            `;
        });
        
        if (headings.length > 10) {
            html += `
                <div class="pagination-controls" data-section="headings"></div>
            `;
        }
        
        html += `
                </div>
            </div>
        `;
    }
    
    // Paragraphes
    if (paragraphs && paragraphs.length > 0) {
        html += `
            <div class="result-card" data-section="paragraphs">
                <div class="result-title">
                    📝 Paragraphes
                    <span class="badge">${paragraphs.length}</span>
                </div>
                <div class="result-content" data-content="paragraphs">
        `;
        
        const displayParagraphs = paragraphs.slice(0, 9);
        displayParagraphs.forEach(p => {
            const truncated = p.length > 200 ? p.substring(0, 200) + '...' : p;
            html += `<p>• ${escapeHtml(truncated)}</p>`;
        });
        
        if (paragraphs.length > 10) {
            html += `
                <div class="pagination-controls" data-section="paragraphs"></div>
            `;
        }
        
        html += `
                </div>
            </div>
        `;
    }
    
    // Liens
    if (links && links.length > 0) {
        html += `
            <div class="result-card" data-section="links">
                <div class="result-title">
                    🔗 Liens
                    <span class="badge">${links.length}</span>
                </div>
                <div class="result-content" data-content="links">
        `;
        
        const displayLinks = links.slice(0, 9);
        displayLinks.forEach(link => {
            html += `
                <p>• <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener">
                    ${escapeHtml(link.text || link.url)}
                </a></p>
            `;
        });
        
        if (links.length > 10) {
            html += `
                <div class="pagination-controls" data-section="links"></div>
            `;
        }
        
        html += `
                </div>
            </div>
        `;
    }
    
    // Images
    if (images && images.length > 0) {
        html += `
            <div class="result-card" data-section="images">
                <div class="result-title">
                    🖼️ Images
                    <span class="badge">${images.length}</span>
                </div>
                <div class="images-grid" data-content="images">
        `;
        
        const displayImages = images.slice(0, 9);
        displayImages.forEach(img => {
            html += `
                <div class="image-item">
                    <img src="${escapeHtml(img.src)}" 
                         alt="${escapeHtml(img.alt)}" 
                         loading="lazy"
                         onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22150%22 height=%22120%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22150%22 height=%22120%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 fill=%22%23999%22%3EImage%3C/text%3E%3C/svg%3E'">
                    ${img.alt ? `<div class="image-info">${escapeHtml(img.alt)}</div>` : ''}
                </div>
            `;
        });
        
        if (images.length > 10) {
            html += `
                <div class="pagination-controls" data-section="images"></div>
            `;
        }
        
        html += `
                </div>
            </div>
        `;
    }
    
    // Informations de scraping
    html += `
        <div class="result-card">
            <div class="result-title">ℹ️ Informations</div>
            <div class="result-content">
                <p><strong>URL :</strong> <a href="${escapeHtml(url)}" target="_blank">${escapeHtml(url)}</a></p>
                <p><strong>Scraped à :</strong> ${new Date(scrapedAt).toLocaleString('fr-FR')}</p>
            </div>
        </div>
    `;
    
    resultsDiv.innerHTML = html;
    resultsDiv.style.display = 'block';
    
    // Store data for pagination
    window.scrapedData = data;
    
    // Add event listeners for clickable statistics
    addStatClickListeners();
    
    // Add event listeners for pagination controls
    addPaginationListeners();
    
    // Scroll vers les résultats
    setTimeout(() => {
        resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

/**
 * Vider le cache
 */
clearCacheLink.addEventListener('click', async (e) => {
    e.preventDefault();
    
    if (!confirm('Voulez-vous vraiment vider le cache ?')) {
        return;
    }
    
    try {
        const response = await fetch('/api/cache/clear', {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showSuccess('Cache vidé avec succès ! 🗑️');
        } else {
            throw new Error(data.error || 'Erreur');
        }
    } catch (error) {
        showError('Erreur lors du vidage du cache');
    }
});

/**
 * Ajouter les écouteurs d'événements pour les statistiques cliquables
 */
function addStatClickListeners() {
    const statItems = document.querySelectorAll('.clickable-stat');
    
    statItems.forEach(item => {
        item.addEventListener('click', function() {
            const type = this.getAttribute('data-type');
            filterContent(type);
            
            // Update active state
            statItems.forEach(stat => stat.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Set "All" as active by default
    const allStat = document.querySelector('.clickable-stat[data-type="all"]');
    if (allStat) {
        allStat.classList.add('active');
    }
}

/**
 * Filtrer le contenu en fonction du type sélectionné
 */
function filterContent(type) {
    const resultCards = document.querySelectorAll('.result-card');
    
    resultCards.forEach((card, index) => {
        // Skip the statistics card (index 0) and page title card (index 1)
        if (index === 0 || index === 1) {
            return;
        }
        
        const title = card.querySelector('.result-title');
        if (!title) return;
        
        let shouldShow = false;
        const titleText = title.textContent.toLowerCase();
        
        switch(type) {
            case 'headings':
                shouldShow = titleText.includes('titres') && !titleText.includes('titre de la page');
                break;
            case 'paragraphs':
                shouldShow = titleText.includes('paragraphes');
                break;
            case 'links':
                shouldShow = titleText.includes('liens');
                break;
            case 'images':
                shouldShow = titleText.includes('images');
                break;
            case 'all':
                shouldShow = true;
                break;
        }
        
        card.style.display = shouldShow ? 'block' : 'none';
    });
}

/**
 * Ajouter les écouteurs d'événements pour les contrôles de pagination
 */
function addPaginationListeners() {
    const paginationContainers = document.querySelectorAll('.pagination-controls');
    console.log('Pagination containers found:', paginationContainers.length);
    
    paginationContainers.forEach(container => {
        const section = container.getAttribute('data-section');
        console.log('Processing section:', section);
        const data = window.scrapedData;
        if (!data) {
            console.log('No scraped data available');
            return;
        }
        
        let totalItems = 0;
        switch(section) {
            case 'headings':
                totalItems = data.headings.length;
                break;
            case 'paragraphs':
                totalItems = data.paragraphs.length;
                break;
            case 'links':
                totalItems = data.links.length;
                break;
            case 'images':
                totalItems = data.images.length;
                break;
        }
        
        console.log('Section:', section, 'Total items:', totalItems);
        
        if (totalItems > 10) {
            const totalPages = Math.ceil(totalItems / 10);
            console.log('Creating pagination for', totalPages, 'pages');
            createPaginationControls(container, section, totalPages);
            
            // Add event listeners to pagination buttons
            const prevBtn = container.querySelector('.prev-btn');
            const nextBtn = container.querySelector('.next-btn');
            
            if (prevBtn && nextBtn) {
                prevBtn.addEventListener('click', () => {
                    console.log('Prev button clicked for section:', section);
                    changePage(section, -1);
                });
                nextBtn.addEventListener('click', () => {
                    console.log('Next button clicked for section:', section);
                    changePage(section, 1);
                });
                console.log('Event listeners added for section:', section);
            } else {
                console.log('Buttons not found in container:', container);
            }
        }
    });
}

/**
 * Créer les contrôles de pagination
 */
function createPaginationControls(container, section, totalPages) {
    let html = '<div class="pagination-wrapper">';
    html += '<button class="pagination-btn prev-btn" data-section="' + section + '" data-action="prev">';
    html += '<i class="fas fa-chevron-left"></i> Précédent';
    html += '</button>';
    html += '<span class="pagination-info">Page <span class="current-page">1</span> / ' + totalPages + '</span>';
    html += '<button class="pagination-btn next-btn" data-section="' + section + '" data-action="next">';
    html += 'Page suivante <i class="fas fa-chevron-right"></i>';
    html += '</button>';
    html += '</div>';
    
    container.innerHTML = html;
    
    // Store pagination state
    if (!window.paginationState) {
        window.paginationState = {};
    }
    window.paginationState[section] = { currentPage: 1, totalPages };
}

/**
 * Changer de page
 */
function changePage(section, direction) {
    const state = window.paginationState[section];
    if (!state) return;
    
    const newPage = state.currentPage + direction;
    if (newPage < 1 || newPage > state.totalPages) return;
    
    console.log('Changing page from', state.currentPage, 'to', newPage, 'for section:', section);
    
    // Update current page
    state.currentPage = newPage;
    
    // Update display
    displayPage(section, newPage);
    
    // Update pagination controls
    updatePaginationControls(section, newPage);
}

/**
 * Afficher une page spécifique
 */
function displayPage(section, page) {
    const data = window.scrapedData;
    if (!data) return;
    
    let content = [];
    let contentDiv = document.querySelector(`[data-content="${section}"]`);
    if (!contentDiv) return;
    
    // Calculate items for current page (exactly 10 per page, not cumulative)
    const startIndex = (page - 1) * 10;
    const endIndex = Math.min(startIndex + 10, getTotalItems(section));
    
    // Clear current content but preserve pagination controls
    const paginationControls = contentDiv.querySelector('.pagination-controls');
    contentDiv.innerHTML = '';
    
    // Get and display only current page items
    switch(section) {
        case 'headings':
            content = data.headings.slice(startIndex, endIndex);
            content.forEach(h => {
                const div = document.createElement('div');
                div.className = `heading-item ${h.level}`;
                div.innerHTML = `
                    <span class="heading-level">${h.level.toUpperCase()}</span>
                    ${escapeHtml(h.text)}
                `;
                contentDiv.appendChild(div);
            });
            break;
            
        case 'paragraphs':
            content = data.paragraphs.slice(startIndex, endIndex);
            content.forEach(p => {
                const truncated = p.length > 200 ? p.substring(0, 200) + '...' : p;
                const pElement = document.createElement('p');
                pElement.textContent = `• ${truncated}`;
                contentDiv.appendChild(pElement);
            });
            break;
            
        case 'links':
            content = data.links.slice(startIndex, endIndex);
            content.forEach(link => {
                const pElement = document.createElement('p');
                pElement.innerHTML = `• <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener">
                    ${escapeHtml(link.text || link.url)}
                </a>`;
                contentDiv.appendChild(pElement);
            });
            break;
            
        case 'images':
            content = data.images.slice(startIndex, endIndex);
            content.forEach(img => {
                const div = document.createElement('div');
                div.className = 'image-item';
                div.innerHTML = `
                    <img src="${escapeHtml(img.src)}" 
                         alt="${escapeHtml(img.alt)}" 
                         loading="lazy"
                         onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22150%22 height=%22120%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22150%22 height=%22120%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 fill=%22%23999%22%3EImage%3C/text%3E%3C/svg%3E'">
                    ${img.alt ? `<div class="image-info">${escapeHtml(img.alt)}</div>` : ''}
                `;
                contentDiv.appendChild(div);
            });
            break;
    }
    
    // Re-add pagination controls at the bottom
    if (paginationControls) {
        contentDiv.appendChild(paginationControls);
    }
}

/**
 * Obtenir le nombre total d'items pour une section
 */
function getTotalItems(section) {
    const data = window.scrapedData;
    if (!data) return 0;
    
    switch(section) {
        case 'headings':
            return data.headings.length;
        case 'paragraphs':
            return data.paragraphs.length;
        case 'links':
            return data.links.length;
        case 'images':
            return data.images.length;
        default:
            return 0;
    }
}

/**
 * Mettre à jour les contrôles de pagination
 */
function updatePaginationControls(section, currentPage) {
    const container = document.querySelector(`.pagination-controls[data-section="${section}"]`);
    if (!container) return;
    
    const paginationWrapper = container.querySelector('.pagination-wrapper');
    if (!paginationWrapper) return;
    
    const currentPageSpan = paginationWrapper.querySelector('.current-page');
    const prevBtn = paginationWrapper.querySelector('.prev-btn');
    const nextBtn = paginationWrapper.querySelector('.next-btn');
    
    if (currentPageSpan) {
        currentPageSpan.textContent = currentPage;
    }
    
    if (prevBtn) {
        prevBtn.disabled = currentPage === 1;
    }
    
    const state = window.paginationState[section];
    if (nextBtn && state) {
        nextBtn.disabled = currentPage === state.totalPages;
    }
}

/**
 * Gérer l'état de chargement du bouton
 */
function setLoading(loading) {
    isLoading = loading;
    submitBtn.disabled = loading;
    
    if (loading) {
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline';
    } else {
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
    }
}

/**
 * Afficher un message d'erreur
 */
function showError(message) {
    errorDiv.textContent = '❌ ' + message;
    errorDiv.style.display = 'block';
    successDiv.style.display = 'none';
    
    // Auto-hide après 5 secondes
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

/**
 * Afficher un message de succès
 */
function showSuccess(message) {
    successDiv.textContent = '✅ ' + message;
    successDiv.style.display = 'block';
    errorDiv.style.display = 'none';
    
    // Auto-hide après 3 secondes
    setTimeout(() => {
        successDiv.style.display = 'none';
    }, 3000);
}

/**
 * Cacher les messages
 */
function hideMessages() {
    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';
}

/**
 * Valider une URL
 */
function isValidUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

/**
 * Échapper le HTML pour éviter les XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Exemple d'URLs pour test (optionnel)
const exampleUrls = [
    'https://example.com',
    'https://www.wikipedia.org',
    'https://github.com'
];

// Ajouter des suggestions (optionnel)
urlInput.addEventListener('focus', () => {
    // Vous pouvez ajouter une liste de suggestions ici
});