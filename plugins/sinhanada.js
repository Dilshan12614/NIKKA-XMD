const axios = require('axios')
const { cmd } = require('../command')

const API_URL = 'https://sasa-dev-api.xyz/api/sinhanada/download'
const API_KEY = process.env.SASA_API_KEY

cmd({
    pattern: 'sinhanada',
    alias: ['sinhana', 'sdl'],
    react: '🎵',
    desc: 'Sinhanada audio downloader',
    category: 'download',
    filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
    try {
        const input = args.join(' ').trim()

        if (!input) {
            return reply(
                '❌ Sinhanada link එකක් ලබා දෙන්න.\n\n' +
                'උදාහරණය:\n.sinhanada https://example.com/audio'
            )
        }

        if (!API_KEY) {
            return reply('❌ GitHub Secrets තුළ SASA_API_KEY එක සකස් කරන්න.')
        }

        let parsedUrl

        try {
            parsedUrl = new URL(input)
        } catch {
            return reply('❌ නිවැරදි URL එකක් ලබා දෙන්න.')
        }

        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            return reply('❌ HTTP හෝ HTTPS link එකක් ලබා දෙන්න.')
        }

        await reply('⏳ *ɴɪᴋᴋᴀ x ᴍᴅ*\n\n🎵 Audio එක ලබාගන්නවා...')

        const { data } = await axios.get(API_URL, {
            params: {
                apikey: API_KEY,
                url: input
            },
            timeout: 60000,
            maxContentLength: 5 * 1024 * 1024
        })

        function findAudioUrl(obj, depth = 0) {
            if (!obj || typeof obj !== 'object' || depth > 8) {
                return null
            }

            const keys = [
                'download_url',
                'downloadUrl',
                'audio_url',
                'audioUrl',
                'media_url',
                'mediaUrl',
                'direct_url',
                'directUrl',
                'url',
                'link',
                'download'
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
                    const result = findAudioUrl(value, depth + 1)
                    if (result) return result
                }
            }

            return null
        }

        const audioUrl = findAudioUrl(data)

        if (!audioUrl) {
            console.log(
                'Sinhanada API response:',
                JSON.stringify(data, null, 2)
            )

            return reply(
                '❌ Audio download URL එක API එකෙන් ලැබුණේ නැහැ.\n' +
                'GitHub Actions logs පරීක්ෂා කරන්න.'
            )
        }

        const response = await axios.get(audioUrl, {
            responseType: 'arraybuffer',
            timeout: 120000,
            maxContentLength: 64 * 1024 * 1024,
            validateStatus: status => status >= 200 && status < 300
        })

        const buffer = Buffer.from(response.data)
        const contentType = (
            response.headers['content-type'] ||
            'application/octet-stream'
        ).split(';')[0].trim()

        if (
            buffer.length === 0 ||
            contentType.includes('text/html') ||
            contentType.includes('application/json')
        ) {
            return reply('❌ API එකෙන් audio file එකක් ලැබුණේ නැහැ.')
        }

        const fileName = 'THENUVA-Sinhanada' +
            (contentType.includes('mpeg') ? '.mp3' : '.audio')

        await conn.sendMessage(from, {
            audio: buffer,
            mimetype: contentType.startsWith('audio/')
                ? contentType
                : 'audio/mpeg',
            fileName
        }, { quoted: mek })

    } catch (error) {
        console.error(
            'THENUVA Sinhanada Error:',
            error.response?.data || error.message
        )

        if (error.response?.status === 401 ||
            error.response?.status === 403) {
            return reply('❌ API key එක හෝ access permission පරීක්ෂා කරන්න.')
        }

        if (error.code === 'ECONNABORTED') {
            return reply('❌ Download එකට වැඩි කාලයක් ගත වුණා. නැවත උත්සාහ කරන්න.')
        }

        return reply('❌ Audio download අසාර්ථකයි. API response එක පරීක්ෂා කරන්න.')
    }
})
