const { cmd } = require('../command');
const axios = require('axios');

const API_KEY = process.env.SASA_API_KEY;

cmd({
    pattern: 'cinesubz',
    alias: ['cinesearch', 'cs'],
    desc: 'Search movies using CineSubz API',
    category: 'search',
    react: '🎬',
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) {
            return reply(
                '🎬 *CINESUBZ MOVIE SEARCH*\n\n' +
                '📌 Usage: .cinesubz movie name\n' +
                '📌 Example: .cinesubz Avatar\n\n' +
                '> ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ'
            );
        }

        if (!API_KEY) {
            return reply('❌ SASA_API_KEY GitHub Secret එක set කරලා නැහැ.');
        }

        await reply('🔎 Searching CineSubz... Please wait.');

        const response = await axios.get(
            'https://sasa-dev-api.xyz/api/cinesubz/search',
            {
                params: {
                    apikey: API_KEY,
                    q: q.trim(),
                    page: 1
                },
                timeout: 30000
            }
        );

        const data = response.data;

        if (!data || data.status === false) {
            return reply('❌ Search results ලබාගන්න බැරි වුණා. API response එක පරීක්ෂා කරන්න.');
        }

        const results = data.results || data.data || data.movies || data.result;

        if (!results || (Array.isArray(results) && results.length === 0)) {
            return reply('😕 *No results found!*\n\nවෙනත් movie name එකක් උත්සාහ කරන්න.');
        }

        let text = '╭─〔 *🎬 CINESUBZ SEARCH* 〕\n';
        text += `│ 🔍 Query: ${q.trim()}\n`;
        text += '╰━━━━━━━━━━━━━━━━━━\n\n';

        if (Array.isArray(results)) {
            results.slice(0, 10).forEach((movie, index) => {
                if (typeof movie === 'string') {
                    text += `*${index + 1}.* ${movie}\n\n`;
                    return;
                }

                const title = movie.title || movie.name || movie.movieTitle || 'Unknown title';
                const year = movie.year || movie.releaseYear || '';
                const description = movie.description || movie.overview || '';
                const url = movie.url || movie.link || movie.pageUrl || '';

                text += `*${index + 1}. ${title}*${year ? ` (${year})` : ''}\n`;

                if (description) {
                    text += `📝 ${String(description).slice(0, 180)}\n`;
                }

                if (url && /^https?:\/\//i.test(url)) {
                    text += `🔗 ${url}\n`;
                }

                text += '\n';
            });
        } else if (typeof results === 'object') {
            text += JSON.stringify(results, null, 2).slice(0, 3000);
        } else {
            text += String(results);
        }

        text += '\n> ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ';

        return reply(text);

    } catch (error) {
        console.error('CineSubz Search Error:', error.response?.data || error.message);

        if (error.response?.status === 401 || error.response?.status === 403) {
            return reply('❌ API key එක invalid හෝ access denied. GitHub Secret එක පරීක්ෂා කරන්න.');
        }

        if (error.response?.status === 400) {
            return reply('❌ Search request එක වැරදියි. API එකට යවන parameters පරීක්ෂා කරන්න.');
        }

        return reply('❌ CineSubz search එක අසාර්ථකයි. API එක පසුව නැවත උත්සාහ කරන්න.');
    }
});
