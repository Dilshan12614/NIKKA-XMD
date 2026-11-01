const { cmd } = require('../command');
const { sleep } = require('../lib/functions');

const BOT_NAME = 'ɴɪᴋᴋᴀ x ᴍᴅ';
const FOOTER = 'ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ';

cmd(
{
pattern: 'shutdown',
alias: ['stopbot'],
desc: 'Stop the bot',
category: 'owner',
filename: __filename
},


async (conn, mek, m, { isOwner, isMe, reply }) => {
    try {
        if (!isOwner && !isMe) {
            return await reply(
                '╭─〔 *ᴀᴄᴄᴇss ᴅᴇɴɪᴇᴅ* 〕─●●►\n' +
                '│\n' +
                '│ ➤ ᴏᴡɴᴇʀ ᴏɴʟʏ ᴄᴏᴍᴍᴀɴᴅ\n' +
                '│ ➤ ᴀᴄᴄᴇss ɴᴏᴛ ᴀʟʟᴏᴡᴇᴅ\n' +
                '│\n' +
                '╰────────────────●●►\n\n' +
                `> ${FOOTER}`
            );
        }

        await reply(
            '╭─〔 *sʜᴜᴛᴅᴏᴡɴ ᴘᴀɴᴇʟ* 〕─●●►\n' +
            '│\n' +
            `│ ➤ ${BOT_NAME}\n` +
            '│ ➤ ʙᴏᴛ sʜᴜᴛᴛɪɴɢ ᴅᴏᴡɴ...\n' +
            '│ ➤ ᴛʜᴇ ᴘʀᴏᴄᴇss ᴡɪʟʟ sᴛᴏᴘ\n' +
            '│\n' +
            '╰────────────────●●►\n\n' +
            `> ${FOOTER}`
        );

        await sleep(1500);

        console.log(`[${BOT_NAME}] Shutdown requested by owner.`);

        process.exit(0);

    } catch (error) {
        console.error('[SHUTDOWN ERROR]', error);

        try {
            await reply(
                '╭─〔 *sʜᴜᴛᴅᴏᴡɴ ᴇʀʀᴏʀ* 〕─●●►\n' +
                '│\n' +
                `│ ➤ ${error.message}\n` +
                '│\n' +
                '╰────────────────●●►\n\n' +
                `> ${FOOTER}`
            );
        } catch (_) {}
    }
}

);
