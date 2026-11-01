const axios = require('axios')
const { cmd } = require('../command')

const API_URL = 'https://sasa-dev-api.xyz/api/instagram/dl'

const FOOTER =
    'ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ'

cmd({
    pattern: 'instagram',
    alias: ['ig', 'igdl', 'insta'],
    react: '📸',
    desc: 'Download Instagram media',
    category: 'download',
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        const url = q ? q.trim() : ''

        if (!url) {
            return reply(
                '╭─〔 📸 *INSTAGRAM DL* 〕\n' +
                '│\n' +
                '│ ▸ *.ig* Instagram_Link\n' +
                '│ ▸ *.insta* Instagram_Link\n' +
                '│\n' +
                '╰──────────\n\n' +
                FOOTER
            )
        }

        if (!/^https?:\/\/(www\.)?instagram\.com\//i.test(url)) {
            return reply('❌ වලංගු Instagram link එකක් එවන්න.')
        }

        const apiKey = process.env.SASA_API_KEY

        if (!apiKey) {
            return reply('❌ SASA_API_KEY GitHub Secret එක සකස් කරන්න.')
        }

        await reply('⏳ *Instagram media ලබාගනිමින්...*')

        const response = await axios.get(API_URL, {
            params: {
                apikey: apiKey,
                url: url,
                raw: 'false'
            },
            timeout: 60000
        })

        const data = response.data

        if (!data || data.status === false || data.error) {
            console.error('Instagram API Error:', data)
            return reply('❌ Download අසාර්ථකයි. නැවත උත්සාහ කරන්න.')
        }

        const mediaUrls = []

        function extractMedia(obj) {
            if (!obj) return

            if (typeof obj === 'string') {
                if (/^https?:\/\//i.test(obj)) {
                    mediaUrls.push(obj)
                }
                return
            }

            if (Array.isArray(obj)) {
                for (const item of obj) extractMedia(item)
                return
            }

            if (typeof obj === 'object') {
                for (const [key, value] of Object.entries(obj)) {
                    if (
                        typeof value === 'string' &&
                        /^https?:\/\//i.test(value) &&
                        /url|link|src|download|video|image|media/i.test(key)
                    ) {
                        mediaUrls.push(value)
                    } else if (value && typeof value === 'object') {
                        extractMedia(value)
                    }
                }
            }
        }

        extractMedia(data)

        const uniqueUrls = [...new Set(mediaUrls)]

        if (!uniqueUrls.length) {
            console.error('Instagram API Response:', JSON.stringify(data))
            return reply(
                '⚠️ Media link එක හඳුනාගන්න බැහැ.\n' +
                'API response format එක පරීක්ෂා කළ යුතුයි.'
            )
        }

        for (const mediaUrl of uniqueUrls.slice(0, 5)) {
            const cleanUrl = mediaUrl.split('?')[0]
            const isImage = /\.(jpg|jpeg|png|webp)$/i.test(cleanUrl)

            const caption =
                (isImage ? '📸' : '🎬') +
                ' *INSTAGRAM DOWNLOADED*\n\n' +
                FOOTER

            if (isImage) {
                await conn.sendMessage(
                    from,
                    {
                        image: { url: mediaUrl },
                        caption
                    },
                    { quoted: mek }
                )
            } else {
                await conn.sendMessage(
                    from,
                    {
                        video: { url: mediaUrl },
                        caption
                    },
                    { quoted: mek }
                )
            }
        }
    } catch (error) {
        console.error(
            'Instagram Downloader Error:',
            error.response?.data || error.message
        )

        if (error.response?.status === 401) {
            return reply('❌ API key එක පරීක්ෂා කරන්න.')
        }

        return reply(
            '❌ Instagram download කිරීම අසාර්ථකයි.\n\n' +
            FOOTER
        )
    }
})
