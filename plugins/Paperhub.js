const axios = require('axios')
const { cmd } = require('../command')

const API_URL = 'https://sasa-dev-api.xyz/api/download'
const API_KEY = process.env.SASA_API_KEY

const FOOTER =
    'ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ'

function findDownloadUrl(data) {
    if (!data || typeof data !== 'object') return null

    const keys = [
        'download_url',
        'downloadUrl',
        'direct_url',
        'directUrl',
        'media_url',
        'mediaUrl',
        'file_url',
        'fileUrl',
        'video_url',
        'audio_url',
        'url',
        'link'
    ]

    for (const key of keys) {
        const value = data[key]

        if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
            return value
        }
    }

    for (const value of Object.values(data)) {
        if (value && typeof value === 'object') {
            const result = findDownloadUrl(value)
            if (result) return result
        }
    }

    return null
}

cmd({
    pattern: 'paperhub',
    alias: ['paper'],
    react: '📥',
    desc: 'Download files from PaperHub',
    category: 'download',
    filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
    try {
        const input = args.join(' ').trim()

        if (!input) {
            return reply(
                '╭─〔 *PAPERHUB DOWNLOADER* 〕\n' +
                '│\n' +
                '│ 📌 භාවිතය:\n' +
                '│ .paperhub LINK\n' +
                '│\n' +
                '╰─ ' + FOOTER
            )
        }

        if (!API_KEY) {
            return reply(
                '❌ SASA_API_KEY GitHub Secret එක සකසා නැහැ.'
            )
        }

        let parsed

        try {
            parsed = new URL(input)
        } catch {
            return reply('❌ නිවැරදි PaperHub link එකක් ලබා දෙන්න.')
        }

        if (!['http:', 'https:'].includes(parsed.protocol)) {
            return reply('❌ HTTP/HTTPS link එකක් ලබා දෙන්න.')
        }

        // Call Sasa Dev API
        const apiResponse = await axios.get(API_URL, {
            params: {
                site: 'paperhub',
                apikey: API_KEY,
                url: input
            },
            timeout: 60000,
            maxContentLength: 100 * 1024 * 1024
        })

        const data = apiResponse.data

        if (
            data?.status === false ||
            data?.success === false ||
            data?.error
        ) {
            console.log('[PaperHub API Error]', data)

            return reply(
                '❌ Download අසාර්ථකයි.\n' +
                (data.error || data.message || 'API error එකක් ලැබුණා.')
            )
        }

        // API may return a direct file URL or a JSON object
        let downloadUrl = null

        if (typeof data === 'string' && /^https?:\/\//i.test(data)) {
            downloadUrl = data
        } else {
            downloadUrl = findDownloadUrl(data)
        }

        let buffer
        let mime = ''
        let filename = 'paperhub-download'

        if (downloadUrl) {
            const fileResponse = await axios.get(downloadUrl, {
                responseType: 'arraybuffer',
                timeout: 120000,
                maxContentLength: 100 * 1024 * 1024
            })

            buffer = Buffer.from(fileResponse.data)
            mime = String(
                fileResponse.headers['content-type'] || ''
            ).split(';')[0].toLowerCase()

            const disposition =
                fileResponse.headers['content-disposition'] || ''
            const match = disposition.match(/filename="?([^";]+)"?/i)

            if (match) filename = match[1]
        } else {
            // API might have returned the actual file directly
            const contentType = String(
                apiResponse.headers['content-type'] || ''
            ).toLowerCase()

            if (
                contentType.includes('application/json') ||
                contentType.includes('text/html') ||
                contentType.startsWith('text/')
            ) {
                console.log(
                    '[PaperHub API Response]',
                    JSON.stringify(data).slice(0, 3000)
                )

                return reply(
                    '❌ API එකෙන් download file එකක් හෝ download URL එකක් ලැබුණේ නැහැ.\n' +
                    'GitHub Actions logs පරීක්ෂා කරන්න.'
                )
            }

            buffer = Buffer.from(data)
            mime = contentType.split(';')[0]
        }

        if (!buffer || !buffer.length) {
            return reply('❌ Download file එක හිස්.')
        }

        if (
            mime.includes('application/json') ||
            mime.includes('text/html')
        ) {
            return reply('❌ API එකෙන් file එක වෙනුවට webpage එකක් ලැබුණා.')
        }

        const caption = FOOTER

        if (mime.startsWith('image/')) {
            await conn.sendMessage(from, {
                image: buffer,
                mimetype: mime,
                caption
            }, { quoted: mek })
        } else if (mime.startsWith('video/')) {
            await conn.sendMessage(from, {
                video: buffer,
                mimetype: mime,
                caption
            }, { quoted: mek })
        } else if (mime.startsWith('audio/')) {
            await conn.sendMessage(from, {
                audio: buffer,
                mimetype: mime,
                fileName: filename.endsWith('.mp3')
                    ? filename
                    : 'paperhub-audio.mp3'
            }, { quoted: mek })

            await conn.sendMessage(from, {
                text: FOOTER
            }, { quoted: mek })
        } else {
            await conn.sendMessage(from, {
                document: buffer,
                mimetype: mime || 'application/octet-stream',
                fileName: filename,
                caption
            }, { quoted: mek })
        }

    } catch (error) {
        console.error(
            '[PaperHub Download Error]',
            error.response?.data || error.message
        )

        return reply(
            '❌ Download අසාර්ථකයි.\n' +
            'Link එක සහ API එක පරීක්ෂා කරන්න.'
        )
    }
})
