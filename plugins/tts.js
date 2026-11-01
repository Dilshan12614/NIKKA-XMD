const { cmd } = require('../command');

const API_BASE = 'https://sasa-dev-api.xyz/api/tools/tts';
const API_KEY = process.env.SASA_TTS_API_KEY;

const BOT_NAME = 'ɴɪᴋᴋᴀ x ᴍᴅ';
const FOOTER = 'ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ';

cmd({
pattern: 'tts',
alias: ['say', 'speak'],
react: '🗣️',
desc: 'Convert text to speech',
category: 'tools',
use: '.tts <text>',
filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
try {
const text = String(q || '').trim();


    if (!text) {
        return await reply(
            `🗣️ *${BOT_NAME.toUpperCase()} TEXT TO SPEECH*\n\n` +
            '╭─〔 ᴜsᴀɢᴇ 〕─●●►\n' +
            '│\n' +
            '│ ➤ .tts Hello everyone\n' +
            '│ ➤ .say How are you?\n' +
            '│ ➤ .speak ආයුබෝවන්\n' +
            '│\n' +
            '╰────────────────●●►\n\n' +
            `> ${FOOTER}`
        );
    }

    if (!API_KEY) {
        return await reply(
            '❌ *API KEY MISSING*\n\n' +
            'SASA_TTS_API_KEY environment variable එක සකස් කර නැහැ.\n\n' +
            `> ${FOOTER}`
        );
    }

    if (text.length > 500) {
        return await reply(
            '⚠️ Text එක අකුරු 500කට සීමා කරන්න.\n\n' +
            `> ${FOOTER}`
        );
    }

    await reply(
        '╭─〔 *ᴛᴇxᴛ ᴛᴏ sᴘᴇᴇᴄʜ* 〕─●●►\n' +
        '│\n' +
        '│ 🗣️ ᴠᴏɪᴄᴇ ɢᴇɴᴇʀᴀᴛɪɴɢ...\n' +
        '│ ⏳ ᴘʟᴇᴀsᴇ ᴡᴀɪᴛ\n' +
        '│\n' +
        '╰────────────────●●►\n\n' +
        `> ${FOOTER}`
    );

    const lang = /[\u0D80-\u0DFF]/.test(text)
        ? 'si'
        : 'en';

    const apiUrl = new URL(API_BASE);
    apiUrl.searchParams.set('apikey', API_KEY);
    apiUrl.searchParams.set('text', text);
    apiUrl.searchParams.set('lang', lang);

    const response = await fetch(apiUrl.toString(), {
        method: 'GET',
        headers: {
            Accept: 'application/json, audio/mpeg, audio/*'
        },
        signal: AbortSignal.timeout(60000)
    });

    if (!response.ok) {
        const errorText = await response.text();

        console.error(
            '[TTS API ERROR]',
            response.status,
            errorText.slice(0, 500)
        );

        return await reply(
            `❌ TTS API error: HTTP ${response.status}\n\n` +
            `> ${FOOTER}`
        );
    }

    const contentType =
        response.headers.get('content-type') || '';

    // Direct audio response
    if (contentType.startsWith('audio/')) {
        const audioBuffer = Buffer.from(
            await response.arrayBuffer()
        );

        if (!audioBuffer.length) {
            throw new Error('Empty audio response');
        }

        await conn.sendMessage(from, {
            audio: audioBuffer,
            mimetype: contentType.includes('mpeg')
                ? 'audio/mpeg'
                : contentType,
            fileName: 'NIKKA-X-MD-TTS.mp3',
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true
            }
        }, { quoted: mek });

        return;
    }

    // JSON response containing an audio URL
    if (contentType.includes('application/json')) {
        const data = await response.json();

        console.log(
            '[TTS API RESPONSE]',
            JSON.stringify(data).slice(0, 1500)
        );

        const audioUrl =
            data?.result?.url ||
            data?.result?.audio ||
            data?.result?.audioUrl ||
            data?.result?.download_url ||
            data?.url ||
            data?.audioUrl ||
            data?.audio_url ||
            data?.download_url;

        if (
            typeof audioUrl === 'string' &&
            /^https?:\/\//i.test(audioUrl)
        ) {
            await conn.sendMessage(from, {
                audio: { url: audioUrl },
                mimetype: 'audio/mpeg',
                fileName: 'NIKKA-X-MD-TTS.mp3',
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true
                }
            }, { quoted: mek });

            return;
        }

        throw new Error(
            data?.message ||
            data?.error ||
            'API response contains no recognised audio URL.'
        );
    }

    const body = await response.text();

    console.error(
        '[TTS UNKNOWN RESPONSE]',
        contentType,
        body.slice(0, 500)
    );

    throw new Error(
        `Unsupported API response: ${contentType || 'unknown content type'}`
    );

} catch (error) {
    console.error('[TTS ERROR]', error);

    await reply(
        '╭─〔 *ᴠᴏɪᴄᴇ ᴇʀʀᴏʀ* 〕─●●►\n' +
        '│\n' +
        '│ ➤ Voice එක සකස් කරන්න බැරි වුණා.\n' +
        '│ ➤ API key සහ API response පරීක්ෂා කරන්න.\n' +
        '│\n' +
        '╰────────────────●●►\n\n' +
        `> ${FOOTER}`
    );
}


});
