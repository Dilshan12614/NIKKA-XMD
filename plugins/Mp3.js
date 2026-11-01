const { cmd } = require('../command');
const yts = require('yt-search');

const API_KEY = process.env.SASA_API_KEY;
const API_URL = 'https://sasa-dev-api.xyz/api/yt/mp3-dl';

const MAX_SIZE = 64 * 1024 * 1024;
const TIMEOUT = 300000;
const MAX_RETRIES = 3;

const FOOTER =
    '> ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ';

const activeDownloads = new Set();

function cleanName(value) {
    return String(value || 'NIKKA-X-MD')
        .replace(/[\\/:*?"<>|\x00-\x1F]/g, '')
        .trim()
        .slice(0, 100) || 'NIKKA-X-MD';
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getRetryDelay(response, attempt) {
    const retryAfter = response.headers.get('retry-after');

    if (retryAfter) {
        const seconds = Number(retryAfter);

        if (Number.isFinite(seconds) && seconds > 0) {
            return Math.min(seconds * 1000, 180000);
        }

        const date = Date.parse(retryAfter);

        if (Number.isFinite(date)) {
            return Math.min(
                Math.max(date - Date.now(), 1000),
                180000
            );
        }
    }

    return attempt * 60000;
}

async function searchSongs(query) {
    const result = await yts(query);
    const videos = result?.videos || [];

    const item = videos.find(video =>
        video?.videoId &&
        /^[\w-]{11}$/.test(video.videoId)
    );

    if (!item) return null;

    return {
        id: item.videoId,
        title: cleanName(item.title),
        url: `https://www.youtube.com/watch?v=${item.videoId}`,
        author: item.author?.name || 'YouTube',
        duration: item.timestamp || 'Unknown'
    };
}

async function requestSasaApi(videoUrl, quality) {
    if (!API_KEY) {
        throw new Error(
            'SASA_API_KEY GitHub Secret එක සකස් කර නැත.'
        );
    }

    const params = new URLSearchParams({
        apikey: API_KEY,
        url: videoUrl,
        quality,
        raw: 'false'
    });

    const endpoint = `${API_URL}?${params.toString()}`;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                Accept: 'application/json, audio/*, application/octet-stream, */*'
            },
            redirect: 'follow',
            signal: AbortSignal.timeout(TIMEOUT)
        });

        if (response.status === 429) {
            const delay = getRetryDelay(response, attempt);

            await response.text().catch(() => '');

            if (attempt === MAX_RETRIES) {
                throw new Error(
                    'Sasa Dev API එකේ conversion limit එක ඉක්මවා ඇත (HTTP 429). ටික වේලාවකින් නැවත උත්සාහ කරන්න.'
                );
            }

            console.log(
                `[SASA MP3] HTTP 429. Retry ${attempt + 1}/${MAX_RETRIES} after ${Math.ceil(delay / 1000)} seconds.`
            );

            await sleep(delay);
            continue;
        }

        if (response.status >= 500 && attempt < MAX_RETRIES) {
            await response.text().catch(() => '');
            await sleep(attempt * 5000);
            continue;
        }

        if (!response.ok) {
            const body = await response.text().catch(() => '');

            console.error('[SASA MP3 API ERROR]', {
                status: response.status,
                body: body.slice(0, 1000)
            });

            throw new Error(
                `Sasa API HTTP ${response.status}: ${body.slice(0, 200)}`
            );
        }

        return response;
    }

    throw new Error('Sasa API එකට සම්බන්ධ වීමට නොහැකි විය.');
}

async function downloadAudioDirectly(videoUrl, quality) {
    const response = await requestSasaApi(videoUrl, quality);

    const contentType = (
        response.headers.get('content-type') || ''
    ).toLowerCase();

    let result = {};
    let downloadUrl;

    if (
        contentType.includes('application/json') ||
        contentType.includes('text/json')
    ) {
        const data = await response.json();

        if (data?.status === false || data?.success === false) {
            throw new Error(
                data.message ||
                data.error ||
                'Sasa API request එක අසාර්ථකයි.'
            );
        }

        result = data?.result || data?.data || data;

        downloadUrl =
            result?.download ||
            result?.downloadUrl ||
            result?.url;

        if (!downloadUrl) {
            console.error(
                '[SASA MP3 RESPONSE]',
                JSON.stringify(data).slice(0, 1500)
            );

            throw new Error(
                data.message ||
                result?.message ||
                'API response එකේ download URL එකක් නැහැ.'
            );
        }
    } else {
        return await readAudioResponse(response);
    }

    let parsedUrl;

    try {
        parsedUrl = new URL(downloadUrl);
    } catch {
        throw new Error('API එකෙන් ලැබුණු download URL එක වැරදියි.');
    }

    if (parsedUrl.protocol !== 'https:') {
        throw new Error('Download URL එක HTTPS විය යුතුයි.');
    }

    const audioResponse = await fetch(parsedUrl.toString(), {
        method: 'GET',
        headers: {
            Accept: 'audio/mpeg, audio/*, application/octet-stream, */*'
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(TIMEOUT)
    });

    if (!audioResponse.ok) {
        const body = await audioResponse.text().catch(() => '');

        console.error('[SASA CDN ERROR]', {
            status: audioResponse.status,
            body: body.slice(0, 500)
        });

        throw new Error(`Audio CDN HTTP ${audioResponse.status}`);
    }

    if (
        Number(audioResponse.headers.get('content-length') || 0) > MAX_SIZE ||
        Number(result?.sizeBytes || 0) > MAX_SIZE
    ) {
        throw new Error('FILE_TOO_LARGE');
    }

    return await readAudioResponse(audioResponse);
}

async function readAudioResponse(response) {
    const contentType = (
        response.headers.get('content-type') || ''
    ).toLowerCase();

    if (
        contentType.includes('application/json') ||
        contentType.includes('text/html')
    ) {
        const body = await response.text().catch(() => '');

        console.error('[SASA INVALID AUDIO RESPONSE]', body.slice(0, 500));

        throw new Error(
            'Download server එකෙන් audio වෙනුවට error response එකක් ලැබුණා.'
        );
    }

    const declaredSize = Number(
        response.headers.get('content-length') || 0
    );

    if (declaredSize > MAX_SIZE) {
        throw new Error('FILE_TOO_LARGE');
    }

    if (!response.body) {
        throw new Error('Audio stream එකක් ලැබුණේ නැහැ.');
    }

    const chunks = [];
    let totalSize = 0;

    for await (const chunk of response.body) {
        const buffer = Buffer.from(chunk);
        totalSize += buffer.length;

        if (totalSize > MAX_SIZE) {
            try {
                await response.body.cancel();
            } catch {}

            throw new Error('FILE_TOO_LARGE');
        }

        chunks.push(buffer);
    }

    const audio = Buffer.concat(chunks);

    if (!audio.length) {
        throw new Error('Downloaded audio file එක හිස්.');
    }

    return audio;
}

cmd({
    pattern: 'mp3',
    alias: ['song', 'ytaudio', 'ytmp3'],
    react: '🎵',
    desc: 'Search and download YouTube MP3',
    category: 'download',
    filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
    const fullInput = (args || []).join(' ').trim();

    if (!fullInput) {
        return reply(
            '🎧 *YouTube MP3 Downloader*\n\n' +
            'ගීතයේ නම සමඟ quality එක ලබා දෙන්න.\n\n' +
            'Example: *.mp3 Shape of You*\n' +
            'Example: *.mp3 Shape of You | 128*\n' +
            'Example: *.mp3 Shape of You | 320*\n\n' +
            'Default quality: 128kbps\n\n' +
            FOOTER
        );
    }

    let query = fullInput;
    let quality = '128';

    if (fullInput.includes('|')) {
        const parts = fullInput.split('|');

        query = parts.slice(0, -1).join('|').trim();

        const requestedQuality = parts[parts.length - 1].trim();

        if (!['128', '320'].includes(requestedQuality)) {
            return reply(
                '❌ Quality එක 128 හෝ 320 ලෙස ලබා දෙන්න.\n' +
                'Example: *.mp3 Shape of You | 320*'
            );
        }

        quality = requestedQuality;
    }

    if (!query) {
        return reply('❌ ගීතයේ නම ලබා දෙන්න.');
    }

    if (activeDownloads.has(from)) {
        return reply(
            '⏳ මේ chat එකේ download එකක් දැනට ක්‍රියාත්මකයි. ටිකක් ඉන්න.'
        );
    }

    activeDownloads.add(from);

    try {
        const video = await searchSongs(query);

        if (!video) {
            return reply('❌ ඔබ සෙවූ ගීතය සොයාගත නොහැකි විය.');
        }

        const thumbnail = `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;

await conn.sendMessage(from, {
    image: { url: thumbnail },
    caption:
        '╭━━〔 *ᴍᴘ3 ᴅᴏᴡɴʟᴏᴀᴅ* 〕━━╮\n' +
        `┃ 🎵 *Title:* ${video.title}\n` +
        `┃ 👤 *Channel:* ${video.author}\n` +
        `┃ 🕒 *Duration:* ${video.duration}\n` +
        `┃ 🎧 *Quality:* ${quality}kbps\n` +
        '┃ ⏳ *Audio එක සකස් කරමින්...*\n' +
        '╰━━━━━━━━━━━━━━━━━━╯\n\n' +
        FOOTER
}, { quoted: mek });

        const audio = await downloadAudioDirectly(
            video.url,
            quality
        );

        await conn.sendMessage(from, {
            audio,
            mimetype: 'audio/mpeg',
            fileName: `${cleanName(video.title)}.mp3`,
            ptt: false
        }, { quoted: mek });

    } catch (error) {
        console.error('[MP3 DOWNLOAD ERROR]', error);

        let reason = String(
            error.message || 'Unknown error'
        ).slice(0, 350);

        if (error.message === 'FILE_TOO_LARGE') {
            reason = 'Audio file එක 64 MB සීමාව ඉක්මවයි.';
        } else if (
            error.name === 'TimeoutError' ||
            error.name === 'AbortError'
        ) {
            reason = 'Download එකට වැඩි වෙලාවක් ගියා. නැවත උත්සාහ කරන්න.';
        }

        await conn.sendMessage(from, {
            text:
                `❌ *MP3 Download Failed*\n\n` +
                `${reason}\n\n` +
                FOOTER
        }, { quoted: mek });

    } finally {
        activeDownloads.delete(from);
    }
});
