const { cmd } = require('../command');

cmd({
    pattern: "jid",
    alias: ["getjid", "id"],
    desc: "Get WhatsApp JID",
    category: "main",
    react: "🆔",
    filename: __filename
},
async (conn, mek, m, {
    from,
    quoted,
    mentionedJid,
    reply
}) => {
    try {
        let jid;

        // If message is replied to
        if (quoted) {
            jid = quoted.sender || quoted.participant || quoted.key?.participant;
        }

        // If user is mentioned
        if (!jid && mentionedJid && mentionedJid.length > 0) {
            jid = mentionedJid[0];
        }

        // If no reply/mention, use current chat JID
        if (!jid) {
            jid = from;
        }

        if (!jid) {
            return reply("❌ JID එක හොයාගන්න බැරි වුණා.");
        }

        return reply(
`╭━━━〔 *🆔 NIKKA-XMD JID* 〕━━━╮

┃ 👤 *JID:*
┃ ${jid}

╰━━━━━━━━━━━━━━━━━━╯`
        );

    } catch (error) {
        console.error("JID Plugin Error:", error);
        return reply("❌ JID ලබාගැනීමේදී error එකක් ආවා.");
    }
});
