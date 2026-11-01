const { cmd } = require('../command');
const { runtime } = require('../lib/functions');
const config = require('../config');

const BOT_NAME = 'ɴɪᴋᴋᴀ x ᴍᴅ';
const FOOTER = 'ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ';

cmd({
    pattern: 'uptime',
    alias: ['runtime', 'up'],
    desc: 'Check bot uptime',
    category: 'main',
    react: '⏱️',
    filename: __filename
},
async (conn, mek, m, { from, reply, pushname }) => {
    try {
        const uptime = runtime(process.uptime());

        const startTime = new Date(
            Date.now() - process.uptime() * 1000
        );

        const botName = BOT_NAME;
        const ownerName = config.OWNER_NAME || 'ɴɪᴋᴋᴀ x ᴍᴅ';

        const caption = `
╭━━〔 *ᴜᴘᴛɪᴍᴇ ᴘᴀɴᴇʟ* 〕━━╮
┃
┃ 👋 ʜᴇʟʟᴏ, ${pushname || 'User'}
┃
┃ ⏱️ *ʀᴜɴᴛɪᴍᴇ*
┃ └─ ${uptime}
┃
┃ 🕒 *sᴛᴀʀᴛᴇᴅ ᴀᴛ*
┃ └─ ${startTime.toLocaleString()}
┃
┃ 🤖 *ʙᴏᴛ ɴᴀᴍᴇ*
┃ └─ ${botName}
┃
╰━━━━━━━━━━━━━━━━━━╯

> ${FOOTER}`;

        await conn.sendMessage(
            from,
            { text: caption },
            { quoted: mek }
        );

    } catch (error) {
        console.error('[UPTIME ERROR]', error);

        await reply('❌ Uptime Error: ' + error.message);
    }
});
