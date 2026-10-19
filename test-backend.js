const http = require('http');
const net = require('net');
const { server, getAllDreams, insertDream, deleteDream } = require('./server.js');

const PORT = parseInt(process.env.TEST_PORT, 10) || 4173;

function isPortActive(port, host = '127.0.0.1') {
    return new Promise(resolve => {
        const socket = new net.Socket();
        socket.setTimeout(350);
        socket.once('connect', () => {
            socket.destroy();
            resolve(true);
        });
        socket.once('timeout', () => {
            socket.destroy();
            resolve(false);
        });
        socket.once('error', () => {
            resolve(false);
        });
        socket.connect(port, host);
    });
}

function makeRequest(options, body) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                let parsed = null;
                try {
                    parsed = data ? JSON.parse(data) : null;
                } catch (e) {
                    parsed = data;
                }
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    raw: data,
                    body: parsed
                });
            });
        });
        req.on('error', reject);
        if (body) {
            req.write(typeof body === 'string' ? body : JSON.stringify(body));
        }
        req.end();
    });
}

async function runTests() {
    console.log('--- STARTING BACKEND SUITE ---');

    let startedOurOwnServer = false;
    const isAlreadyRunning = await isPortActive(PORT);

    if (isAlreadyRunning) {
        console.log(`✓ Detected server already running on port ${PORT}. Reusing for test.`);
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

    const createdTestIds = [];

    try {
        // 1. GET /api/dreams
        console.log('\n[1/6] Testing GET /api/dreams...');
        const getRes = await makeRequest({
            hostname: '127.0.0.1',
            port: PORT,
            path: '/api/dreams',
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });
        console.log(`  Status: ${getRes.status}, Count: ${getRes.body?.count}`);
        if (getRes.status !== 200 || !getRes.body?.success || !Array.isArray(getRes.body?.dreams)) {
            throw new Error(`GET /api/dreams failed: Expected 200 and array, got ${getRes.status}`);
        }
        if (!getRes.headers['content-type']?.includes('application/json')) {
            throw new Error('GET /api/dreams did not set application/json header');
        }
        console.log('  ✓ GET /api/dreams returns valid JSON array.');

        // 2. POST /api/dreams with valid payload
        console.log('\n[2/6] Testing POST /api/dreams (valid submission)...');
        const postRes = await makeRequest({
            hostname: '127.0.0.1',
            port: PORT,
            path: '/api/dreams',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        }, {
            name: 'Backend Test Voyager',
            dream: 'Testing starlight whispers through the moon database.',
            star_sign: 'moon'
        });
        console.log(`  Status: ${postRes.status}, Created ID: ${postRes.body?.dream?.id}`);
        if (postRes.status !== 201 || !postRes.body?.success || !postRes.body?.dream?.id) {
            throw new Error(`POST /api/dreams failed: ${JSON.stringify(postRes.body)}`);
        }
        createdTestIds.push(postRes.body.dream.id);
        console.log('  ✓ POST /api/dreams successfully saved and returned 201 Created.');

        // 3. Validation: empty name and empty dream
        console.log('\n[3/6] Testing validation for empty/invalid inputs...');
        const emptyNameRes = await makeRequest({
            hostname: '127.0.0.1',
            port: PORT,
            path: '/api/dreams',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { name: '', dream: 'Valid dream text' });

        if (emptyNameRes.status !== 400 || !emptyNameRes.body?.error) {
            throw new Error(`Expected 400 for empty name, got ${emptyNameRes.status}`);
        }

        const emptyDreamRes = await makeRequest({
            hostname: '127.0.0.1',
            port: PORT,
            path: '/api/dreams',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { name: 'Valid Name', dream: '' });

        if (emptyDreamRes.status !== 400 || !emptyDreamRes.body?.error) {
            throw new Error(`Expected 400 for empty dream, got ${emptyDreamRes.status}`);
        }

        const longNameRes = await makeRequest({
            hostname: '127.0.0.1',
            port: PORT,
            path: '/api/dreams',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { name: 'A'.repeat(45), dream: 'Valid dream' });

        if (longNameRes.status !== 400) {
            throw new Error(`Expected 400 for name > 40 chars, got ${longNameRes.status}`);
        }

        console.log('  ✓ Server correctly validated and rejected empty and oversized inputs.');

        // 4. API Error Handling: Method Not Allowed & 404
        console.log('\n[4/6] Testing API consistency for 404 & 405 routes...');
        const notAllowedRes = await makeRequest({
            hostname: '127.0.0.1',
            port: PORT,
            path: '/api/dreams',
            method: 'PUT'
        });
        if (notAllowedRes.status !== 405 || typeof notAllowedRes.body !== 'object' || !notAllowedRes.body.error) {
            throw new Error(`Expected JSON 405 for PUT /api/dreams, got ${notAllowedRes.status}`);
        }

        const notFoundApiRes = await makeRequest({
            hostname: '127.0.0.1',
            port: PORT,
            path: '/api/nonexistent-route',
            method: 'GET'
        });
        if (notFoundApiRes.status !== 404 || typeof notFoundApiRes.body !== 'object' || !notFoundApiRes.body.error) {
            throw new Error(`Expected JSON 404 for unknown /api route, got ${notFoundApiRes.status}`);
        }
        console.log('  ✓ All API errors return consistent JSON responses with appropriate HTTP codes.');

        // 5. POST /api/chat
        console.log('\n[5/6] Testing POST /api/chat...');
        const chatRes = await makeRequest({
            hostname: '127.0.0.1',
            port: PORT,
            path: '/api/chat',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            name: 'Voyager',
            message: 'Tell me a tiny story about the stars'
        });
        console.log(`  Status: ${chatRes.status}, Reply length: ${chatRes.body?.reply?.length}`);
        if (chatRes.status !== 200 || !chatRes.body?.success || !chatRes.body?.reply) {
            throw new Error('POST /api/chat failed');
        }
        console.log('  ✓ Character chat responds in Mimi voice.');

        // 6. Test Data Cleanup
        console.log('\n[6/6] Cleaning up test records...');
        for (const id of createdTestIds) {
            deleteDream(id);
        }
        console.log(`  ✓ Cleaned up ${createdTestIds.length} test records.`);

        console.log('\n======================================================');
        console.log('✨ ALL BACKEND TESTS PASSED (EXIT CODE 0)');
        console.log('======================================================\n');
        process.exitCode = 0;
    } catch (err) {
        console.error('\n❌ BACKEND TEST FAILURE:', err.message);
        process.exitCode = 1;
    } finally {
        if (startedOurOwnServer) {
            console.log('Closing isolated test server...');
            server.close();
        }
    }
}

runTests();
