const { cmd } = require('../command');

const API_KEY = process.env.SASA_API_KEY;
const API_URL = 'https://sasa-dev-api.xyz/api/yt/thumbnail-dl';

cmd({
    pattern: 'thumbnail',
    alias: ['ytthumb', 'thumb'],
    desc: 'Download YouTube thumbnail',
    category: 'download',
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        const input = q?.trim();

        if (!input) {
            return reply(
                '╭─〔 *ʏᴛ ᴛʜᴜᴍʙɴᴀɪʟ* 〕\n' +
                '│\n' +
                '│ ❌ YouTube URL එකක් ලබා දෙන්න.\n' +
                '│\n' +
                '│ උදා: .thumbnail https://youtu.be/VIDEO_ID\n' +
                '╰──────────────\n\n' +
                '> ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ'
            );
        }

        if (!API_KEY) {
            return reply('❌ SASA_API_KEY environment variable එක සකසා නැහැ.');
        }

        let videoUrl;

        try {
            videoUrl = new URL(input);

            const allowedHosts = [
                'youtube.com',
                'www.youtube.com',
                'm.youtube.com',
                'youtu.be',
                'www.youtu.be',
                'youtube-nocookie.com',
                'www.youtube-nocookie.com'
            ];

            if (
                !['https:', 'http:'].includes(videoUrl.protocol) ||
                !allowedHosts.includes(videoUrl.hostname)
            ) {
                return reply('❌ නිවැරදි YouTube URL එකක් ලබා දෙන්න.');
            }
        } catch {
            return reply('❌ YouTube URL එක නිවැරදි නැහැ.');
        }

        const apiUrl = new URL(API_URL);
        apiUrl.searchParams.set('apikey', API_KEY);
        apiUrl.searchParams.set('url', videoUrl.toString());
        apiUrl.searchParams.set('quality', 'maxresdefault');
        apiUrl.searchParams.set('raw', 'false');

        const response = await fetch(apiUrl.toString(), {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(30000)
        });

        if (!response.ok) {
            console.error('Thumbnail API HTTP Error:', response.status);
            return reply(`❌ Thumbnail API Error: HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.status !== true) {
            return reply(
                `❌ ${data.message || data.error || 'Thumbnail ලබාගන්න බැරි වුණා.'}`
            );
        }

        // Correct paths from the actual API response
        const result = data.result || {};

        const thumbnailUrl =
            result.best?.url ||
            result.variants?.find(v => v.variant === 'maxresdefault')?.url ||
            result.variants?.[0]?.url;

        if (!thumbnailUrl) {
            console.error('Thumbnail URL missing:', JSON.stringify(data));
            return reply('❌ API response එකේ thumbnail image URL එකක් නැහැ.');
        }

        // Download the image and send it directly to WhatsApp
        const imageResponse = await fetch(thumbnailUrl, {
            signal: AbortSignal.timeout(30000)
        });

        if (!imageResponse.ok) {
            return reply('❌ Thumbnail image එක download කරන්න බැරි වුණා.');
        }

        const contentType = imageResponse.headers.get('content-type') || '';

        if (!contentType.startsWith('image/')) {
            return reply('❌ API එකෙන් image file එකක් ලැබුණේ නැහැ.');
        }

        const imageBuffer = Buffer.from(
            await imageResponse.arrayBuffer()
        );

        const caption =
            '╭━━〔 *ʏᴛ ᴛʜᴜᴍʙɴᴀɪʟ* 〕━━╮\n' +
            '┃\n' +
            '┃ ✅ Thumbnail Downloaded!\n' +
            `┃ 🎬 Video ID: ${result.videoId || 'YouTube'}\n` +
            `┃ 🖼️ Quality: ${result.best?.variant || 'HD'}\n` +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━╯\n\n' +
            '> ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ';

        return await conn.sendMessage(
            from,
            {
                image: imageBuffer,
                caption
            },
            { quoted: mek }
        );

    } catch (error) {
        console.error('Thumbnail Plugin Error:', error);

        return reply(
            '❌ Thumbnail ලබාගැනීමේදී දෝෂයක් ඇති වුණා.\n' +
            'නැවත උත්සාහ කරන්න.\n\n' +
            '> ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ'
        );
    }
});
