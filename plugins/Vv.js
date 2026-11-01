const { cmd } = require('../command');

const BOT_NAME = 'ɴɪᴋᴋᴀ x ᴍᴅ';
const FOOTER = 'ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ';

cmd({
    pattern: 'vv',
    alias: ['viewimage', 'reimage'],
    react: '🖼️',
    desc: 'Resend a replied image',
    category: 'main',
    filename: __filename
},
async (conn, mek, m, { from, quoted, reply }) => {
    try {
        if (!quoted) {
            return reply(
                '❌ *IMAGE NOT FOUND*\n\n' +
                'සාමාන්‍ය photo එකකට reply කරලා `.vv` යවන්න.'
            );
        }

        // Get the quoted message
        let msg = quoted.message || quoted;

        // Unwrap supported message wrappers
        while (true) {
            if (msg.ephemeralMessage?.message) {
                msg = msg.ephemeralMessage.message;
            } else if (msg.viewOnceMessage?.message) {
                msg = msg.viewOnceMessage.message;
            } else if (msg.viewOnceMessageV2?.message) {
                msg = msg.viewOnceMessageV2.message;
            } else if (msg.viewOnceMessageV2Extension?.message) {
                msg = msg.viewOnceMessageV2Extension.message;
            } else {
                break;
            }
        }

        const imageMessage = msg.imageMessage;

        if (!imageMessage) {
            return reply(
                '❌ *IMAGE NOT FOUND*\n\n' +
                'Image එකකට reply කරලා `.vv` යවන්න.'
            );
        }

        await reply('⏳ *Processing image...*');

        // Download image using Baileys
        const { downloadContentFromMessage } =
            await import('@whiskeysockets/baileys');

        let stream;

        try {
            stream = await downloadContentFromMessage(
                imageMessage,
                'image'
            );
        } catch (downloadError) {
            console.error('[VV DOWNLOAD ERROR]', downloadError);

            return reply(
                '❌ *IMAGE DOWNLOAD FAILED*\n\n' +
                `${downloadError?.message || downloadError}`
            );
        }

        // Convert stream to Buffer
        const chunks = [];

        for await (const chunk of stream) {
            chunks.push(chunk);
        }

        const buffer = Buffer.concat(chunks);

        if (!buffer.length) {
            return reply(
                '❌ *EMPTY IMAGE*\n\n' +
                'Image data එක ලබාගන්න බැරි වුණා.'
            );
        }

        console.log(
            `[VV] Image downloaded: ${(buffer.length / 1024).toFixed(2)} KB`
        );

        // Send the image again
        await conn.sendMessage(
            from,
            {
                image: buffer,
                mimetype: imageMessage.mimetype || 'image/jpeg',
                caption:
                    '╭━━〔 *ɪᴍᴀɢᴇ ᴘᴀɴᴇʟ* 〕━━╮\n' +
                    '┃\n' +
                    '┃ 🖼️ *ɪᴍᴀɢᴇ ʀᴇᴄᴇɪᴠᴇᴅ*\n' +
                    '┃ ✅ Image resent successfully\n' +
                    '┃ 🤖 ' + BOT_NAME + '\n' +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━━━╯\n\n' +
                    '> ' + FOOTER
            },
            {
                quoted: mek
            }
        );

    } catch (error) {
        console.error('[VV ERROR]', error);

        return reply(
            '❌ *VV ERROR*\n\n' +
            `${error?.message || error}`
        );
    }
});
