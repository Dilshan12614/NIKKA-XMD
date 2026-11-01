const { cmd } = require('../command');

const SEARCH_API =
    'https://sasa-dev-api.xyz/api/cartoons-lk/search';

const DOWNLOAD_API =
    'https://sasa-dev-api.xyz/api/cartoons-lk/dl';

const MAX_VIDEO_SIZE = 64 * 1024 * 1024; // 64 MB

function getApiKey() {
    return process.env.SASA_API_KEY;
}

async function requestApi(url) {
    const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(60000)
    });

    const text = await response.text();

    if (!response.ok) {
        throw new Error(`API returned HTTP ${response.status}`);
    }

    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

function getTitle(item) {
    if (!item || typeof item !== 'object') return null;

    return item.title ||
        item.name ||
        item.animeName ||
        item.anime_name ||
        item.episodeTitle ||
        item.episode_title ||
        null;
}

function getPageUrl(item) {
    if (!item || typeof item !== 'object') return null;

    const keys = [
        'animeUrl',
        'anime_url',
        'pageUrl',
        'page_url',
        'url',
        'link',
        'href'
    ];

    for (const key of keys) {
        const value = item[key];

        if (typeof value === 'string' &&
            /^https?:\/\//i.test(value)) {
            return value;
        }
    }

    return null;
}

function collectResults(data, results = [], seen = new Set()) {
    if (!data || typeof data !== 'object') return results;

    if (Array.isArray(data)) {
        for (const item of data) {
            collectResults(item, results, seen);
        }

        return results;
    }

    const title = getTitle(data);
    const url = getPageUrl(data);

    if (title && url && !seen.has(url)) {
        seen.add(url);
        results.push({ title, url });
    }

    for (const value of Object.values(data)) {
        if (value && typeof value === 'object') {
            collectResults(value, results, seen);
        }
    }

    return results;
}

function findVideoUrl(data) {
    const preferredKeys = [
        'downloadUrl',
        'download_url',
        'directUrl',
        'direct_url',
        'videoUrl',
        'video_url',
        'streamUrl',
        'stream_url',
        'downloadLink',
        'download_link'
    ];

    if (!data || typeof data !== 'object') return null;

    for (const key of preferredKeys) {
        const value = data[key];

        if (typeof value === 'string' &&
            /^https?:\/\//i.test(value)) {
            return value;
        }
    }

    if (Array.isArray(data)) {
        for (const item of data) {
            const result = findVideoUrl(item);
            if (result) return result;
        }

        return null;
    }

    for (const value of Object.values(data)) {
        if (value && typeof value === 'object') {
            const result = findVideoUrl(value);
            if (result) return result;
        }
    }

    return null;
}

cmd({
    pattern: 'anime',
    alias: ['animsearch', 'cartoon'],
    desc: 'Search anime',
    category: 'download',
    react: '🔎',
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) {
            return reply(
                '╭━━〔 🎬 ɴɪᴋᴋᴀ x ᴍᴅ 〕━━╮\n' +
                '┃ Anime Search\n' +
                '╰━━━━━━━━━━━━━━━━╯\n\n' +
                'භාවිතය:\n' +
                '.anime Naruto\n\n' +
                '> ɴɪᴋᴋᴀ x ᴍᴅ 🚀'
            );
        }

        const apiKey = getApiKey();

        if (!apiKey) {
            return reply('❌ SASA_API_KEY secret එක සකසා නැහැ.');
        }

        await reply('🔎 Anime සොයමින් පවතී...');

        const params = new URLSearchParams({
            apikey: apiKey,
            q: q.trim()
        });

        const data = await requestApi(
            `${SEARCH_API}?${params.toString()}`
        );

        const results = collectResults(data).slice(0, 10);

        if (!results.length) {
            console.log(
                'NIKKA X MD: Search response received; no recognized results.'
            );

            return reply(
                '⚠️ Search results හඳුනාගන්න බැරි වුණා.\n' +
                'API එකේ response format එකට code එක ගැළපිය යුතුයි.'
            );
        }

        let message =
            '╭━━〔 🎬 ɴɪᴋᴋᴀ x ᴍᴅ 〕━━╮\n' +
            '┃ 🔎 ᴀɴɪᴍᴇ sᴇᴀʀᴄʜ\n' +
            '╰━━━━━━━━━━━━━━━━╯\n\n';

        results.forEach((item, index) => {
            message += `${index + 1}. *${item.title}*\n`;
            message += `${item.url}\n\n`;
        });

        message +=
            'Download කිරීමට:\n' +
            '.animedl Anime_URL | Episode_Number\n\n' +
            '> ɴɪᴋᴋᴀ x ᴍᴅ 🚀';

        return conn.sendMessage(
            from,
            { text: message },
            { quoted: mek }
        );

    } catch (error) {
        console.error('NIKKA X MD Anime Search:', error.message);

        return reply(
            '❌ Anime search එක අසාර්ථකයි.\n' +
            'API එක හෝ network connection එක පරීක්ෂා කරන්න.'
        );
    }
});

cmd({
    pattern: 'animedl',
    alias: ['anime-download', 'cartoondl'],
    desc: 'Download anime episode',
    category: 'download',
    react: '📥',
    filename: __filename
}, async (conn, mek, m, { from, q, reply, pushname }) => {
    try {
        if (!q || !q.includes('|')) {
            return reply(
                '╭━━〔 📥 ɴɪᴋᴋᴀ x ᴍᴅ 〕━━╮\n' +
                '┃ Anime Episode Downloader\n' +
                '╰━━━━━━━━━━━━━━━━╯\n\n' +
                'භාවිතය:\n' +
                '.animedl Anime_URL | 1'
            );
        }

        const apiKey = getApiKey();

        if (!apiKey) {
            return reply('❌ SASA_API_KEY secret එක සකසා නැහැ.');
        }

        const separator = q.lastIndexOf('|');
        const animeUrl = q.slice(0, separator).trim();
        const episode = q.slice(separator + 1).trim();

        if (!/^https?:\/\//i.test(animeUrl) || !episode) {
            return reply(
                '❌ නිවැරදි Anime URL එකක් සහ episode number එකක් දෙන්න.'
            );
        }

        await reply('⏳ Episode එක ලබාගනිමින් පවතී...');

        const params = new URLSearchParams({
            apikey: apiKey,
            url: animeUrl,
            ep: episode
        });

        const data = await requestApi(
            `${DOWNLOAD_API}?${params.toString()}`
        );

        const downloadUrl = findVideoUrl(data);

        if (!downloadUrl) {
            console.log(
                'NIKKA X MD: Download response did not contain a recognized direct video URL.'
            );

            return reply(
                '⚠️ API එකෙන් හඳුනාගත හැකි direct video URL එකක් ලැබුණේ නැහැ.\n' +
                'API response format එකට අනුව code එක වෙනස් කළ යුතුයි.'
            );
        }

        await reply('📥 වීඩියෝව ලබාගෙන පරීක්ෂා කරමින් පවතී...');

        const videoResponse = await fetch(downloadUrl, {
            signal: AbortSignal.timeout(120000)
        });

        if (!videoResponse.ok) {
            return reply(
                `❌ Video download අසාර්ථකයි. HTTP ${videoResponse.status}`
            );
        }

        const contentType =
            (videoResponse.headers.get('content-type') || '')
                .toLowerCase();

        const contentLength = Number(
            videoResponse.headers.get('content-length') || 0
        );

        if (
            contentLength > MAX_VIDEO_SIZE ||
            !(
                contentType.startsWith('video/') ||
                contentType === 'application/octet-stream'
            )
        ) {
            return reply(
                '⚠️ ලැබුණු URL එක direct video file එකක් නොවිය හැකියි, ' +
                'නැත්නම් වීඩියෝව 64 MB සීමාව ඉක්මවයි.'
            );
        }

        const arrayBuffer = await videoResponse.arrayBuffer();

        if (arrayBuffer.byteLength === 0) {
            return reply('❌ වීඩියෝ file එක හිස්.');
        }

        if (arrayBuffer.byteLength > MAX_VIDEO_SIZE) {
            return reply('⚠️ වීඩියෝව 64 MB සීමාව ඉක්මවනවා.');
        }

        const videoBuffer = Buffer.from(arrayBuffer);

        const mimeType = contentType.startsWith('video/')
            ? contentType.split(';')[0]
            : 'video/mp4';

        await conn.sendMessage(
            from,
            {
                video: videoBuffer,
                mimetype: mimeType,
                caption:
                    '╭━━〔 🎬 ɴɪᴋᴋᴀ x ᴍᴅ 〕━━╮\n' +
                    `┃ 👤 User: ${pushname || 'User'}\n` +
                    `┃ 📺 Episode: ${episode}\n` +
                    '┃ ✅ Video sent successfully\n' +
                    '╰━━━━━━━━━━━━━━━━╯\n\n' +
                    '> ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ 🚀'
            },
            { quoted: mek }
        );

    } catch (error) {
        console.error('NIKKA X MD Anime Download:', error.message);

        return reply(
            '❌ Anime episode එක download කර යැවීමට නොහැකි වුණා.\n' +
            'API response, direct video URL සහ network එක පරීක්ෂා කරන්න.'
        );
    }
});
