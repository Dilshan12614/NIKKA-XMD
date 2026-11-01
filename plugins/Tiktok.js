const axios = require('axios')
const { cmd } = require('../command')

const API_URL = 'https://sasa-dev-api.xyz/api/tiktok/dl'
const FOOTER =
    'ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ'

cmd({
    pattern: 'tiktok',
    alias: ['tt', 'ttdl', 'tk'],
    react: '🎵',
    desc: 'Direct TikTok video downloader',
    category: 'download',
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        const url = (q || '').trim()

        if (!url) {
            return reply(
                '╭─〔 🎵 *TIKTOK DL* 〕\n' +
                '│\n' +
                '│ ▸ .tiktok TikTok_Link\n' +
                '│\n' +
                '╰──────────\n\n' + FOOTER
            )
        }

        if (!/^https?:\/\/([a-z0-9-]+\.)?tiktok\.com\//i.test(url)) {
            return reply('❌ නිවැරදි TikTok link එකක් එවන්න.')
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
            console.error('TikTok API Error:', data)
            return reply('❌ TikTok video එක ලබාගන්න බැරි වුණා.')
        }

        function findVideo(obj) {
            if (!obj) return null

            if (Array.isArray(obj)) {
                for (const item of obj) {
                    const found = findVideo(item)
                    if (found) return found
                }
                return null
            }

            if (typeof obj !== 'object') return null

            const keys = [
                'play',
                'play_url',
                'playUrl',
                'downloadUrl',
                'download_url',
                'videoUrl',
                'video_url',
                'noWatermark',
                'no_watermark'
            ]

            for (const key of keys) {
                const value = obj[key]

                if (
                    typeof value === 'string' &&
                    /^https?:\/\//i.test(value)
                ) {
                    return value
                }
            }

            for (const value of Object.values(obj)) {
                if (value && typeof value === 'object') {
                    const found = findVideo(value)
                    if (found) return found
                }
            }

            return null
        }

        const videoUrl = findVideo(data)

        if (!videoUrl) {
            console.error(
                'TikTok API Response:',
                JSON.stringify(data).slice(0, 3000)
            )
            return reply(
                '⚠️ API response එකෙන් video link එක හඳුනාගන්න බැරි වුණා.'
            )
        }

        const videoResponse = await axios.get(videoUrl, {
            responseType: 'arraybuffer',
            timeout: 120000,
            maxContentLength: 80 * 1024 * 1024,
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        })

        const videoBuffer = Buffer.from(videoResponse.data)

        if (!videoBuffer.length) {
            return reply('❌ Video file එක හිස්.')
        }

        await conn.sendMessage(
            from,
            {
                video: videoBuffer,
                mimetype: 'video/mp4',
                fileName: 'NIKKA-TIKTOK.mp4',
                caption:
                    '🎵 *TIKTOK VIDEO DOWNLOADED*\n\n' + FOOTER
            },
            { quoted: mek }
        )

    } catch (error) {
        console.error(
            'TikTok Downloader Error:',
            error.response?.data || error.message
        )

        if (error.response?.status === 401) {
            return reply('❌ API key එක පරීක්ෂා කරන්න.')
        }

        if (
            error.code === 'ERR_BAD_RESPONSE' ||
            error.response?.status === 413
        ) {
            return reply('❌ Video file එක විශාල වැඩියි හෝ API response එක වැරදියි.')
        }

        return reply(
            '❌ TikTok download අසාර්ථකයි. නැවත උත්සාහ කරන්න.\n\n' +
            FOOTER
        )
    }
})
