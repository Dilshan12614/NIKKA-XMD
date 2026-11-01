const { cmd } = require('../command');
const axios = require('axios');

const API_URL = 'https://sasa-dev-api.xyz/api/weather/coords';
const API_KEY = process.env.SASA_API_KEY;

cmd({
    pattern: 'weathercoords',
    alias: ['coords', 'weatherloc'],
    desc: 'Get weather using coordinates',
    category: 'search',
    react: '🌍',
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q || !q.trim()) {
            return reply(
                '╭━━〔 🌍 *ᴡᴇᴀᴛʜᴇʀ ᴄᴏᴏʀᴅɪɴᴀᴛᴇs* 〕━━╮\n' +
                '┃\n' +
                '┃ 📍 Get weather by coordinates\n' +
                '┃\n' +
                '┃ *Usage:*\n' +
                '┃ .weathercoords 9.6615 80.0255\n' +
                '┃ .coords 6.9271 79.8612\n' +
                '┃\n' +
                '┃ First: Latitude\n' +
                '┃ Second: Longitude\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━━━━━╯\n\n' +
                '> ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ'
            );
        }

        if (!API_KEY) {
            return reply(
                '❌ SASA_API_KEY is missing.\n' +
                'Add it to GitHub Actions Secrets.'
            );
        }

        const parts = q.trim().split(/[\s,]+/);

        if (parts.length !== 2) {
            return reply(
                '❌ Invalid coordinates!\n\n' +
                'Example: .weathercoords 9.6615 80.0255'
            );
        }

        const lat = Number(parts[0]);
        const lon = Number(parts[1]);

        if (
            !Number.isFinite(lat) ||
            !Number.isFinite(lon) ||
            lat < -90 || lat > 90 ||
            lon < -180 || lon > 180
        ) {
            return reply(
                '❌ Invalid latitude or longitude.\n' +
                'Latitude: -90 to 90\n' +
                'Longitude: -180 to 180'
            );
        }

        await conn.sendMessage(from, {
            react: { text: '⏳', key: mek.key }
        });

        // Matches the supplied API parameters: lat and lon.
        const response = await axios.get(API_URL, {
            params: {
                apikey: API_KEY,
                lat: lat,
                lon: lon
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
                '❌ *WEATHER API ERROR*\n\n' +
                String(data.error || data.message || 'Request failed.')
            );
        }

        const result = data?.data ?? data?.result ?? data;

        let output =
            '╭━━〔 🌍 *ᴡᴇᴀᴛʜᴇʀ ʀᴇᴘᴏʀᴛ* 〕━━╮\n' +
            `┃ 📍 *Latitude:* ${lat}\n` +
            `┃ 📍 *Longitude:* ${lon}\n` +
            '╰━━━━━━━━━━━━━━━━━━━━╯\n\n';

        if (Array.isArray(result)) {
            output += result.length
                ? result.map(item =>
                    typeof item === 'object' && item !== null
                        ? JSON.stringify(item, null, 2)
                        : String(item)
                ).join('\n\n')
                : 'No weather data available.';
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

                return `🌤️ *${label}:* ${formatted}`;
            }).join('\n');
        } else {
            output += String(result);
        }

        output +=
            '\n\n> ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ';

        return reply(output);

    } catch (error) {
        console.error(
            '[NIKKA X MD WEATHER COORDS]',
            error.response?.data || error.message
        );

        let message =
            'Unable to retrieve weather data. Please try again later.';

        if (error.response?.status === 401) {
            message = 'Invalid API key. Please check SASA DEV API credentials.';
        } else if (error.response?.status === 429) {
            message = 'Too many requests. Please try again later.';
        } else if (error.response?.status === 400) {
            message = 'Invalid coordinates or API parameters.';
        }

        return reply(
            '╭━━〔 ⚠️ *ᴡᴇᴀᴛʜᴇʀ ᴇʀʀᴏʀ* 〕━━╮\n\n' +
            `❌ ${message}\n\n` +
            '╰━━━━━━━━━━━━━━━━━━╯\n\n' +
            '> ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ'
        );
    }
});
