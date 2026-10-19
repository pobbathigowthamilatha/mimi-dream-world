/**
 * Mimi's Dream World — Tier 3 Interactive 3D Character
 * Uses Three.js with lazy loading, WebGL detection, reduced-motion support,
 * custom procedural stylized character geometry, and interactive controls.
 */

(function () {
    let THREE = null;
    let scene = null;
    let camera = null;
    let renderer = null;
    let animationFrameId = null;
    let isVisible = false;
    let isInitialized = false;

    // Model components
    let mimiRoot = null;
    let mimiBodyGroup = null;
    let leftEar = null;
    let rightEar = null;
    let leftEye = null;
    let rightEye = null;
    let leftCheekStar = null;
    let rightCheekStar = null;
    let crownStar = null;
    let stardustParticles = null;
    let keyLight = null;
    let ambientLight = null;
    let rimLight = null;

    // Interaction state
    let isDragging = false;
    let previousPointerPosition = { x: 0, y: 0 };
    let targetRotationX = 0.05;
    let targetRotationY = 0;
    let currentRotationX = 0.05;
    let currentRotationY = 0;
    let pointerTarget = { x: 0, y: 0 };
    let currentPointer = { x: 0, y: 0 };
    let activeAction = null; // 'bounce', 'twinkle', 'slumber'
    let actionStartTime = 0;
    let blinkTimer = 0;
    let isBlinking = false;
    let isSleepy = false;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    // DOM Elements
    let section = null;
    let container = null;
    let canvas = null;
    let fallback = null;
    let loadingBadge = null;
    let statusText = null;

    function checkWebGLSupport() {
        try {
            const testCanvas = document.createElement('canvas');
            return Boolean(window.WebGLRenderingContext && (testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl')));
        } catch (e) {
            return false;
        }
    }

    function createStarShape(points, innerRadius, outerRadius) {
        const shape = new THREE.Shape();
        const step = Math.PI / points;
        for (let i = 0; i < points * 2; i++) {
            const r = (i % 2 === 0) ? outerRadius : innerRadius;
            const a = i * step - Math.PI / 2;
            const x = Math.cos(a) * r;
            const y = Math.sin(a) * r;
            if (i === 0) shape.moveTo(x, y);
            else shape.lineTo(x, y);
        }
        shape.closePath();
        return shape;
    }

    function buildMimiModel() {
        mimiRoot = new THREE.Group();
        mimiBodyGroup = new THREE.Group();
        mimiRoot.add(mimiBodyGroup);

        // Materials with dreamy palette
        const puffMaterial = new THREE.MeshStandardMaterial({
            color: 0xfcf8f2,
            roughness: 0.65,
            metalness: 0.04,
            emissive: 0x1e1828,
            emissiveIntensity: 0.12
        });

        const innerEarMaterial = new THREE.MeshStandardMaterial({
            color: 0xf6c6d5,
            roughness: 0.75,
            metalness: 0.02
        });

        const starMaterial = new THREE.MeshStandardMaterial({
            color: 0xf6d47d,
            emissive: 0xf6d47d,
            emissiveIntensity: 0.85,
            roughness: 0.3,
            metalness: 0.25
        });

        const eyeMaterial = new THREE.MeshStandardMaterial({
            color: 0x2e1d4e,
            roughness: 0.15,
            metalness: 0.1
        });

        const catchlightMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff
        });

        // 1. Mimi's Round Dream Puff Body
        const bodyGeo = new THREE.SphereGeometry(1.0, 32, 28);
        bodyGeo.scale(1.08, 0.98, 1.02);
        const bodyMesh = new THREE.Mesh(bodyGeo, puffMaterial);
        bodyMesh.position.y = 0.95;
        bodyMesh.castShadow = true;
        bodyMesh.receiveShadow = true;
        mimiBodyGroup.add(bodyMesh);

        // 2. Floppy Bunny Ears
        function createEar(isRight) {
            const earGroup = new THREE.Group();
            const earGeo = new THREE.SphereGeometry(0.38, 24, 20);
            earGeo.scale(0.7, 1.9, 0.45);
            const earMesh = new THREE.Mesh(earGeo, puffMaterial);
            earMesh.position.y = 0.45;
            earMesh.castShadow = true;
            earGroup.add(earMesh);

            // Inner ear blush
            const innerGeo = new THREE.SphereGeometry(0.3, 20, 16);
            innerGeo.scale(0.55, 1.5, 0.25);
            const innerMesh = new THREE.Mesh(innerGeo, innerEarMaterial);
            innerMesh.position.set(0, 0.45, 0.12);
            earGroup.add(innerMesh);

            // Flop angle
            const sign = isRight ? 1 : -1;
            earGroup.position.set(sign * 0.72, 1.75, -0.05);
            earGroup.rotation.z = sign * -0.52;
            earGroup.rotation.x = -0.15;
            earGroup.rotation.y = sign * 0.15;
            return earGroup;
        }

        leftEar = createEar(false);
        rightEar = createEar(true);
        mimiBodyGroup.add(leftEar);
        mimiBodyGroup.add(rightEar);

        // 3. Galaxy-Violet Eyes with Starlight Catchlights
        function createEye(isRight) {
            const eyeGroup = new THREE.Group();
            const eyeGeo = new THREE.SphereGeometry(0.165, 24, 20);
            eyeGeo.scale(0.9, 1.15, 0.6);
            const eyeMesh = new THREE.Mesh(eyeGeo, eyeMaterial);
            eyeGroup.add(eyeMesh);

            // Catchlight (upper highlight)
            const catchlightGeo = new THREE.SphereGeometry(0.045, 12, 12);
            const catchlightMesh = new THREE.Mesh(catchlightGeo, catchlightMaterial);
            catchlightMesh.position.set(0.04, 0.05, 0.1);
            eyeGroup.add(catchlightMesh);

            // Tiny secondary catchlight
            const catchlightGeo2 = new THREE.SphereGeometry(0.025, 8, 8);
            const catchlightMesh2 = new THREE.Mesh(catchlightGeo2, catchlightMaterial);
            catchlightMesh2.position.set(-0.04, -0.04, 0.1);
            eyeGroup.add(catchlightMesh2);

            const sign = isRight ? 1 : -1;
            eyeGroup.position.set(sign * 0.38, 1.05, 0.94);
            eyeGroup.rotation.y = sign * 0.22;
            eyeGroup.rotation.x = -0.06;
            return eyeGroup;
        }

        leftEye = createEye(false);
        rightEye = createEye(true);
        mimiBodyGroup.add(leftEye);
        mimiBodyGroup.add(rightEye);

        // 4. Golden Stars on Cheeks
        const starShape = createStarShape(5, 0.06, 0.13);
        const starExtrudeSettings = { depth: 0.03, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.015, bevelThickness: 0.015 };
        const starGeo = new THREE.ExtrudeGeometry(starShape, starExtrudeSettings);

        leftCheekStar = new THREE.Mesh(starGeo, starMaterial);
        leftCheekStar.position.set(-0.62, 0.78, 0.78);
        leftCheekStar.rotation.set(-0.1, -0.42, 0.15);
        mimiBodyGroup.add(leftCheekStar);

        rightCheekStar = new THREE.Mesh(starGeo, starMaterial);
        rightCheekStar.position.set(0.62, 0.78, 0.78);
        rightCheekStar.rotation.set(-0.1, 0.42, -0.15);
        mimiBodyGroup.add(rightCheekStar);

        // 5. Cute Soft Front Paws
        function createPaw(isRight) {
            const pawGeo = new THREE.SphereGeometry(0.24, 20, 16);
            pawGeo.scale(0.85, 0.65, 1.25);
            const pawMesh = new THREE.Mesh(pawGeo, puffMaterial);
            const sign = isRight ? 1 : -1;
            pawMesh.position.set(sign * 0.38, 0.22, 0.82);
            pawMesh.rotation.x = 0.1;
            pawMesh.rotation.y = sign * -0.15;
            pawMesh.castShadow = true;
            return pawMesh;
        }
        mimiBodyGroup.add(createPaw(false));
        mimiBodyGroup.add(createPaw(true));

        // 6. Floating Crown Star (Hovering gently above Mimi's head)
        const crownShape = createStarShape(5, 0.09, 0.2);
        const crownGeo = new THREE.ExtrudeGeometry(crownShape, { depth: 0.04, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02 });
        crownStar = new THREE.Mesh(crownGeo, starMaterial);
        crownStar.position.set(0, 2.25, 0);
        mimiBodyGroup.add(crownStar);

        // 7. Moon Cloud Pedestal
        const cloudGroup = new THREE.Group();
        const cloudMat = new THREE.MeshStandardMaterial({
            color: 0xded8ee,
            roughness: 0.9,
            metalness: 0.05
        });

        const cloudPuffs = [
            { r: 0.55, x: 0, y: 0.05, z: 0 },
            { r: 0.48, x: -0.62, y: -0.05, z: 0.25 },
            { r: 0.46, x: 0.62, y: -0.05, z: 0.25 },
            { r: 0.42, x: -0.5, y: -0.08, z: -0.45 },
            { r: 0.44, x: 0.5, y: -0.08, z: -0.45 },
            { r: 0.52, x: 0, y: -0.02, z: 0.65 }
        ];

        cloudPuffs.forEach(p => {
            const puff = new THREE.Mesh(new THREE.SphereGeometry(p.r, 20, 16), cloudMat);
            puff.position.set(p.x, p.y, p.z);
            puff.scale.set(1.15, 0.65, 1.15);
            puff.receiveShadow = true;
            cloudGroup.add(puff);
        });

        // Golden Moon Crescent Ring around cloud
        const crescentGeo = new THREE.TorusGeometry(1.4, 0.075, 16, 64, Math.PI * 1.55);
        const crescentMat = new THREE.MeshStandardMaterial({
            color: 0xf6d47d,
            emissive: 0x8a6f23,
            roughness: 0.35,
            metalness: 0.4
        });
        const crescentMesh = new THREE.Mesh(crescentGeo, crescentMat);
        crescentMesh.rotation.x = Math.PI / 2 + 0.12;
        crescentMesh.rotation.z = -0.35;
        crescentMesh.position.set(0, 0.08, 0);
        cloudGroup.add(crescentMesh);

        mimiRoot.add(cloudGroup);

        // 8. Swirling Floating Stardust Particles
        const particleCount = 75;
        const particleGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        const palette = [
            new THREE.Color(0xf6d47d), // gold
            new THREE.Color(0xf3b5cf), // rose
            new THREE.Color(0xd8c5ff), // lilac
            new THREE.Color(0xa8e8ef)  // starlight cyan
        ];

        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 1.3 + Math.random() * 1.5;
            const y = 0.2 + Math.random() * 2.4;

            positions[i * 3] = Math.cos(angle) * radius;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = Math.sin(angle) * radius;

            const c = palette[i % palette.length];
            colors[i * 3] = c.r;
            colors[i * 3 + 1] = c.g;
            colors[i * 3 + 2] = c.b;
        }

        particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const particleMat = new THREE.PointsMaterial({
            size: 0.07,
            vertexColors: true,
            transparent: true,
            opacity: 0.85
        });

        stardustParticles = new THREE.Points(particleGeo, particleMat);
        mimiRoot.add(stardustParticles);

        scene.add(mimiRoot);
    }

    function setupLights() {
        ambientLight = new THREE.AmbientLight(0x766c9a, 1.4);
        scene.add(ambientLight);

        keyLight = new THREE.DirectionalLight(0xfff3db, 2.2);
        keyLight.position.set(3, 5, 4);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.width = 1024;
        keyLight.shadow.mapSize.height = 1024;
        keyLight.shadow.camera.near = 0.5;
        keyLight.shadow.camera.far = 15;
        scene.add(keyLight);

        rimLight = new THREE.DirectionalLight(0xdfa0bd, 1.6);
        rimLight.position.set(-3.5, 3.5, -3);
        scene.add(rimLight);

        const bounceLight = new THREE.DirectionalLight(0xf6d47d, 0.6);
        bounceLight.position.set(0, -2, 2);
        scene.add(bounceLight);
    }

    function updateThemeColors() {
        if (!ambientLight || !keyLight) return;
        const isDay = document.body.classList.contains('day-mode');
        if (isDay) {
            ambientLight.color.setHex(0xb5b7cf);
            ambientLight.intensity = 1.7;
            keyLight.color.setHex(0xfff5e6);
            keyLight.intensity = 2.0;
            rimLight.color.setHex(0xc7a9d9);
        } else {
            ambientLight.color.setHex(0x766c9a);
            ambientLight.intensity = 1.4;
            keyLight.color.setHex(0xfff3db);
            keyLight.intensity = 2.2;
            rimLight.color.setHex(0xdfa0bd);
        }
    }

    function onResize() {
        if (!camera || !renderer || !container) return;
        const width = container.clientWidth;
        const height = container.clientHeight || 420;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }

    function bindInteractionEvents() {
        const targetEl = container;

        function onPointerDown(e) {
            isDragging = true;
            targetEl.style.cursor = 'grabbing';
            previousPointerPosition = {
                x: e.clientX || (e.touches && e.touches[0].clientX) || 0,
                y: e.clientY || (e.touches && e.touches[0].clientY) || 0
            };
        }

        function onPointerMove(e) {
            const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
            const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;

            const rect = container.getBoundingClientRect();
            pointerTarget.x = ((clientX - rect.left) / rect.width - 0.5) * 2;
            pointerTarget.y = -((clientY - rect.top) / rect.height - 0.5) * 2;

            if (!isDragging) return;

            const deltaX = clientX - previousPointerPosition.x;
            const deltaY = clientY - previousPointerPosition.y;

            targetRotationY += deltaX * 0.009;
            targetRotationX += deltaY * 0.007;

            // Clamping pitch rotation to avoid tumbling upside down
            targetRotationX = Math.max(-0.4, Math.min(0.6, targetRotationX));

            previousPointerPosition = { x: clientX, y: clientY };
        }

        function onPointerUp() {
            isDragging = false;
            targetEl.style.cursor = 'grab';
        }

        targetEl.addEventListener('mousedown', onPointerDown);
        targetEl.addEventListener('touchstart', onPointerDown, { passive: true });
        window.addEventListener('mousemove', onPointerMove);
        window.addEventListener('touchmove', onPointerMove, { passive: true });
        window.addEventListener('mouseup', onPointerUp);
        window.addEventListener('touchend', onPointerUp, { passive: true });

        // Interactive Button Controls
        const btnTwinkle = document.querySelector('#mimi-3d-twinkle');
        const btnBounce = document.querySelector('#mimi-3d-bounce');
        const btnSlumber = document.querySelector('#mimi-3d-slumber');
        const btnReset = document.querySelector('#mimi-3d-reset');

        if (btnTwinkle) {
            btnTwinkle.addEventListener('click', () => {
                triggerTwinkle();
                announceAction('Mimi’s golden stars are sparkling brightly!');
            });
        }
        if (btnBounce) {
            btnBounce.addEventListener('click', () => {
                triggerBounce();
                announceAction('Mimi bounced happily in the moonlight!');
            });
        }
        if (btnSlumber) {
            btnSlumber.addEventListener('click', () => {
                toggleSlumber();
            });
        }
        if (btnReset) {
            btnReset.addEventListener('click', () => {
                resetView();
                announceAction('Mimi’s view returned to the center.');
            });
        }

        // React to day/night theme toggle
        const themeToggle = document.querySelector('#theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                setTimeout(updateThemeColors, 100);
            });
        }
    }

    function announceAction(msg) {
        if (statusText) statusText.textContent = msg;
    }

    function triggerTwinkle() {
        activeAction = 'twinkle';
        actionStartTime = performance.now();
    }

    function triggerBounce() {
        activeAction = 'bounce';
        actionStartTime = performance.now();
    }

    function toggleSlumber() {
        isSleepy = !isSleepy;
        if (isSleepy) {
            announceAction('Shh… Mimi is resting gently on the moon cloud.');
            if (leftEye && rightEye) {
                leftEye.scale.set(0.9, 0.15, 0.6);
                rightEye.scale.set(0.9, 0.15, 0.6);
            }
        } else {
            announceAction('Mimi woke up ready to gather more starlight!');
            if (leftEye && rightEye) {
                leftEye.scale.set(0.9, 1.15, 0.6);
                rightEye.scale.set(0.9, 1.15, 0.6);
            }
        }
    }

    function resetView() {
        targetRotationX = 0.05;
        targetRotationY = 0;
    }

    function animate() {
        if (!isVisible) {
            animationFrameId = null;
            return;
        }

        animationFrameId = requestAnimationFrame(animate);

        const now = performance.now();
        const time = now * 0.001;

        // Smooth rotation damping
        const lerpFactor = prefersReducedMotion.matches ? 0.25 : 0.08;
        currentRotationX += (targetRotationX - currentRotationX) * lerpFactor;
        currentRotationY += (targetRotationY - currentRotationY) * lerpFactor;

        // Smooth pointer tracking for subtle head tilt
        currentPointer.x += (pointerTarget.x - currentPointer.x) * 0.05;
        currentPointer.y += (pointerTarget.y - currentPointer.y) * 0.05;

        if (mimiRoot) {
            mimiRoot.rotation.x = currentRotationX + currentPointer.y * 0.1;
            mimiRoot.rotation.y = currentRotationY + currentPointer.x * 0.15;
        }

        // Subtle Idle Breathing & Animation (disabled if prefersReducedMotion)
        if (!prefersReducedMotion.matches && mimiBodyGroup) {
            // Gentle floating bob
            const breath = Math.sin(time * 2.0);
            mimiBodyGroup.position.y = breath * 0.05;

            // Ear sway
            if (leftEar && rightEar) {
                const earSway = Math.cos(time * 2.0) * 0.06;
                leftEar.rotation.z = -0.52 + earSway;
                rightEar.rotation.z = 0.52 - earSway;
            }

            // Crown star floating and spinning
            if (crownStar) {
                crownStar.position.y = 2.25 + Math.sin(time * 3.0) * 0.06;
                crownStar.rotation.z = time * 0.8;
            }

            // Stardust particle rotation
            if (stardustParticles) {
                stardustParticles.rotation.y = time * 0.12;
            }

            // Cheek star pulse
            if (leftCheekStar && rightCheekStar) {
                const pulse = 0.75 + Math.sin(time * 3.0) * 0.25;
                leftCheekStar.material.emissiveIntensity = pulse;
                rightCheekStar.material.emissiveIntensity = pulse;
            }

            // Periodic Eye Blink
            if (!isSleepy && leftEye && rightEye) {
                if (now > blinkTimer) {
                    isBlinking = true;
                    leftEye.scale.set(0.9, 0.1, 0.6);
                    rightEye.scale.set(0.9, 0.1, 0.6);
                    setTimeout(() => {
                        if (!isSleepy && leftEye && rightEye) {
                            leftEye.scale.set(0.9, 1.15, 0.6);
                            rightEye.scale.set(0.9, 1.15, 0.6);
                        }
                        isBlinking = false;
                    }, 140);
                    blinkTimer = now + 3500 + Math.random() * 4000;
                }
            }

            // Handle active special actions
            if (activeAction === 'twinkle') {
                const elapsed = (now - actionStartTime) * 0.001;
                if (elapsed < 1.2) {
                    const flare = Math.sin(elapsed * Math.PI) * 2.5;
                    leftCheekStar.material.emissiveIntensity = 0.8 + flare;
                    rightCheekStar.material.emissiveIntensity = 0.8 + flare;
                    crownStar.rotation.z = time * 6.0;
                } else {
                    activeAction = null;
                }
            } else if (activeAction === 'bounce') {
                const elapsed = (now - actionStartTime) * 0.001;
                if (elapsed < 0.65) {
                    const jump = Math.sin(elapsed / 0.65 * Math.PI) * 0.45;
                    mimiBodyGroup.position.y = jump;
                    leftEar.rotation.z = -0.52 - jump * 0.8;
                    rightEar.rotation.z = 0.52 + jump * 0.8;
                } else {
                    activeAction = null;
                }
            }
        }

        renderer.render(scene, camera);
    }

    function startRendering() {
        if (!isVisible) {
            isVisible = true;
            if (!animationFrameId) {
                animate();
            }
        }
    }

    function stopRendering() {
        isVisible = false;
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    }

    async function init() {
        if (isInitialized) return;

        // Check WebGL support
        if (!checkWebGLSupport()) {
            if (loadingBadge) loadingBadge.hidden = true;
            if (fallback) fallback.hidden = false;
            if (canvas) canvas.hidden = true;
            return;
        }

        try {
            // Lazy load Three.js module
            const threeModule = await import('./lib/three.module.js');
            THREE = threeModule;

            // Initialize Scene, Camera & Renderer
            scene = new THREE.Scene();

            const width = container.clientWidth || 600;
            const height = container.clientHeight || 420;

            camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
            camera.position.set(0, 1.25, 4.6);
            camera.lookAt(0, 0.9, 0);

            renderer = new THREE.WebGLRenderer({
                canvas: canvas,
                alpha: true,
                antialias: true,
                powerPreference: 'high-performance'
            });
            renderer.setSize(width, height);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;

            setupLights();
            buildMimiModel();
            updateThemeColors();
            bindInteractionEvents();

            window.addEventListener('resize', onResize);

            // Hide loading indicator, reveal canvas
            if (loadingBadge) loadingBadge.hidden = true;
            canvas.classList.add('is-ready');
            isInitialized = true;

            // Start loop if in viewport
            startRendering();
        } catch (err) {
            console.error('Could not initialize Mimi 3D:', err);
            if (loadingBadge) loadingBadge.hidden = true;
            if (fallback) fallback.hidden = false;
            if (canvas) canvas.hidden = true;
        }
    }

    function setup() {
        section = document.querySelector('#mimi-3d-sanctuary');
        container = document.querySelector('#mimi-3d-canvas-wrap');
        canvas = document.querySelector('#mimi-3d-canvas');
        fallback = document.querySelector('#mimi-3d-fallback');
        loadingBadge = document.querySelector('#mimi-3d-loading');
        statusText = document.querySelector('#mimi-3d-status');

        if (!container || !canvas) return;

        // Lazy load when user scrolls near the 3D sanctuary
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        if (!isInitialized) {
                            init();
                        } else {
                            startRendering();
                        }
                    } else {
                        if (isInitialized) {
                            stopRendering();
                        }
                    }
                });
            }, { rootMargin: '250px 0px' });

            observer.observe(section || container);
        } else {
            // Fallback for older browsers
            setTimeout(init, 1000);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setup);
    } else {
        setup();
    }

    // Page Visibility API to pause rendering when tab is hidden
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopRendering();
        } else if (isInitialized) {
            startRendering();
        }
    });
})();
