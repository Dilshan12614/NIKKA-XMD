const { cmd } = require('../command');

const sleep = ms =>
    new Promise(resolve => setTimeout(resolve, ms));

const FOOTER =
    'ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ';

cmd({
    pattern: 'sendmsg',
    alias: ['privatemsg', 'pmnumber'],
    desc: 'Send a private message to selected numbers',
    category: 'owner',
    filename: __filename
}, async (conn, mek, m, {
    isOwner,
    body,
    reply
}) => {
    try {
        if (!isOwner) {
            return reply(
                '❌ මේ command එක භාවිතා කළ හැක්කේ owner ට පමණයි.\n\n' +
                `> ${FOOTER}`
            );
        }

        const input = String(body || '')
            .trim()
            .replace(/^\.?sendmsg(?:\s+|$)/i, '')
            .trim();

        const split = input.split('|');

        if (split.length < 2) {
            return reply(
                '╭─〔 *sᴇɴᴅ ᴍᴇssᴀɢᴇ* 〕─╮\n' +
                '│\n' +
                '│ 📌 භාවිතය:\n' +
                '│ .sendmsg 94771234567,94770000000 | Hello!\n' +
                '│\n' +
                '│ • Numbers comma (,) මඟින් වෙන් කරන්න.\n' +
                '│ • Numbers සහ message එක අතර | යොදන්න.\n' +
                '╰──────────────╯\n\n' +
                `> ${FOOTER}`
            );
        }

        const numberText = split.shift().trim();
        const message = split.join('|').trim();

        if (!message) {
            return reply(
                '❌ යවන්න message එකක් ඇතුළත් කරන්න.\n\n' +
                `> ${FOOTER}`
            );
        }

        const numbers = [...new Set(
            numberText
                .split(',')
                .map(number => number.trim().replace(/^\+/, ''))
        )];

        if (
            !numbers.length ||
            numbers.some(number => !/^\d{8,15}$/.test(number))
        ) {
            return reply(
                '❌ Number format එක වැරදියි.\n' +
                'රටේ code එක සමඟ නිවැරදි numbers ඇතුළත් කරන්න.\n\n' +
                `> ${FOOTER}`
            );
        }

        if (numbers.length > 20) {
            return reply(
                '❌ එක් command එකකට numbers 20ක් දක්වා පමණයි.\n\n' +
                `> ${FOOTER}`
            );
        }

        await reply(
            '╭─〔 *ᴍᴇssᴀɢᴇ sᴇɴᴅᴇʀ* 〕─╮\n' +
            `│ 👥 Recipients: ${numbers.length}\n` +
            '│ ⏳ Sending messages...\n' +
            '╰──────────────╯'
        );

        let sent = 0;
        let failed = 0;

        for (const number of numbers) {
            const jid = `${number}@s.whatsapp.net`;

            try {
                await conn.sendMessage(jid, {
                    text: message
                });

                sent++;
                console.log('[NIKKA SENDMSG SENT]', number);
            } catch (error) {
                failed++;
                console.error(
                    '[NIKKA SENDMSG ERROR]',
                    number,
                    error?.message || error
                );
            }

            await sleep(1500);
        }

        const resultText =
            '╭─〔 *sᴇɴᴅ ʀᴇsᴜʟᴛ* 〕─╮\n' +
            `│ 👥 Total: ${numbers.length}\n` +
            `│ ✅ Sent: ${sent}\n` +
            `│ ❌ Failed: ${failed}\n` +
            '╰──────────────╯\n\n' +
            `> ${FOOTER}`;

        return reply(resultText);

    } catch (error) {
        console.error('[NIKKA SENDMSG FATAL]', error);

        return reply(
            '❌ Message command එක ක්‍රියාත්මක කිරීමේදී දෝෂයක් ඇති වුණා.\n\n' +
            `> ${FOOTER}`
        );
    }
});
