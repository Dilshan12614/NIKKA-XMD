const axios = require('axios')
const { cmd } = require('../command')

cmd({
    pattern: 'twitter',
    alias: ['tw', 'xdl', 'twitterdl'],
    desc: 'Download Twitter/X videos directly',
    category: 'download',
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) {
            return reply('❌ Twitter/X video link එකක් දෙන්න.\n\nඋදාහරණය: .twitter https://x.com/user/status/123456')
        }

        const url = q.trim()

        if (!/^https?:\/\/(?:www\.|mobile\.)?(?:twitter\.com|x\.com)\//i.test(url)) {
            return reply('❌ නිවැරදි Twitter/X link එකක් දෙන්න.')
        }

        const apiKey = process.env.SASA_API_KEY

        if (!apiKey) {
            return reply('❌ SASA_API_KEY GitHub Secret එක සකස් කර නැහැ.')
        }

        await reply('⏳ Video එක download කරනවා...')

        const response = await axios.get(
            'https://sasa-dev-api.xyz/api/twitter',
            {
                params: {
                    apikey: apiKey,
                    url: url
                },
                timeout: 60000
            }
        )

        const data = response.data

        if (data?.status === false || data?.success === false) {
            return reply('❌ API එකෙන් video එක ලබාගන්න බැරි වුණා.')
        }

        function findVideoUrl(obj, depth = 0) {
            if (!obj || depth > 8) return null

            if (typeof obj === 'string') {
                if (
                    /^https?:\/\//i.test(obj) &&
                    /\.(mp4|m4v|mov)(?:$|[?#])/i.test(obj)
                ) {
                    return obj
                }
                return null
            }

            if (Array.isArray(obj)) {
                for (const item of obj) {
                    const found = findVideoUrl(item, depth + 1)
                    if (found) return found
                }
                return null
            }

            if (typeof obj === 'object') {
                const keys = [
                    'video_url',
                    'videoUrl',
                    'download_url',
                    'downloadUrl',
                    'video',
                    'hd',
                    'sd',
                    'mp4',
                    'media',
                    'url',
                    'link'
                ]

                for (const key of keys) {
                    if (obj[key]) {
                        const found = findVideoUrl(obj[key], depth + 1)
                        if (found) return found
                    }
                }

                for (const value of Object.values(obj)) {
                    const found = findVideoUrl(value, depth + 1)
                    if (found) return found
                }
            }

            return null
        }

        const videoUrl = findVideoUrl(data)

        if (!videoUrl) {
            console.error(
                'Twitter API response:',
                JSON.stringify(data).slice(0, 3000)
            )
            return reply('❌ API response එකෙන් video URL එක හොයාගන්න බැරි වුණා. API response format එක පරීක්ෂා කරන්න.')
        }

        const videoResponse = await axios.get(videoUrl, {
            responseType: 'arraybuffer',
            timeout: 120000,
            maxContentLength: 100 * 1024 * 1024,
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
                caption:
                    '╭━━〔 ɴɪᴋᴋᴀ x ᴍᴅ 〕━━╮\n' +
                    '┃ ✅ *TWITTER VIDEO*\n' +
                    '┃ 📥 Download Complete\n' +
                    '╰━━━━━━━━━━━━━━╯\n\n' +
                    '> ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ'
            },
            { quoted: mek }
        )

    } catch (error) {
        console.error(
            'TWITTER DOWNLOAD ERROR:',
            error.response?.data || error.message
        )

        if (error.response?.status === 401) {
            return reply('❌ API key එක වැරදියි හෝ අවලංගුයි.')
        }

        if (error.response?.status === 404) {
            return reply('❌ Video එක හමු වුණේ නැහැ.')
        }

        return reply('❌ Video download අසාර්ථකයි. Link එක සහ API එක පරීක්ෂා කරන්න.')
    }
})
