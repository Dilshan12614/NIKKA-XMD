const { cmd } = require('../command');
const { setSetting, getSettings } = require('../lib/botsettings');

const OWNER_NUMBER = '94772194789';

function normalizeNumber(number = '') {
    let clean = String(number).replace(/\D/g, '');

    if (clean.startsWith('0')) {
        clean = '94' + clean.slice(1);
    }

    return clean;
}

function isOwner(senderNumber, sender) {
    const number = normalizeNumber(
        senderNumber || String(sender || '').split('@')[0]
    );

    return number === OWNER_NUMBER;
}

async function toggleCommand(name, title, conn, mek, m, context) {
    const { from, sender, senderNumber, q, reply } = context;

    if (!isOwner(senderNumber, sender)) {
        return reply('❌ Owner Only Command!');
    }

    const value = String(q || '').trim().toLowerCase();

    if (!['on', 'off'].includes(value)) {
        return reply(
            `❌ වැරදි භාවිතයක්!\n\n` +
            `උදාහරණය: .${name} on\n` +
            `උදාහරණය: .${name} off`
        );
    }

    const enabled = value === 'on';
    setSetting(name, enabled);

    // Apply online presence immediately when changed.
    if (name === 'alwaysonline') {
        try {
            await conn.sendPresenceUpdate(
                enabled ? 'available' : 'unavailable'
            );
        } catch (error) {
            console.error('[SETTINGS] Presence update error:', error);
        }
    }

    return reply(
        `╭━━〔 NIKKA X MD 〕━━╮\n` +
        `│\n` +
        `│ ⚙️ *${title}*\n` +
        `│ 📌 Status: ${enabled ? 'ON ✅' : 'OFF ❌'}\n` +
        `│\n` +
        `╰━━━━━━━━━━━━━━╯`
    );
}

cmd({
    pattern: 'autorecord',
    desc: 'Enable or disable automatic recording status',
    category: 'owner',
    filename: __filename
}, async (conn, mek, m, context) => {
    return toggleCommand(
        'autorecord',
        'AUTO RECORD',
        conn, mek, m, context
    );
});

cmd({
    pattern: 'autotyping',
    desc: 'Enable or disable automatic typing status',
    category: 'owner',
    filename: __filename
}, async (conn, mek, m, context) => {
    return toggleCommand(
        'autotyping',
        'AUTO TYPING',
        conn, mek, m, context
    );
});

cmd({
    pattern: 'alwaysonline',
    desc: 'Enable or disable always online',
    category: 'owner',
    filename: __filename
}, async (conn, mek, m, context) => {
    return toggleCommand(
        'alwaysonline',
        'ALWAYS ONLINE',
        conn, mek, m, context
    );
});

cmd({
    pattern: 'settings',
    desc: 'Show bot settings',
    category: 'owner',
    filename: __filename
}, async (conn, mek, m, {
    sender,
    senderNumber,
    reply
}) => {
    if (!isOwner(senderNumber, sender)) {
        return reply('❌ Owner Only Command!');
    }

    const settings = getSettings();

    return reply(
        `╭━━〔 ⚙️ NIKKA X MD SETTINGS 〕━━╮\n` +
        `│\n` +
        `│ 🎙️ Auto Record : ${settings.autorecord ? 'ON ✅' : 'OFF ❌'}\n` +
        `│ ⌨️ Auto Typing : ${settings.autotyping ? 'ON ✅' : 'OFF ❌'}\n` +
        `│ 🟢 Always Online : ${settings.alwaysonline ? 'ON ✅' : 'OFF ❌'}\n` +
        `│\n` +
        `╰━━━━━━━━━━━━━━━━━━━━╯`
    );
});
