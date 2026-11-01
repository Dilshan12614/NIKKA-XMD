const { cmd } = require('../command');

const BOT_NAME = 'NIKKA X MD';
const FOOTER = '> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ';

let autoReadEnabled = false;
let customReadReact = '🤍';

const initializedConnections = new WeakSet();

function makePanel(title, lines = []) {
    return [
        '╭━━━〔 🤍 ɴɪᴋᴋᴀ x ᴍᴅ 🤍 〕━━━╮',
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
        console.error('[AUTOREAD] Event emitter unavailable.');
        return;
    }

    initializedConnections.add(conn);

    conn.ev.on('messages.upsert', async ({ messages }) => {
        if (!autoReadEnabled) return;

        for (const message of messages || []) {
            try {
                const key = message?.key;

                if (!key?.remoteJid || !key?.id || key.fromMe) continue;
                if (key.remoteJid === 'status@broadcast') continue;

                // Mark message as read
                await conn.readMessages([key]);

                // Optional custom reaction
                if (customReadReact) {
                    await conn.sendMessage(
                        key.remoteJid,
                        {
                            react: {
                                text: customReadReact,
                                key
                            }
                        }
                    );
                }
            } catch (error) {
                console.error('[AUTOREAD MESSAGE ERROR]', error);
            }
        }
    });

    console.log(`[${BOT_NAME}] Auto Read listener initialized.`);
}

// Auto Read ON/OFF command
cmd({
    pattern: 'autoread',
    alias: ['readmsg', 'readmessage'],
    react: '👁️',
    desc: 'Enable or disable Auto Read',
    category: 'owner',
    filename: __filename
}, async (conn, mek, m, { reply, args }) => {
    initializeAutoRead(conn);

    const action = String(args?.[0] || '').toLowerCase();

    if (action === 'on') {
        autoReadEnabled = true;

        return reply(makePanel('AUTO READ ENABLED', [
            '✅ Auto Read ක්‍රියාත්මකයි.',
            '📩 Incoming messages Read කරනවා.',
            `💖 Custom React: ${customReadReact || 'OFF'}`
        ]));
    }

    if (action === 'off') {
        autoReadEnabled = false;

        return reply(makePanel('AUTO READ DISABLED', [
            '❌ Auto Read අක්‍රිය කළා.',
            '📩 Messages Read කිරීම සහ React කිරීම නවත්වනවා.'
        ]));
    }

    return reply(makePanel('AUTO READ SETTINGS', [
        `📌 Status: ${autoReadEnabled ? '🟢 ON' : '🔴 OFF'}`,
        `💖 React: ${customReadReact || 'OFF'}`,
        '',
        '➤ .autoread on',
        '➤ .autoread off',
        '➤ .setreadreact ❤️',
        '➤ .setreadreact off'
    ]));
});

// Custom React command
cmd({
    pattern: 'setreadreact',
    alias: ['readreact'],
    react: '💖',
    desc: 'Change Auto Read reaction',
    category: 'owner',
    filename: __filename
}, async (conn, mek, m, { reply, args }) => {
    const emoji = String(args?.join(' ') || '').trim();

    if (!emoji) {
        return reply(makePanel('CUSTOM REACT', [
            `💖 Current React: ${customReadReact || 'OFF'}`,
            '',
            'භාවිතය:',
            '➤ .setreadreact ❤️',
            '➤ .setreadreact 🔥',
            '➤ .setreadreact off'
        ]));
    }

    if (emoji.toLowerCase() === 'off') {
        customReadReact = '';
        return reply(makePanel('REACT DISABLED', [
            '🔕 Custom React අක්‍රිය කළා.',
            '👁️ Auto Read තවදුරටත් ක්‍රියාත්මක විය හැකියි.'
        ]));
    }

    if (emoji.length > 12) {
        return reply('❌ කරුණාකර emoji එකක් හෝ කෙටි emoji එකතුවක් දෙන්න.');
    }

    customReadReact = emoji;

    return reply(makePanel('REACT UPDATED', [
        `💖 New React: ${customReadReact}`,
        '✅ නව React එක save කළා.',
        '📌 .autoread on කරලා භාවිතා කරන්න.'
    ]));
});

module.exports = { initializeAutoRead };
