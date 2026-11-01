const { cmd } = require('../command');

const BOT_NAME = 'NIKKA X MD';
const FOOTER = '> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ';

// Auto Read default OFF
let autoReadEnabled = false;

// Prevent duplicate listeners on the same connection
const initializedConnections = new WeakSet();

function makePanel(title, lines = []) {
    return [
        '╭━━━『 🤍 NIKKA X MD 🤍 』━━━╮',
        '┃',
        `┃  ✨ *${title}*`,
        '┃',
        ...lines.map(line => `┃  ${line}`),
        '┃',
        '╰━━━━━━━━━━━━━━━━━━━━━━╯',
        '',
        FOOTER
    ].join('\n');
}

function initializeAutoRead(conn) {
    if (!conn || typeof conn !== 'object') return;

    if (initializedConnections.has(conn)) return;

    if (!conn.ev || typeof conn.ev.on !== 'function') {
        console.error('[AUTOREAD] Connection event emitter unavailable.');
        return;
    }

    initializedConnections.add(conn);

    conn.ev.on('messages.upsert', async ({ messages }) => {
        if (!autoReadEnabled) return;

        for (const message of messages || []) {
            try {
                const key = message?.key;

                if (!key?.remoteJid || !key?.id) continue;
                if (key.fromMe) continue;

                // Ignore WhatsApp status updates
                if (key.remoteJid === 'status@broadcast') continue;

                // Mark incoming message as read
                await conn.readMessages([key]);

            } catch (error) {
                console.error('[AUTOREAD MESSAGE ERROR]', error);
            }
        }
    });

    console.log(`[${BOT_NAME}] Auto Read listener initialized.`);
}

// Auto Read command
cmd({
    pattern: 'autoread',
    alias: ['readmsg', 'readmessage'],
    react: '👁️',
    desc: 'Enable or disable Auto Read',
    category: 'owner',
    filename: __filename
}, async (conn, mek, m, { reply, args }) => {
    // Ensure the listener is attached
    initializeAutoRead(conn);

    const action = String(args?.[0] || '').toLowerCase();

    if (action === 'on') {
        autoReadEnabled = true;

        return reply(makePanel('AUTO READ ENABLED', [
            '✅ Auto Read ක්‍රියාත්මකයි.',
            '📩 ලැබෙන messages Read කරනවා.',
            '🔵 Read receipts අනුව blue ticks පෙන්විය හැකියි.'
        ]));
    }

    if (action === 'off') {
        autoReadEnabled = false;

        return reply(makePanel('AUTO READ DISABLED', [
            '❌ Auto Read අක්‍රිය කළා.',
            '📩 Messages ස්වයංක්‍රීයව Read කිරීම නවත්වනවා.'
        ]));
    }

    return reply(makePanel('AUTO READ SETTINGS', [
        `📌 Status: ${autoReadEnabled ? '✅ ON' : '❌ OFF'}`,
        '',
        '📌 Commands:',
        '➤ .autoread on',
        '➤ .autoread off',
        '',
        '🤍 NIKKA X MD Auto Read System'
    ]));
});

module.exports = { initializeAutoRead };
