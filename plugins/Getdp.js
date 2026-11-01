const { cmd } = require('../command');

cmd({
    pattern: 'getdp',
    alias: ['dp', 'profilepic', 'getprofile'],
    react: '🖼️',
    desc: 'Get the other participant profile picture',
    category: 'tools',
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    try {
        const isGroup = from.endsWith('@g.us');
        let targetJid;

        if (isGroup) {
            const contextInfo =
                mek?.message?.extendedTextMessage?.contextInfo ||
                mek?.message?.imageMessage?.contextInfo ||
                mek?.message?.videoMessage?.contextInfo;

            targetJid =
                m?.quoted?.sender ||
                m?.quoted?.participant ||
                contextInfo?.participant ||
                m?.sender ||
                mek?.key?.participant;
        } else {
            targetJid = mek?.key?.remoteJid || from;
        }

        if (!targetJid || targetJid === 'status@broadcast') {
            return reply('❌ User හඳුනාගන්න බැරි වුණා.');
        }

        const botJid = conn.user?.id
            ? conn.user.id.split(':')[0].split('@')[0]
            : null;

        const targetNumber = targetJid
            .split('@')[0]
            .split(':')[0];

        if (!isGroup && botJid && targetNumber === botJid) {
            return reply(
                '❌ Chat එකේ අනිත් userගේ JID එක හඳුනාගන්න බැරි වුණා.'
            );
        }

        let imageUrl;

        try {
            imageUrl = await conn.profilePictureUrl(
                targetJid,
                'image'
            );
        } catch (error) {
            console.error('[GETDP PROFILE ERROR]', error);

            return reply(
                '❌ *Profile picture එක ලබාගන්න බැරි වුණා.*\n\n' +
                '• DP එක නොමැති විය හැකියි.\n' +
                '• Privacy settings නිසා සීමා කර තිබිය හැකියි.\n' +
                '• WhatsApp JID එක ලබාගත නොහැකි විය හැකියි.'
            );
        }

        if (!imageUrl) {
            return reply(
                '❌ Profile picture URL එකක් ලැබුණේ නැහැ.'
            );
        }

        const response = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0'
            },
            signal: AbortSignal.timeout(30000)
        });

        if (!response.ok) {
            throw new Error(
                `Image download failed: HTTP ${response.status}`
            );
        }

        const contentType = (
            response.headers.get('content-type') || ''
        ).toLowerCase();

        if (!contentType.startsWith('image/')) {
            throw new Error(
                'Server එකෙන් image එකක් ලැබුණේ නැහැ.'
            );
        }

        const imageBuffer = Buffer.from(
            await response.arrayBuffer()
        );

        if (!imageBuffer.length) {
            throw new Error('Image file එක හිස්.');
        }

        if (imageBuffer.length > 10 * 1024 * 1024) {
            return reply(
                '❌ Image එක 10 MB සීමාව ඉක්මවා තිබෙනවා.'
            );
        }

        await conn.sendMessage(
            from,
            {
                image: imageBuffer,
                caption:
                    '╭─〔 *🖼️ PROFILE PICTURE* 〕\n' +
                    '│\n' +
                    `│ 👤 *User:* ${targetNumber}\n` +
                    '│\n' +
                    '╰────────────────\n\n' +
                    '> *ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ*'
            },
            { quoted: mek }
        );

    } catch (error) {
        console.error('[GETDP ERROR]', error);

        return reply(
            '❌ *GETDP ERROR*\n\n' +
            `${error.message || 'Unknown error'}`
        );
    }
});
