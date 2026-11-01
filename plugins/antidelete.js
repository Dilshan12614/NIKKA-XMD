const { cmd } = require('../command');

const ANTIDELETE_IMAGE_URL = 'https://files.catbox.moe/2yenlk.jpeg';
const FOOTER = '> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ';

const ownerNumber = '94772194789';

// In-memory settings
if (!global.antiDeleteSettings) {
    global.antiDeleteSettings = {
        gc: false,
        dm: false
    };
}

cmd({
    pattern: 'antidelete',
    alias: ['antidel'],
    react: '🛡️',
    desc: 'Enable or disable AntiDelete',
    category: 'tools',
    filename: __filename
}, async (conn, mek, m, {
    from,
    reply,
    args
}) => {

    const senderNumber = (m.sender || '')
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
        const type = (args?.[0] || '').toLowerCase();
        const action = (args?.[1] || '').toLowerCase();

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
                await conn.sendMessage(
                    from,
                    {
                        image: { url: ANTIDELETE_IMAGE_URL },
                        caption: text
                    },
                    { quoted: mek }
                );
            } catch (e) {
                return reply(text);
            }

            return;
        }

        status[type] = action === 'on';

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
        console.error('[ANTIDELETE ERROR]', error);
        return reply('❌ AntiDelete Error: ' + error.message);
    }
});
