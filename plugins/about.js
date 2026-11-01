const { cmd } = require('../command');
const config = require('../config');

cmd(
    {
        pattern: 'about',
        alias: ['developer', 'ownerinfo'],
        react: '👑',
        desc: 'Get bot information',
        category: 'main',
        filename: __filename
    },

    async (conn, mek, m, { from, pushName, pushname }) => {
        try {
            const userName =
                pushName ||
                pushname ||
                m?.pushName ||
                m?.pushname ||
                'User';

            const prefix = config.PREFIX || '.';
            const botName = 'ɴɪᴋᴋᴀ x ᴍᴅ';

            const aboutText = `👋 HELLO... *${userName}* 🎉

╭──〔 *${botName}* 〕──●●►
│
│ 👋 ʜᴇʟʟᴏ, *${userName}* ❤️
│
│ 💖 Welcome to *${botName}*
│ 🤖 Your smart WhatsApp assistant
│ ⚡ Ready to make your WhatsApp
│    experience more amazing!
│
├─〔 *ᴀʙᴏᴜᴛ ᴍᴇ* 〕
│
│ 👨‍💻 *ᴅᴇᴠᴇʟᴏᴘᴇʀ* : ${botName}
│ 🚀 *ʙᴏᴛ ɴᴀᴍᴇ* : ${botName}
│ 🧩 *ᴘʀᴇғɪx* : ${prefix}
│ 🌟 *sᴛᴀᴛᴜs* : Always Ready
│
│ 💌 Thank you for choosing us!
│ ✨ Enjoy the experience!
│
╰───────────────●●►

> ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ`;

            await conn.sendMessage(
                from,
                {
                    image: {
                        url: 'https://i.ibb.co/Qv01hMpz/e605876ded5b.jpg'
                    },
                    caption: aboutText
                },
                { quoted: mek }
            );

        } catch (error) {
            console.error('[ABOUT ERROR]', error);

            await conn.sendMessage(
                from,
                {
                    text:
                        `❌ *ABOUT ERROR*\n\n` +
                        `⚠️ ${error.message || 'Unknown error'}`
                },
                { quoted: mek }
            );
        }
    }
);
