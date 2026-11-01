// ╭──────────────────────────────╮
// │       DARK-DILA MD            │
// │      CURRENCY CONVERTER       │
// │       SASA DEV API            │
// ╰──────────────────────────────╯

const axios = require('axios');
const { cmd } = require('../command');

const API_URL = 'https://sasa-dev-api.xyz/api/currency';

const API_KEY = process.env.SASA_API_KEY ||
    'Sasa_Dev_Api_79346efacb553ec6ee94f2f6453dec8658ec5e7b';

const FOOTER =
    'ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ';

cmd({
    pattern: 'currency',
    alias: ['convert', 'exchange', 'rate'],
    react: '💱',
    desc: 'Convert currencies',
    category: 'tools',
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) {
            return reply(
                '╭━━〔 *ᴄᴜʀʀᴇɴᴄʏ ᴄᴏɴᴠᴇʀᴛᴇʀ* 〕━━╮\n' +
                '┃\n' +
                '┃ 💱 *Currency Converter*\n' +
                '┃\n' +
                '┃ 📌 *Usage:*\n' +
                '┃ .currency 100 USD LKR\n' +
                '┃ .currency 50 EUR USD\n' +
                '┃ .currency 1000 LKR INR\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━━━━━╯\n\n' +
                `> ${FOOTER}`
            );
        }

        const args = q.trim().split(/\s+/);

        if (
            args.length !== 3 ||
            !Number.isFinite(Number(args[0])) ||
            Number(args[0]) <= 0
        ) {
            return reply(
                '❌ *Invalid Format!*\n\n' +
                'Example: .currency 100 USD LKR\n\n' +
                `> ${FOOTER}`
            );
        }

        const amount = Number(args[0]);
        const fromCurrency = args[1].toUpperCase();
        const toCurrency = args[2].toUpperCase();

        if (
            !/^[A-Z]{3}$/.test(fromCurrency) ||
            !/^[A-Z]{3}$/.test(toCurrency)
        ) {
            return reply(
                '❌ Please use 3-letter currency codes.\n\n' +
                'Example: .currency 100 USD LKR\n\n' +
                `> ${FOOTER}`
            );
        }

        await reply('⏳ *Fetching exchange rates...*');

        const response = await axios.get(API_URL, {
            params: {
                apikey: API_KEY,
                from: fromCurrency,
                to: toCurrency,
                amount: amount
            },
            timeout: 30000
        });

        const data = response.data;

        if (
            !data ||
            data.status !== true ||
            !data.result ||
            !data.result.rates
        ) {
            console.log(
                '[Currency API Error]',
                JSON.stringify(data)
            );

            return reply(
                '❌ *Currency conversion failed!*\n\n' +
                `${data?.error || 'Invalid API response.'}\n\n` +
                `> ${FOOTER}`
            );
        }

        const result = data.result;

        // API response: result.rates.LKR
        const targetCurrencies = Array.isArray(result.to)
            ? result.to
            : [result.to];

        const lines = targetCurrencies.map(currency => {
            const rateData = result.rates[currency];

            if (!rateData) {
                return `┃ ⚠️ ${currency}: Rate unavailable`;
            }

            const convertedAmount = Number(rateData.amount);
            const exchangeRate = Number(rateData.rate);

            if (
                !Number.isFinite(convertedAmount) ||
                !Number.isFinite(exchangeRate)
            ) {
                return `┃ ⚠️ ${currency}: Invalid rate data`;
            }

            return [
                `┃ 💱 *Result:* ${convertedAmount.toLocaleString(
                    'en-US',
                    { maximumFractionDigits: 4 }
                )} ${currency}`,
                `┃ 📊 *Rate:* 1 ${fromCurrency} = ${exchangeRate.toLocaleString(
                    'en-US',
                    { maximumFractionDigits: 6 }
                )} ${currency}`
            ].join('\n');
        });

        const lastUpdate = result.lastUpdate
            ? new Date(result.lastUpdate).toISOString()
                .replace('T', ' ')
                .replace('.000Z', ' UTC')
            : 'Unavailable';

        const message =
            '╭━━〔 *ᴄᴜʀʀᴇɴᴄʏ ʀᴇsᴜʟᴛ* 〕━━╮\n' +
            '┃\n' +
            `┃ 💰 *Amount:* ${Number(result.amount).toLocaleString(
                'en-US'
            )} ${result.from || fromCurrency}\n` +
            '┃\n' +
            lines.join('\n┃\n') +
            '\n┃\n' +
            `┃ 🕒 *Last Update:* ${lastUpdate}\n` +
            '┃ 🌐 *Provider:* SASA DEV API\n' +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━━━━━╯\n\n' +
            `> ${FOOTER}`;

        return reply(message);

    } catch (error) {
        console.error(
            '[DARK-DILA MD Currency Error]',
            error.response?.data || error.message
        );

        let errorMessage =
            'Could not connect to the currency API.';

        if (error.response?.status === 401) {
            errorMessage = 'Invalid API key.';
        } else if (error.response?.status === 429) {
            errorMessage = 'API limit reached. Try again later.';
        } else if (error.code === 'ECONNABORTED') {
            errorMessage = 'Request timed out. Please try again.';
        }

        return reply(
            `❌ *${errorMessage}*\n\n> ${FOOTER}`
        );
    }
});
