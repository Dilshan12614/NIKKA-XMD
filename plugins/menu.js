const { cmd, commands } = require('../command');

const BOT_NAME = 'ɴɪᴋᴋᴀ x ᴍᴅ';
const FOOTER = '© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ';
const PREFIX = '.';

const categoryInfo = {
    main:      { title: 'ᴍᴀɪɴ ᴍᴇɴᴜ', emoji: '🏠' },
    owner:     { title: 'ᴏᴡɴᴇʀ ᴍᴇɴᴜ', emoji: '👑' },
    download:  { title: 'ᴅᴏᴡɴʟᴏᴀᴅ ᴍᴇɴᴜ', emoji: '📥' },
    downloads: { title: 'ᴅᴏᴡɴʟᴏᴀᴅ ᴍᴇɴᴜ', emoji: '📥' },
    search:    { title: 'sᴇᴀʀᴄʜ ᴍᴇɴᴜ', emoji: '🔎' },
    group:     { title: 'ɢʀᴏᴜᴘ ᴍᴇɴᴜ', emoji: '👥' },
    admin:     { title: 'ᴀᴅᴍɪɴ ᴍᴇɴᴜ', emoji: '🛡️' },
    tools:     { title: 'ᴛᴏᴏʟs ᴍᴇɴᴜ', emoji: '🧰' },
    ai:        { title: 'ᴀɪ ᴍᴇɴᴜ', emoji: '🤖' },
    fun:       { title: 'ғᴜɴ ᴍᴇɴᴜ', emoji: '🎭' },
    convert:   { title: 'ᴄᴏɴᴠᴇʀᴛ ᴍᴇɴᴜ', emoji: '🔄' },
    other:     { title: 'ᴏᴛʜᴇʀ ᴍᴇɴᴜ', emoji: '📌' }
};

const commandEmojiRules = [
    { match: /alive|status|uptime|runtime/, emoji: '⚡' },
    { match: /ping|speed|test/, emoji: '🏓' },
    { match: /menu|help|commands/, emoji: '📜' },
    { match: /owner|sudo|creator/, emoji: '👑' },
    { match: /song|mp3|audio|music|play/, emoji: '🎵' },
    { match: /video|mp4|ytvideo/, emoji: '🎬' },
    { match: /download|dl|media/, emoji: '📥' },
    { match: /sticker|take|steal/, emoji: '🪄' },
    { match: /image|photo|img|wallpaper/, emoji: '🖼️' },
    { match: /group|member|invite/, emoji: '👥' },
    { match: /kick|add|promote|demote/, emoji: '🥷' },
    { match: /ban|mute|unmute|warn/, emoji: '🛡️' },
    { match: /search|google|wiki|find/, emoji: '🔎' },
    { match: /ai|gpt|chat|ask/, emoji: '🤖' },
    { match: /translate|trt|language/, emoji: '🌐' },
    { match: /weather|forecast/, emoji: '🌦️' },
    { match: /calc|math|calculate/, emoji: '🧮' },
    { match: /time|date|calendar/, emoji: '🕒' },
    { match: /news|headline/, emoji: '📰' },
    { match: /joke|fun|fact|quote/, emoji: '🎭' },
    { match: /convert|toaudio|tovideo|tomp3/, emoji: '🔄' },
    { match: /broadcast|bc|sendall/, emoji: '📢' },
    { match: /restart|reboot|update/, emoji: '♻️' },
    { match: /delete|clear|remove/, emoji: '🗑️' },
    { match: /tag|hidetag|mention/, emoji: '🏷️' },
    { match: /repo|github|git/, emoji: '🐙' },
    { match: /contact|number|ownerinfo/, emoji: '📞' },
    { match: /bug|report|support/, emoji: '🐞' },
    { match: /game|quiz|guess/, emoji: '🎮' },
    { match: /lock|unlock|close|open/, emoji: '🔐' }
];

function getCategoryInfo(category) {
    const key = String(category || 'other').toLowerCase();

    if (categoryInfo[key]) {
        return categoryInfo[key];
    }

    let emoji = '📂';

    if (/owner|sudo/.test(key)) emoji = '👑';
    else if (/download|media|music/.test(key)) emoji = '📥';
    else if (/search/.test(key)) emoji = '🔎';
    else if (/group/.test(key)) emoji = '👥';
    else if (/admin|moderation/.test(key)) emoji = '🛡️';
    else if (/tool|utility/.test(key)) emoji = '🧰';
    else if (/ai|gpt/.test(key)) emoji = '🤖';
    else if (/fun|game/.test(key)) emoji = '🎮';
    else if (/convert|sticker/.test(key)) emoji = '🔄';

    return {
        title: `${key.replace(/[-_]/g, ' ').toUpperCase()} MENU`,
        emoji
    };
}

function getCommandEmoji(data, categoryEmoji) {
    if (typeof data.react === 'string' && data.react.trim()) {
        return data.react.trim();
    }

    const text = `${data.pattern || ''} ${data.desc || ''}`.toLowerCase();

    for (const rule of commandEmojiRules) {
        if (rule.match.test(text)) {
            return rule.emoji;
        }
    }

    return categoryEmoji || '✨';
}

cmd({
    pattern: 'menu',
    alias: ['help', 'commands'],
    react: '📜',
    desc: 'Displays all commands by category',
    category: 'main',
    filename: __filename
},
async (danuwa, mek, m, { from, reply }) => {
    const pushName =
        m?.pushName ||
        mek?.pushName ||
        mek?.verifiedBizName ||
        '';
    try {
        const categories = {};
        const seen = new Set();

        for (const data of Object.values(commands)) {
            if (!data || !data.pattern) continue;

            const pattern = String(data.pattern).trim();
            const uniqueKey = pattern.toLowerCase();

            if (!pattern || seen.has(uniqueKey)) continue;

            seen.add(uniqueKey);

            const category = String(data.category || 'other').toLowerCase();
            const info = getCategoryInfo(category);

            if (!categories[category]) {
                categories[category] = [];
            }

            categories[category].push({
                pattern,
                desc: data.desc || 'No description',
                emoji: getCommandEmoji(data, info.emoji)
            });
        }

        const totalCommands = Object.values(categories)
            .reduce((total, list) => total + list.length, 0);

        const sortedCategories = Object.keys(categories).sort();

        // Short bot-name header
        let menuText = [
            `╭─「 *${BOT_NAME}* 」──●●►`,
            `│ 👋 𝙷𝙴𝙻𝙻𝙾 *${pushName}* 𝚆𝙴𝙻𝙲𝙾𝙼𝙴 𝚃𝙾 ${BOT_NAME} 🎉`,
            `│ 📚 ${totalCommands} Commands`,
            `│ 🔰 Prefix: ${PREFIX}`,
            '╰────────●●►',
            ''
        ].join('\n');

        // Command categories
        for (const category of sortedCategories) {
            const info = getCategoryInfo(category);

            const list = categories[category].sort((a, b) =>
                a.pattern.localeCompare(b.pattern)
            );

            menuText += [
                `╭─〔 ${info.emoji} *${info.title}* 〕`,
                '│',
                ...list.flatMap(command => [
                    `│ ${command.emoji} *${PREFIX}${command.pattern}*`,
                    `│   ↳ ${command.desc}`,
                    '│'
                ]),
                '╰────────●●►',
                ''
            ].join('\n') + '\n';
        }

        // Footer
        menuText += [
            '',
            `> © ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ`,
            ''
        ].join('\n');

        await danuwa.sendMessage(
            from,
            {
                image: {
                    url: 'https://files.catbox.moe/imq304.jpg'
                },
                caption: menuText.trim(),
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363430604376029@newsletter',
                        newsletterName: 'අපේ නික්කා පැට්ටා',
                        serverMessageId: 143
                    }
                }
            },
            { quoted: mek }
        );

    } catch (error) {
        console.error('[NIKKA X MD] MENU ERROR:', error);

        await reply(
            '❌ NIKKA X MD menu එක හදද්දී දෝෂයක් ඇති වුණා. Console logs බලන්න.'
        );
    }
});
