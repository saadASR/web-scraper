const scrapingService = require('../services/scrapingService');

function validateUrl(value) {
    if (!value || typeof value !== 'string') return { isValid: false, error: 'URL manquante ou invalide' };
    try {
        const u = new URL(value);
        if (!['http:', 'https:'].includes(u.protocol)) return { isValid: false, error: 'Le protocole doit être http ou https' };
        return { isValid: true };
    } catch (e) {
        return { isValid: false, error: "Format d'URL invalide" };
    }
}

const _store = new Map();
let _hits = 0, _misses = 0;
const cache = {
    get(k) { if (_store.has(k)) { _hits++; return _store.get(k); } _misses++; return undefined; },
    set(k, v) { _store.set(k, v); },
    keys() { return Array.from(_store.keys()); },
    clear() { _store.clear(); _hits = 0; _misses = 0; },
    getStats() { return { hits: _hits, misses: _misses, ksize: _store.size, vsize: Array.from(_store.values()).reduce((s, v) => s + (v ? JSON.stringify(v).length : 0), 0) }; }
};

const scraperController = {

    // Main scraping endpoint that handles URL scraping requests
    async scrapeUrl(req, res) {
        try {
            const { url } = req.body;

            // Validate input URL
            if (!url) {
                return res.status(400).json({ error: 'URL manquante', details: 'Veuillez fournir une URL à scraper' });
            }

            // Check URL format and protocol
            const validation = validateUrl(url);
            if (!validation.isValid) {
                return res.status(400).json({ error: 'URL invalide', details: validation.error });
            }

            // Check cache first
            const cached = cache.get(url);
            if (cached) {
                return res.json({ ...cached, fromCache: true });
            }

            // Listen to scraping events emitted by the service
            scrapingService.on('scrapeStart', (data) => {
                console.log('Scraping started for:', data.url);
            });

            scrapingService.on('responseReceived', (data) => {
                console.log('Response received for:', data.url, 'Status:', data.status);
            });

            scrapingService.on('htmlParsed', (data) => {
                console.log('HTML parsed for:', data.url);
            });

            scrapingService.on('dataSaved', (data) => {
                console.log('Data saved to file:', data.filename);
            });

            scrapingService.on('scrapeEnd', (data) => {
                console.log('Scraping ended for:', data.url);
            });

            scrapingService.on('scrapeError', (data) => {
                console.error('Scraping error for:', data.url, 'Error:', data.error);
            });

            // Perform the scraping using the service
            const result = await scrapingService.scrape(url);
            cache.set(url, result);
            res.json({ ...result, fromCache: false });

        } catch (error) {
            // Handle different types of errors with appropriate HTTP status codes
            const msg = (error && error.message) ? error.message.toLowerCase() : '';
            if (msg.includes('timeout')) {
                return res.status(408).json({ error: 'Timeout', details: 'La page met trop de temps à répondre' });
            }
            if (msg.includes('404')) {
                return res.status(404).json({ error: 'Page non trouvée', details: "La page demandée n'existe pas" });
            }
            if (msg.includes('403')) {
                return res.status(403).json({ error: 'Accès refusé', details: "Le site bloque l'accès au scraping" });
            }

            res.status(500).json({ error: 'Erreur lors du scraping', details: 'Impossible de scraper cette URL. Vérifiez qu\'elle est accessible.' });
        }
    },

    getCacheStats(req, res) {
        const stats = cache.getStats();
        res.json({
            keys: cache.keys().length,
            hits: stats.hits,
            misses: stats.misses,
            ksize: stats.ksize,
            vsize: stats.vsize
        });
    },

    clearCache(req, res) {
        cache.clear();
        res.json({ ok: true });
    },
};

module.exports = scraperController;