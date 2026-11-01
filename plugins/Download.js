const axios = require('axios')
const { cmd } = require('../command')

const API_URL = 'https://sasa-dev-api.xyz/api/download'
const API_KEY = process.env.SASA_API_KEY

const FOOTER =
    '> ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ'

function findUrl(data) {
    if (!data || typeof data !== 'object') return null

    const keys = [
        'download_url', 'downloadUrl',
        'direct_url', 'directUrl',
        'media_url', 'mediaUrl',
        'file_url', 'fileUrl',
        'video_url', 'audio_url',
        'url', 'link'
    ]

    for (const key of keys) {
        const value = data[key]
        if (typeof value === 'string' &&
            /^https?:\/\//i.test(value)) {
            return value
        }
    }

    for (const value of Object.values(data)) {
        if (value && typeof value === 'object') {
            const result = findUrl(value)
            if (result) return result
        }
    }

    return null
}

async function sendFile(conn, from, mek, buffer, mime, filename) {
    const caption = FOOTER

    if (mime.startsWith('video/')) {
        return conn.sendMessage(from, {
            video: buffer,
            mimetype: mime,
            caption
        }, { quoted: mek })
    }

    if (mime.startsWith('image/')) {
        return conn.sendMessage(from, {
            image: buffer,
            mimetype: mime,
            caption
        }, { quoted: mek })
    }

    if (mime.startsWith('audio/')) {
        await conn.sendMessage(from, {
            audio: buffer,
            mimetype: mime,
            fileName: filename || 'download.mp3'
        }, { quoted: mek })

        return conn.sendMessage(from, {
            text: FOOTER
        }, { quoted: mek })
    }

    return conn.sendMessage(from, {
        document: buffer,
        mimetype: mime || 'application/octet-stream',
        fileName: filename || 'download-file',
        caption
    }, { quoted: mek })
}

cmd({
    pattern: 'download',
    alias: ['dl'],
    react: '⬇️',
    desc: 'Download media directly from a supported URL',
    category: 'download',
    filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
    try {
        const input = args.join(' ').trim()

        if (!input) {
            return reply(
                '❌ Link එක ලබා දෙන්න.\n\n' +
                'භාවිතය: .download LINK\n\n' + FOOTER
            )
        }

        if (!API_KEY) {
            return reply('❌ GitHub Secrets තුළ SASA_API_KEY සකසන්න.')
        }

        let parsed
        try {
            parsed = new URL(input)
        } catch {
            return reply('❌ නිවැරදි URL එකක් ලබා දෙන්න.')
        }

        if (!['http:', 'https:'].includes(parsed.protocol)) {
            return reply('❌ නිවැරදි HTTP/HTTPS link එකක් ලබා දෙන්න.')
        }

        // Request the API response
        const apiResponse = await axios.get(API_URL, {
            params: {
                apikey: API_KEY,
                url: input
            },
            responseType: 'arraybuffer',
            timeout: 60000,
            maxContentLength: 100 * 1024 * 1024
        })

        let buffer = Buffer.from(apiResponse.data)
        let mime = String(
            apiResponse.headers['content-type'] || ''
        ).split(';')[0].toLowerCase()

        let filename = 'download-file'

        // If the API returned JSON, extract its download URL
        if (
            mime.includes('json') ||
            mime.startsWith('text/')
        ) {
            let data

            try {
                data = JSON.parse(buffer.toString('utf8'))
            } catch {
                return reply('❌ API response එක කියවන්න බැහැ.')
            }

            if (
                data.status === false ||
                data.success === false ||
                data.error
            ) {
                console.log('[Download API error]', data)
                return reply(
                    '❌ API error: ' +
                    (data.error || data.message || 'Download failed')
                )
            }

            const downloadUrl = findUrl(data)

            if (!downloadUrl) {
                console.log(
                    '[Download API response]',
                    JSON.stringify(data).slice(0, 3000)
                )
                return reply(
                    '❌ API එකෙන් download URL එකක් ලැබුණේ නැහැ. ' +
                    'API response එක පරීක්ෂා කළ යුතුයි.'
                )
            }

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
        }

        if (
            !buffer.length ||
            mime.includes('application/json') ||
            mime.includes('text/html')
        ) {
            return reply('❌ ලැබුණු response එක download file එකක් නෙවෙයි.')
        }

        await sendFile(
            conn,
            from,
            mek,
            buffer,
            mime || 'application/octet-stream',
            filename
        )

    } catch (error) {
        console.error(
            '[Download Error]',
            error.response?.data
                ? Buffer.from(error.response.data).toString('utf8').slice(0, 1000)
                : error.message
        )

        return reply(
            '❌ Download අසාර්ථකයි.\n' +
            'API එක හෝ ලබාදුන් link එක පරීක්ෂා කරන්න.'
        )
    }
})
