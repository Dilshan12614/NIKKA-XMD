const axios = require('axios')
const { cmd } = require('../command')

const API_URL = 'https://sasa-dev-api.xyz/api/download/gdrive'
const API_KEY = process.env.SASA_API_KEY ||
    'YOUR_SASA_API_KEY'

cmd({
    pattern: 'gdrive',
    alias: ['gdl', 'drive'],
    react: '📥',
    desc: 'Google Drive direct downloader',
    category: 'download',
    filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
    try {
        const driveLink = args.join(' ').trim()

        if (!driveLink) {
            return reply(
                '❌ Google Drive link එකක් ලබා දෙන්න.\n\n' +
                'උදාහරණය:\n.gdrive https://drive.google.com/file/d/FILE_ID/view'
            )
        }

        let parsedUrl

        try {
            parsedUrl = new URL(driveLink)
        } catch {
            return reply('❌ නිවැරදි Google Drive link එකක් ලබා දෙන්න.')
        }

        const allowedHosts = [
            'drive.google.com',
            'docs.google.com'
        ]

        if (
            !['http:', 'https:'].includes(parsedUrl.protocol) ||
            !allowedHosts.includes(parsedUrl.hostname)
        ) {
            return reply('❌ Google Drive link එකක් පමණක් ලබා දෙන්න.')
        }

        if (!API_KEY || API_KEY === 'YOUR_SASA_API_KEY') {
            return reply('❌ SASA_API_KEY එක සකස් කර නැහැ.')
        }

        await reply('⏳ *ɴɪᴋᴋᴀ x ᴍᴅ*\n\n📥 Google Drive file එක ලබාගන්නවා...')

        const apiResponse = await axios.get(API_URL, {
            params: {
                apikey: API_KEY,
                url: driveLink
            },
            timeout: 60000,
            maxContentLength: 5 * 1024 * 1024
        })

        const data = apiResponse.data

        function findFileUrl(obj, depth = 0) {
            if (!obj || typeof obj !== 'object' || depth > 8) {
                return null
            }

            const preferredKeys = [
                'download_url',
                'downloadUrl',
                'download',
                'direct_url',
                'directUrl',
                'file_url',
                'fileUrl',
                'url',
                'link'
            ]

            for (const key of preferredKeys) {
                const value = obj[key]

                if (
                    typeof value === 'string' &&
                    /^https?:\/\//i.test(value) &&
                    !value.includes('sasa-dev-api.xyz/api/download/gdrive')
                ) {
                    return value
                }
            }

            for (const value of Object.values(obj)) {
                if (value && typeof value === 'object') {
                    const result = findFileUrl(value, depth + 1)
                    if (result) return result
                }
            }

            return null
        }

        const downloadUrl = findFileUrl(data)

        if (!downloadUrl) {
            console.log(
                'GDrive API response:',
                JSON.stringify(data, null, 2)
            )

            return reply(
                '❌ Download link එක API එකෙන් ලැබුණේ නැහැ.\n' +
                'GitHub Actions logs පරීක්ෂා කරන්න.'
            )
        }

        const fileResponse = await axios.get(downloadUrl, {
            responseType: 'arraybuffer',
            timeout: 120000,
            maxContentLength: 64 * 1024 * 1024,
            maxBodyLength: 64 * 1024 * 1024,
            validateStatus: status => status >= 200 && status < 300
        })

        const buffer = Buffer.from(fileResponse.data)
        const contentType = (
            fileResponse.headers['content-type'] ||
            'application/octet-stream'
        ).split(';')[0].trim()

        if (
            contentType.includes('text/html') ||
            contentType.includes('application/json')
        ) {
            return reply(
                '❌ API එකෙන් file එක වෙනුවට webpage එකක් ලැබුණා.'
            )
        }

        if (!buffer.length) {
            return reply('❌ Download කළ file එක හිස්.')
        }

        const disposition =
            fileResponse.headers['content-disposition'] || ''

        const match = disposition.match(/filename="?([^";]+)"?/i)

        let fileName = match
            ? match[1]
            : 'THENUVA-GDrive-Download'

        fileName = fileName.replace(/[\\/:*?"<>|]/g, '_')

        const caption =
            '╭─〔 *ɴɪᴋᴋᴀ x ᴍᴅ* 〕\n' +
            '│ ✅ Google Drive Download\n' +
            '│ 📁 ' + fileName + '\n' +
            '╰──────────────'

        if (contentType.startsWith('image/')) {
            await conn.sendMessage(from, {
                image: buffer,
                caption
            }, { quoted: mek })

        } else if (contentType.startsWith('video/')) {
            await conn.sendMessage(from, {
                video: buffer,
                caption,
                mimetype: contentType
            }, { quoted: mek })

        } else if (contentType.startsWith('audio/')) {
            await conn.sendMessage(from, {
                audio: buffer,
                mimetype: contentType,
                fileName
            }, { quoted: mek })

        } else {
            await conn.sendMessage(from, {
                document: buffer,
                mimetype: contentType,
                fileName,
                caption
            }, { quoted: mek })
        }

    } catch (error) {
        console.error(
            'THENUVA GDrive Error:',
            error.response?.data || error.message
        )

        if (error.response?.status === 401 ||
            error.response?.status === 403) {
            return reply('❌ API key එක හෝ Google Drive access permission පරීක්ෂා කරන්න.')
        }

        if (error.response?.status === 404) {
            return reply('❌ File එක හෝ API endpoint එක හමු වුණේ නැහැ.')
        }

        if (error.code === 'ERR_BAD_RESPONSE' ||
            error.code === 'ECONNABORTED') {
            return reply('❌ Download එක timeout වුණා. නැවත උත්සාහ කරන්න.')
        }

        return reply('❌ Download අසාර්ථකයි. GitHub Actions logs පරීක්ෂා කරන්න.')
    }
})
