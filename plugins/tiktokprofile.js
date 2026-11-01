const axios = require('axios');
const { cmd } = require('../command');

const API_KEY = process.env.SASA_API_KEY ||
    'Sasa_Dev_Api_79346efacb553ec6ee94f2f6453dec8658ec5e7b';

const API_URL = 'https://sasa-dev-api.xyz/api/tiktok-profile-dl';

const FOOTER =
    'ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ';

cmd({
    pattern: 'tiktokprofile',
    alias: ['ttprofile', 'ttpf', 'tiktokpf'],
    react: '🎵',
    desc: 'Download TikTok profile',
    category: 'download',
    filename: __filename
}, async (conn, mek, m, {
    from, q, reply
}) => {
    try {
        const username = (q || '').trim().replace(/^@/, '');

        if (!username) {
            return reply(
                '❌ Please provide a TikTok username.\n\n' +
                'Example: .tiktokprofile username\n\n' +
                `> ${FOOTER}`
            );
        }

        await reply('⏳ Downloading TikTok profile...');

        const response = await axios.get(API_URL, {
            params: {
                apikey: API_KEY,
                username: username,
                raw: 'false'
            },
            timeout: 60000
        });

        const data = response.data;

        if (!data || data.status === false || data.error) {
            return reply(
                '❌ Failed to download TikTok profile.\n' +
                `${data?.error || 'Please check the username or API.'}\n\n` +
                `> ${FOOTER}`
            );
        }

        const profile =
            data.result ||
            data.data ||
            data.profile ||
            data;

        const caption =
            `╭━━〔 *ᴛɪᴋᴛᴏᴋ ᴘʀᴏғɪʟᴇ* 〕━━╮\n` +
            `┃ 👤 Username: ${username}\n` +
            `┃ 🖤 Powered by DARK-DILA MD\n` +
            `╰━━━━━━━━━━━━━━━━━━╯\n\n` +
            `> ${FOOTER}`;

        const imageUrl =
            profile.profilePicture ||
            profile.profile_picture ||
            profile.avatar ||
            profile.avatar_url ||
            profile.avatarLarger ||
            profile.avatarMedium;

        const videoUrl =
            profile.video ||
            profile.videoUrl ||
            profile.downloadUrl ||
            profile.download_url ||
            profile.url;

        if (imageUrl && /^https?:\/\//i.test(imageUrl)) {
            await conn.sendMessage(from, {
                image: { url: imageUrl },
                caption: caption
            }, { quoted: mek });
        } else {
            await reply(caption);
        }

        if (videoUrl && /^https?:\/\//i.test(videoUrl)) {
            await conn.sendMessage(from, {
                document: { url: videoUrl },
                mimetype: 'application/octet-stream',
                fileName: `tiktok_${username}`,
                caption: `✅ TikTok profile file\n\n> ${FOOTER}`
            }, { quoted: mek });
        }

    } catch (error) {
        console.error(
            '[DARK-DILA MD TikTok Profile Error]',
            error.response?.data || error.message
        );

        const message = error.response?.status === 401
            ? 'Invalid API key.'
            : error.response?.status === 404
                ? 'TikTok profile or API endpoint not found.'
                : 'Could not fetch the profile. Please try again later.';

        return reply(
            `❌ ${message}\n\n> ${FOOTER}`
        );
    }
});
