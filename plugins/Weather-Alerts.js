const { cmd } = require('../command');
const axios = require('axios');

const API_URL = 'https://sasa-dev-api.xyz/api/weather/alerts';
const API_KEY = process.env.SASA_API_KEY;

cmd({
    pattern: 'weatheralerts',
    alias: ['alerts', 'weatheralert'],
    desc: 'Get weather alerts',
    category: 'search',
    react: '🌩️',
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    try {
        if (!API_KEY) {
            return reply(
                '❌ *API KEY MISSING*\n\n' +
                'Please configure SASA_API_KEY in GitHub Actions Secrets.'
            );
        }

        await conn.sendMessage(from, {
            react: { text: '⏳', key: mek.key }
        });

        const response = await axios.get(API_URL, {
            params: {
                apikey: API_KEY
            },
            timeout: 20000
        });

        const data = response.data;

        if (
            data?.status === false ||
            data?.success === false ||
            data?.error
        ) {
            return reply(
                '❌ *WEATHER ALERT API ERROR*\n\n' +
                String(data.error || data.message || 'Request failed.')
            );
        }

        const result = data?.data ?? data?.alerts ?? data?.result ?? data;

        let output =
            '╭━━〔 🌩️ *ᴡᴇᴀᴛʜᴇʀ ᴀʟᴇʀᴛs* 〕━━╮\n' +
            '╰━━━━━━━━━━━━━━━━━━╯\n\n';

        if (Array.isArray(result)) {
            if (result.length === 0) {
                output += '✅ No weather alerts were returned by the API.';
            } else {
                output += result.map((item, index) => {
                    if (item && typeof item === 'object') {
                        return (
                            `⚠️ *ALERT ${index + 1}*\n` +
                            Object.entries(item).map(([key, value]) => {
                                const label = key
                                    .replace(/([A-Z])/g, ' $1')
                                    .replace(/[_-]/g, ' ')
                                    .replace(/^./, c => c.toUpperCase());

                                const formatted =
                                    value && typeof value === 'object'
                                        ? JSON.stringify(value, null, 2)
                                        : String(value);

                                return `• *${label}:* ${formatted}`;
                            }).join('\n')
                        );
                    }

                    return `⚠️ ${String(item)}`;
                }).join('\n\n');
            }
        } else if (result && typeof result === 'object') {
            output += Object.entries(result).map(([key, value]) => {
                const label = key
                    .replace(/([A-Z])/g, ' $1')
                    .replace(/[_-]/g, ' ')
                    .replace(/^./, c => c.toUpperCase());

                const formatted =
                    value && typeof value === 'object'
                        ? JSON.stringify(value, null, 2)
                        : String(value);

                return `📌 *${label}:* ${formatted}`;
            }).join('\n');
        } else {
            output += String(result);
        }

        output +=
            '\n\n> ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ';

        return reply(output);

    } catch (error) {
        console.error(
            '[NIKKA X MD WEATHER ALERTS]',
            error.response?.data || error.message
        );

        let message =
            'Unable to retrieve weather alerts. Please try again later.';

        if (error.response?.status === 401) {
            message = 'Invalid API key. Check your SASA DEV API key.';
        } else if (error.response?.status === 429) {
            message = 'Too many requests. Please try again later.';
        } else if (error.response?.status === 400) {
            message = 'Invalid API request. Please check the endpoint parameters.';
        }

        return reply(
            '╭━━〔 ⚠️ *ᴀʟᴇʀᴛ ᴇʀʀᴏʀ* 〕━━╮\n\n' +
            `❌ ${message}\n\n` +
            '╰━━━━━━━━━━━━━━━━━━╯\n\n' +
            '> ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ'
        );
    }
});
