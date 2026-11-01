const { cmd } = require('../command');

const API_BASE = 'https://sasa-dev-api.xyz';
const APTOIDE_META = 'https://ws2.aptoide.com/api/7/app/getMeta';

const FOOTER =
    'ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ';

const MAX_FILE_SIZE = 200 * 1024 * 1024;
const API_TIMEOUT = 30000;
const DOWNLOAD_TIMEOUT = 120000;

function safeName(name = 'app') {
    return String(name)
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
        .replace(/\s+/g, '_')
        .slice(0, 90) || 'app';
}

function formatSize(bytes) {
    if (!Number.isFinite(Number(bytes)) || Number(bytes) <= 0) {
        return 'Unknown';
    }

    return `${(Number(bytes) / (1024 * 1024)).toFixed(2)} MB`;
}

async function getJson(url) {
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'NIKKA-X-MD/2.0',
            Accept: 'application/json'
        },
        signal: AbortSignal.timeout(API_TIMEOUT)
    });

    if (!response.ok) {
        throw new Error(`API HTTP ${response.status}`);
    }

    return response.json();
}

function getResults(data) {
    if (Array.isArray(data?.result)) return data.result;

    if (data?.result && typeof data.result === 'object') {
        return [data.result];
    }

    return [];
}

function getStoreLink(app) {
    for (const value of [app?.link, app?.page, app?.web_url]) {
        try {
            const url = new URL(value);

            if (url.protocol === 'https:' || url.protocol === 'http:') {
                return url.href;
            }
        } catch {}
    }

    return null;
}

function isHttpUrl(value) {
    try {
        const url = new URL(value);

        return (
            (url.protocol === 'https:' || url.protocol === 'http:') &&
            Boolean(url.hostname)
        );
    } catch {
        return false;
    }
}

function isDirectDownload(value) {
    if (!isHttpUrl(value)) return false;

    try {
        const url = new URL(value);

        return /\.(apk|xapk)$/i.test(url.pathname);
    } catch {
        return false;
    }
}

function guessPackageFromLink(link) {
    try {
        const host = new URL(link).hostname.toLowerCase();

        if (!host.endsWith('.aptoide.com')) return null;

        let name = host.slice(0, -'.aptoide.com'.length);

        if (name.endsWith('.en')) {
            name = name.slice(0, -3);
        }

        if (/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z0-9_]+)+$/.test(name)) {
            return name;
        }
    } catch {}

    return null;
}

async function resolveAptoideDownload(link) {
    const packageName = guessPackageFromLink(link);

    if (!packageName) return null;

    const endpoint = new URL(APTOIDE_META);
    endpoint.searchParams.set('package_name', packageName);

    const data = await getJson(endpoint.href);

    const file =
        data?.data?.file ||
        data?.apk ||
        data?.data?.apk ||
        null;

    const url = file?.path || file?.path_alt;

    if (!isHttpUrl(url)) return null;

    return {
        url,
        size: Number(file?.size) || 0
    };
}

async function downloadApk(url, expectedSize = 0) {
    if (!isHttpUrl(url)) {
        throw new Error('Invalid download URL.');
    }

    if (expectedSize > MAX_FILE_SIZE) {
        throw new Error('APK file එක 200 MB සීමාව ඉක්මවයි.');
    }

    const response = await fetch(url, {
        headers: {
            'User-Agent': 'NIKKA-X-MD/2.0',
            Accept: 'application/vnd.android.package-archive, application/octet-stream, */*'
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT)
    });

    if (!response.ok) {
        throw new Error(`Download HTTP ${response.status}`);
    }

    const contentType = (
        response.headers.get('content-type') || ''
    ).toLowerCase();

    const contentLength = Number(
        response.headers.get('content-length') || 0
    );

    if (contentLength > MAX_FILE_SIZE) {
        throw new Error('Downloaded file එක 200 MB සීමාව ඉක්මවයි.');
    }

    if (
        contentType.includes('text/html') ||
        contentType.includes('application/json')
    ) {
        throw new Error('Download server එකෙන් APK file එකක් ලැබුණේ නැහැ.');
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    if (!buffer.length || buffer.length > MAX_FILE_SIZE) {
        throw new Error('Invalid file size.');
    }

    // APK/XAPK files use ZIP container signatures.
    if (
        buffer.length < 4 ||
        buffer[0] !== 0x50 ||
        buffer[1] !== 0x4b
    ) {
        throw new Error('ලැබුණු file එක APK/ZIP file එකක් නොවේ.');
    }

    return buffer;
}

cmd(
    {
        pattern: 'apk',
        alias: ['downloadapk', 'playstore', 'app'],
        react: '📦',
        desc: 'Search and directly send an APK file',
        category: 'download',
        filename: __filename
    },

    async (conn, mek, m, { from, q, reply }) => {
        try {
            const query = String(q || '').trim();

            if (!query) {
                return reply(
                    '╭━━〔 *ᴀᴘᴋ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ* 〕━━╮\n' +
                    '┃\n' +
                    '┃ 📱 App එකේ නම ලබා දෙන්න.\n' +
                    '┃\n' +
                    '┃ උදා: `.apk whatsapp`\n' +
                    '┃ උදා: `.apk capcut`\n' +
                    '┃ උදා: `.apk telegram`\n' +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━━━╯\n\n' +
                    FOOTER
                );
            }

            const apiKey = process.env.SASA_DEV_API_KEY;

            if (!apiKey) {
                return reply(
                    '❌ SASA_DEV_API_KEY environment variable එක සකස් කර නැහැ.'
                );
            }

            const endpoint = new URL('/api/search/apk', API_BASE);

            endpoint.searchParams.set('mode', 'search_dl');
            endpoint.searchParams.set('apikey', apiKey);
            endpoint.searchParams.set('q', query);

            await reply(
                '╭━━〔 *ᴀᴘᴋ sᴇᴀʀᴄʜ* 〕━━╮\n' +
                `┃ 📱 App: ${query}\n` +
                '┃ 🔎 Search කරනවා...\n' +
                '┃ ⏳ කරුණාකර රැඳී සිටින්න.\n' +
                '╰━━━━━━━━━━━━━━━━━━╯\n\n' +
                FOOTER
            );

            const data = await getJson(endpoint.href);
            const apps = getResults(data);

            if (data?.status !== true || apps.length === 0) {
                return reply(
                    '❌ App එක හමු වුණේ නැහැ.\n\n' +
                    'වෙනත් නමක් භාවිත කර නැවත උත්සාහ කරන්න.\n\n' +
                    FOOTER
                );
            }

            // Automatically use the first search result.
            // No number selection and no interactive buttons.
            const app = apps[0];
            const title = String(app.title || query);
            let downloadUrl = null;
            let expectedSize = Number(app.size_bytes) || 0;

            const possibleUrls = [
                app.download_url,
                app.apk_url,
                app.file_url,
                app.download
            ];

            for (const url of possibleUrls) {
                if (isDirectDownload(url)) {
                    downloadUrl = url;
                    break;
                }
            }

            // If the API didn't provide a direct APK URL,
            // try resolving the Aptoide store page.
            const storeLink = getStoreLink(app);

            if (!downloadUrl && storeLink) {
                try {
                    const resolved = await resolveAptoideDownload(storeLink);

                    if (resolved) {
                        downloadUrl = resolved.url;
                        expectedSize = resolved.size || expectedSize;
                    }
                } catch (error) {
                    console.error(
                        '[NIKKA APK] Aptoide lookup:',
                        error.message
                    );
                }
            }

            if (!downloadUrl) {
                return reply(
                    '❌ *Direct APK link එකක් ලැබුණේ නැහැ.*\n\n' +
                    `📱 App: ${title}\n` +
                    (storeLink ? `🌐 Store: ${storeLink}\n\n` : '\n') +
                    'API එකෙන් සෘජු download URL එකක් ලබාදිය යුතුයි.\n\n' +
                    FOOTER
                );
            }

            await reply(
                '╭━━〔 *ᴅᴏᴡɴʟᴏᴀᴅɪɴɢ ᴀᴘᴋ* 〕━━╮\n' +
                `┃ 📱 ${title}\n` +
                '┃ ⬇️ File එක ලබාගන්නවා...\n' +
                '┃ ⏳ කරුණාකර රැඳී සිටින්න.\n' +
                '╰━━━━━━━━━━━━━━━━━━━━╯\n\n' +
                FOOTER
            );

            const buffer = await downloadApk(
                downloadUrl,
                expectedSize
            );

            const fileName = `${safeName(title)}.apk`;

            await conn.sendMessage(
                from,
                {
                    document: buffer,
                    mimetype: 'application/vnd.android.package-archive',
                    fileName,
                    caption:
                        
'╭─〔 *ᴀᴘᴋ ᴄᴏᴍᴘʟᴇᴛᴇ* 〕─╮\n' +
`│ 📱 ${title}\n` +
`│ 💾 ${formatSize(buffer.length)}\n` +
'╰────────────╯\n\n' +
FOOTER
                },
                { quoted: mek }
            );

        } catch (error) {
            console.error('[NIKKA APK ERROR]', error);

            return reply(
                '❌ *APK Downloader Error*\n\n' +
                `${String(error.message || 'Unknown error').slice(0, 500)}\n\n` +
                'නැවත උත්සාහ කරන්න.\n\n' +
                FOOTER
            );
        }
    }
);
