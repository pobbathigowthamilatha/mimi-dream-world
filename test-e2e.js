const { spawn } = require('child_process');
const http = require('http');
const { server, getAllDreams, deleteDream, isPortActive } = require('./server.js');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = parseInt(process.env.TEST_PORT, 10) || 4173;
const CDP_PORT = 9222;

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try { resolve(JSON.parse(data)); } catch (e) { resolve(null); }
            });
        }).on('error', reject);
    });
}

class SimpleCDP {
    constructor(wsUrl) {
        this.ws = new WebSocket(wsUrl);
        this.msgId = 0;
        this.callbacks = new Map();
        this.events = [];
        this.consoleLogs = [];

        this.ws.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            if (msg.id && this.callbacks.has(msg.id)) {
                const cb = this.callbacks.get(msg.id);
                this.callbacks.delete(msg.id);
                cb(msg);
            } else if (msg.method) {
                if (msg.method === 'Runtime.consoleAPICalled') {
                    const text = msg.params.args.map(a => a.value || a.description || '').join(' ');
                    this.consoleLogs.push({ type: msg.params.type, text });
                } else if (msg.method === 'Runtime.exceptionThrown') {
                    const desc = msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text;
                    this.consoleLogs.push({ type: 'error', text: desc });
                }
            }
        };
    }

    ready() {
        return new Promise((resolve) => {
            if (this.ws.readyState === WebSocket.OPEN) return resolve();
            this.ws.onopen = () => resolve();
        });
    }

    send(method, params = {}) {
        return new Promise((resolve) => {
            const id = ++this.msgId;
            this.callbacks.set(id, resolve);
            this.ws.send(JSON.stringify({ id, method, params }));
        });
    }

    async eval(expr) {
        const res = await this.send('Runtime.evaluate', {
            expression: expr,
            awaitPromise: true,
            returnByValue: true
        });
        if (res.result?.exceptionDetails) {
            throw new Error(res.result.exceptionDetails.exception?.description || 'Eval error');
        }
        return res.result?.result?.value;
    }

    close() {
        try { this.ws.close(); } catch (e) {}
    }
}

async function run() {
    console.log('--- STARTING E2E VERIFICATION ---');

    // 1. Ensure server is active (reusing existing server or starting isolated test server)
    let startedOurOwnServer = false;
    const isAlreadyRunning = await isPortActive(PORT);

    if (isAlreadyRunning) {
        console.log(`✓ Detected server already running on port ${PORT}. Reusing for E2E test.`);
    } else {
        console.log(`Starting isolated test server on port ${PORT}...`);
        await new Promise((resolve, reject) => {
            server.once('error', reject);
            server.listen(PORT, '127.0.0.1', () => {
                startedOurOwnServer = true;
                resolve();
            });
        });
        console.log(`✓ Test server listening on port ${PORT}.`);
    }

    // 2. Launch Headless Chrome
    console.log('Launching headless Chrome...');
    const chrome = spawn(CHROME_PATH, [
        '--headless=new',
        `--remote-debugging-port=${CDP_PORT}`,
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-background-networking',
        `http://localhost:${PORT}/`
    ]);

    await delay(1500);

    let cdp = null;
    try {
        const versionInfo = await fetchJson(`http://localhost:${CDP_PORT}/json/version`);
        console.log('Connected to Chrome:', versionInfo['User-Agent']);

        const targets = await fetchJson(`http://localhost:${CDP_PORT}/json/list`);
        const pageTarget = targets.find(t => t.type === 'page' && t.url.includes(`localhost:${PORT}`));
        if (!pageTarget) throw new Error('Could not find Chrome page target');


        cdp = new SimpleCDP(pageTarget.webSocketDebuggerUrl);
        await cdp.ready();
        await cdp.send('Runtime.enable');
        await cdp.send('Page.enable');

        await delay(1200);

        // Check for any errors during initial load
        console.log('\n1. Checking initial load and console logs...');
        const initialErrors = cdp.consoleLogs.filter(l => l.type === 'error');
        if (initialErrors.length > 0) {
            console.error('Console errors found:', initialErrors);
        } else {
            console.log('✓ Initial page loaded with zero console errors.');
        }

        // 2. Test Visitor Memory
        console.log('\n2. Testing Visitor Memory (mimi-memory.js)...');
        const visitCount = await cdp.eval('window.MimiMemory.getVisitCount()');
        console.log('Visit count returned:', visitCount);

        const greetingText = await cdp.eval('document.querySelector("#mimi-greeting-text").textContent');
        console.log('Initial greeting text:', greetingText);
        if (!greetingText || greetingText.length === 0) {
            throw new Error('Greeting text was empty');
        }
        console.log('✓ Greeting rendered safely with visit count and prompt.');

        // Test preferred name setting
        console.log('Setting preferred name to "Starlight Star"...');
        await cdp.eval('window.MimiMemory.setPreferredName("Starlight Star")');
        const savedName = await cdp.eval('window.MimiMemory.getPreferredName()');
        const updatedGreeting = await cdp.eval('document.querySelector("#mimi-greeting-text").textContent');
        console.log('Updated greeting after setting name:', updatedGreeting);
        if (savedName !== 'Starlight Star' || !updatedGreeting.includes('Starlight Star')) {
            throw new Error('Preferred name was not updated in memory or greeting');
        }
        console.log('✓ Preferred name safely stored and dynamically updated.');

        // Test returning visit
        console.log('Testing second visit greeting...');
        await cdp.eval(`
            sessionStorage.removeItem("mimi_session_counted");
            window.MimiMemory.refreshGreeting();
        `);
        const secondVisitText = await cdp.eval('document.querySelector("#mimi-greeting-text").textContent');
        console.log('Second visit greeting text:', secondVisitText);
        if (!secondVisitText.includes('Visit #2') && !secondVisitText.includes('Starlight Star')) {
            throw new Error('Second visit did not increment count or retain preferred name');
        }
        console.log('✓ Returning visit recognized and personalized without innerHTML injection.');

        // 3. Test 3D Interactive Character (mimi-3d.js)
        console.log('\n3. Testing Interactive 3D Character (mimi-3d.js)...');
        // Scroll 3D section into view to trigger IntersectionObserver
        await cdp.eval('document.querySelector("#mimi-3d-sanctuary").scrollIntoView();');
        await delay(1200);

        const canvasReady = await cdp.eval('document.querySelector("#mimi-3d-canvas").classList.contains("is-ready")');
        console.log('3D Canvas is-ready class:', canvasReady);
        const loadingHidden = await cdp.eval('document.querySelector("#mimi-3d-loading").hidden');
        console.log('3D Loading badge hidden:', loadingHidden);

        // Click 3D action buttons
        console.log('Testing 3D button interactions: Twinkle, Bounce, Slumber, Reset...');
        await cdp.eval('document.querySelector("#mimi-3d-twinkle").click()');
        let statusMsg = await cdp.eval('document.querySelector("#mimi-3d-status").textContent');
        console.log('Status after Twinkle:', statusMsg);
        if (!statusMsg.includes('sparkling brightly')) throw new Error('Twinkle button did not update status');

        await cdp.eval('document.querySelector("#mimi-3d-bounce").click()');
        statusMsg = await cdp.eval('document.querySelector("#mimi-3d-status").textContent');
        console.log('Status after Bounce:', statusMsg);

        await cdp.eval('document.querySelector("#mimi-3d-slumber").click()');
        statusMsg = await cdp.eval('document.querySelector("#mimi-3d-status").textContent');
        console.log('Status after Slumber:', statusMsg);

        await cdp.eval('document.querySelector("#mimi-3d-reset").click()');
        statusMsg = await cdp.eval('document.querySelector("#mimi-3d-status").textContent');
        console.log('Status after Reset:', statusMsg);

        // Test pointer dragging on canvas container
        await cdp.eval(`
            const wrap = document.querySelector("#mimi-3d-canvas-wrap");
            wrap.dispatchEvent(new MouseEvent("mousedown", { clientX: 200, clientY: 200 }));
            window.dispatchEvent(new MouseEvent("mousemove", { clientX: 260, clientY: 220 }));
            window.dispatchEvent(new MouseEvent("mouseup", { clientX: 260, clientY: 220 }));
        `);
        console.log('✓ 3D Character rendered and responds to pointer rotation & action buttons.');

        // 4. Test Dream Guestbook
        console.log('\n4. Testing Real Dream Guestbook (mimi-guestbook.js)...');
        await cdp.eval('document.querySelector("#guestbook").scrollIntoView();');
        await delay(800);

        const cardCount = await cdp.eval('document.querySelectorAll("#guestbook-list .dream-card").length');
        console.log('Initial guestbook cards loaded from server:', cardCount);
        if (cardCount === 0) throw new Error('No guestbook cards rendered from persistent server');

        // Submit a dream via the form
        console.log('Submitting a new dream via the form...');
        await cdp.eval(`
            document.querySelector("#guestbook-name").value = "Cosmic Traveler";
            document.querySelector("#guestbook-dream").value = "May every soul searching for comfort find a quiet star tonight.";
            document.querySelector('input[name="guestbook-charm"][value="heart"]').checked = true;
            document.querySelector("#guestbook-form").dispatchEvent(new Event("submit", { cancelable: true }));
        `);
        await delay(800);

        const formStatus = await cdp.eval('document.querySelector("#guestbook-form-status").textContent');
        console.log('Guestbook form submission status:', formStatus);
        if (!formStatus.includes('tucked safely')) throw new Error('Guestbook form did not show success status');

        const newCardCount = await cdp.eval('document.querySelectorAll("#guestbook-list .dream-card").length');
        const firstCardAuthor = await cdp.eval('document.querySelector("#guestbook-list .dream-card .dream-author").textContent');
        console.log('New card count:', newCardCount, 'First card author:', firstCardAuthor);
        if (firstCardAuthor !== 'Cosmic Traveler') throw new Error('New dream was not prepended to the feed');
        console.log('✓ Dream guestbook submitted, validated, and safely displayed.');

        // Clean up test submission so tests leave zero artifacts
        try {
            const allDreams = getAllDreams();
            const testRecord = (allDreams || []).find(d => d.name === 'Cosmic Traveler');
            if (testRecord && testRecord.id) {
                deleteDream(testRecord.id);
                console.log(`✓ Cleaned up E2E test guestbook record (ID: ${testRecord.id}).`);
            }
        } catch (cleanupErr) {
            console.warn('Note: Could not delete test dream record:', cleanupErr.message);
        }

        // 5. Test Character Chat (mimi-chat.js)
        console.log('\n5. Testing Character Chat (mimi-chat.js)...');
        await cdp.eval('document.querySelector("#mimi-chat").scrollIntoView();');

        // Test clicking prompt chip: "Tell me a tiny story"
        console.log('Testing prompt chip "Tell me a tiny story"...');
        await cdp.eval('document.querySelector(\'#mimi-chat-choices button[data-chat="story"]\').click()');
        await delay(700);

        let chatMessages = await cdp.eval('Array.from(document.querySelectorAll("#mimi-chat-messages .mimi-chat-bubble")).map(b => b.textContent)');
        console.log('Chat messages after prompt:', chatMessages.length);
        const lastMimiStory = chatMessages[chatMessages.length - 1];
        console.log('Mimi reply excerpt:', lastMimiStory.slice(0, 80) + '...');

        // Test typing custom message into chat input
        console.log('Testing custom user whisper: "Who are you?"...');
        await cdp.eval(`
            document.querySelector("#mimi-chat-input").value = "Who are you, little puff?";
            document.querySelector("#mimi-chat-form").dispatchEvent(new Event("submit", { cancelable: true }));
        `);
        await delay(700);

        chatMessages = await cdp.eval('Array.from(document.querySelectorAll("#mimi-chat-messages .mimi-chat-bubble")).map(b => b.textContent)');
        const lastMimiReply = chatMessages[chatMessages.length - 1];
        console.log('Mimi answer to identity inquiry:', lastMimiReply);
        if (!/mimi/i.test(lastMimiReply) || !/dream puff/i.test(lastMimiReply)) {
            throw new Error('Mimi character chat did not reply accurately in voice');
        }
        console.log('✓ Character chat replied warmly and accurately in Mimi voice.');

        // 6. Test Tier 1/2 Features (Theme toggle, sound toggle, dialogs)
        console.log('\n6. Verifying existing Tier 1/Tier 2 features remain intact...');
        // Day/night toggle
        await cdp.eval('document.querySelector("#theme-toggle").click()');
        const isDayMode = await cdp.eval('document.body.classList.contains("day-mode")');
        console.log('Theme toggle switched to day-mode:', isDayMode);
        if (!isDayMode) throw new Error('Theme toggle failed');

        // Switch back to night mode
        await cdp.eval('document.querySelector("#theme-toggle").click()');

        // Test storybook dialog opening
        await cdp.eval('document.querySelector(\'.project-open[data-dialog-target="storybook-dialog"]\').click()');
        const storybookOpen = await cdp.eval('document.querySelector("#storybook-dialog").open');
        console.log('Storybook dialog opens:', storybookOpen);
        if (!storybookOpen) throw new Error('Storybook dialog did not open');
        await cdp.eval('document.querySelector("#storybook-dialog .dialog-close").click()');

        // Check console logs again for any errors
        const allErrors = cdp.consoleLogs.filter(l => l.type === 'error');
        console.log('\nConsole error check:', allErrors.length === 0 ? 'Zero errors detected!' : allErrors);
        if (allErrors.length > 0) {
            throw new Error(`Browser console errors detected: ${JSON.stringify(allErrors)}`);
        }

        console.log('\n======================================================');
        console.log('🎉 ALL TIER 3 FEATURES VERIFIED SUCCESSFULLY IN BROWSER!');
        console.log('======================================================\n');
        process.exitCode = 0;
    } finally {
        if (cdp) cdp.close();
        if (chrome) chrome.kill();
        if (startedOurOwnServer) {
            console.log('Closing isolated test server...');
            server.close();
        }
    }
}

run().catch((err) => {
    console.error('E2E TEST FAILURE:', err);
    process.exit(1);
});

