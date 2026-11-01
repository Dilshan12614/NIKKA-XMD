const { cmd } = require('../command');

const FOOTER =
    '> ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ';

cmd({
    pattern: 'calc',
    alias: ['calculate'],
    react: '🧮',
    desc: 'Perform mathematical calculations',
    category: 'tools',
    use: '.calc <expression>',
    filename: __filename
},
async (conn, mek, m, { from, reply, q }) => {
    try {
        const expression = String(q || '').trim();

        if (!expression) {
            return reply(
                '╭─〔 *ᴄᴀʟᴄᴜʟᴀᴛᴏʀ* 〕─╮\n' +
                '│\n' +
                '│ 🧮 ගණනය කිරීමට expression එක දෙන්න.\n' +
                '│\n' +
                '│ උදා: .calc 25 + 75\n' +
                '│ උදා: .calc 12 * 8\n' +
                '│ උදා: .calc sqrt(144)\n' +
                '│\n' +
                '╰──────────────╯\n\n' +
                `> ${FOOTER}`
            );
        }

        if (expression.length > 200) {
            return reply(
                '❌ Expression එක දිග වැඩියි. කෙටි expression එකක් ලබා දෙන්න.\n\n' +
                `> ${FOOTER}`
            );
        }

        const apiUrl =
            'https://apis.davidcyriltech.my.id/tools/calculate?expr=' +
            encodeURIComponent(expression);

        const response = await fetch(apiUrl, {
            headers: {
                Accept: 'application/json'
            },
            signal: AbortSignal.timeout(20000)
        });

        if (!response.ok) {
            throw new Error(`Calculator API HTTP ${response.status}`);
        }

        const data = await response.json();

        if (
            data?.success !== true ||
            data.result === null ||
            data.result === undefined
        ) {
            return reply(
                '❌ *Invalid Calculation*\n\n' +
                'Expression එක පරීක්ෂා කර නැවත උත්සාහ කරන්න.\n\n' +
                `> ${FOOTER}`
            );
        }

        const result = String(data.result);

        if (result.length > 500) {
            return reply(
                '❌ ප්‍රතිඵලය පෙන්වීමට දිග වැඩියි.\n\n' +
                `> ${FOOTER}`
            );
        }

        const resultMessage =
            '╭─〔 *ᴄᴀʟᴄ ʀᴇsᴜʟᴛ* 〕─╮\n' +
            `│ 📝 ${expression}\n` +
            '│\n' +
            `│ 🧮 ${result}\n` +
            '╰──────────────╯\n\n' +
            `> ${FOOTER}`;

        return await conn.sendMessage(
            from,
            { text: resultMessage },
            { quoted: mek }
        );

    } catch (error) {
        console.error('[NIKKA CALC ERROR]', error);

        return reply(
            '❌ Calculator එක ක්‍රියාත්මක කිරීමේදී දෝෂයක් ඇති වුණා.\n' +
            'ටික වේලාවකින් නැවත උත්සාහ කරන්න.\n\n' +
            `> ${FOOTER}`
        );
    }
});
