/**
 * Mimi's Dream World — Tier 3 Character Chat
 * Creates a friendly, comforting conversational interface in Mimi's character voice.
 * Provides rich rule-based replies (with optional backend /api/chat support),
 * safe DOM rendering without innerHTML injection, name-memory integration,
 * sound chimes, and full keyboard/screen-reader accessibility.
 */

(function () {
    window.MimiChat = true;

    let chatFeedEl = null;
    let chatFormEl = null;
    let chatInputEl = null;
    let chatChoicesEl = null;
    let chatStatusEl = null;

    const MimiVoice = {
        getGreeting: function () {
            const name = window.MimiMemory ? window.MimiMemory.getPreferredName() : '';
            if (name) {
                return `Mimi peeks over a starlit cloud. "Welcome back, ${name}! What would you like to whisper tonight?"`;
            }
            return `Mimi peeks from the Moon. "Hello gentle traveler! What would you like to share under the stars?"`;
        },

        generateReply: function (rawInput) {
            const input = (rawInput || '').trim().toLowerCase();
            const preferredName = window.MimiMemory ? window.MimiMemory.getPreferredName() : '';
            const namePrefix = preferredName ? `${preferredName}, ` : '';

            // Check if visitor is introducing themselves: "my name is X", "i am X", "call me X"
            const nameMatch = rawInput.match(/(?:my name is|i am|call me|name's)\s+([A-Za-z0-9_-]{1,30})/i);
            if (nameMatch && nameMatch[1]) {
                const detectedName = nameMatch[1].trim();
                if (window.MimiMemory && typeof window.MimiMemory.setPreferredName === 'function') {
                    window.MimiMemory.setPreferredName(detectedName);
                }
                return `Mimi claps their soft paws together! "It is so wonderful to meet you, ${detectedName}! I tucked your name into my star jar so I'll always remember you."`;
            }

            // Loneliness & Sadness
            if (/lonely|alone|sad|cry|hurting|unhappy|down|empty/.test(input)) {
                return `${namePrefix}lonely hearts are why Mimi keeps the moon lamps burning bright. You can stay right here as long as you like. You are never as alone as it feels.`;
            }

            // Anxiety & Overwhelm
            if (/anxious|scared|fear|stressed|worry|overwhelm|panic|nervous/.test(input)) {
                return `Take one soft, slow breath with Mimi... in, and out. You don't have to carry the whole sky right now. Just this little moment of quiet starlight is enough.`;
            }

            // Sleep, Bedtime & Tiredness
            if (/sleep|tired|exhaust|bed|night|rest|slumber|nap|yawn|sleepy/.test(input)) {
                return `Then let the Moon keep watch for you, ${namePrefix}Mimi has folded a cloud blanket and turned the nightlight down low. May your dreams be gentle and kind.`;
            }

            // Story request
            if (/story|tale|tell me|read|book/.test(input)) {
                const stories = [
                    `Once, a shy little star fell onto Mimi's windowsill. It thought it wasn't bright enough for the sky. Mimi wrapped it in velvet and whispered kind words all night. By morning, it shone with a golden glow and danced back into the constellation.`,
                    `In the quietest nook of the Moon, Mimi keeps a shelf of glass jars. Whenever someone feels a tiny spark of hope on Earth, a new speck of stardust lands inside. Tonight, your jar is glowing softly.`,
                    `Before the stars learned to hum, the universe was very quiet. Mimi made three music boxes from fallen moonbeams. Now, every breeze that touches a sleeping child carries a lullaby from the sky.`
                ];
                return stories[Math.floor(Math.random() * stories.length)];
            }

            // Who are you / Mimi's identity
            if (/who are you|what are you|about you|your name|character/.test(input)) {
                return `I am Mimi, the Little Dream Puff! I have floppy bunny ears, galaxy-violet eyes, and golden cheek stars. I live in a bedroom on the Moon and turn starlight into comfort for lonely hearts.`;
            }

            // Stars & Constellations
            if (/star|starlight|constellation|sparkle|glow/.test(input)) {
                return `Every golden star on Mimi's cheeks blinks whenever someone feels a little bit of warmth. There are billions of stars, and each one has room for a wish.`;
            }

            // Moon & Bedroom
            if (/moon|bedroom|nook|workshop|sky|space/.test(input)) {
                return `The Moon is quiet and smells like cool silver dew. In Mimi's bedroom, there's a Storybook, a Music Box, and soft floating light orbs. You are always welcome in the nook!`;
            }

            // Wishes & Dreams
            if (/wish|dream|hope|future|magic/.test(input)) {
                return `Mimi gently folds your wish into a paper boat of moonlight. Wishes whispered softly have a special way of finding their way into reality.`;
            }

            // Greetings
            if (/^(hi|hello|hey|howdy|greetings|good morning|good afternoon|good evening|sup)/.test(input)) {
                return `Hello gentle traveler! Mimi's ears fluttered with joy when you whispered. How does your heart feel tonight?`;
            }

            // Love, Hugs & Kindness
            if (/love|hug|care|friend|sweet|kind|kiss/.test(input)) {
                return `Mimi gives you a warm, soft puff hug! You are cherished, and your presence makes this corner of the cosmos a softer place. ♡`;
            }

            // Music & Sound
            if (/music|song|tune|melody|chime|lullaby/.test(input)) {
                return `The moonbeam music box plays three gentle notes: do, mi, and sol. When the melody spins, every sleepy star sways in time.`;
            }

            // Gratitude & Goodbye
            if (/thank|thanks|grateful|appreciate/.test(input)) {
                return `Thank you for sharing your light with Mimi, ${namePrefix}visiting with you makes the Moon feel much warmer.`;
            }
            if (/bye|goodbye|farewell|see you|later|night/.test(input)) {
                return `Goodnight, sweet dreamer. Mimi will keep the window star shining until you return.`;
            }

            // Fallback replies
            const fallbacks = [
                `Mimi listens closely with floppy ears tilted forward. "Even the smallest thoughts are held tenderly here under the stars."`,
                `A tiny golden spark fluttered down as you spoke. Mimi tucked your words into a velvet moon-pocket.`,
                `Mimi nods gently. "The universe is very vast, ${namePrefix}but in this quiet moment, you have a safe space on the Moon."`,
                `"Whatever you are holding today," Mimi whispers softly, "you can set it down here on the moon cloud for a little while."`
            ];

            return fallbacks[Math.floor(Math.random() * fallbacks.length)];
        }
    };

    function appendMessage(role, text) {
        if (!chatFeedEl) return;

        const msgEl = document.createElement('div');
        msgEl.className = `mimi-chat-bubble is-${role}`;

        const roleBadge = document.createElement('span');
        roleBadge.className = 'chat-avatar-badge';
        roleBadge.setAttribute('aria-hidden', 'true');
        roleBadge.textContent = role === 'mimi' ? '✦ Mimi' : '✧ You';
        msgEl.appendChild(roleBadge);

        const textEl = document.createElement('p');
        textEl.className = 'chat-bubble-text';
        // SECURE: textContent prevents any script execution
        textEl.textContent = text;
        msgEl.appendChild(textEl);

        chatFeedEl.appendChild(msgEl);

        // Auto-scroll to latest
        chatFeedEl.scrollTop = chatFeedEl.scrollHeight;

        // Announce for assistive tech
        if (chatStatusEl && role === 'mimi') {
            chatStatusEl.textContent = `Mimi whispers: ${text}`;
        }
    }

    async function processUserMessage(text) {
        const clean = (text || '').trim();
        if (!clean) return;

        // Add user bubble
        appendMessage('user', clean);

        // Attempt server reply first, fallback to rich rule-based engine
        let reply = '';
        try {
            const visitorName = window.MimiMemory ? window.MimiMemory.getPreferredName() : '';
            const apiUrl = (window.location.protocol === 'http:' || window.location.protocol === 'https:')
                ? '/api/chat'
                : 'http://localhost:4173/api/chat';

            const res = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ message: clean, name: visitorName })
            });
            if (res.ok) {
                const text = await res.text();
                if (text && text.trim()) {
                    try {
                        const data = JSON.parse(text);
                        if (data && data.success && data.reply) {
                            reply = data.reply;
                        }
                    } catch (e) {}
                }
            }
        } catch (e) {
            // Server offline or static mode, proceed to local rule engine
        }

        if (!reply) {
            reply = MimiVoice.generateReply(clean);
        }

        // Slight cozy delay to simulate Mimi listening and replying
        setTimeout(() => {
            appendMessage('mimi', reply);

            // Play gentle chime if audio is enabled
            if (typeof window.MimiPlayChime === 'function') {
                window.MimiPlayChime(587.33);
            }
        }, 320);
    }

    function init() {
        const chatContainer = document.querySelector('#mimi-chat');
        if (!chatContainer) return;

        chatFeedEl = document.querySelector('#mimi-chat-messages');
        chatFormEl = document.querySelector('#mimi-chat-form');
        chatInputEl = document.querySelector('#mimi-chat-input');
        chatChoicesEl = document.querySelector('#mimi-chat-choices');
        chatStatusEl = document.querySelector('#mimi-chat-status');

        // Initial welcome message from Mimi if feed is empty
        if (chatFeedEl && chatFeedEl.children.length === 0) {
            appendMessage('mimi', MimiVoice.getGreeting());
        }

        // Handle suggestion chips
        if (chatChoicesEl) {
            chatChoicesEl.addEventListener('click', (e) => {
                const btn = e.target.closest('button[data-chat]');
                if (!btn) return;

                const chatType = btn.getAttribute('data-chat');
                let messageText = btn.textContent.trim();

                if (chatType === 'lonely') messageText = 'I feel a little lonely';
                else if (chatType === 'tired') messageText = 'I am sleepy';
                else if (chatType === 'story') messageText = 'Tell me a tiny story';
                else if (chatType === 'who') messageText = 'Who are you, Mimi?';
                else if (chatType === 'wish') messageText = 'Can I make a wish?';

                processUserMessage(messageText);
            });
        }

        // Handle form submit
        if (chatFormEl && chatInputEl) {
            chatFormEl.addEventListener('submit', (e) => {
                e.preventDefault();
                const val = chatInputEl.value;
                if (!val || !val.trim()) return;
                chatInputEl.value = '';
                processUserMessage(val);
                chatInputEl.focus();
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
