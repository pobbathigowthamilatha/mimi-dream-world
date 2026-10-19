/**
 * Mimi's Dream World — Tier 3 Real Dream Guestbook Client
 * Connects to persistent backend API (/api/dreams), validates inputs,
 * provides loading, success, empty, and error states, and renders
 * messages completely safely using DOM textContent (zero XSS risk).
 */

(function () {
    const CHARM_ICONS = {
        star: '✦',
        moon: '☾',
        sparkle: '✧',
        heart: '♡',
        cloud: '☁'
    };

    let listEl = null;
    let loadingEl = null;
    let errorEl = null;
    let emptyEl = null;
    let formEl = null;
    let nameInput = null;
    let dreamInput = null;
    let charCountEl = null;
    let statusEl = null;
    let submitBtn = null;
    let retryBtn = null;

    // Detect API base URL: relative path by default, fallback to localhost:4173 if running on file:// or static port
    function getPrimaryApiUrl(path) {
        if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
            return path;
        }
        return `http://localhost:4173${path}`;
    }

    function getFallbackApiUrl(path) {
        return `http://localhost:4173${path}`;
    }

    // Safe response parser that NEVER throws "Unexpected end of JSON input"
    async function safeParseJsonResponse(response) {
        let text = '';
        try {
            text = await response.text();
        } catch (e) {
            return {
                ok: false,
                status: response.status,
                data: null,
                error: `Network error reading response: ${e.message}`
            };
        }

        const trimmed = (text || '').trim();
        if (!trimmed) {
            return {
                ok: false,
                status: response.status,
                data: null,
                error: `The moon vault returned an empty response (HTTP ${response.status} ${response.statusText || ''}).`
            };
        }

        try {
            const data = JSON.parse(trimmed);
            return {
                ok: response.ok,
                status: response.status,
                data: data,
                error: data.error || (response.ok ? null : `HTTP ${response.status}`)
            };
        } catch (parseErr) {
            return {
                ok: false,
                status: response.status,
                data: null,
                error: `Expected JSON from server but received non-JSON content (HTTP ${response.status}).`
            };
        }
    }

    // Dual-stage fetch helper (tries primary URL, then tries fallback if on different port)
    async function fetchApi(path, options = {}) {
        const primaryUrl = getPrimaryApiUrl(path);
        let res;
        let lastErr = null;

        try {
            res = await fetch(primaryUrl, options);
            if (res.ok || (res.status >= 400 && res.status < 500)) {
                return res;
            }
        } catch (e) {
            lastErr = e;
        }

        // If primary URL failed and we're on localhost but on a different dev port (e.g. 5500), attempt fallback to port 4173
        const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isLocalHost && window.location.port !== '4173' && primaryUrl !== getFallbackApiUrl(path)) {
            try {
                const fallbackUrl = getFallbackApiUrl(path);
                res = await fetch(fallbackUrl, options);
                return res;
            } catch (fallbackErr) {
                lastErr = fallbackErr;
            }
        }

        if (res) return res;
        throw lastErr || new Error('Could not connect to the moon vault.');
    }

    function formatTime(isoString) {
        try {
            const date = new Date(isoString);
            if (isNaN(date.getTime())) return 'recently';
            const now = new Date();
            const diffSec = Math.floor((now - date) / 1000);
            if (diffSec < 60) return 'just now';
            if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
            if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
            return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        } catch (e) {
            return 'recently';
        }
    }

    function createDreamCard(entry) {
        const card = document.createElement('article');
        card.className = 'dream-card';
        card.setAttribute('tabindex', '0');

        const header = document.createElement('div');
        header.className = 'dream-card-header';

        const charmSpan = document.createElement('span');
        charmSpan.className = 'dream-charm';
        charmSpan.setAttribute('aria-hidden', 'true');
        const iconKey = (entry.star_sign || 'star').toLowerCase();
        charmSpan.textContent = CHARM_ICONS[iconKey] || '✦';
        header.appendChild(charmSpan);

        const authorName = document.createElement('h4');
        authorName.className = 'dream-author';
        // SECURE: textContent ensures absolute safety against HTML/script injection
        authorName.textContent = entry.name || 'Anonymous Dreamer';
        header.appendChild(authorName);

        const timeSpan = document.createElement('time');
        timeSpan.className = 'dream-time';
        timeSpan.textContent = formatTime(entry.created_at);
        if (entry.created_at) {
            timeSpan.setAttribute('datetime', entry.created_at);
        }
        header.appendChild(timeSpan);

        card.appendChild(header);

        const body = document.createElement('p');
        body.className = 'dream-text';
        // SECURE: textContent ensures absolute safety against HTML/script injection
        body.textContent = entry.dream || '';
        card.appendChild(body);

        return card;
    }

    async function loadDreams() {
        if (!listEl) return;

        if (loadingEl) loadingEl.hidden = false;
        if (errorEl) errorEl.hidden = true;
        if (emptyEl) emptyEl.hidden = true;

        try {
            const response = await fetchApi('/api/dreams', {
                headers: { 'Accept': 'application/json' }
            });

            const parsed = await safeParseJsonResponse(response);

            if (!parsed.ok || !parsed.data || !parsed.data.success) {
                throw new Error(parsed.error || `Server returned error status ${response.status}`);
            }

            const dreams = parsed.data.dreams || [];

            if (loadingEl) loadingEl.hidden = true;
            listEl.textContent = '';

            if (dreams.length === 0) {
                if (emptyEl) emptyEl.hidden = false;
            } else {
                dreams.forEach(item => {
                    const card = createDreamCard(item);
                    listEl.appendChild(card);
                });
            }
        } catch (err) {
            console.warn('[Guestbook] Could not fetch dreams from server:', err.message);
            if (loadingEl) loadingEl.hidden = true;
            if (errorEl) {
                errorEl.hidden = false;
                const errorMsg = errorEl.querySelector('.error-message');
                if (errorMsg) {
                    errorMsg.textContent = `Could not reach the moon vault (${err.message}). Ensure the server is running on port 4173 with 'npm start'.`;
                }
            }
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!formEl || !nameInput || !dreamInput) return;

        const name = nameInput.value.trim();
        const dream = dreamInput.value.trim();
        const charmRadio = formEl.querySelector('input[name="guestbook-charm"]:checked');
        const star_sign = charmRadio ? charmRadio.value : 'star';

        if (!name) {
            announceStatus('Please whisper a name or nickname so Mimi knows who left this wish.', 'error');
            nameInput.focus();
            return;
        }

        if (name.length > 40) {
            announceStatus('Names must be 40 characters or fewer.', 'error');
            nameInput.focus();
            return;
        }

        if (!dream || dream.length < 2) {
            announceStatus('Please write at least 2 characters for your dream or wish.', 'error');
            dreamInput.focus();
            return;
        }

        if (dream.length > 280) {
            announceStatus('Dreams must be 280 characters or fewer.', 'error');
            dreamInput.focus();
            return;
        }

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Sending to Moon...';
        }

        try {
            const response = await fetchApi('/api/dreams', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ name, dream, star_sign })
            });

            const parsed = await safeParseJsonResponse(response);

            if (!parsed.ok || !parsed.data || !parsed.data.success) {
                throw new Error(parsed.error || `Could not save dream (HTTP ${response.status}).`);
            }

            // Sync preferred name with Visitor Memory
            if (window.MimiMemory && typeof window.MimiMemory.setPreferredName === 'function') {
                window.MimiMemory.setPreferredName(name);
            }

            // Success feedback
            announceStatus('Your dream was tucked safely into the Moon vault! ✦', 'success');

            // Prepend new card immediately
            if (emptyEl) emptyEl.hidden = true;
            if (listEl) {
                const newCard = createDreamCard(parsed.data.dream);
                newCard.classList.add('is-new');
                listEl.insertBefore(newCard, listEl.firstChild);
                listEl.scrollTop = 0;
            }

            // Reset textarea, keep name
            dreamInput.value = '';
            updateCharCount();

            // Trigger global dream counter increment if available
            try {
                const dreamOdo = document.querySelector('#dream-count');
                if (dreamOdo) {
                    const current = parseInt(dreamOdo.textContent, 10) || 1;
                    const next = String(current + 1).padStart(5, '0');
                    dreamOdo.textContent = next;
                }
            } catch (err) {}

        } catch (err) {
            announceStatus(err.message || 'Could not send dream right now.', 'error');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Send Dream to Mimi <span aria-hidden="true">✦</span>';
            }
        }
    }

    function announceStatus(msg, type) {
        if (!statusEl) return;
        statusEl.textContent = msg;
        statusEl.className = `guestbook-status status-${type}`;
    }

    function updateCharCount() {
        if (!dreamInput || !charCountEl) return;
        const remaining = 280 - dreamInput.value.length;
        charCountEl.textContent = `${remaining}`;
        if (remaining < 20) {
            charCountEl.classList.add('is-low');
        } else {
            charCountEl.classList.remove('is-low');
        }
    }

    function init() {
        listEl = document.querySelector('#guestbook-list');
        loadingEl = document.querySelector('#guestbook-loading');
        errorEl = document.querySelector('#guestbook-error');
        emptyEl = document.querySelector('#guestbook-empty');
        formEl = document.querySelector('#guestbook-form');
        nameInput = document.querySelector('#guestbook-name');
        dreamInput = document.querySelector('#guestbook-dream');
        charCountEl = document.querySelector('#guestbook-char-count');
        statusEl = document.querySelector('#guestbook-form-status');
        submitBtn = document.querySelector('#guestbook-submit');
        retryBtn = document.querySelector('#guestbook-retry');

        if (!listEl || !formEl) return;

        // Pre-fill name if visitor has stored memory
        if (nameInput && window.MimiMemory) {
            const savedName = window.MimiMemory.getPreferredName();
            if (savedName) {
                nameInput.value = savedName;
            }
        }

        // Listen for name updates from memory module
        window.addEventListener('mimi:name-changed', (e) => {
            if (nameInput && e.detail && e.detail.name) {
                nameInput.value = e.detail.name;
            }
        });

        if (dreamInput) {
            dreamInput.addEventListener('input', updateCharCount);
            updateCharCount();
        }

        formEl.addEventListener('submit', handleSubmit);

        if (retryBtn) {
            retryBtn.addEventListener('click', async () => {
                retryBtn.disabled = true;
                const originalText = retryBtn.innerHTML;
                retryBtn.textContent = 'Connecting...';
                if (statusEl) {
                    statusEl.textContent = 'Retrying connection to the moon vault...';
                    statusEl.className = 'guestbook-status';
                }
                try {
                    await loadDreams();
                    if (statusEl) {
                        statusEl.textContent = '';
                    }
                } finally {
                    retryBtn.disabled = false;
                    retryBtn.innerHTML = originalText;
                }
            });
        }

        // Initial load
        loadDreams();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
