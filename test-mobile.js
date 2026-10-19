const { spawn } = require('child_process');
const http = require('http');
const { server, isPortActive } = require('./server.js');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = parseInt(process.env.TEST_PORT, 10) || 4173;
const CDP_PORT = 9225;

const VIEWPORTS = [
    { name: 'Mobile Narrow (iPhone SE)', width: 375, height: 812 },
    { name: 'Mobile Modern (iPhone 14/15/16)', width: 390, height: 844 },
    { name: 'Tablet Portrait (iPad)', width: 768, height: 1024 },
    { name: 'Desktop Standard', width: 1280, height: 800 }
];

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        http.get(url, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => {
                try { resolve(JSON.parse(d)); } catch (e) { resolve(null); }
            });
        }).on('error', reject);
    });
}

class SimpleCDP {
    constructor(wsUrl) {
        this.ws = new WebSocket(wsUrl);
        this.msgId = 0;
        this.callbacks = new Map();

        this.ws.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            if (msg.id && this.callbacks.has(msg.id)) {
                const cb = this.callbacks.get(msg.id);
                this.callbacks.delete(msg.id);
                cb(msg);
            }
        };
    }

    ready() {
        return new Promise(resolve => {
            if (this.ws.readyState === WebSocket.OPEN) return resolve();
            this.ws.onopen = () => resolve();
        });
    }

    send(method, params = {}) {
        return new Promise(resolve => {
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
        return res.result?.result?.value;
    }

    close() {
        try { this.ws.close(); } catch (e) {}
    }
}

async function run() {
    console.log('--- STARTING RESPONSIVE & MOBILE LAYOUT VERIFICATION ---');

    let startedOurOwnServer = false;
    const isAlreadyRunning = await isPortActive(PORT);

    if (isAlreadyRunning) {
        console.log(`✓ Detected server already running on port ${PORT}. Reusing for mobile test.`);
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

    const chrome = spawn(CHROME_PATH, [
        '--headless=new',
        `--remote-debugging-port=${CDP_PORT}`,
        '--window-size=1280,800',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        `http://localhost:${PORT}/`
    ]);

    await delay(1500);

    let cdp = null;
    let allPassed = true;

    try {
        const targets = await fetchJson(`http://localhost:${CDP_PORT}/json/list`);
        const pageTarget = targets?.find(t => t.type === 'page' && t.url.includes(`localhost:${PORT}`));
        if (!pageTarget) throw new Error('Could not find page target in Chrome');

        cdp = new SimpleCDP(pageTarget.webSocketDebuggerUrl);
        await cdp.ready();
        await cdp.send('Runtime.enable');
        await cdp.send('Emulation.setDeviceMetricsOverride', {
            width: 1280,
            height: 800,
            deviceScaleFactor: 1,
            mobile: false
        });

        for (const vp of VIEWPORTS) {
            console.log(`\nTesting viewport: ${vp.name} (${vp.width}x${vp.height})...`);
            await cdp.send('Emulation.setDeviceMetricsOverride', {
                width: vp.width,
                height: vp.height,
                deviceScaleFactor: vp.width < 768 ? 2 : 1,
                mobile: vp.width < 768
            });
            await delay(400);

            const metrics = await cdp.eval(`({
                innerWidth: window.innerWidth,
                scrollWidth: document.documentElement.scrollWidth,
                clientWidth: document.documentElement.clientWidth,
                hasOverflow: document.documentElement.scrollWidth > window.innerWidth,
                heroVisible: !!document.querySelector('#home'),
                sanctuaryVisible: !!document.querySelector('#mimi-3d-sanctuary'),
                guestbookVisible: !!document.querySelector('#guestbook'),
                chatVisible: !!document.querySelector('#mimi-chat')
            })`);

            console.log(`  Inner Width: ${metrics.innerWidth}px, Document Scroll Width: ${metrics.scrollWidth}px`);
            console.log(`  Components detected: Hero: ${metrics.heroVisible}, 3D: ${metrics.sanctuaryVisible}, Guestbook: ${metrics.guestbookVisible}, Chat: ${metrics.chatVisible}`);

            if (metrics.hasOverflow) {
                console.error(`  ❌ OVERFLOW DETECTED: scrollWidth (${metrics.scrollWidth}px) exceeds innerWidth (${metrics.innerWidth}px) by ${metrics.scrollWidth - metrics.innerWidth}px!`);
                allPassed = false;
            } else {
                console.log(`  ✓ Perfectly responsive: zero horizontal overflow.`);
            }
        }

        console.log('\n======================================================');
        if (allPassed) {
            console.log('✨ ALL VIEWPORT RESPONSIVENESS TESTS PASSED (EXIT CODE 0)');
            process.exitCode = 0;
        } else {
            console.error('❌ SOME VIEWPORT TESTS FAILED OVERFLOW CHECKS');
            process.exitCode = 1;
        }
        console.log('======================================================\n');
    } catch (e) {
        console.error('Mobile layout verification error:', e.message);
        process.exitCode = 1;
    } finally {
        if (cdp) cdp.close();
        if (chrome) chrome.kill();
        if (startedOurOwnServer) {
            console.log('Closing isolated test server...');
            server.close();
        }
    }
}

run();

