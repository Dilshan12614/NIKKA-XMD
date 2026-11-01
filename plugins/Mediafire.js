const axios = require('axios')
const { cmd } = require('../command')

cmd({
    pattern: 'mediafire',
    alias: ['mfire', 'mfdl'],
    desc: 'Download MediaFire files directly',
    category: 'download',
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) {
            return reply(
                '❌ MediaFire link එකක් දෙන්න.\n\n' +
                'උදාහරණය: .mediafire https://www.mediafire.com/file/...'
            )
        }

        const url = q.trim()

        if (!/^https?:\/\/(?:www\.)?mediafire\.com\/file\//i.test(url)) {
            return reply('❌ නිවැරදි MediaFire file link එකක් දෙන්න.')
        }

        const apiKey = process.env.SASA_API_KEY

        if (!apiKey) {
            return reply('❌ SASA_API_KEY GitHub Secret එක සකස් කර නැහැ.')
        }

        await reply('⏳ File එක download කරනවා...')

        const response = await axios.get(
            'https://sasa-dev-api.xyz/api/mediafire',
            {
                params: {
                    apikey: apiKey,
                    url: url
                },
                timeout: 60000
            }
        )

        const data = response.data

        if (
            data?.status === false ||
            data?.success === false ||
            data?.error
        ) {
            console.error('MediaFire API error:', data)
            return reply('❌ API එකෙන් file එක ලබාගන්න බැරි වුණා.')
        }

        function findFileInfo(obj, depth = 0) {
            if (!obj || typeof obj !== 'object' || depth > 8) {
                return null
            }

            if (Array.isArray(obj)) {
                for (const item of obj) {
                    const result = findFileInfo(item, depth + 1)
                    if (result) return result
                }
                return null
            }

            const urlKeys = [
                'downloadUrl',
                'download_url',
                'directLink',
                'direct_link',
                'download',
                'fileUrl',
                'file_url',
                'url',
                'link'
            ]

            for (const key of urlKeys) {
                const value = obj[key]

                if (
                    typeof value === 'string' &&
                    /^https?:\/\//i.test(value) &&
                    !/mediafire\.com\/file\//i.test(value)
                ) {
                    return {
                        url: value,
                        name:
                            obj.fileName ||
                            obj.filename ||
                            obj.name ||
                            'mediafire_file',
                        mime:
                            obj.mimeType ||
                            obj.mimetype ||
                            obj.contentType ||
                            ''
                    }
                }
            }

            for (const value of Object.values(obj)) {
                const result = findFileInfo(value, depth + 1)
                if (result) return result
            }

            return null
        }

        const fileInfo = findFileInfo(data)

        if (!fileInfo) {
            console.error(
                'MediaFire API response:',
                JSON.stringify(data).slice(0, 3000)
            )

            return reply(
                '❌ API response එකෙන් direct download link එක හොයාගන්න බැරි වුණා.'
            )
        }

        const fileResponse = await axios.get(fileInfo.url, {
            responseType: 'arraybuffer',
            timeout: 120000,
            maxContentLength: 100 * 1024 * 1024,
            maxBodyLength: 100 * 1024 * 1024,
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        })

        const buffer = Buffer.from(fileResponse.data)

        if (!buffer.length) {
            return reply('❌ Download කළ file එක හිස්.')
        }

        const fileName = String(fileInfo.name)
            .split(/[\\/]/)
            .pop()
            .replace(/[^\w.\- ()]/g, '_')
            .slice(0, 150) || 'mediafire_file'

        const contentType = String(
            fileResponse.headers['content-type'] ||
            fileInfo.mime ||
            'application/octet-stream'
        )
            .split(';')[0]
            .toLowerCase()

        const caption =
            '╭━━〔 ɴɪᴋᴋᴀ x ᴍᴅ 〕━━╮\n' +
            '┃ ✅ *MEDIAFIRE DOWNLOAD*\n' +
            `┃ 📁 ${fileName}\n` +
            '╰━━━━━━━━━━━━━━╯\n\n' +
            '> ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ'

        if (contentType.startsWith('image/')) {
            await conn.sendMessage(
                from,
                {
                    image: buffer,
                    caption
                },
                { quoted: mek }
            )
        } else if (contentType.startsWith('video/')) {
            await conn.sendMessage(
                from,
                {
                    video: buffer,
                    mimetype: contentType,
                    caption
                },
                { quoted: mek }
            )
        } else if (contentType.startsWith('audio/')) {
            await conn.sendMessage(
                from,
                {
                    audio: buffer,
                    mimetype: contentType,
                    fileName,
                    ptt: false
                },
                { quoted: mek }
            )
        } else {
            await conn.sendMessage(
                from,
                {
                    document: buffer,
                    mimetype: contentType,
                    fileName,
                    caption
                },
                { quoted: mek }
            )
        }

    } catch (error) {
        console.error(
            'MEDIAFIRE DOWNLOAD ERROR:',
            error.response?.data || error.message
        )

        if (error.response?.status === 401) {
            return reply('❌ API key එක පරීක්ෂා කරන්න.')
        }

        return reply(
            '❌ Download අසාර්ථකයි. Link එක, API එක හෝ file size එක පරීක්ෂා කරන්න.'
        )
    }
})
