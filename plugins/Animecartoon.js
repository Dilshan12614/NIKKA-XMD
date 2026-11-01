const { cmd } = require('../command');

const API_URL = 'https://sasa-dev-api.xyz/api/cartoons-lk/dl';

function findDownloadUrl(data) {
    if (typeof data === 'string') {
        return /^https?:\/\/\S+$/i.test(data) ? data : null;
    }

    if (!data || typeof data !== 'object') return null;

    const keys = [
        'downloadUrl',
        'download_url',
        'download',
        'videoUrl',
        'video_url',
        'url',
        'link',
        'result'
    ];

    for (const key of keys) {
        const value = data[key];

        if (typeof value === 'string' &&
            /^https?:\/\//i.test(value)) {
            return value;
        }
    }

    for (const value of Object.values(data)) {
        if (value && typeof value === 'object') {
            const found = findDownloadUrl(value);
            if (found) return found;
        }
    }

    return null;
}

cmd({
    pattern: 'anime',
    alias: ['cartoon', 'animedl'],
    desc: 'Anime episode downloader',
    category: 'download',
    react: '🎬',
    filename: __filename
}, async (conn, mek, m, {
    from,
    q,
    reply,
    pushname
}) => {
    try {
        if (!q) {
            return reply(
                '🎬 *NIKKA X MD ANIME DOWNLOADER*\n\n' +
                'භාවිතය:\n' +
                '.anime Anime_URL | Episode_Number\n\n' +
                'උදාහරණය:\n' +
                '.anime https://example.com/anime | 1'
            );
        }

        const parts = q.split('|').map(x => x.trim());
        const animeUrl = parts[0];
        const episode = parts[1];

        if (!animeUrl || !episode) {
            return reply(
                '❌ Anime URL එක සහ episode number එක දෙන්න.\n\n' +
                'උදා: .anime Anime_URL | 1'
            );
        }

        if (!/^https?:\/\//i.test(animeUrl)) {
            return reply('❌ නිවැරදි Anime URL එකක් ලබා දෙන්න.');
        }

        const apiKey = process.env.SASA_API_KEY;

        if (!apiKey) {
            return reply(
                '❌ SASA_API_KEY GitHub Secret එක සකසා නැහැ.'
            );
        }

        await reply('⏳ Anime episode එක ලබාගනිමින් පවතී...');

        const params = new URLSearchParams({
            apikey: apiKey,
            url: animeUrl,
            ep: episode
        });

        const response = await fetch(
            `${API_URL}?${params.toString()}`
        );

        const raw = await response.text();

        if (!response.ok) {
            console.error('Anime API HTTP error:', response.status);
            return reply(
                `❌ API එකෙන් error එකක් ලැබුණා. HTTP ${response.status}`
            );
        }

        let data;

        try {
            data = JSON.parse(raw);
        } catch {
            data = raw;
        }

        const downloadUrl = findDownloadUrl(data);

        if (!downloadUrl) {
            console.log('Anime API response:', raw.slice(0, 3000));
            return reply(
                '⚠️ API එකෙන් හඳුනාගත හැකි download link එකක් ලැබුණේ නැහැ.\n\n' +
                'API response format එකට අනුව code එක වෙනස් කළ යුතුයි.'
            );
        }

        await conn.sendMessage(from, {
            text:
                `╭━━〔 🎬 ɴɪᴋᴋᴀ x ᴍᴅ 〕━━╮\n` +
                `┃ 👤 User: ${pushname || 'User'}\n` +
                `┃ 📺 Episode: ${episode}\n` +
                `┃ ✅ Download link:\n` +
                `╰━━━━━━━━━━━━━━━━╯\n\n` +
                `${downloadUrl}\n\n` +
                `> ɴɪᴋᴋᴀ x ᴍᴅ 🚀`
        }, { quoted: mek });

    } catch (error) {
        console.error('NIKKA X MD Anime Error:', error);
        return reply(
            '❌ Anime download request එකේ දෝෂයක් ඇති වුණා.'
        );
    }
});
