/**
 * Mimi's Dream World — Tier 3 Returning-Visitor Memory
 * Respectful personalization using localStorage with zero tracking of sensitive data,
 * visit counter, time-of-day awareness, varied dreamy greetings, safe DOM rendering,
 * interactive preferred-name support, and graceful storage fallbacks.
 */

(function () {
    const STORAGE_KEY_COUNT = 'mimi_visit_count';
    const STORAGE_KEY_FIRST = 'mimi_first_visit';
    const STORAGE_KEY_LAST = 'mimi_last_visit';
    const STORAGE_KEY_NAME = 'mimi_visitor_name';
    const SESSION_KEY = 'mimi_session_counted';

    // In-memory fallback if localStorage / sessionStorage are blocked or disabled
    const memoryStore = {};
    const sessionMemoryStore = {};

    function safeGet(key) {
        try {
            if (window.localStorage) {
                return window.localStorage.getItem(key);
            }
        } catch (e) {
            // Storage access blocked or restricted
        }
        return Object.prototype.hasOwnProperty.call(memoryStore, key) ? memoryStore[key] : null;
    }

    function safeSet(key, val) {
        let stored = false;
        try {
            if (window.localStorage) {
                window.localStorage.setItem(key, val);
                stored = true;
            }
        } catch (e) {
            // Storage access blocked or quota exceeded
        }
        memoryStore[key] = String(val);
        return stored;
    }

    function safeSessionGet(key) {
        try {
            if (window.sessionStorage) {
                return window.sessionStorage.getItem(key);
            }
        } catch (e) {
            // Storage access blocked
        }
        return Object.prototype.hasOwnProperty.call(sessionMemoryStore, key) ? sessionMemoryStore[key] : null;
    }

    function safeSessionSet(key, val) {
        let stored = false;
        try {
            if (window.sessionStorage) {
                window.sessionStorage.setItem(key, val);
                stored = true;
            }
        } catch (e) {
            // Storage access blocked
        }
        sessionMemoryStore[key] = String(val);
        return stored;
    }

    function getTimeOfDayGreeting() {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 18) return 'afternoon';
        if (hour >= 18 && hour < 22) return 'evening';
        return 'night';
    }

    const firstVisitGreetings = [
        "Welcome, dreamer! Your magical journey begins here.",
        "A new star just arrived! Mimi’s moon is so happy to meet you.",
        "Hello, little dreamer. Mimi tucked away a soft corner of starlight just for you."
    ];

    const returningGreetings = [
        "Your little corner of magic missed you.",
        "Mimi kept the nightlight burning for you.",
        "It feels warmer on the Moon whenever you return. Mimi flapped their ears happily!",
        "Mimi saved a little glow for your return. Rest here as long as you need.",
        "The stars whispered that you might wander by tonight."
    ];

    function pickRandom(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    function renderGreetingSafely(isFirst, visitCount, storedName) {
        const greetingTextEl = document.querySelector('#mimi-greeting-text');
        if (!greetingTextEl) return;

        // Clear existing children
        greetingTextEl.textContent = '';

        const timeOfDay = getTimeOfDayGreeting();

        if (isFirst) {
            const strong = document.createElement('strong');
            strong.textContent = 'First Star Sighting: ';
            greetingTextEl.appendChild(strong);

            const greetingSpan = document.createElement('span');
            greetingSpan.textContent = pickRandom(firstVisitGreetings);
            greetingTextEl.appendChild(greetingSpan);
        } else {
            const badge = document.createElement('span');
            badge.className = 'visit-badge';
            badge.setAttribute('aria-label', `Visit number ${visitCount}`);
            badge.textContent = `✦ Visit #${visitCount}`;
            greetingTextEl.appendChild(badge);

            greetingTextEl.appendChild(document.createTextNode(' '));

            const greetingSpan = document.createElement('span');
            if (storedName) {
                greetingSpan.textContent = `Welcome back, ${storedName}! Mimi's little corner of magic missed you.`;
            } else if (timeOfDay === 'night' && Math.random() > 0.5) {
                greetingSpan.textContent = "A quiet starry night on the Moon. Mimi kept a cozy blanket ready for you.";
            } else if (timeOfDay === 'morning' && Math.random() > 0.5) {
                greetingSpan.textContent = "Good morning, gentle dreamer! Daydreams and soft melodies are waiting.";
            } else {
                greetingSpan.textContent = `Welcome back, starlight traveler! ${pickRandom(returningGreetings)}`;
            }
            greetingTextEl.appendChild(greetingSpan);
        }

        // Update name button text if present
        const nameBtn = document.querySelector('#greeting-name-btn');
        if (nameBtn) {
            if (storedName) {
                nameBtn.textContent = `You: ${storedName} ✎`;
                nameBtn.setAttribute('aria-label', `Preferred name: ${storedName}. Click to change.`);
            } else {
                nameBtn.textContent = 'Tell Mimi your name ✦';
                nameBtn.setAttribute('aria-label', 'Tell Mimi your preferred name');
            }
        }
    }

    function updateGreeting() {
        const greetingEl = document.querySelector('#mimi-greeting');
        const greetingCloseEl = document.querySelector('#greeting-close');
        if (!greetingEl) return;

        let visitCount = 1;
        const storedCount = safeGet(STORAGE_KEY_COUNT);
        const storedFirst = safeGet(STORAGE_KEY_FIRST);
        const storedName = safeGet(STORAGE_KEY_NAME);
        const nowIso = new Date().toISOString();

        const isNewSession = !safeSessionGet(SESSION_KEY);
        let isFirstVisit = false;

        if (!storedCount || !storedFirst) {
            // FIRST VISIT
            isFirstVisit = true;
            visitCount = 1;
            safeSet(STORAGE_KEY_COUNT, '1');
            safeSet(STORAGE_KEY_FIRST, nowIso);
            safeSet(STORAGE_KEY_LAST, nowIso);
            safeSessionSet(SESSION_KEY, 'yes');
        } else {
            // RETURNING VISIT
            visitCount = parseInt(storedCount, 10) || 1;
            if (isNewSession) {
                visitCount += 1;
                safeSet(STORAGE_KEY_COUNT, String(visitCount));
                safeSet(STORAGE_KEY_LAST, nowIso);
                safeSessionSet(SESSION_KEY, 'yes');
            }
        }

        renderGreetingSafely(isFirstVisit, visitCount, storedName);

        // Show greeting
        greetingEl.hidden = false;
        greetingEl.classList.add('is-active');

        // Dismiss action
        if (greetingCloseEl) {
            greetingCloseEl.onclick = function () {
                greetingEl.hidden = true;
                greetingEl.classList.remove('is-active');
            };
        }
    }

    function initNameUI() {
        const nameBtn = document.querySelector('#greeting-name-btn');
        const nameDialog = document.querySelector('#name-dialog');
        const nameForm = document.querySelector('#name-form');
        const nameInput = document.querySelector('#preferred-name-input');
        const nameDialogClose = nameDialog ? nameDialog.querySelector('.dialog-close') : null;

        if (nameBtn && nameDialog) {
            nameBtn.addEventListener('click', () => {
                const currentName = safeGet(STORAGE_KEY_NAME) || '';
                if (nameInput) {
                    nameInput.value = currentName;
                }
                if (typeof nameDialog.showModal === 'function') {
                    nameDialog.showModal();
                    if (nameInput) nameInput.focus();
                } else {
                    nameDialog.hidden = false;
                }
            });
        }

        if (nameDialogClose && nameDialog) {
            nameDialogClose.addEventListener('click', () => {
                if (typeof nameDialog.close === 'function') {
                    nameDialog.close();
                } else {
                    nameDialog.hidden = true;
                }
            });
        }

        if (nameForm) {
            nameForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const newName = nameInput ? nameInput.value : '';
                window.MimiMemory.setPreferredName(newName);

                if (nameDialog) {
                    if (typeof nameDialog.close === 'function') {
                        nameDialog.close();
                    } else {
                        nameDialog.hidden = true;
                    }
                }

                // Show confirmation toast if available
                const toast = document.querySelector('#toast');
                if (toast) {
                    toast.textContent = newName.trim()
                        ? `Mimi whispered: "I'll remember you as ${newName.trim()}!"`
                        : "Name cleared. You are a gentle mystery to the Moon.";
                    toast.classList.add('is-visible');
                    setTimeout(() => toast.classList.remove('is-visible'), 3200);
                }
            });
        }
    }

    // Expose memory API
    window.MimiMemory = {
        setPreferredName: function (name) {
            if (typeof name === 'string' && name.trim().length > 0) {
                // Sanitize and limit to 30 characters
                const clean = name.trim().replace(/[\u0000-\u001F\u007F-\u009F]/g, '').slice(0, 30);
                safeSet(STORAGE_KEY_NAME, clean);
            } else {
                try {
                    if (window.localStorage) {
                        window.localStorage.removeItem(STORAGE_KEY_NAME);
                    }
                } catch (e) {}
                delete memoryStore[STORAGE_KEY_NAME];
            }

            const storedName = safeGet(STORAGE_KEY_NAME);
            const storedCount = parseInt(safeGet(STORAGE_KEY_COUNT), 10) || 1;
            renderGreetingSafely(storedCount <= 1 && !safeGet(STORAGE_KEY_LAST), storedCount, storedName);

            // Dispatch custom event for guestbook / chat sync
            try {
                window.dispatchEvent(new CustomEvent('mimi:name-changed', { detail: { name: storedName || '' } }));
            } catch (e) {}
        },
        getPreferredName: function () {
            return safeGet(STORAGE_KEY_NAME) || '';
        },
        getVisitCount: function () {
            return parseInt(safeGet(STORAGE_KEY_COUNT), 10) || 1;
        },
        refreshGreeting: function () {
            updateGreeting();
        }
    };

    function start() {
        updateGreeting();
        initNameUI();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
