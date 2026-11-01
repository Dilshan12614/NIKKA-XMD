const { cmd } = require('../command');

const API_KEY = process.env.SASA_API_KEY;
const API_URL = 'https://sasa-dev-api.xyz/api/fitgirl/search';

cmd({
    pattern: 'fitgirl',
    alias: ['fitgirlsearch', 'fgsearch'],
    desc: 'Search FitGirl games',
    category: 'search',
    filename: __filename
}, async (conn, mek, m, { q, reply }) => {
    try {
        const query = q?.trim();

        if (!query) {
            return reply(
                '╭─〔 *ғɪᴛɢɪʀʟ sᴇᴀʀᴄʜ* 〕\n' +
                '│\n' +
                '│ ❌ Game name එකක් දෙන්න.\n' +
                '│\n' +
                '│ උදා: .fitgirl GTA V\n' +
                '│ උදා: .fitgirl Resident Evil\n' +
                '╰──────────────\n\n' +
                '> ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ'
            );
        }

        if (!API_KEY) {
            return reply(
                '❌ SASA_API_KEY environment variable එක සකසා නැහැ.\n\n' +
                '> ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ'
            );
        }

        const url = new URL(API_URL);
        url.searchParams.set('apikey', API_KEY);
        url.searchParams.set('q', query);
        url.searchParams.set('page', '1');

        const response = await fetch(url.toString(), {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(30000)
        });

        if (!response.ok) {
            console.error('FitGirl API HTTP Error:', response.status);

            return reply(
                `❌ API Error: HTTP ${response.status}\n\n` +
                '> ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ'
            );
        }

        const data = await response.json();

        if (
            data.status === false ||
            data.success === false ||
            data.error
        ) {
            return reply(
                '❌ Search එක අසාර්ථකයි.\n' +
                `හේතුව: ${data.message || data.error || 'API error'}\n\n` +
                '> ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ'
            );
        }

        let results =
            data.results ??
            data.data?.results ??
            data.data?.games ??
            data.games ??
            data.data ??
            [];

        if (!Array.isArray(results)) {
            results =
                results && typeof results === 'object'
                    ? Object.values(results)
                    : [];
        }

        if (results.length === 0) {
            return reply(
                `╭─〔 *ғɪᴛɢɪʀʟ sᴇᴀʀᴄʜ* 〕\n` +
                `│ 🔎 Search: ${query}\n` +
                '│ ❌ Results හමු වුණේ නැහැ.\n' +
                '╰──────────────\n\n' +
                '> ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ'
            );
        }

        const list = results.slice(0, 10).map((game, index) => {
            if (typeof game === 'string') {
                return `${index + 1}. ${game}`;
            }

            const title =
                game.title ||
                game.name ||
                game.gameTitle ||
                'Unknown Game';

            const link =
                game.url ||
                game.link ||
                game.gameUrl ||
                '';

            const description =
                game.description ||
                game.size ||
                '';

            return [
                `╭─〔 *${index + 1}. ${title}* 〕`,
                description ? `│ 📝 ${description}` : null,
                link ? `│ 🔗 ${link}` : null,
                '╰──────────────'
            ].filter(Boolean).join('\n');
        }).join('\n\n');

        return reply(
            `╭━━〔 *ғɪᴛɢɪʀʟ sᴇᴀʀᴄʜ* 〕━━╮\n` +
            `┃ 🔎 Query: ${query}\n` +
            `┃ 📄 Page: 1\n` +
            `┃ 📌 Results: ${results.length}\n` +
            `╰━━━━━━━━━━━━━━━━╯\n\n` +
            `${list}\n\n` +
            '> ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ'
        );

    } catch (error) {
        console.error('FitGirl Search Error:', error);

        return reply(
            '❌ Search කිරීමේදී දෝෂයක් ඇති වුණා.\n' +
            'ටික වේලාවකින් නැවත උත්සාහ කරන්න.\n\n' +
            '> ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ'
        );
    }
});
