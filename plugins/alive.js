const { cmd } = require('../command');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { runtime } = require('../lib/functions');

// ==========================================
//             NIKKA X MD ALIVE
// ==========================================

const BOT_NAME = 'NIKKA X MD';
const OWNER_NAME = 'NIKKA X MD';
const VERSION = '3.0.0 BETA';
const PREFIX = '.';

const ALIVE_IMAGE = 'https://i.ibb.co/Jw3Dyyqz/dec1fcbd941d.jpg';

const AUDIO_FILE = path.resolve(
    __dirname,
    '..',
    'AUD-20261027-WA0000.mp3'
);

cmd({
    pattern: 'alive',
    alias: ['status', 'runtime', 'uptime'],
    desc: 'NIKKA X MD bot status',
    category: 'main',
    react: '🧚‍♂️',
    filename: __filename
},
async (conn, mek, m, {
    from, sender, senderNumber, pushname, isGroup, reply
}) => {
    try {
        // SYSTEM STATS
        const uptime = runtime(process.uptime());

        const ramUsed = (
            process.memoryUsage().heapUsed / 1024 / 1024
        ).toFixed(2);

        const ramTotal = (
            os.totalmem() / 1024 / 1024
        ).toFixed(2);

        const host = os.hostname();
        const userName = pushname || senderNumber || 'User';

        // STATUS PANEL
        const caption = [
            `╭━━〔 ⚡ ${BOT_NAME} 〕━━╮`,
            '',
            `👋 𝙷𝙴𝙻𝙻𝙾 *${userName}* 𝚆𝙴𝙻𝙲𝙾𝙼𝙴 𝚃𝙾 ${BOT_NAME} 🎉`,
            '',
            '╭─「 ꜱᴛᴀᴛᴜꜱ ᴘᴀɴᴇʟ 」 ──●●►',
            '│',
            `│ ⏳ *ᴜᴘᴛɪᴍᴇ*   : ${uptime}`,
            `│ 👤 *ᴜsᴇʀ*     : ${userName}`,
            `│ 💾 *ʀᴀᴍ*      : ${ramUsed} MB`,
            `│ 🖥️ *ᴛᴏᴛᴀʟ ʀᴀᴍ* : ${ramTotal} MB`,
            `│ ⚙️ *ʜᴏsᴛ*      : ${host}`,
            `│ ⌨️ *ᴘʀᴇғɪx*    : ${PREFIX}`,
            `│ 🧬 *ᴠᴇʀsɪᴏɴ*   : ${VERSION}`,
            `│ 👑 *ᴏᴡɴᴇʀ*     : ${OWNER_NAME}`,
            '│',
            '╰─────────────────●●►',
            '',
            '',
            '> © ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ',
            '',
            
            
        ].join('\n');

        
        // SEND STATUS IMAGE — NO BUTTONS
        try {
            await conn.sendMessage(
                from,
                {
                    image: { url: ALIVE_IMAGE },
                    caption: caption,
                    contextInfo: {
                        mentionedJid: sender ? [sender] : [],
                        forwardingScore: 999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363430604376029@newsletter',
                            newsletterName: 'අපේ නික්කා පැට්ටා',
                            serverMessageId: 143
                        }
                    }
                },
                { quoted: mek }
            );
        } catch (imageError) {
            console.error('[NIKKA X MD] Image error:', imageError);

            await conn.sendMessage(
                from,
                { text: caption },
                { quoted: mek }
            );
        }
        
        // SEND UPLOADED AUDIO
        if (fs.existsSync(AUDIO_FILE)) {
            try {
                const audioBuffer = fs.readFileSync(AUDIO_FILE);

                await conn.sendMessage(
                    from,
                    {
                        audio: audioBuffer,
                        mimetype: 'audio/mpeg',
                        fileName: 'NIKKA-X-MD.mp3',
                        ptt: false
                    },
                    { quoted: mek }
                );

                console.log('[NIKKA X MD] Audio sent successfully.');

            } catch (audioError) {
                console.error('[NIKKA X MD] Audio sending error:', audioError);
            }
        } else {
            console.error('[NIKKA X MD] Audio file not found:', AUDIO_FILE);
        }

    } catch (error) {
        console.error('[NIKKA X MD] Alive command error:', error);

        try {
            await reply('❌ NIKKA X MD alive command error. Check the bot logs.');
        } catch (replyError) {
            console.error('[NIKKA X MD] Reply error:', replyError);
        }
    }
});
