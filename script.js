(function () {
    const themeToggle = document.querySelector("#theme-toggle");
    const soundToggle = document.querySelector("#sound-toggle");
    const projectDialogs = Array.from(document.querySelectorAll(".project-dialog"));
    const projectOpenButtons = Array.from(document.querySelectorAll(".project-open"));
    const themeLabel = themeToggle.querySelector(".toggle-label");
    const themeIcon = themeToggle.querySelector(".toggle-icon");
    const toast = document.querySelector("#toast");
    const secretStar = document.querySelector("#secret-star");
    const secretExperience = document.querySelector("#secret-experience");
    const secretStatus = document.querySelector("#secret-status");
    const secretProgress = document.querySelector("#secret-progress");
    const secretStars = Array.from(secretExperience.querySelectorAll(".constellation-star"));
    const constellationPaths = Array.from(secretExperience.querySelectorAll(".constellation-lines path"));
    const secretLetter = document.querySelector("#secret-letter");
    const secretClose = document.querySelector("#secret-close");
    const secretDismiss = document.querySelector("#secret-dismiss");
    const secretRestart = document.querySelector("#secret-restart");
    const storybookToggle = document.querySelector("#storybook-toggle");
    const storybookReveal = document.querySelector("#storybook-reveal");
    const storybookDialog = document.querySelector("#storybook-dialog");
    const storybookPage = document.querySelector("#storybook-page");
    const storybookBook = document.querySelector("#storybook-book");
    const storybookFolio = document.querySelector("#storybook-folio");
    const storybookStage = document.querySelector("#storybook-stage");
    const storybookPrevButton = document.querySelector("#storybook-prev-button");
    const storybookPageButton = document.querySelector("#storybook-page-button");
    const storybookTurning = document.querySelector("#storybook-turning");
    const storybookTurningFront = document.querySelector("#storybook-turning-front");
    const storybookTurningBack = document.querySelector("#storybook-turning-back");
    const deliverySection = document.querySelector(".dream-delivery");
    const deliveryRoute = document.querySelector("#delivery-route");
    const deliveryParcel = document.querySelector("#delivery-parcel");
    const dreamField = document.querySelector("#dream-field");
    const dreamCatcher = document.querySelector("#dream-catcher");
    const dreamCatchScore = document.querySelector("#dream-catch-score");
    const dreamCatchTime = document.querySelector("#dream-catch-time");
    const dreamCatchStatus = document.querySelector("#dream-catch-status");
    const dreamCatchStart = document.querySelector("#dream-catch-start");
    const dreamCatchRestart = document.querySelector("#dream-catch-restart");
    const dreamMoveLeft = document.querySelector("#dream-move-left");
    const dreamMoveRight = document.querySelector("#dream-move-right");
    const greeting = document.querySelector("#mimi-greeting");
    const greetingText = document.querySelector("#mimi-greeting-text");
    const greetingClose = document.querySelector("#greeting-close");
    const dreamCount = document.querySelector("#dream-count");
    const chaosToggle = document.querySelector("#chaos-toggle");
    const chaosExit = document.querySelector("#chaos-exit");
    const chatLine = document.querySelector("#mimi-chat-line");
    const chatChoices = document.querySelector("#mimi-chat-choices");
    const musicBox = document.querySelector("#music-box");
    const windButton = document.querySelector("#wind-box");
    const musicCaption = document.querySelector("#music-caption");
    const orbCaption = document.querySelector("#orb-caption");
    const heroScene = document.querySelector(".hero-scene");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const themeArtwork = Array.from(document.querySelectorAll(".theme-artwork"));
    const storyCards = Array.from(document.querySelectorAll(".story-card"));
    const activeStarlights = [];
    const activeSparkles = [];
    const activeCursorParticles = [];
    const activeAwakeningStars = [];
    const maxStarlights = 12;
    const maxSparkles = 30;
    const maxCursorParticles = 24;
    const sparkleColors = ["#d8c5ff", "#f3b5cf", "#a8e8ef", "#f6d47d", "#b8d5ff"];
    const noteTimers = new WeakMap();
    const activeTones = new Set();
    const melodyTimers = new Set();
    let audioContext = null;
    let soundEnabled = false;
    let soundPending = false;
    let soundRequestId = 0;
    let dialogTrigger = null;
    let magicCursor = null;
    let storyPageIndex = 0;
    let nextSecretStar = 0;
    let toastTimer;
    let lampFrame = 0;
    let storyTurnTimer;
    let storyTurning = false;
    let swipeStartX = null;
    let swipeStartY = null;
    let dreamsDelivered = 0;
    let deliveryFrame = 0;
    let deliveryLength = 0;
    let dreamGame = {
        playing: false,
        score: 0,
        remaining: 30,
        catcherX: 0.5,
        stars: [],
        keys: { left: false, right: false },
        frame: 0,
        lastTime: 0,
        spawnAt: 0,
        roundTimer: 0
    };

    function safeStorageGet(key) {
        try {
            return window.localStorage.getItem(key);
        } catch (error) {
            return null;
        }
    }

    function safeStorageSet(key, value) {
        try {
            window.localStorage.setItem(key, value);
            return true;
        } catch (error) {
            return false;
        }
    }

    function formatDreams(count) {
        return String(Math.max(0, count)).padStart(5, "0");
    }

    function incrementDreams(amount) {
        if (!dreamCount) return;
        dreamsDelivered = Math.min(99999, dreamsDelivered + amount);
        dreamCount.textContent = formatDreams(dreamsDelivered);
        dreamCount.setAttribute("aria-label", "Dreams delivered on this moon: " + dreamsDelivered);
        safeStorageSet("mimi-moon-dreams", String(dreamsDelivered));
    }

    function announce(message) {
        window.clearTimeout(toastTimer);
        toast.textContent = message;
        toast.classList.add("is-visible");
        toastTimer = window.setTimeout(function () {
            toast.classList.remove("is-visible");
        }, 4200);
    }

    function updateSoundButton() {
        soundToggle.setAttribute("aria-pressed", String(soundEnabled));
        soundToggle.querySelector(".sound-label").textContent = soundEnabled ? "Sound On" : "Muted";
        soundToggle.setAttribute(
            "aria-label",
            soundEnabled ? "Mute magical sounds" : "Enable magical sounds; currently muted"
        );
        soundToggle.title = soundEnabled ? "Magical sounds are on" : "Magical sounds are muted";
        updateMusicStatus();
    }

    function stopAllSounds() {
        if (!audioContext) return;
        melodyTimers.forEach(function (timer) {
            window.clearTimeout(timer);
        });
        melodyTimers.clear();
        const now = audioContext.currentTime;
        activeTones.forEach(function (tone) {
            tone.gain.gain.cancelScheduledValues(now);
            tone.gain.gain.setValueAtTime(0, now);
            tone.oscillator.stop(now);
        });
    }

    function playMelody(startFrequency) {
        if (!soundEnabled) return;
        stopAllSounds();
        const notes = [1, 1.25, 1.5, 1.25, 1.125, 1.25, 1];
        notes.forEach(function (interval, index) {
            const timer = window.setTimeout(function () {
                melodyTimers.delete(timer);
                playChime(startFrequency * interval);
            }, index * 300);
            melodyTimers.add(timer);
        });
    }

    function playChime(frequency) {
        window.MimiPlayChime = playChime;
        if (!soundEnabled || !audioContext) return;
        if (audioContext.state !== "running") {
            audioContext.resume().then(function () {
                if (soundEnabled) playChime(frequency);
            }).catch(function (error) {
                console.error("Could not resume Mimi's magical sounds.", error);
                announce("Magical sounds could not start, so they remain muted.");
                soundEnabled = false;
                updateSoundButton();
            });
            return;
        }

        const startTime = audioContext.currentTime;
        [[frequency, 0.045, 0], [frequency * 1.5, 0.018, 0.035]].forEach(function (partial) {
            const oscillator = audioContext.createOscillator();
            const gain = audioContext.createGain();
            const tone = { oscillator: oscillator, gain: gain };
            oscillator.type = "sine";
            oscillator.frequency.setValueAtTime(partial[0], startTime + partial[2]);
            gain.gain.setValueAtTime(0.0001, startTime + partial[2]);
            gain.gain.exponentialRampToValueAtTime(partial[1], startTime + partial[2] + 0.04);
            gain.gain.exponentialRampToValueAtTime(0.0001, startTime + partial[2] + 0.72);
            oscillator.connect(gain);
            gain.connect(audioContext.destination);
            oscillator.addEventListener("ended", function () {
                oscillator.disconnect();
                gain.disconnect();
                activeTones.delete(tone);
            }, { once: true });
            activeTones.add(tone);
            oscillator.start(startTime + partial[2]);
            oscillator.stop(startTime + partial[2] + 0.75);
        });
    }

    soundToggle.addEventListener("click", function () {
        if (soundEnabled || soundPending) {
            soundEnabled = false;
            soundPending = false;
            soundRequestId += 1;
            stopAllSounds();
            updateSoundButton();
            if (audioContext && audioContext.state === "running") {
                audioContext.suspend().catch(function (error) {
                    console.error("Could not suspend Mimi's magical sounds.", error);
                });
            }
            return;
        }

        const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextConstructor) {
            console.error("This browser does not support the Web Audio API.");
            announce("This browser cannot play the optional magical sounds.");
            return;
        }

        try {
            if (!audioContext) audioContext = new AudioContextConstructor();
        } catch (error) {
            console.error("Could not create Mimi's magical audio.", error);
            announce("Magical sounds could not start, so they remain muted.");
            return;
        }

        soundPending = true;
        const requestId = ++soundRequestId;
        audioContext.resume().then(function () {
            if (requestId !== soundRequestId || !soundPending) {
                if (!soundEnabled && audioContext.state === "running") {
                    audioContext.suspend().catch(function (error) {
                        console.error("Could not suspend Mimi's magical sounds.", error);
                    });
                }
                return;
            }
            soundPending = false;
            soundEnabled = true;
            updateSoundButton();
        }).catch(function (error) {
            if (requestId !== soundRequestId) return;
            soundPending = false;
            soundEnabled = false;
            updateSoundButton();
            console.error("Could not enable Mimi's magical sounds.", error);
            announce("Magical sounds could not start, so they remain muted.");
        });
    });

    function openProjectDialog(dialog, trigger) {
        if (dialog.open) return;
        dialogTrigger = trigger;
        document.body.classList.add("modal-open");
        try {
            dialog.showModal();
            updateCursorLayer();
            dialog.querySelector(".dialog-close").focus();
            playChime(784);
        } catch (error) {
            document.body.classList.remove("modal-open");
            dialogTrigger = null;
            console.error("Could not open Mimi's project dialog.", error);
            announce("This browser could not open the project window.");
        }
    }

    projectOpenButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            const dialog = document.getElementById(button.dataset.dialogTarget);
            if (!dialog) {
                console.error("A project button points to a missing dialog.", button);
                return;
            }
            openProjectDialog(dialog, button);
        });
    });

    projectDialogs.forEach(function (dialog) {
        dialog.querySelector(".dialog-close").addEventListener("click", function () {
            dialog.close();
        });
        dialog.addEventListener("click", function (event) {
            if (event.target === dialog) dialog.close();
        });
        dialog.addEventListener("close", function () {
            document.body.classList.remove("modal-open");
            updateCursorLayer();
            playChime(523.25);
            if (dialogTrigger) dialogTrigger.focus();
            dialogTrigger = null;
        });
    });

    document.addEventListener("keydown", function (event) {
        if (event.key !== "Escape") return;
        const openDialog = projectDialogs.find(function (dialog) {
            return dialog.open;
        });
        if (!openDialog) return;
        event.preventDefault();
        openDialog.close();
    });

    const storyPages = [
        "One sleepy star fell into Mimi's paws. “You can rest here,” Mimi whispered. The star tucked itself beside the Moon, and together they made a little light for anyone finding their way home.",
        "At dawn, the star felt brave enough to travel again. It promised to share Mimi's gentle light with every quiet corner it crossed.",
        "Mimi smiled as one tiny glow became a constellation: a reminder that a soft place to rest can help any heart find its way."
    ];

    function finishStoryTurn() {
        storybookBook.classList.remove("is-turning-next", "is-turning-prev");
        storyTurning = false;
    }

    function renderStoryPage(direction) {
        const currentText = storyPages[storyPageIndex];
        storybookPage.textContent = currentText;
        storybookFolio.textContent = "Page " + (storyPageIndex + 1) + " of " + storyPages.length;
        playChime(659.25);
        if (reducedMotion.matches || !direction || !storybookTurning) {
            finishStoryTurn();
            return;
        }

        storyTurning = true;
        const incomingIndex = (storyPageIndex - direction + storyPages.length) % storyPages.length;
        const outgoingText = storyPages[incomingIndex];
        if (direction > 0) {
            storybookTurningFront.textContent = outgoingText;
            storybookTurningBack.textContent = currentText;
        } else {
            storybookTurningFront.textContent = currentText;
            storybookTurningBack.textContent = outgoingText;
        }
        storybookBook.classList.remove("is-turning-next", "is-turning-prev");
        void storybookBook.offsetWidth;
        storybookBook.classList.add(direction > 0 ? "is-turning-next" : "is-turning-prev");
        window.clearTimeout(storyTurnTimer);
        storyTurnTimer = window.setTimeout(finishStoryTurn, 640);
    }

    function turnStoryPage(direction) {
        if (storyTurning) return;
        storyPageIndex = (storyPageIndex + direction + storyPages.length) % storyPages.length;
        renderStoryPage(direction);
        incrementDreams(1);
    }

    function isEditableTarget(target) {
        if (!(target instanceof Element)) return false;
        return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
    }

    storybookPageButton.addEventListener("click", function () {
        turnStoryPage(1);
    });
    storybookPrevButton.addEventListener("click", function () {
        turnStoryPage(-1);
    });
    document.addEventListener("keydown", function (event) {
        if (!storybookDialog.open) return;
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
        if (isEditableTarget(event.target)) return;
        event.preventDefault();
        turnStoryPage(event.key === "ArrowRight" ? 1 : -1);
    });
    storybookStage.addEventListener("touchstart", function (event) {
        if (!event.changedTouches[0]) return;
        swipeStartX = event.changedTouches[0].clientX;
        swipeStartY = event.changedTouches[0].clientY;
    }, { passive: true });
    storybookStage.addEventListener("touchend", function (event) {
        if (swipeStartX === null || !event.changedTouches[0]) return;
        const dx = event.changedTouches[0].clientX - swipeStartX;
        const dy = event.changedTouches[0].clientY - swipeStartY;
        swipeStartX = null;
        swipeStartY = null;
        if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
        turnStoryPage(dx < 0 ? 1 : -1);
    }, { passive: true });

    function updateMusicStatus() {
        document.querySelector("#music-dialog-status").textContent = soundEnabled
            ? "A little melody is ready whenever you are."
            : "Enable Sound On in the page header to hear Mimi's tune.";
    }

    const melodyButton = document.querySelector("#music-melody-button");
    melodyButton.addEventListener("click", function () {
        playMelody(523.25);
        document.querySelector("#music-dialog-status").textContent = soundEnabled
            ? "A gentle moonbeam melody is dancing through the room."
            : "Turn Sound On in the page header, then play Mimi's tune again.";
    });
    document.querySelectorAll(".dialog-note").forEach(function (note) {
        note.addEventListener("click", function () {
            playMelody(Number(note.dataset.frequency));
            note.classList.add("note-active");
            window.setTimeout(function () {
                note.classList.remove("note-active");
            }, 450);
            document.querySelector("#music-dialog-status").textContent = soundEnabled
                ? "Your chosen note is leading a little moonbeam melody."
                : "Turn Sound On in the page header to hear Mimi's tune.";
        });
    });

    const dialogOrbMessage = document.querySelector("#dialog-orb-message");
    document.querySelectorAll(".dialog-orbs .orb").forEach(function (orb) {
        orb.addEventListener("click", function () {
            dialogOrbMessage.textContent = orb.dataset.message;
            playChime(orb.classList.contains("orb-gold") ? 783.99 : 587.33);
            incrementDreams(1);
        });
    });

    function sparkleAt(x, y) {
        if (reducedMotion.matches) return;

        const marks = ["✦", "✧", "·", "✦", "·"];
        marks.forEach(function (mark, index) {
            if (activeSparkles.length >= maxSparkles) {
                activeSparkles.shift().remove();
            }
            const sparkle = document.createElement("span");
            const angle = (Math.PI * 2 * index) / marks.length;
            const distance = 25 + (index % 2) * 12;
            sparkle.className = "sparkle";
            sparkle.textContent = mark;
            sparkle.style.left = x + "px";
            sparkle.style.top = y + "px";
            sparkle.style.setProperty("--spark-color", sparkleColors[index % sparkleColors.length]);
            sparkle.style.setProperty("--spark-x", Math.cos(angle) * distance + "px");
            sparkle.style.setProperty("--spark-y", Math.sin(angle) * distance + "px");
            document.body.appendChild(sparkle);
            window.setTimeout(function () {
                sparkle.remove();
                const activeIndex = activeSparkles.indexOf(sparkle);
                if (activeIndex !== -1) activeSparkles.splice(activeIndex, 1);
            }, 850);
            activeSparkles.push(sparkle);
        });
    }

    function createAwakeningStars() {
        if (reducedMotion.matches) return;
        const marks = ["✦", "✧", "·", "✦", "✧", "·", "✦", "✧"];
        marks.forEach(function (mark, index) {
            if (activeAwakeningStars.length >= 12) {
                activeAwakeningStars.shift().remove();
            }
            const star = document.createElement("span");
            const inUpperBand = index % 2 === 0;
            star.className = "awakening-star";
            star.textContent = mark;
            star.setAttribute("aria-hidden", "true");
            star.style.left = (8 + Math.random() * 84) + "vw";
            star.style.top = (inUpperBand ? 6 + Math.random() * 20 : 75 + Math.random() * 18) + "vh";
            star.style.setProperty("--star-drift-x", (Math.random() * 44 - 22) + "px");
            secretExperience.appendChild(star);
            activeAwakeningStars.push(star);
            window.setTimeout(function () {
                star.remove();
                const activeIndex = activeAwakeningStars.indexOf(star);
                if (activeIndex !== -1) activeAwakeningStars.splice(activeIndex, 1);
            }, 1800);
        });
    }

    function resetSecretConstellation() {
        nextSecretStar = 0;
        secretStars.forEach(function (star, index) {
            star.disabled = index !== 0;
            star.classList.toggle("is-next", index === 0);
            star.classList.remove("is-lit");
        });
        constellationPaths.forEach(function (path) {
            path.classList.remove("is-lit");
        });
        secretLetter.hidden = true;
        secretStatus.textContent = "Follow the glowing stars to discover Mimi's letter.";
        secretProgress.textContent = "Star 1 of 3 is waiting for you";
    }

    function closeSecretExperience() {
        if (secretExperience.hidden) return;
        secretExperience.hidden = true;
        secretExperience.setAttribute("aria-hidden", "true");
        document.body.classList.remove("secret-experience-open");
        secretStar.focus();
    }

    function openSecretExperience() {
        if (!secretExperience.hidden) return;
        resetSecretConstellation();
        secretExperience.hidden = false;
        secretExperience.setAttribute("aria-hidden", "false");
        document.body.classList.add("secret-experience-open");
        createAwakeningStars();
        playChime(880);
        secretStars[0].focus();
    }

    function createConstellationBurst(target) {
        if (reducedMotion.matches) return;
        const bounds = target.getBoundingClientRect();
        const marks = ["✦", "✧", "·", "✦", "·"];
        marks.forEach(function (mark, index) {
            const sparkle = document.createElement("span");
            const angle = Math.PI * 2 * index / marks.length;
            const distance = 18 + (index % 2) * 9;
            sparkle.className = "secret-sparkle";
            sparkle.textContent = mark;
            sparkle.setAttribute("aria-hidden", "true");
            sparkle.style.left = bounds.left + bounds.width / 2 + "px";
            sparkle.style.top = bounds.top + bounds.height / 2 + "px";
            sparkle.style.setProperty("--spark-color", sparkleColors[index % sparkleColors.length]);
            sparkle.style.setProperty("--spark-x", Math.cos(angle) * distance + "px");
            sparkle.style.setProperty("--spark-y", Math.sin(angle) * distance + "px");
            secretExperience.appendChild(sparkle);
            window.setTimeout(function () {
                sparkle.remove();
            }, 850);
        });
    }

    function createStoryEntranceEffect(card) {
        const colors = sparkleColors;
        const positions = [
            [12, 12], [50, 7], [88, 12], [94, 50],
            [88, 88], [50, 93], [12, 88], [6, 50]
        ];
        const width = card.clientWidth;
        const height = card.clientHeight;

        card.classList.add("scene-glowing");
        positions.forEach(function (position, index) {
            const sparkle = document.createElement("span");
            sparkle.className = "scene-sparkle";
            sparkle.textContent = index % 2 ? "✧" : "✦";
            sparkle.style.left = width * position[0] / 100 + "px";
            sparkle.style.top = height * position[1] / 100 + "px";
            sparkle.style.setProperty("--spark-color", colors[index % colors.length]);
            card.appendChild(sparkle);
            window.setTimeout(function () {
                sparkle.remove();
            }, 950);
        });
        window.setTimeout(function () {
            card.classList.remove("scene-glowing");
        }, 1000);
    }

    function createCursorParticle(className, x, y, color, driftX, driftY) {
        if (activeCursorParticles.length >= maxCursorParticles) {
            activeCursorParticles.shift().remove();
        }

        const particle = document.createElement("span");
        particle.className = className;
        particle.textContent = className === "cursor-burst" ? "✦" : "✧";
        particle.setAttribute("aria-hidden", "true");
        particle.style.left = x + "px";
        particle.style.top = y + "px";
        particle.style.setProperty("--spark-color", color);
        particle.style.setProperty("--burst-x", driftX + "px");
        particle.style.setProperty("--burst-y", driftY + "px");
        getCursorLayer().appendChild(particle);
        activeCursorParticles.push(particle);

        window.setTimeout(function () {
            particle.remove();
            const index = activeCursorParticles.indexOf(particle);
            if (index !== -1) activeCursorParticles.splice(index, 1);
        }, 800);
    }

    function createCursorBurst(x, y, colorIndex) {
        for (let index = 0; index < 4; index += 1) {
            const angle = Math.PI * 2 * index / 4;
            const color = sparkleColors[(colorIndex + index) % sparkleColors.length];
            createCursorParticle("cursor-burst", x, y, color, Math.cos(angle) * 19, Math.sin(angle) * 19);
        }
    }

    function getCursorLayer() {
        return projectDialogs.slice().reverse().find(function (dialog) {
            return dialog.open;
        }) || document.body;
    }

    function updateCursorLayer() {
        const layer = getCursorLayer();
        if (magicCursor && magicCursor.parentElement !== layer) {
            layer.appendChild(magicCursor);
        }
        activeCursorParticles.forEach(function (particle) {
            if (particle.parentElement !== layer) layer.appendChild(particle);
        });
    }

    function updateArtwork(isDay) {
        themeArtwork.forEach(function (image) {
            const source = isDay ? image.dataset.daySrc : image.dataset.nightSrc;
            if (!source) {
                console.error("An artwork image is missing its theme source.", image);
                return;
            }
            if (image.getAttribute("src") === source) return;

            image.classList.add("is-changing");
            image.addEventListener("load", function () {
                image.classList.remove("is-changing");
            }, { once: true });
            image.addEventListener("error", function () {
                image.classList.remove("is-changing");
                console.error("Could not load Mimi artwork: " + source);
            }, { once: true });
            image.setAttribute("src", source);
        });
    }

    function setTheme(isDay) {
        document.body.classList.toggle("day-mode", isDay);
        themeToggle.setAttribute("aria-pressed", String(isDay));
        themeToggle.setAttribute("aria-label", isDay ? "Switch to night mode" : "Switch to day mode");
        themeLabel.textContent = isDay ? "Moonlight" : "Daydream";
        themeIcon.textContent = isDay ? "☾" : "☀";
        document.querySelector('meta[name="theme-color"]').setAttribute("content", isDay ? "#e8f2f4" : "#11152c");
        updateArtwork(isDay);
    }

    themeArtwork.forEach(function (image) {
        if (image.complete && image.naturalWidth === 0) {
            console.error("Could not load Mimi artwork: " + image.getAttribute("src"));
        }
    });

    themeToggle.addEventListener("click", function () {
        setTheme(!document.body.classList.contains("day-mode"));
        playChime(784);
    });

    storybookToggle.addEventListener("click", function () {
        const isOpen = storybookToggle.getAttribute("aria-expanded") !== "true";
        storybookToggle.setAttribute("aria-expanded", String(isOpen));
        storybookReveal.hidden = !isOpen;
        storybookToggle.querySelector(".button-label").textContent = isOpen ? "Close the story" : "Turn a page";
        if (isOpen) playChime(659.25);
    });

    function setMusicPlaying(isPlaying) {
        musicBox.classList.toggle("is-playing", isPlaying);
        musicBox.setAttribute("aria-pressed", String(isPlaying));
        musicBox.setAttribute("aria-label", isPlaying ? "Pause the moonbeam music-box melody" : "Play the moonbeam music-box melody");
        windButton.setAttribute("aria-pressed", String(isPlaying));
        windButton.querySelector(".button-label").textContent = isPlaying ? "Let the stars rest" : "Wind the box";
        musicCaption.textContent = isPlaying
            ? "A gentle moonbeam melody is dancing through the room."
            : "Tap a note, or wind the key to let the stars dance.";
        if (isPlaying) playMelody(523.25);
        else stopAllSounds();
    }

    musicBox.addEventListener("click", function () {
        setMusicPlaying(musicBox.getAttribute("aria-pressed") !== "true");
    });

    windButton.addEventListener("click", function () {
        setMusicPlaying(windButton.getAttribute("aria-pressed") !== "true");
    });

    document.querySelectorAll(".music-controls .music-note").forEach(function (note) {
        note.addEventListener("click", function () {
            const previousTimer = noteTimers.get(note);
            window.clearTimeout(previousTimer);
            musicBox.classList.add("note-playing");
            note.classList.add("note-active");
            const noteName = (note.dataset.note || note.textContent).trim().toLowerCase();
            musicCaption.textContent = "A soft " + noteName + " note ripples out like a little star.";
            sparkleAt(note.getBoundingClientRect().left + note.offsetWidth / 2, note.getBoundingClientRect().top);
            const noteFrequencies = { do: 523.25, mi: 659.25, sol: 783.99 };
            playMelody(Number(note.dataset.frequency) || noteFrequencies[noteName] || 523.25);
            noteTimers.set(note, window.setTimeout(function () {
                note.classList.remove("note-active");
                if (document.querySelector(".music-note.note-active") === null) {
                    musicBox.classList.remove("note-playing");
                    if (musicBox.getAttribute("aria-pressed") === "true") {
                        musicCaption.textContent = "A gentle moonbeam melody is dancing through the room.";
                    } else {
                        musicCaption.textContent = "Tap a note, or wind the key to let the stars dance.";
                    }
                }
            }, 850));
        });
    });

    document.querySelectorAll(".creation-card .orbs .orb").forEach(function (orb) {
        orb.addEventListener("click", function () {
            orbCaption.textContent = orb.dataset.message;
            sparkleAt(orb.getBoundingClientRect().left + orb.offsetWidth / 2, orb.getBoundingClientRect().top + orb.offsetHeight / 2);
            playChime(orb.classList.contains("orb-gold") ? 783.99 : 587.33);
            incrementDreams(1);
        });
    });

    secretStar.addEventListener("click", openSecretExperience);

    secretStars.forEach(function (star, index) {
        star.addEventListener("click", function () {
            if (index !== nextSecretStar) return;
            star.disabled = true;
            star.classList.remove("is-next");
            star.classList.add("is-lit");
            if (constellationPaths[index]) constellationPaths[index].classList.add("is-lit");
            createConstellationBurst(star);
            playChime([783.99, 987.77, 1174.66][index]);
            nextSecretStar += 1;

            if (nextSecretStar === secretStars.length) {
                secretStatus.textContent = "The constellation is complete. Mimi has a little letter for you.";
                secretProgress.textContent = "All three stars are shining!";
                secretLetter.hidden = false;
                secretRestart.focus();
                return;
            }

            secretStars[nextSecretStar].disabled = false;
            secretStars[nextSecretStar].classList.add("is-next");
            secretStatus.textContent = "Beautiful! One star is shining. Keep going.";
            secretProgress.textContent = "Star " + (nextSecretStar + 1) + " of 3 is ready";
            secretStars[nextSecretStar].focus();
        });
    });

    [secretClose, secretDismiss].forEach(function (button) {
        button.addEventListener("click", closeSecretExperience);
    });

    secretRestart.addEventListener("click", function () {
        resetSecretConstellation();
        secretStars[0].focus();
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && !secretExperience.hidden) closeSecretExperience();
    });

    heroScene.addEventListener("pointermove", function (event) {
        if (reducedMotion.matches || !finePointer.matches || event.pointerType === "touch") return;
        const bounds = heroScene.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)) - 0.5;
        const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)) - 0.5;
        heroScene.style.setProperty("--cursor-x", (x + 0.5) * 100 + "%");
        heroScene.style.setProperty("--cursor-y", (y + 0.5) * 100 + "%");
    });

    heroScene.addEventListener("pointerleave", function () {
        heroScene.style.removeProperty("--cursor-x");
        heroScene.style.removeProperty("--cursor-y");
    });

    if ("IntersectionObserver" in window && !reducedMotion.matches) {
        const storyObserver = new IntersectionObserver(function (entries, observer) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                entry.target.classList.add("is-visible");
                createStoryEntranceEffect(entry.target);
                observer.unobserve(entry.target);
            });
        }, { threshold: 0.12 });

        document.body.classList.add("motion-ready");
        storyCards.forEach(function (card) {
            storyObserver.observe(card);
        });
    } else {
        storyCards.forEach(function (card) {
            card.classList.add("is-visible");
        });
    }

    document.querySelector("main").addEventListener("click", function (event) {
        if (reducedMotion.matches || !(event.target instanceof Element)) return;
        if (event.target.closest("a, button, input, select, textarea, summary, [contenteditable='true']")) return;

        sparkleAt(event.clientX, event.clientY);
        playChime(523.25);
        if (activeStarlights.length >= maxStarlights) {
            activeStarlights.shift().remove();
        }

        const starlight = document.createElement("span");
        starlight.className = "starlight-drop";
        starlight.textContent = "✦";
        starlight.setAttribute("aria-hidden", "true");
        starlight.style.left = event.clientX + "px";
        starlight.style.top = event.clientY + "px";
        starlight.style.setProperty("--drift-x", (Math.random() * 36 - 18) + "px");
        document.body.appendChild(starlight);
        activeStarlights.push(starlight);

        window.setTimeout(function () {
            starlight.remove();
            const index = activeStarlights.indexOf(starlight);
            if (index !== -1) activeStarlights.splice(index, 1);
        }, 1500);
    });

    if (finePointer.matches) {
        magicCursor = document.createElement("span");
        magicCursor.className = "magic-cursor";
        magicCursor.textContent = "✦";
        magicCursor.setAttribute("aria-hidden", "true");
        document.body.appendChild(magicCursor);
        document.body.classList.add("magic-cursor-enabled");

        let lastX = 0;
        let lastY = 0;
        let lastMoveAt = 0;
        let lastTrailAt = 0;
        let lastBurstAt = 0;
        let trailIndex = 0;

        document.addEventListener("pointermove", function (event) {
            if (event.pointerType === "touch" || reducedMotion.matches) return;
            updateCursorLayer();
            const now = performance.now();
            const elapsed = now - lastMoveAt;
            const distance = Math.hypot(event.clientX - lastX, event.clientY - lastY);
            magicCursor.classList.add("is-positioned");
            magicCursor.style.transform = "translate(" + event.clientX + "px, " + event.clientY + "px) translate(-50%, -50%)";

            if (now - lastTrailAt >= 28 && distance >= 10) {
                createCursorParticle("cursor-trail", event.clientX, event.clientY, sparkleColors[trailIndex % sparkleColors.length], 0, 0);
                trailIndex += 1;
                lastTrailAt = now;
            }

            if (elapsed > 0 && distance / elapsed > 1.15 && now - lastBurstAt > 450) {
                createCursorBurst(event.clientX, event.clientY, trailIndex % sparkleColors.length);
                lastBurstAt = now;
            }

            lastX = event.clientX;
            lastY = event.clientY;
            lastMoveAt = now;
            document.body.classList.add("nightlight-on");
            if (!lampFrame) {
                lampFrame = window.requestAnimationFrame(function () {
                    lampFrame = 0;
                    document.documentElement.style.setProperty("--lamp-x", lastX + "px");
                    document.documentElement.style.setProperty("--lamp-y", lastY + "px");
                });
            }
        }, { passive: true });
    }

    document.addEventListener("click", function (event) {
        const control = event.target.closest("a, button");
        if (!control || !soundEnabled) return;
        if (control === soundToggle) return;
        if (control.closest(".project-dialog, .secret-experience, .music-controls, .orbs, .dialog-orbs, #music-box, #wind-box, #secret-star, .constellation-star, .mimi-chat, #theme-toggle, #storybook-toggle, #chaos-toggle, #chaos-exit, #dream-catch")) return;
        playChime(494);
    });

    const storedDreams = Number(safeStorageGet("mimi-moon-dreams"));
    dreamsDelivered = Number.isFinite(storedDreams) && storedDreams >= 0 ? Math.floor(storedDreams) : 0;
    incrementDreams(1);

    if (!window.MimiMemory) {
        if (safeStorageGet("mimi-moon-return")) {
            greeting.hidden = false;
            greetingText.textContent = "Welcome back, little star. Mimi kept a nightlight on for you.";
        } else {
            safeStorageSet("mimi-moon-return", "yes");
        }
    }
    if (greetingClose) {
        greetingClose.addEventListener("click", function () {
            greeting.hidden = true;
        });
    }

    function setChaos(isOn) {
        document.body.classList.toggle("chaos-mode", isOn);
        chaosToggle.setAttribute("aria-pressed", String(isOn));
        chaosToggle.setAttribute("aria-label", isOn ? "Exit Chaos Mode" : "Enter playful Chaos Mode");
        chaosToggle.textContent = isOn ? "Settle the stars" : "Chaos Mode";
        chaosExit.hidden = !isOn;
        if (isOn) playChime(698.46);
    }
    chaosToggle.addEventListener("click", function () {
        setChaos(!document.body.classList.contains("chaos-mode"));
    });
    chaosExit.addEventListener("click", function () {
        setChaos(false);
        chaosToggle.focus();
    });

    if (!window.MimiChat) {
        const chatReplies = {
            lonely: "Lonely hearts are why Mimi keeps the workshop lamps on. You can rest here as long as you like.",
            tired: "Then let the Moon keep watch. Softness is allowed, even in the middle of a busy sky.",
            story: "Once a shy star borrowed Mimi's blanket. By morning it shone a little kinder, and left a thank-you glow on the wall."
        };
        const initialChatChoices = chatChoices.innerHTML;
        chatChoices.addEventListener("click", function (event) {
            const button = event.target.closest("button[data-chat]");
            if (!button) return;
            if (button.dataset.chat === "reset") {
                chatLine.textContent = "Mimi peeks from the Moon. What would you like to share?";
                chatChoices.innerHTML = initialChatChoices;
                return;
            }
            chatLine.textContent = chatReplies[button.dataset.chat] || "Mimi answers with a tiny golden glow.";
            playChime(587.33);
            incrementDreams(1);
            chatChoices.innerHTML = '<button type="button" data-chat="reset">Ask Mimi something else</button>';
        });
    }

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function measureDeliveryRoute() {
        if (!deliveryRoute || typeof deliveryRoute.getTotalLength !== "function") return;
        deliveryLength = deliveryRoute.getTotalLength();
    }

    function placeDeliveryParcel(progress) {
        if (!deliveryParcel || !deliveryRoute || !deliveryLength) return;
        const point = deliveryRoute.getPointAtLength(progress * deliveryLength);
        deliveryParcel.setAttribute("cx", point.x.toFixed(2));
        deliveryParcel.setAttribute("cy", point.y.toFixed(2));
    }

    function deliveryProgress() {
        if (!deliverySection) return 0;
        const rect = deliverySection.getBoundingClientRect();
        const viewHeight = window.innerHeight || document.documentElement.clientHeight;
        const start = viewHeight * 0.82;
        const end = viewHeight * 0.18;
        const travel = Math.max(1, rect.height + (start - end));
        return clamp((start - rect.top) / travel, 0, 1);
    }

    function updateDeliveryParcel() {
        deliveryFrame = 0;
        if (!deliveryParcel || !deliveryRoute) return;
        if (reducedMotion.matches) {
            placeDeliveryParcel(0.55);
            return;
        }
        placeDeliveryParcel(deliveryProgress());
    }

    function requestDeliveryUpdate() {
        if (deliveryFrame) return;
        deliveryFrame = window.requestAnimationFrame(updateDeliveryParcel);
    }

    measureDeliveryRoute();
    updateDeliveryParcel();
    window.addEventListener("scroll", requestDeliveryUpdate, { passive: true });
    window.addEventListener("resize", function () {
        measureDeliveryRoute();
        requestDeliveryUpdate();
    });
    if (typeof reducedMotion.addEventListener === "function") {
        reducedMotion.addEventListener("change", updateDeliveryParcel);
    }

    function setCatcherPosition(ratio) {
        if (!dreamField || !dreamCatcher) return;
        const fieldWidth = dreamField.clientWidth;
        const catcherWidth = dreamCatcher.offsetWidth || 72;
        const maxX = Math.max(0, fieldWidth - catcherWidth);
        dreamGame.catcherX = clamp(ratio, 0, 1);
        dreamCatcher.style.transform = "translateX(" + (dreamGame.catcherX * maxX) + "px)";
    }

    function clearDreamStars() {
        dreamGame.stars.forEach(function (star) {
            if (star.el && star.el.parentNode) star.el.remove();
        });
        dreamGame.stars = [];
    }

    function stopDreamGameLoop() {
        if (dreamGame.frame) {
            window.cancelAnimationFrame(dreamGame.frame);
            dreamGame.frame = 0;
        }
        if (dreamGame.roundTimer) {
            window.clearInterval(dreamGame.roundTimer);
            dreamGame.roundTimer = 0;
        }
        dreamGame.keys.left = false;
        dreamGame.keys.right = false;
        if (dreamMoveLeft) dreamMoveLeft.classList.remove("is-held");
        if (dreamMoveRight) dreamMoveRight.classList.remove("is-held");
    }

    function spawnDreamStar() {
        if (!dreamField || !dreamGame.playing) return;
        const star = document.createElement("span");
        star.className = "dream-star";
        star.textContent = Math.random() > 0.5 ? "✦" : "✧";
        star.setAttribute("aria-hidden", "true");
        dreamField.appendChild(star);
        const startX = 8 + Math.random() * 84;
        dreamGame.stars.push({
            el: star,
            x: startX,
            y: reducedMotion.matches ? 18 + Math.random() * 12 : -6,
            speed: reducedMotion.matches ? 18 + Math.random() * 12 : 42 + Math.random() * 38
        });
    }

    function endDreamGame() {
        if (!dreamGame.playing) return;
        dreamGame.playing = false;
        stopDreamGameLoop();
        clearDreamStars();
        dreamField.style.touchAction = "pan-y";
        dreamCatchStart.hidden = false;
        dreamCatchStart.disabled = false;
        dreamCatchRestart.hidden = false;
        dreamCatchStatus.textContent = "What a gentle round. You caught " + dreamGame.score + " falling dream" + (dreamGame.score === 1 ? "" : "s") + ".";
        incrementDreams(1);
        playChime(784);
        dreamCatchRestart.focus();
    }

    function tickDreamGame(now) {
        if (!dreamGame.playing) return;
        const elapsed = Math.min(0.05, (now - dreamGame.lastTime) / 1000 || 0.016);
        dreamGame.lastTime = now;
        const move = (dreamGame.keys.right ? 1 : 0) - (dreamGame.keys.left ? 1 : 0);
        if (move) setCatcherPosition(dreamGame.catcherX + move * elapsed * 0.85);

        if (now >= dreamGame.spawnAt) {
            spawnDreamStar();
            dreamGame.spawnAt = now + (reducedMotion.matches ? 1100 : 650) + Math.random() * 500;
        }

        const fieldHeight = dreamField.clientHeight;
        const fieldWidth = dreamField.clientWidth;
        const catcherWidth = dreamCatcher.offsetWidth || 72;
        const catcherLeft = dreamGame.catcherX * Math.max(0, fieldWidth - catcherWidth);
        const catcherTop = fieldHeight - 56;
        const catcherRight = catcherLeft + catcherWidth;

        dreamGame.stars = dreamGame.stars.filter(function (star) {
            star.y += star.speed * elapsed * (fieldHeight / 220);
            const starX = (star.x / 100) * fieldWidth;
            star.el.style.transform = "translate(" + starX + "px, " + star.y + "px) translate(-50%, -50%)";
            const caught = star.y >= catcherTop && star.y <= fieldHeight - 8 && starX >= catcherLeft - 6 && starX <= catcherRight + 6;
            if (caught) {
                dreamGame.score += 1;
                dreamCatchScore.textContent = String(dreamGame.score);
                star.el.classList.add("is-caught");
                window.setTimeout(function () {
                    star.el.remove();
                }, reducedMotion.matches ? 0 : 220);
                playChime(880);
                return false;
            }
            if (star.y > fieldHeight + 18) {
                star.el.remove();
                return false;
            }
            return true;
        });

        dreamGame.frame = window.requestAnimationFrame(tickDreamGame);
    }

    function startDreamGame() {
        stopDreamGameLoop();
        clearDreamStars();
        dreamGame.playing = true;
        dreamGame.score = 0;
        dreamGame.remaining = 30;
        dreamGame.lastTime = performance.now();
        dreamGame.spawnAt = dreamGame.lastTime + 240;
        dreamCatchScore.textContent = "0";
        dreamCatchTime.textContent = "30";
        dreamCatchStatus.textContent = "Stars are drifting down. Catch as many as you like.";
        dreamCatchStart.hidden = true;
        dreamCatchStart.disabled = true;
        dreamCatchRestart.hidden = false;
        dreamField.style.touchAction = "none";
        setCatcherPosition(0.5);
        dreamField.focus();
        playChime(659.25);
        dreamGame.roundTimer = window.setInterval(function () {
            if (!dreamGame.playing) return;
            dreamGame.remaining -= 1;
            dreamCatchTime.textContent = String(Math.max(0, dreamGame.remaining));
            if (dreamGame.remaining <= 0) endDreamGame();
        }, 1000);
        dreamGame.frame = window.requestAnimationFrame(tickDreamGame);
    }

    function setDreamMove(direction, isDown) {
        dreamGame.keys[direction] = isDown;
        const button = direction === "left" ? dreamMoveLeft : dreamMoveRight;
        if (button) button.classList.toggle("is-held", isDown);
    }

    function bindHoldControl(button, direction) {
        if (!button) return;
        button.addEventListener("pointerdown", function (event) {
            event.preventDefault();
            setDreamMove(direction, true);
            if (typeof button.setPointerCapture === "function") button.setPointerCapture(event.pointerId);
        });
        button.addEventListener("pointerup", function () {
            setDreamMove(direction, false);
        });
        button.addEventListener("pointercancel", function () {
            setDreamMove(direction, false);
        });
        button.addEventListener("lostpointercapture", function () {
            setDreamMove(direction, false);
        });
    }

    if (dreamCatchStart && dreamField && dreamCatcher) {
        setCatcherPosition(0.5);
        dreamCatchStart.addEventListener("click", startDreamGame);
        dreamCatchRestart.addEventListener("click", startDreamGame);
        bindHoldControl(dreamMoveLeft, "left");
        bindHoldControl(dreamMoveRight, "right");
        document.addEventListener("keydown", function (event) {
            if (!dreamGame.playing) return;
            if (storybookDialog.open) return;
            if (isEditableTarget(event.target)) return;
            const key = event.key.toLowerCase();
            if (event.key === "ArrowLeft" || key === "a") {
                event.preventDefault();
                setDreamMove("left", true);
            } else if (event.key === "ArrowRight" || key === "d") {
                event.preventDefault();
                setDreamMove("right", true);
            }
        });
        document.addEventListener("keyup", function (event) {
            const key = event.key.toLowerCase();
            if (event.key === "ArrowLeft" || key === "a") setDreamMove("left", false);
            if (event.key === "ArrowRight" || key === "d") setDreamMove("right", false);
        });
        dreamField.addEventListener("pointerdown", function (event) {
            if (!dreamGame.playing || event.target.closest("button")) return;
            const bounds = dreamField.getBoundingClientRect();
            const catcherWidth = dreamCatcher.offsetWidth || 72;
            const ratio = (event.clientX - bounds.left - catcherWidth / 2) / Math.max(1, bounds.width - catcherWidth);
            setCatcherPosition(ratio);
            dreamField.setPointerCapture(event.pointerId);
        });
        dreamField.addEventListener("pointermove", function (event) {
            if (!dreamGame.playing || !dreamField.hasPointerCapture(event.pointerId)) return;
            const bounds = dreamField.getBoundingClientRect();
            const catcherWidth = dreamCatcher.offsetWidth || 72;
            const ratio = (event.clientX - bounds.left - catcherWidth / 2) / Math.max(1, bounds.width - catcherWidth);
            setCatcherPosition(ratio);
        });
        window.addEventListener("blur", function () {
            dreamGame.keys.left = false;
            dreamGame.keys.right = false;
        });
        window.addEventListener("resize", function () {
            setCatcherPosition(dreamGame.catcherX);
        });
    }
}());
