const { cmd } = require('../command');
const axios = require('axios');

const API_URL = 'https://sasa-dev-api.xyz/api/weather/air-quality';
const API_KEY = process.env.SASA_API_KEY;

cmd({
    pattern: 'airquality',
    alias: ['aqi', 'air'],
    desc: 'Check city air quality',
    category: 'search',
    react: '🌫️',
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        const city = q?.trim();

        if (!city) {
            return reply(
                '╭━━〔 🌫️ *ᴀɪʀ Qᴜᴀʟɪᴛʏ* 〕━━╮\n' +
                '┃\n' +
                '┃ 📍 Check city air quality\n' +
                '┃\n' +
                '┃ 📝 *Usage:*\n' +
                '┃ .airquality Colombo\n' +
                '┃ .aqi Jaffna\n' +
                '┃ .air Kandy\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━━━╯\n\n' +
                '> ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ'
            );
        }

        if (!API_KEY) {
            return reply(
                '❌ *API KEY MISSING*\n\n' +
                'Please configure SASA_API_KEY in GitHub Actions Secrets.\n\n' +
                '> ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ'
            );
        }

        await conn.sendMessage(from, {
            react: { text: '⏳', key: mek.key }
        });

        const response = await axios.get(API_URL, {
            params: {
                apikey: API_KEY,
                city: city
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
                '❌ *AIR QUALITY API ERROR*\n\n' +
                String(data.error || data.message || 'Request failed.') +
                '\n\n> ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ'
            );
        }

        const result = data?.data ?? data?.result ?? data;

        let output =
            '╭━━〔 🌫️ *ᴀɪʀ Qᴜᴀʟɪᴛʏ ʀᴇᴘᴏʀᴛ* 〕━━╮\n' +
            `┃ 📍 *City:* ${city}\n` +
            '╰━━━━━━━━━━━━━━━━━━━━╯\n\n';

        if (Array.isArray(result)) {
            output += result.length
                ? result.map((item, index) =>
                    `*📊 Result ${index + 1}*\n` +
                    JSON.stringify(item, null, 2)
                ).join('\n\n')
                : 'No air quality data available.';
        } else if (result && typeof result === 'object') {
            output += Object.entries(result)
                .map(([key, value]) => {
                    const label = key
                        .replace(/([A-Z])/g, ' $1')
                        .replace(/[_-]/g, ' ')
                        .replace(/^./, char => char.toUpperCase());

                    const formatted =
                        value && typeof value === 'object'
                            ? JSON.stringify(value, null, 2)
                            : String(value);

                    return `🌐 *${label}:* ${formatted}`;
                })
                .join('\n');
        } else {
            output += String(result);
        }

        output +=
            '\n\n> ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ';

        return reply(output);

    } catch (error) {
        console.error(
            '[NIKKA X MD AIR QUALITY]',
            error.response?.data || error.message
        );

        let message = '❌ Unable to retrieve air quality data. Please try again later.';

        if (error.response?.status === 401) {
            message = '❌ Invalid API key. Please check your SASA DEV API key.';
        } else if (error.response?.status === 429) {
            message = '⚠️ Too many requests. Please try again later.';
        } else if (error.response?.status === 400) {
            message = '❌ Invalid request. Please check the city name.';
        }

        return reply(
            '╭━━〔 ⚠️ *ᴀɪʀ Qᴜᴀʟɪᴛʏ ᴇʀʀᴏʀ* 〕━━╮\n\n' +
            message +
            '\n\n> ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ'
        );
    }
});
