const axios = require('axios')
const { cmd } = require('../command')

const API_URL = 'https://sasa-dev-api.xyz/api/pinterest/dl'

const FOOTER =
    'ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ'

cmd({
    pattern: 'pin',
    alias: ['pinterest', 'pindl'],
    react: '📌',
    desc: 'Download Pinterest images and videos',
    category: 'download',
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        const url = (q || '').trim()

        if (!url) {
            return reply(
                '╭─〔 📌 *PINTEREST DL* 〕\n' +
                '│\n' +
                '│ ▸ .pin Pinterest_Link\n' +
                '│ ▸ .pinterest Pinterest_Link\n' +
                '│\n' +
                '╰──────────\n\n' +
                FOOTER
            )
        }

        if (!/^https?:\/\/(?:www\.)?(?:pinterest\.com|pin\.it)\//i.test(url)) {
            return reply('❌ වලංගු Pinterest link එකක් එවන්න.')
        }

        const apikey = process.env.SASA_API_KEY

        if (!apikey) {
            return reply('❌ SASA_API_KEY GitHub Secret එක සකස් කර නැහැ.')
        }

        const response = await axios.get(API_URL, {
            params: {
                apikey,
                url,
                raw: 'false'
            },
            timeout: 60000
        })

        const data = response.data

        if (!data || data.status === false || data.error) {
            console.error('Pinterest API Error:', data)
            return reply('❌ Pinterest download අසාර්ථකයි.')
        }

        const mediaItems = []

        function extractMedia(obj, parentKey = '') {
            if (!obj) return

            if (Array.isArray(obj)) {
                for (const item of obj) {
                    extractMedia(item, parentKey)
                }
                return
            }

            if (typeof obj !== 'object') return

            for (const [key, value] of Object.entries(obj)) {
                const keyName = key.toLowerCase()

                if (
                    typeof value === 'string' &&
                    /^https?:\/\//i.test(value) &&
                    /url|link|src|download|video|image|media|photo|play/i.test(keyName)
                ) {
                    mediaItems.push({
                        url: value,
                        key: keyName
                    })
                } else if (value && typeof value === 'object') {
                    extractMedia(value, keyName)
                }
            }
        }

        extractMedia(data)

        const uniqueItems = [
            ...new Map(mediaItems.map(item => [item.url, item])).values()
        ]

        if (!uniqueItems.length) {
            console.error(
                'Pinterest API Response:',
                JSON.stringify(data).slice(0, 3000)
            )
            return reply('⚠️ API response එකෙන් media link එකක් හඳුනාගන්න බැරි වුණා.')
        }

        const selected =
            uniqueItems.find(item =>
                /video|play/i.test(item.key) ||
                /\.(mp4|webm|mov)(\?|$)/i.test(item.url)
            ) ||
            uniqueItems.find(item =>
                /image|photo|picture/i.test(item.key) ||
                /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(item.url)
            ) ||
            uniqueItems[0]

        const mediaResponse = await axios.get(selected.url, {
            responseType: 'arraybuffer',
            timeout: 120000,
            maxContentLength: 80 * 1024 * 1024,
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        })

        const buffer = Buffer.from(mediaResponse.data)

        if (!buffer.length) {
            return reply('❌ Media file එක හිස්.')
        }

        const contentType = String(
            mediaResponse.headers['content-type'] || ''
        ).toLowerCase()

        const cleanUrl = selected.url.split('?')[0]

        const isImage =
            contentType.startsWith('image/') ||
            /\.(jpg|jpeg|png|webp|gif)$/i.test(cleanUrl)

        const isVideo =
            contentType.startsWith('video/') ||
            /\.(mp4|webm|mov)$/i.test(cleanUrl) ||
            /video|play/i.test(selected.key)

        const caption =
            '📌 *PINTEREST DOWNLOADED*\n\n' + FOOTER

        if (isImage && !isVideo) {
            await conn.sendMessage(
                from,
                {
                    image: buffer,
                    caption
                },
                { quoted: mek }
            )
        } else {
            await conn.sendMessage(
                from,
                {
                    video: buffer,
                    mimetype: 'video/mp4',
                    fileName: 'NIKKA-PINTEREST.mp4',
                    caption
                },
                { quoted: mek }
            )
        }

    } catch (error) {
        console.error(
            'Pinterest Downloader Error:',
            error.response?.data || error.message
        )

        if (error.response?.status === 401) {
            return reply('❌ API key එක පරීක්ෂා කරන්න.')
        }

        return reply(
            '❌ Pinterest download අසාර්ථකයි. නැවත උත්සාහ කරන්න.\n\n' +
            FOOTER
        )
    }
})
