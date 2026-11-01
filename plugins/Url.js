const axios = require('axios')
const { cmd } = require('../command')

cmd({
    pattern: 'tourl',
    alias: ['imgtourl', 'img2url', 'url'],
    desc: 'Upload image and get a direct URL',
    category: 'tools',
    filename: __filename
}, async (conn, mek, m, { reply }) => {
    try {
        const quoted = m.quoted
        if (!quoted) {
            return reply('❌ Reply to an image with .tourl')
        }

        const mime = quoted.mtype || ''
        if (!mime.includes('image')) {
            return reply('❌ Please reply to an image.')
        }

        if (!process.env.IMGBB_API_KEY) {
            return reply('❌ IMGBB_API_KEY is missing in GitHub Secrets.')
        }

        await reply('⏳ Uploading image...')

        const buffer = await quoted.download()
        if (!buffer || !buffer.length) {
            return reply('❌ Failed to download the image.')
        }

        const base64 = buffer.toString('base64')

        const response = await axios.post(
            'https://api.imgbb.com/1/upload',
            new URLSearchParams({
                key: process.env.IMGBB_API_KEY,
                image: base64
            }).toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                timeout: 60000
            }
        )

        const data = response.data?.data
        if (!data?.url) {
            return reply('❌ Image upload failed. Please try again.')
        }

        const imageUrl = data.url

        await conn.sendMessage(
            m.chat,
            {
                image: { url: imageUrl },
                caption:
                    '╭━━〔 ɴɪᴋᴋᴀ x ᴍᴅ 〕━━╮\n' +
                    '┃ ✅ *IMAGE UPLOADED*\n' +
                    '┃\n' +
                    `┃ 🔗 *URL:* ${imageUrl}\n` +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━╯\n\n' +
                    '> ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ'
            },
            { quoted: mek }
        )

    } catch (error) {
        console.error('TOURL ERROR:', error.response?.data || error.message)
        return reply('❌ Upload failed. Check your ImgBB API key and try again.')
    }
})
