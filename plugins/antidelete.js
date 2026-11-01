const { cmd } = require('../command');
const fs = require('fs');
const path = require('path');
const config = require('../config');

const SETTINGS_FILE = path.join(
    __dirname,
    '../data/antidelete.json'
);

const FOOTER = '> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴅᴀɴᴜᴡᴀ x ᴍᴅ';
const IMAGE = 'https://files.catbox.moe/2yenlk.jpeg';

function loadSettings() {
    try {
        if (!fs.existsSync(SETTINGS_FILE)) {
            return { gc: false, dm: false };
        }

        const saved = JSON.parse(
            fs.readFileSync(SETTINGS_FILE, 'utf8')
        );

        return {
            gc: Boolean(saved.gc),
            dm: Boolean(saved.dm)
        };
    } catch (error) {
        console.error('[ANTIDELETE SETTINGS]', error);
        return { gc: false, dm: false };
    }
}

function saveSettings() {
    fs.mkdirSync(path.dirname(SETTINGS_FILE), {
        recursive: true
    });

    fs.writeFileSync(
        SETTINGS_FILE,
        JSON.stringify(global.antiDeleteSettings, null, 2)
    );
}

global.antiDeleteSettings = loadSettings();

cmd({
    pattern: 'antidelete',
    alias: ['antidel'],
    react: '🛡️',
    desc: 'Enable or disable AntiDelete',
    category: 'tools',
    filename: __filename
}, async (conn, mek, m, { from, reply, args }) => {

    const ownerNumber = String(
        config.BOT_OWNER || '94772194789'
    ).replace(/\D/g, '');

    const senderNumber = String(m.sender || '')
        .split('@')[0]
        .split(':')[0];

    if (senderNumber !== ownerNumber) {
        return reply(
            '*╭──────────────●●►*\n' +
            '*┋* ❌ *OWNER ONLY COMMAND*\n' +
            '*┋* ➜ Only the bot owner can use this command.\n' +
            '*╰──────────────●●►*\n\n' +
            FOOTER
        );
    }

    try {
        const type = String(args?.[0] || '').toLowerCase();
        const action = String(args?.[1] || '').toLowerCase();

        const status = global.antiDeleteSettings;

        if (
            !['gc', 'dm'].includes(type) ||
            !['on', 'off'].includes(action)
        ) {
            const text =
                '*╭──────────────●●►*\n' +
                '*┋* 🛡️ *ANTI DELETE PANEL*\n' +
                '*┋*\n' +
                '*┋* 📌 *COMMANDS*\n' +
                '*┋* ➜ `.antidelete gc on`\n' +
                '*┋* ➜ `.antidelete gc off`\n' +
                '*┋* ➜ `.antidelete dm on`\n' +
                '*┋* ➜ `.antidelete dm off`\n' +
                '*┋*\n' +
                '*┋* 📊 *CURRENT STATUS*\n' +
                `*┋* ➜ 👥 Group: ${status.gc ? '✅ ON' : '❌ OFF'}\n` +
                `*┋* ➜ 👤 Personal: ${status.dm ? '✅ ON' : '❌ OFF'}\n` +
                '*╰──────────────●●►*\n\n' +
                FOOTER;

            try {
                return await conn.sendMessage(
                    from,
                    {
                        image: { url: IMAGE },
                        caption: text
                    },
                    { quoted: mek }
                );
            } catch {
                return reply(text);
            }
        }

        status[type] = action === 'on';
        saveSettings();

        return reply(
            '*╭──────────────●●►*\n' +
            '*┋* 🛡️ *ANTI DELETE UPDATED*\n' +
            '*┋*\n' +
            `*┋* ➜ Type: ${type.toUpperCase()}\n` +
            `*┋* ➜ Status: ${status[type] ? '✅ ENABLED' : '❌ DISABLED'}\n` +
            '*╰──────────────●●►*\n\n' +
            FOOTER
        );

    } catch (error) {
        console.error('[ANTIDELETE COMMAND ERROR]', error);

        return reply(
            '❌ AntiDelete Error: ' + error.message
        );
    }
});
