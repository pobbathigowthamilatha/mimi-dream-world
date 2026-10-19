/**
 * Mimi's Dream World — Tier 3 Persistent Backend Server
 * Uses Node.js standard libraries and native SQLite database (node:sqlite)
 * with robust fallback to atomic JSON persistence.
 *
 * Endpoints:
 * - GET    /api/dreams      Retrieve persistent dream guestbook entries
 * - POST   /api/dreams      Validate, limit, and persistently save a new dream
 * - DELETE /api/dreams/:id  Remove a dream entry (for test cleanup/moderation)
 * - POST   /api/chat        Mimi's character chat response endpoint
 * - Static file serving with proper MIME types and security headers
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT, 10) || 4173;
const HOST = process.env.HOST || '0.0.0.0';
const ROOT_DIR = __dirname;

// Support persistent volume storage via DATA_DIR or DB_PATH
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : ROOT_DIR;
if (!fs.existsSync(DATA_DIR)) {
    try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        console.log(`[DB] Created persistent data directory at: ${DATA_DIR}`);
    } catch (e) {
        console.warn(`[DB] Could not create data directory at ${DATA_DIR}:`, e.message);
    }
}

const DB_PATH = process.env.DB_PATH ? path.resolve(process.env.DB_PATH) : path.join(DATA_DIR, 'dreams.db');
const JSON_DB_PATH = path.join(DATA_DIR, 'dreams-fallback.json');

// Auto-seed: If persistent volume is mounted and empty, copy initial seed database if available
if (DATA_DIR !== ROOT_DIR) {
    const seedDbPath = path.join(ROOT_DIR, 'dreams.db');
    if (!fs.existsSync(DB_PATH) && fs.existsSync(seedDbPath)) {
        try {
            fs.copyFileSync(seedDbPath, DB_PATH);
            console.log(`[DB] Seeded initial database to persistent volume at ${DB_PATH}`);
        } catch (copyErr) {
            console.warn('[DB] Could not copy initial seed database:', copyErr.message);
        }
    }
}

// --- Persistent Database Initialization ---
let sqliteDb = null;

try {
    const { DatabaseSync } = require('node:sqlite');
    sqliteDb = new DatabaseSync(DB_PATH);
    try {
        sqliteDb.exec('PRAGMA journal_mode = WAL;');
        sqliteDb.exec('PRAGMA busy_timeout = 5000;');
    } catch (pragmaErr) {
        // Pragma warnings non-fatal
    }
    sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS dreams (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            dream TEXT NOT NULL,
            star_sign TEXT NOT NULL DEFAULT 'star',
            created_at TEXT NOT NULL
        );
    `);
    console.log(`[DB] Persistent SQLite database active at ${DB_PATH}`);
} catch (err) {
    console.warn('[DB] Native SQLite not supported or failed to initialize, using persistent JSON store:', err.message);
}

// Fallback JSON persistence helpers
function loadJsonDreams() {
    try {
        if (fs.existsSync(JSON_DB_PATH)) {
            const data = fs.readFileSync(JSON_DB_PATH, 'utf8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.error('[DB] Failed reading fallback JSON:', e.message);
    }
    return [];
}

function saveJsonDreams(dreams) {
    try {
        const tempPath = `${JSON_DB_PATH}.tmp`;
        fs.writeFileSync(tempPath, JSON.stringify(dreams, null, 2), 'utf8');
        fs.renameSync(tempPath, JSON_DB_PATH);
    } catch (e) {
        console.error('[DB] Failed writing fallback JSON:', e.message);
    }
}

// Seed initial dreamy messages if DB is brand new
function seedInitialDreams() {
    const initialSeeds = [
        {
            name: "Mimi",
            dream: "May every quiet bedroom find a soft patch of moonlight tonight.",
            star_sign: "star",
            created_at: new Date(Date.now() - 3600000 * 5).toISOString()
        },
        {
            name: "Starry Wanderer",
            dream: "I wish for gentle sleep, quiet thoughts, and brighter mornings for anyone who feels tired.",
            star_sign: "moon",
            created_at: new Date(Date.now() - 3600000 * 2).toISOString()
        },
        {
            name: "Cloud Seeker",
            dream: "Hoping my grandmother's garden blooms beautifully this spring.",
            star_sign: "sparkle",
            created_at: new Date(Date.now() - 3600000).toISOString()
        }
    ];

    if (sqliteDb) {
        const countRow = sqliteDb.prepare('SELECT COUNT(*) as cnt FROM dreams').get();
        if (countRow && countRow.cnt === 0) {
            const insertStmt = sqliteDb.prepare(`
                INSERT INTO dreams (name, dream, star_sign, created_at)
                VALUES (?, ?, ?, ?)
            `);
            for (const s of initialSeeds) {
                insertStmt.run(s.name, s.dream, s.star_sign, s.created_at);
            }
            console.log('[DB] Seeded initial moonlit dreams in SQLite.');
        }
    } else {
        const list = loadJsonDreams();
        if (list.length === 0) {
            saveJsonDreams(initialSeeds.map((s, idx) => ({ id: idx + 1, ...s })));
            console.log('[DB] Seeded initial moonlit dreams in fallback JSON.');
        }
    }
}

seedInitialDreams();

// --- Database Operations ---
function getAllDreams() {
    if (sqliteDb) {
        const rows = sqliteDb.prepare(`
            SELECT id, name, dream, star_sign, created_at
            FROM dreams
            ORDER BY id DESC
            LIMIT 100
        `).all();
        return rows || [];
    }
    const list = loadJsonDreams();
    return list.slice().reverse().slice(0, 100);
}

function insertDream(name, dream, star_sign) {
    const nowIso = new Date().toISOString();
    const cleanSign = ['star', 'moon', 'sparkle', 'heart', 'cloud'].includes(star_sign) ? star_sign : 'star';

    if (sqliteDb) {
        const stmt = sqliteDb.prepare(`
            INSERT INTO dreams (name, dream, star_sign, created_at)
            VALUES (?, ?, ?, ?)
        `);
        const info = stmt.run(name, dream, cleanSign, nowIso);
        return {
            id: Number(info.lastInsertRowid),
            name,
            dream,
            star_sign: cleanSign,
            created_at: nowIso
        };
    }

    const list = loadJsonDreams();
    const nextId = list.length > 0 ? Math.max(...list.map(d => d.id || 0)) + 1 : 1;
    const newEntry = {
        id: nextId,
        name,
        dream,
        star_sign: cleanSign,
        created_at: nowIso
    };
    list.push(newEntry);
    saveJsonDreams(list);
    return newEntry;
}

function deleteDream(id) {
    if (sqliteDb) {
        sqliteDb.prepare('DELETE FROM dreams WHERE id = ?').run(id);
        return true;
    }
    let list = loadJsonDreams();
    list = list.filter(d => d.id !== id);
    saveJsonDreams(list);
    return true;
}

// --- Sanitization & Validation ---
function cleanText(input) {
    if (typeof input !== 'string') return '';
    // Strip control characters except basic newlines and spaces
    return input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '').trim();
}

// Rate limiting in memory (IP -> timestamp array)
const rateLimits = new Map();
function isRateLimited(ip) {
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const maxRequests = 30; // generous limit for visitors and tests

    let timestamps = rateLimits.get(ip) || [];
    timestamps = timestamps.filter(t => now - t < windowMs);

    if (timestamps.length >= maxRequests) {
        return true;
    }
    timestamps.push(now);
    rateLimits.set(ip, timestamps);
    return false;
}

// --- MIME Type Mapping ---
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain; charset=utf-8',
    '.woff2': 'font/woff2'
};

// --- Character Voice Reply Engine (for server chat fallback) ---
function getMimiReply(message, visitorName) {
    const text = message.toLowerCase();
    const namePrefix = visitorName ? `${visitorName}, ` : '';

    if (text.includes('lonely') || text.includes('alone') || text.includes('sad')) {
        return `${namePrefix}lonely hearts are why Mimi keeps the moon lamps burning bright. You can stay here as long as you need.`;
    }
    if (text.includes('sleep') || text.includes('tired') || text.includes('rest') || text.includes('bed')) {
        return `Then let the Moon keep watch, ${namePrefix}softness is allowed, even in the middle of a big, busy sky.`;
    }
    if (text.includes('story') || text.includes('tale')) {
        return `Once, a little falling star landed right in Mimi's paw. It was cold and shivering, but Mimi gave it a velvet blanket. By morning, it was shining warmer than ever.`;
    }
    if (text.includes('star') || text.includes('starlight')) {
        return `Every star in Mimi's jar carries a tiny wish. Whenever someone does a gentle deed down on Earth, a new golden star blinks into life!`;
    }
    if (text.includes('hello') || text.includes('hi') || text.includes('hey')) {
        return `Hello gentle traveler! Mimi flapped their ears happily when you arrived on the Moon.`;
    }
    if (text.includes('who are you') || text.includes('what are you') || text.includes('mimi')) {
        return `Mimi is a little dream puff with galaxy-violet eyes and golden cheek stars. I gather starlight and turn it into bedtime stories and quiet comfort.`;
    }
    if (text.includes('wish') || text.includes('dream')) {
        return `Mimi will tuck your dream into the silver moonbeams. Wishes whispered softly have a way of finding their place in the sky.`;
    }
    if (text.includes('love') || text.includes('hug')) {
        return `Mimi wraps you in a soft moon-cloud hug. May your heart feel warm tonight. ♡`;
    }
    if (text.includes('thank')) {
        return `You are always welcome here beneath the stars, ${namePrefix}thank you for sharing your light with Mimi.`;
    }

    const gentleFallbacks = [
        `Mimi listens with soft, floppy ears. Even the quietest thoughts are safe here under the moonlight.`,
        `A small golden spark drifted past as you spoke. Mimi tucked your words into a velvet pocket.`,
        `The Moon is calm tonight. Whatever you are carrying, you can put it down and rest for a little while.`,
        `Mimi nods gently and taps their cheeks. The universe is big, but you are not alone in it.`
    ];

    return gentleFallbacks[Math.floor(Math.random() * gentleFallbacks.length)];
}

// Helper to send JSON responses consistently
function sendJson(res, statusCode, payload) {
    if (res.headersSent) return;
    const bodyStr = JSON.stringify(payload);
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(bodyStr)
    });
    res.end(bodyStr);
}

// --- Main Request Handler ---
function requestHandler(req, res) {
    // Security & CORS Headers on every response
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const clientIp = req.socket.remoteAddress || '127.0.0.1';
    let pathname = '/';
    try {
        const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        pathname = parsedUrl.pathname;
    } catch (e) {
        pathname = req.url.split('?')[0] || '/';
    }

    // ==========================================
    // API ROUTING (/api/*)
    // Always returns JSON responses. Never empty.
    // ==========================================
    if (pathname.startsWith('/api/')) {
        // --- GET /api/dreams ---
        if (pathname === '/api/dreams' && req.method === 'GET') {
            try {
                const dreams = getAllDreams();
                sendJson(res, 200, {
                    success: true,
                    count: dreams.length,
                    dreams: dreams || []
                });
            } catch (e) {
                console.error('[API] GET /api/dreams error:', e);
                sendJson(res, 500, {
                    success: false,
                    error: 'Could not fetch dreams from the moon vault.'
                });
            }
            return;
        }

        // --- POST /api/dreams ---
        if (pathname === '/api/dreams' && req.method === 'POST') {
            if (isRateLimited(clientIp)) {
                sendJson(res, 429, {
                    success: false,
                    error: 'The moon breeze is busy right now. Please wait a moment before sending another dream.'
                });
                return;
            }

            let body = '';
            const MAX_BYTES = 64 * 1024; // 64 KB limit
            let exceeded = false;

            req.on('data', chunk => {
                body += chunk;
                if (body.length > MAX_BYTES && !exceeded) {
                    exceeded = true;
                    sendJson(res, 413, {
                        success: false,
                        error: 'Dream message is too large for the moon parcel.'
                    });
                    req.destroy();
                }
            });

            req.on('end', () => {
                if (exceeded || res.headersSent) return;

                let data;
                try {
                    data = JSON.parse(body || '{}');
                } catch (err) {
                    sendJson(res, 400, {
                        success: false,
                        error: 'Invalid JSON payload received.'
                    });
                    return;
                }

                const rawName = cleanText(data.name || '');
                const rawDream = cleanText(data.dream || '');
                const rawSign = cleanText(data.star_sign || 'star');

                // Server-side validation
                if (!rawName || rawName.length < 1) {
                    sendJson(res, 400, {
                        success: false,
                        error: 'Please share a name or nickname so Mimi knows who left this wish.'
                    });
                    return;
                }
                if (rawName.length > 40) {
                    sendJson(res, 400, {
                        success: false,
                        error: 'Name must be 40 characters or fewer.'
                    });
                    return;
                }
                if (!rawDream || rawDream.length < 2) {
                    sendJson(res, 400, {
                        success: false,
                        error: 'Please write at least 2 characters for your dream or wish.'
                    });
                    return;
                }
                if (rawDream.length > 280) {
                    sendJson(res, 400, {
                        success: false,
                        error: 'Dreams should be 280 characters or fewer.'
                    });
                    return;
                }

                try {
                    const savedDream = insertDream(rawName, rawDream, rawSign);
                    sendJson(res, 201, {
                        success: true,
                        message: 'Your dream has reached Mimi’s Moon!',
                        dream: savedDream
                    });
                } catch (dbErr) {
                    console.error('[API] DB insert error:', dbErr);
                    sendJson(res, 500, {
                        success: false,
                        error: 'Could not store dream in the moon vault database.'
                    });
                }
            });
            return;
        }

        // --- DELETE /api/dreams/:id ---
        if (pathname.startsWith('/api/dreams/') && req.method === 'DELETE') {
            const idPart = pathname.slice('/api/dreams/'.length);
            const id = parseInt(idPart, 10);
            if (id && !isNaN(id)) {
                deleteDream(id);
                sendJson(res, 200, { success: true, message: `Dream ${id} removed.` });
                return;
            }
            sendJson(res, 400, { success: false, error: 'Invalid dream ID for deletion.' });
            return;
        }

        // --- POST /api/chat ---
        if (pathname === '/api/chat' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
                if (res.headersSent) return;
                let data;
                try {
                    data = JSON.parse(body || '{}');
                } catch (err) {
                    sendJson(res, 400, { success: false, error: 'Invalid JSON request payload.' });
                    return;
                }

                const userMessage = cleanText(data.message || '');
                const visitorName = cleanText(data.name || '');

                if (!userMessage) {
                    sendJson(res, 400, { success: false, error: 'Message cannot be empty.' });
                    return;
                }

                const reply = getMimiReply(userMessage, visitorName);
                sendJson(res, 200, {
                    success: true,
                    reply: reply
                });
            });
            return;
        }

        // Any other unsupported method on /api/dreams or /api/chat
        if (pathname === '/api/dreams') {
            sendJson(res, 405, {
                success: false,
                error: `Method ${req.method} not allowed on /api/dreams. Supported methods: GET, POST.`
            });
            return;
        }
        if (pathname === '/api/chat') {
            sendJson(res, 405, {
                success: false,
                error: `Method ${req.method} not allowed on /api/chat. Supported method: POST.`
            });
            return;
        }

        // Any other unknown /api/* endpoint
        sendJson(res, 404, {
            success: false,
            error: `API route ${pathname} not found on Mimi’s Moon.`
        });
        return;
    }

    // ==========================================
    // STATIC FILE SERVING
    // ==========================================
    if (req.method === 'GET' || req.method === 'HEAD') {
        let safePath = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[\/\\])+/, '');
        if (safePath === '/' || safePath === '\\') {
            safePath = '/index.html';
        }

        const filePath = path.join(ROOT_DIR, safePath);

        // Security check: ensure path stays within ROOT_DIR
        if (!filePath.startsWith(ROOT_DIR)) {
            res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Access Denied');
            return;
        }

        fs.stat(filePath, (err, stats) => {
            if (err || !stats.isFile()) {
                res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end('<!DOCTYPE html><html><head><title>404 Not Found</title></head><body><h1>404 Not Found on Mimi’s Moon</h1><p><a href="/">Return to the Moon</a></p></body></html>');
                return;
            }

            const ext = path.extname(filePath).toLowerCase();
            const contentType = MIME_TYPES[ext] || 'application/octet-stream';

            res.writeHead(200, {
                'Content-Type': contentType,
                'Content-Length': stats.size,
                'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600'
            });

            if (req.method === 'HEAD') {
                res.end();
                return;
            }

            const readStream = fs.createReadStream(filePath);
            readStream.pipe(res);
        });
        return;
    }

    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Method Not Allowed');
}

function isPortActive(port, host = '127.0.0.1') {
    return new Promise(resolve => {
        const net = require('net');
        const socket = new net.Socket();
        socket.setTimeout(350);
        socket.once('connect', () => { socket.destroy(); resolve(true); });
        socket.once('timeout', () => { socket.destroy(); resolve(false); });
        socket.once('error', () => { resolve(false); });
        socket.connect(port, host);
    });
}

const server = http.createServer(requestHandler);

// Only bind to port if executed directly (e.g. node server.js or npm start).
// When imported in tests, the test harness controls port binding.
if (require.main === module) {
    server.listen(PORT, HOST, () => {
        console.log(`✨ Mimi's Dream World running at http://localhost:${PORT}/`);
        console.log(`   Database: ${sqliteDb ? `SQLite (${DB_PATH})` : 'JSON fallback'}`);
    });

    const shutdown = (signal) => {
        console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
        if (sqliteDb) {
            try {
                sqliteDb.close();
                console.log('[DB] SQLite connection closed cleanly.');
            } catch (err) {}
        }
        server.close(() => {
            console.log('[Server] HTTP server closed.');
            process.exit(0);
        });
        setTimeout(() => process.exit(0), 3000).unref();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}

module.exports = server;
module.exports.server = server;
module.exports.requestHandler = requestHandler;
module.exports.PORT = PORT;
module.exports.HOST = HOST;
module.exports.sqliteDb = sqliteDb;
module.exports.getAllDreams = getAllDreams;
module.exports.insertDream = insertDream;
module.exports.deleteDream = deleteDream;
module.exports.isPortActive = isPortActive;

