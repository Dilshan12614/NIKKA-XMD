const { cmd } = require('../command');

const OWNER_NAME = 'ɴɪᴋᴋᴀ x ᴍᴅ';
const OWNER_NUMBER = '94703270772';

const OWNER_IMAGE_URL =
'https://i.ibb.co/67DRMzkf/b5fbf712e8fd.jpg';

cmd(
{
pattern: 'owner',
alias: ['ownerinfo', 'ownerbutton'],
react: '👑',
desc: 'Show bot owner information',
category: 'main',
filename: __filename
},


async (conn, mek, m, { from, pushName }) => {
    try {
        const displayName = String(
            pushName ||
            mek?.pushName ||
            m?.pushName ||
            'WhatsApp User'
        ).trim();

        const ownerText = [
            '╭━━〔 ᴏᴡɴᴇʀ ɪɴғᴏ 〕━━●●►',
            '┃',
            `┃ 👤 ᴏᴡɴᴇʀ  : ${OWNER_NAME}`,
            `┃ 📱 ɴᴜᴍʙᴇʀ : +${OWNER_NUMBER}`,
            '┃ 🤖 ʙᴏᴛ    : ɴɪᴋᴋᴀ x ᴍᴅ',
            '┃ ⚡ sᴛᴀᴛᴜs  : ᴏғғɪᴄɪᴀʟ',
            '┃',
            '╰━━━━━━━━━━━━━━●●►',
            '',
            `👋 ʜᴇʟʟᴏ, ${displayName}! ❤️`,
            '',
            '✨ ᴄᴏɴᴛᴀᴄᴛ ᴛʜᴇ ᴏᴡɴᴇʀ',
            '📢 ᴛʜᴀɴᴋ ʏᴏᴜ ғᴏʀ ᴜsɪɴɢ ᴏᴜʀ ʙᴏᴛ! ❤️',
            '',
            'ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ'
        ].join('\n');

        await conn.sendMessage(from, {
            image: { url: OWNER_IMAGE_URL },
            caption: ownerText
        }, { quoted: mek });

    } catch (error) {
        console.error('[OWNER COMMAND ERROR]', error);

        await conn.sendMessage(from, {
            text: '❌ Owner info එක යැවීමේදී දෝෂයක් ඇතිවුණා.'
        }, { quoted: mek });
    }
}


);
