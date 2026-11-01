const config = require('../config');
const { cmd } = require('../command');

cmd({
    pattern: "tagall",
    alias: ["alltag", "everyone"],
    react: "📢",
    desc: "Tag all group members.",
    category: "group",
    use: ".tagall Hello everyone!",
    filename: __filename
}, async (conn, mek, m, {
    from,
    q,
    isGroup,
    isAdmins,
    isDev,
    participants,
    reply
}) => {
    try {
        if (!isGroup) return reply("❌ Group only command.");

        if (!isAdmins && !isDev) {
            return reply("❌ Only group admins can use this command.");
        }

        const members = participants || [];

        if (!members.length) {
            return reply("❌ No group members found.");
        }

        const message = q || "Attention Everyone! 📢";

        const mentions = members.map(member => member.id);

        const tagText = members.map((member, index) =>
            `${index + 1}. @${member.id.split('@')[0]}`
        ).join('\n');

        await conn.sendMessage(from, {
            text: `╭━━〔 📢 TAG ALL 〕━━╮

${message}

${tagText}

╰━━━━━━━━━━━━━━╯`,
            mentions
        }, { quoted: mek });

    } catch (error) {
        console.error("TAGALL ERROR:", error);
        reply(`❌ Tagall Error:\n${error.message}`);
    }
});
