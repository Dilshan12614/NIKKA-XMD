const { cmd } = require('../command');

const API_URL = 'https://sasa-dev-api.xyz/api/weather/current';
const API_KEY = process.env.SASA_DEV_API_KEY;

const BOT_NAME = 'ɴɪᴋᴋᴀ x ᴍᴅ';
const FOOTER = 'ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ';

cmd({
    pattern: 'weather',
    alias: ['climate', 'wether'],
    react: '🌦️',
    desc: 'Get current weather for a city',
    category: 'main',
    filename: __filename
},
async (conn, mek, m, { from, reply, q }) => {
    try {
        const city = (q || '').trim();

        if (!city) {
            return reply(
                '🌦️ *WEATHER PANEL*\n\n' +
                'කරුණාකර නගරයේ නම ලබා දෙන්න.\n\n' +
                '*උදාහරණ:*\n' +
                '`.weather Colombo`\n' +
                '`.weather Jaffna`\n' +
                '`.weather Kilinochchi`\n\n' +
                `> ${FOOTER}`
            );
        }

        if (!API_KEY) {
            return reply(
                '❌ SASA_DEV_API_KEY GitHub Secret එක සකසා නැහැ.'
            );
        }

        await conn.sendMessage(from, {
            text: `⏳ *${city}* සඳහා කාලගුණ තොරතුරු ලබාගනිමින්...`
        }, { quoted: mek });

        const url = new URL(API_URL);
        url.searchParams.set('apikey', API_KEY);
        url.searchParams.set('city', city);

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                Accept: 'application/json'
            },
            signal: AbortSignal.timeout(20000)
        });

        const raw = await response.text();

        let data;
        try {
            data = JSON.parse(raw);
        } catch {
            throw new Error('API එකෙන් නිවැරදි JSON response එකක් ලැබුණේ නැහැ.');
        }

        if (!response.ok || data.status === false || data.success === false) {
            console.error('[WEATHER API ERROR]', response.status, data);

            return reply(
                '❌ *WEATHER API ERROR*\n\n' +
                `${data.error || data.message || `HTTP ${response.status}`}\n\n` +
                'නගරයේ නම පරීක්ෂා කර නැවත උත්සාහ කරන්න.'
            );
        }

        // Support common response structures.
        const weather = data.data || data.result || data.weather || data;

        const pick = (...values) => {
            const value = values.find(
                item => item !== undefined && item !== null && item !== ''
            );
            return value === undefined ? 'N/A' : value;
        };

        const location = pick(
            weather.city,
            weather.location,
            weather.name,
            city
        );

        const temperature = pick(
            weather.temperature,
            weather.temp,
            weather.current?.temperature,
            weather.current?.temp,
            weather.main?.temp
        );

        const condition = pick(
            weather.description,
            weather.condition,
            weather.weather_description,
            typeof weather.weather === 'string' ? weather.weather : undefined,
            weather.current?.condition,
            weather.current?.weather,
            Array.isArray(weather.weather)
                ? weather.weather[0]?.description
                : undefined
        );

        const feelsLike = pick(
            weather.feels_like,
            weather.feelsLike,
            weather.feels_like_temperature,
            weather.main?.feels_like,
            weather.current?.feels_like
        );

        const humidity = pick(
            weather.humidity,
            weather.main?.humidity,
            weather.current?.humidity
        );

        const wind = pick(
            weather.wind_speed,
            weather.windSpeed,
            weather.wind?.speed,
            weather.current?.wind_speed
        );

        const caption =
            '╭━━〔 *ᴡᴇᴀᴛʜᴇʀ ᴘᴀɴᴇʟ* 〕━━╮\n' +
            '┃\n' +
            `┃ 📍 *Location:* ${location}\n` +
            `┃ 🌡️ *Temperature:* ${temperature}${typeof temperature === 'number' ? '°C' : ''}\n` +
            `┃ 🌤️ *Condition:* ${condition}\n` +
            `┃ 🥵 *Feels Like:* ${feelsLike}${typeof feelsLike === 'number' ? '°C' : ''}\n` +
            `┃ 💧 *Humidity:* ${humidity}${typeof humidity === 'number' ? '%' : ''}\n` +
            `┃ 🌬️ *Wind Speed:* ${wind}\n` +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━━━╯\n\n' +
            `> ${FOOTER}`;

        await conn.sendMessage(
            from,
            { text: caption },
            { quoted: mek }
        );

    } catch (error) {
        console.error('[WEATHER ERROR]', error);

        return reply(
            '❌ *WEATHER ERROR*\n\n' +
            `${error.name === 'TimeoutError'
                ? 'API එකෙන් පිළිතුරු ලැබීමට වැඩි කාලයක් ගත වුණා.'
                : error.message || 'කාලගුණ තොරතුරු ලබාගන්න බැරි වුණා.'}`
        );
    }
});
