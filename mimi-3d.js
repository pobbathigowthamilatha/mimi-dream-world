/**
 * Mimi's Dream World — Tier 3 Interactive 3D Character
 * Enhanced expressive procedural character featuring:
 * - Large expressive galaxy-violet eyes with multi-layer starlight catchlights
 * - Cute tiny nose and sweet gentle smiling mouth
 * - Rosy blushing cheeks and glowing golden cheek stars
 * - Soft, fluffy, rounded body proportions with floppy ears, front paws, feet, and tail
 * - Smooth natural blinking, organic breathing, pointer head-tracking, and bouncy squish animations
 * - Perfect anatomical facial alignment, WebGL fallback, and reduced-motion accessibility.
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
    let headGroup = null;
    let faceGroup = null;
    let bodyMesh = null;
    let tailMesh = null;
    let leftEar = null;
    let rightEar = null;
    let leftEye = null;
    let rightEye = null;
    let leftSleepingEye = null;
    let rightSleepingEye = null;
    let noseMesh = null;
    let mouthMesh = null;
    let leftCheekStar = null;
    let rightCheekStar = null;
    let leftBlush = null;
    let rightBlush = null;
    let leftArm = null;
    let rightArm = null;
    let leftFoot = null;
    let rightFoot = null;
    let crownStar = null;
    let stardustParticles = null;
    let keyLight = null;
    let ambientLight = null;
    let rimLight = null;

    // Interaction & Animation state
    let isDragging = false;
    let previousPointerPosition = { x: 0, y: 0 };
    let targetRotationX = 0.05;
    let targetRotationY = 0;
    let currentRotationX = 0.05;
    let currentRotationY = 0;
    let pointerTarget = { x: 0, y: 0 };
    let currentPointer = { x: 0, y: 0 };
    let activeAction = null; // 'bounce', 'twinkle'
    let actionStartTime = 0;
    let isBlinking = false;
    let blinkStartTime = 0;
    let blinkDuration = 160;
    let nextBlinkTime = 0;
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

        // --- Materials with Cozy Dream Palette ---
        const puffMaterial = new THREE.MeshStandardMaterial({
            color: 0xfdfaf5,
            roughness: 0.65,
            metalness: 0.02,
            emissive: 0x1f192b,
            emissiveIntensity: 0.12
        });

        const innerEarMaterial = new THREE.MeshStandardMaterial({
            color: 0xf8c0d2,
            roughness: 0.72,
            metalness: 0.02
        });

        const blushMaterial = new THREE.MeshStandardMaterial({
            color: 0xfda8b8,
            roughness: 0.85,
            metalness: 0.0,
            transparent: true,
            opacity: 0.62
        });

        const starMaterial = new THREE.MeshStandardMaterial({
            color: 0xf6d47d,
            emissive: 0xf6d47d,
            emissiveIntensity: 0.85,
            roughness: 0.3,
            metalness: 0.25
        });

        const eyeBaseMaterial = new THREE.MeshStandardMaterial({
            color: 0x22123b,
            roughness: 0.25,
            metalness: 0.08
        });

        const irisMaterial = new THREE.MeshStandardMaterial({
            color: 0x7638ad,
            emissive: 0x3f1566,
            emissiveIntensity: 0.45,
            roughness: 0.18,
            metalness: 0.05
        });

        const pupilMaterial = new THREE.MeshStandardMaterial({
            color: 0x140826,
            roughness: 0.12,
            metalness: 0.05
        });

        const catchlightMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff
        });

        const noseMaterial = new THREE.MeshStandardMaterial({
            color: 0xdf6b8d,
            roughness: 0.35,
            metalness: 0.05
        });

        const mouthMaterial = new THREE.MeshStandardMaterial({
            color: 0x6a2c49,
            roughness: 0.35,
            metalness: 0.05
        });

        const sleepingEyeMaterial = new THREE.MeshStandardMaterial({
            color: 0x4e235f,
            roughness: 0.45,
            metalness: 0.05
        });

        // 1. Soft Fluffy Body (pear/puff shape)
        const bodyGeo = new THREE.SphereGeometry(0.92, 32, 28);
        bodyGeo.scale(1.08, 0.96, 1.05);
        bodyMesh = new THREE.Mesh(bodyGeo, puffMaterial);
        bodyMesh.position.set(0, 0.64, 0);
        bodyMesh.castShadow = true;
        bodyMesh.receiveShadow = true;
        mimiBodyGroup.add(bodyMesh);

        // Fluffy Pom-Pom Tail at the back
        const tailGeo = new THREE.SphereGeometry(0.28, 20, 16);
        tailGeo.scale(1.0, 0.95, 1.1);
        tailMesh = new THREE.Mesh(tailGeo, puffMaterial);
        tailMesh.position.set(0, 0.52, -0.84);
        tailMesh.castShadow = true;
        mimiBodyGroup.add(tailMesh);

        // 2. Head Group & Facial Alignment Hierarchy
        headGroup = new THREE.Group();
        headGroup.position.set(0, 1.32, 0.05);
        mimiBodyGroup.add(headGroup);

        const headGeo = new THREE.SphereGeometry(0.86, 32, 28);
        headGeo.scale(1.18, 1.04, 1.08);
        const headMesh = new THREE.Mesh(headGeo, puffMaterial);
        headMesh.castShadow = true;
        headMesh.receiveShadow = true;
        headGroup.add(headMesh);

        // Face Group holds all facial features so they stay 100% anatomically locked
        faceGroup = new THREE.Group();
        headGroup.add(faceGroup);

        // 3. Floppy Bunny Ears (attached to headGroup, draping softly downward)
        function createEar(isRight) {
            const earGroup = new THREE.Group();

            const earGeo = new THREE.SphereGeometry(0.35, 24, 20);
            earGeo.scale(0.72, 2.05, 0.42);
            const earMesh = new THREE.Mesh(earGeo, puffMaterial);
            // Pivot from ear base down
            earMesh.position.y = -0.55;
            earMesh.castShadow = true;
            earGroup.add(earMesh);

            const innerGeo = new THREE.SphereGeometry(0.27, 20, 16);
            innerGeo.scale(0.55, 1.65, 0.22);
            const innerMesh = new THREE.Mesh(innerGeo, innerEarMaterial);
            innerMesh.position.set(0, -0.55, 0.12);
            earGroup.add(innerMesh);

            const sign = isRight ? 1 : -1;
            // Attached at upper sides of head, drooping downward alongside cheeks
            earGroup.position.set(sign * 0.78, 0.42, -0.05);
            earGroup.rotation.z = sign * -0.22;
            earGroup.rotation.x = -0.12;
            earGroup.rotation.y = sign * 0.18;
            return earGroup;
        }

        leftEar = createEar(false);
        rightEar = createEar(true);
        headGroup.add(leftEar);
        headGroup.add(rightEar);

        // 4. Large Expressive Galaxy-Violet Eyes with Multi-Catchlights
        function createEye(isRight) {
            const eyeGroup = new THREE.Group();

            // Dark violet sclera base
            const baseGeo = new THREE.SphereGeometry(0.19, 24, 20);
            baseGeo.scale(0.92, 1.25, 0.52);
            const baseMesh = new THREE.Mesh(baseGeo, eyeBaseMaterial);
            eyeGroup.add(baseMesh);

            // Vibrant galaxy-violet iris
            const irisGeo = new THREE.SphereGeometry(0.165, 20, 18);
            irisGeo.scale(0.86, 1.12, 0.38);
            const irisMesh = new THREE.Mesh(irisGeo, irisMaterial);
            irisMesh.position.set(0, -0.02, 0.06);
            eyeGroup.add(irisMesh);

            // Deep night pupil
            const pupilGeo = new THREE.SphereGeometry(0.095, 16, 14);
            pupilGeo.scale(0.82, 0.98, 0.32);
            const pupilMesh = new THREE.Mesh(pupilGeo, pupilMaterial);
            pupilMesh.position.set(0, -0.02, 0.09);
            eyeGroup.add(pupilMesh);

            // Primary starlight catchlight (large sparkle)
            const catch1Geo = new THREE.SphereGeometry(0.052, 12, 10);
            const catch1Mesh = new THREE.Mesh(catch1Geo, catchlightMaterial);
            catch1Mesh.position.set(0.045, 0.055, 0.12);
            eyeGroup.add(catch1Mesh);

            // Secondary twinkle catchlight
            const catch2Geo = new THREE.SphereGeometry(0.028, 10, 8);
            const catch2Mesh = new THREE.Mesh(catch2Geo, catchlightMaterial);
            catch2Mesh.position.set(-0.04, -0.045, 0.11);
            eyeGroup.add(catch2Mesh);

            // Tiny stardust highlight
            const catch3Geo = new THREE.SphereGeometry(0.018, 8, 8);
            const catch3Mesh = new THREE.Mesh(catch3Geo, catchlightMaterial);
            catch3Mesh.position.set(0.05, -0.025, 0.11);
            eyeGroup.add(catch3Mesh);

            const sign = isRight ? 1 : -1;
            eyeGroup.position.set(sign * 0.34, 0.06, 0.90);
            eyeGroup.rotation.y = sign * 0.22;
            eyeGroup.rotation.x = -0.05;
            return eyeGroup;
        }

        leftEye = createEye(false);
        rightEye = createEye(true);
        faceGroup.add(leftEye);
        faceGroup.add(rightEye);

        // Sleeping Eye Arches (^ _ ^) for gentle slumber mode
        function createSleepingEye(isRight) {
            const archCurve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(-0.13, -0.03, 0),
                new THREE.Vector3(0, 0.05, 0.02),
                new THREE.Vector3(0.13, -0.03, 0)
            ]);
            const archGeo = new THREE.TubeGeometry(archCurve, 16, 0.02, 8, false);
            const archMesh = new THREE.Mesh(archGeo, sleepingEyeMaterial);
            const sign = isRight ? 1 : -1;
            archMesh.position.set(sign * 0.34, 0.06, 0.92);
            archMesh.rotation.y = sign * 0.22;
            archMesh.rotation.x = -0.05;
            archMesh.visible = false;
            return archMesh;
        }

        leftSleepingEye = createSleepingEye(false);
        rightSleepingEye = createSleepingEye(true);
        faceGroup.add(leftSleepingEye);
        faceGroup.add(rightSleepingEye);

        // 5. Tiny Cute Button Nose
        const noseGeo = new THREE.SphereGeometry(0.046, 18, 14);
        noseGeo.scale(1.15, 0.88, 0.85);
        noseMesh = new THREE.Mesh(noseGeo, noseMaterial);
        noseMesh.position.set(0, -0.04, 1.018);
        faceGroup.add(noseMesh);

        // 6. Gentle Smiling Mouth (Cat/Bunny "ω" curve)
        const smileCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(-0.085, 0.016, 0),
            new THREE.Vector3(-0.042, -0.026, 0.008),
            new THREE.Vector3(0, -0.012, 0.014),
            new THREE.Vector3(0.042, -0.026, 0.008),
            new THREE.Vector3(0.085, 0.016, 0)
        ]);
        const smileGeo = new THREE.TubeGeometry(smileCurve, 20, 0.018, 8, false);
        mouthMesh = new THREE.Mesh(smileGeo, mouthMaterial);
        mouthMesh.position.set(0, -0.16, 0.985);
        faceGroup.add(mouthMesh);

        // 7. Rosy Blushing Cheeks
        const blushGeo = new THREE.SphereGeometry(0.15, 18, 14);
        blushGeo.scale(1.3, 0.7, 0.3);
        leftBlush = new THREE.Mesh(blushGeo, blushMaterial);
        leftBlush.position.set(-0.48, -0.12, 0.82);
        leftBlush.rotation.set(-0.08, -0.42, 0.1);
        faceGroup.add(leftBlush);

        rightBlush = new THREE.Mesh(blushGeo, blushMaterial);
        rightBlush.position.set(0.48, -0.12, 0.82);
        rightBlush.rotation.set(-0.08, 0.42, -0.1);
        faceGroup.add(rightBlush);

        // 8. Golden Cheek Stars
        const starShape = createStarShape(5, 0.065, 0.14);
        const starExtrudeSettings = { depth: 0.03, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.015, bevelThickness: 0.015 };
        const starGeo = new THREE.ExtrudeGeometry(starShape, starExtrudeSettings);

        leftCheekStar = new THREE.Mesh(starGeo, starMaterial);
        leftCheekStar.position.set(-0.52, -0.08, 0.86);
        leftCheekStar.rotation.set(-0.1, -0.42, 0.15);
        faceGroup.add(leftCheekStar);

        rightCheekStar = new THREE.Mesh(starGeo, starMaterial);
        rightCheekStar.position.set(0.52, -0.08, 0.86);
        rightCheekStar.rotation.set(-0.1, 0.42, -0.15);
        faceGroup.add(rightCheekStar);

        // 9. Cute Front Arms/Paws & Small Feet
        function createArm(isRight) {
            const armGroup = new THREE.Group();
            const armGeo = new THREE.SphereGeometry(0.19, 20, 16);
            armGeo.scale(0.85, 0.75, 1.25);
            const armMesh = new THREE.Mesh(armGeo, puffMaterial);
            armMesh.castShadow = true;
            armGroup.add(armMesh);

            const sign = isRight ? 1 : -1;
            armGroup.position.set(sign * 0.28, 0.58, 0.88);
            armGroup.rotation.set(0.25, sign * -0.32, sign * -0.15);
            return armGroup;
        }

        leftArm = createArm(false);
        rightArm = createArm(true);
        mimiBodyGroup.add(leftArm);
        mimiBodyGroup.add(rightArm);

        function createFoot(isRight) {
            const footGeo = new THREE.SphereGeometry(0.22, 18, 16);
            footGeo.scale(0.88, 0.58, 1.35);
            const footMesh = new THREE.Mesh(footGeo, puffMaterial);
            footMesh.castShadow = true;

            const sign = isRight ? 1 : -1;
            footMesh.position.set(sign * 0.36, 0.16, 0.68);
            footMesh.rotation.set(0.08, sign * 0.14, 0);
            return footMesh;
        }

        leftFoot = createFoot(false);
        rightFoot = createFoot(true);
        mimiBodyGroup.add(leftFoot);
        mimiBodyGroup.add(rightFoot);

        // 10. Floating Crown Star (hovering gently above head)
        const crownShape = createStarShape(5, 0.09, 0.2);
        const crownGeo = new THREE.ExtrudeGeometry(crownShape, { depth: 0.04, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02 });
        crownStar = new THREE.Mesh(crownGeo, starMaterial);
        crownStar.position.set(0, 2.30, 0);
        mimiBodyGroup.add(crownStar);

        // 11. Moon Cloud Pedestal
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

        // 12. Swirling Floating Stardust Particles
        const particleCount = 80;
        const particleGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        const palette = [
            new THREE.Color(0xf6d47d), // gold
            new THREE.Color(0xf3b5cf), // rose
            new THREE.Color(0xd8c5ff), // lilac
            new THREE.Color(0xa8e8ef)  // cyan
        ];

        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 1.3 + Math.random() * 1.6;
            const y = 0.2 + Math.random() * 2.5;

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
        ambientLight = new THREE.AmbientLight(0x766c9a, 1.45);
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
            ambientLight.intensity = 1.45;
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
                leftEye.visible = false;
                rightEye.visible = false;
            }
            if (leftSleepingEye && rightSleepingEye) {
                leftSleepingEye.visible = true;
                rightSleepingEye.visible = true;
            }
            if (headGroup) {
                headGroup.rotation.x = 0.12;
            }
        } else {
            announceAction('Mimi woke up ready to gather more starlight!');
            if (leftEye && rightEye) {
                leftEye.visible = true;
                rightEye.visible = true;
                leftEye.scale.y = 1.0;
                rightEye.scale.y = 1.0;
            }
            if (leftSleepingEye && rightSleepingEye) {
                leftSleepingEye.visible = false;
                rightSleepingEye.visible = false;
            }
            if (headGroup) {
                headGroup.rotation.x = 0;
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

        // Pointer tracking for subtle responsive head-gaze
        currentPointer.x += (pointerTarget.x - currentPointer.x) * 0.05;
        currentPointer.y += (pointerTarget.y - currentPointer.y) * 0.05;

        if (mimiRoot) {
            mimiRoot.rotation.x = currentRotationX + currentPointer.y * 0.08;
            mimiRoot.rotation.y = currentRotationY + currentPointer.x * 0.12;
        }

        // Subtle Idle Breathing, Blinking & Animations (disabled if reduced-motion)
        if (!prefersReducedMotion.matches && mimiBodyGroup) {
            const breathCycle = isSleepy ? time * 1.3 : time * 2.2;
            const breath = Math.sin(breathCycle);

            // Gentle organic breathing with squash & stretch
            if (bodyMesh) {
                bodyMesh.scale.set(
                    1.08 - breath * 0.015,
                    0.96 + breath * 0.025,
                    1.05 - breath * 0.015
                );
            }

            // Head bobs smoothly and tilts to follow gaze
            if (headGroup) {
                headGroup.position.y = 1.32 + Math.sin(breathCycle - 0.3) * 0.022;
                if (!isSleepy) {
                    headGroup.rotation.y = currentPointer.x * 0.18;
                    headGroup.rotation.x = -currentPointer.y * 0.12;
                }
            }

            // Floppy ears sway with gentle soft-body inertia
            if (leftEar && rightEar) {
                const earSway = Math.cos(breathCycle) * 0.045;
                leftEar.rotation.z = -0.22 + earSway;
                rightEar.rotation.z = 0.22 - earSway;
            }

            // Fluffy tail wiggles gently
            if (tailMesh) {
                tailMesh.rotation.y = Math.sin(time * 2.4) * 0.14;
            }

            // Crown star floating and slowly spinning
            if (crownStar) {
                crownStar.position.y = 2.30 + Math.sin(time * 3.0) * 0.06;
                crownStar.rotation.z = time * 0.75;
            }

            // Stardust particle rotation
            if (stardustParticles) {
                stardustParticles.rotation.y = time * 0.12;
            }

            // Pulsating glowing cheek stars
            if (leftCheekStar && rightCheekStar) {
                const pulse = 0.8 + Math.sin(time * 3.2) * 0.35;
                leftCheekStar.material.emissiveIntensity = pulse;
                rightCheekStar.material.emissiveIntensity = pulse;
            }

            // Natural Organic Eye Blinking (smooth eyelid sine curve)
            if (!isSleepy && leftEye && rightEye) {
                if (!isBlinking && now > nextBlinkTime) {
                    isBlinking = true;
                    blinkStartTime = now;
                    blinkDuration = 160;
                }

                if (isBlinking) {
                    const elapsed = now - blinkStartTime;
                    if (elapsed < blinkDuration) {
                        const progress = elapsed / blinkDuration;
                        // Smooth sine curve: dips to 0.06 at halfway mark then springs open
                        const eyeScaleY = 1.0 - Math.sin(progress * Math.PI) * 0.94;
                        leftEye.scale.y = eyeScaleY;
                        rightEye.scale.y = eyeScaleY;
                    } else {
                        leftEye.scale.y = 1.0;
                        rightEye.scale.y = 1.0;
                        isBlinking = false;
                        nextBlinkTime = now + 3200 + Math.random() * 4000;
                    }
                }
            }

            // Handle active special actions
            if (activeAction === 'twinkle') {
                const elapsed = (now - actionStartTime) * 0.001;
                if (elapsed < 1.3) {
                    const flare = Math.sin(elapsed / 1.3 * Math.PI) * 2.8;
                    leftCheekStar.material.emissiveIntensity = 0.9 + flare;
                    rightCheekStar.material.emissiveIntensity = 0.9 + flare;
                    crownStar.material.emissiveIntensity = 0.9 + flare * 1.5;
                    crownStar.rotation.z = time * 6.0;
                } else {
                    activeAction = null;
                }
            } else if (activeAction === 'bounce') {
                const elapsed = (now - actionStartTime) * 0.001;
                const duration = 0.85;
                if (elapsed < duration) {
                    const t = elapsed / duration;
                    // Phase 1: Squash anticipation (0 to 0.15)
                    if (t < 0.15) {
                        const p = t / 0.15;
                        mimiBodyGroup.position.y = -p * 0.12;
                        mimiBodyGroup.scale.set(1 + p * 0.14, 1 - p * 0.18, 1 + p * 0.14);
                    }
                    // Phase 2: Main soaring jump (0.15 to 0.70)
                    else if (t < 0.70) {
                        const jumpProgress = (t - 0.15) / 0.55;
                        const jumpHeight = Math.sin(jumpProgress * Math.PI) * 0.58;
                        mimiBodyGroup.position.y = jumpHeight;
                        const stretch = Math.sin(jumpProgress * Math.PI) * 0.16;
                        mimiBodyGroup.scale.set(1 - stretch * 0.5, 1 + stretch, 1 - stretch * 0.5);

                        // Ears flap back with delight
                        if (leftEar && rightEar) {
                            leftEar.rotation.z = -0.22 - jumpHeight * 0.5;
                            rightEar.rotation.z = 0.22 + jumpHeight * 0.5;
                        }
                        // Excited tail wag
                        if (tailMesh) {
                            tailMesh.rotation.y = Math.sin(jumpProgress * Math.PI * 6) * 0.35;
                        }
                        // Happy paw gesture
                        if (leftArm && rightArm) {
                            leftArm.rotation.x = 0.35 - jumpHeight * 0.55;
                            rightArm.rotation.x = 0.35 - jumpHeight * 0.55;
                        }
                    }
                    // Phase 3: Elastic landing squash & settle (0.70 to 1.0)
                    else {
                        const landProgress = (t - 0.70) / 0.30;
                        const settle = Math.sin(landProgress * Math.PI) * Math.exp(-landProgress * 3.5);
                        mimiBodyGroup.position.y = -settle * 0.1;
                        mimiBodyGroup.scale.set(1 + settle * 0.08, 1 - settle * 0.1, 1 + settle * 0.08);
                        if (leftEar && rightEar) {
                            leftEar.rotation.z = -0.22 + settle * 0.15;
                            rightEar.rotation.z = 0.22 - settle * 0.15;
                        }
                    }
                } else {
                    mimiBodyGroup.position.y = 0;
                    mimiBodyGroup.scale.set(1, 1, 1);
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

            camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
            camera.position.set(0, 1.18, 5.05);
            camera.lookAt(0, 1.05, 0);

            renderer = new THREE.WebGLRenderer({
                canvas: canvas,
                alpha: true,
                antialias: true,
                powerPreference: 'high-performance'
            });
            renderer.setSize(width, height);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFShadowMap;

            setupLights();
            buildMimiModel();
            updateThemeColors();
            bindInteractionEvents();

            window.addEventListener('resize', onResize);

            // Hide loading indicator, reveal canvas
            if (loadingBadge) loadingBadge.hidden = true;
            canvas.classList.add('is-ready');
            isInitialized = true;

            // Expose controller for verification and testing
            window.__MIMI_3D__ = {
                triggerTwinkle,
                triggerBounce,
                toggleSlumber,
                resetView,
                isInitialized: () => isInitialized,
                getScene: () => scene
            };

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
