const { cmd } = require('../command');
const {
    toggleAntiDelete,
    getAntiDeleteStatus
} = require('../lib/antidel');

// AntiDelete image URL
const ANTIDELETE_IMAGE_URL = 'https://files.catbox.moe/2yenlk.jpeg';

const FOOTER = '> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ';

cmd({
    pattern: 'antidelete',
    alias: ['antidel'],
    react: '🛡️',
    desc: 'Enable or disable AntiDelete',
    category: 'tools',
    filename: __filename
}, async (conn, mek, m, { from, reply, args }) => {

    // Owner Only Protection
    const ownerNumber = '94703270772';
    const senderNumber = (m.sender || '')
        .split('@')[0]
        .split(':')[0];

    if (senderNumber !== ownerNumber) {
        return reply(
            '*╭──────────────●●►*\n' +
            '*┋* ❌ *OWNER ONLY COMMAND*\n' +
            '*┋*\n' +
            '*┋* ➜ This command is only for the bot owner.\n' +
            '*╰──────────────●●►*\n\n' +
            FOOTER
        );
    }

    try {
        const type = (args?.[0] || '').toLowerCase();
        const action = (args?.[1] || '').toLowerCase();

        // Show help and current status
        if (
            !['gc', 'dm'].includes(type) ||
            !['on', 'off'].includes(action)
        ) {
            const status = getAntiDeleteStatus();

            const text =
                '*╭──────────────●●►*\n' +
                '*┋* 🛡️ *ANTI DELETE PANEL*\n' +
                '*┋*\n' +
                '*┋* 📌 *Commands:*\n' +
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
            } catch (imageError) {
                console.error(
                    '[ANTIDELETE IMAGE ERROR]',
                    imageError
                );

                return reply(text);
            }

            return;
        }

        // Enable or disable AntiDelete
        const enabled = action === 'on';

        await toggleAntiDelete(
            conn,
            from,
            type,
            enabled
        );

    } catch (error) {
        console.error(
            '[ANTIDELETE COMMAND ERROR]',
            error
        );

        return reply(
            '*╭──────────────●●►*\n' +
            '*┋* ❌ *ANTI DELETE ERROR*\n' +
            `*┋* ➜ ${error.message || 'Unknown error'}\n` +
            '*╰──────────────●●►*\n\n' +
            FOOTER
        );
    }
});
