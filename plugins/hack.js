const { cmd } = require('../command');
const { sleep } = require('../lib/functions');

cmd({
    pattern: "hack",
    alias: ["fakehack"],
    react: "👨‍💻",
    desc: "Show a fake hacking animation for fun",
    category: "main",
    filename: __filename
}, async (conn, mek, m, { from, reply, pushname }) => {
    try {
        if (!mek) {
            return reply("❌ Message object is missing.");
        }

        const name = pushname || "User";
        const quoted = { quoted: mek };

        await conn.sendMessage(from, {
            image: {
                url: "https://i.ibb.co/nN7pHgH4/3f6f01847f5e.jpg"
            },
            caption:
                `╭─〔 👨‍💻 ɴɪᴋᴋᴀ x ᴍᴅ 〕─╮\n\n` +
                `👋 Hello *${name}*!\n` +
                `🎭 Fake Hacking Simulation\n\n` +
                `⚠️ This is only a fun animation.\n` +
                `╰────────────────╯`
        }, quoted);

        const progress = [
            "▰▱▱▱▱▱▱▱▱▱ 10%",
            "▰▰▱▱▱▱▱▱▱▱ 20%",
            "▰▰▰▱▱▱▱▱▱▱ 30%",
            "▰▰▰▰▱▱▱▱▱▱ 40%",
            "▰▰▰▰▰▱▱▱▱▱ 50%",
            "▰▰▰▰▰▰▱▱▱▱ 60%",
            "▰▰▰▰▰▰▰▱▱▱ 70%",
            "▰▰▰▰▰▰▰▰▱▱ 80%",
            "▰▰▰▰▰▰▰▰▰▱ 90%",
            "▰▰▰▰▰▰▰▰▰▰ 100%"
        ];

        for (const bar of progress) {
            await sleep(700);
            await conn.sendMessage(from, {
                text: `╭─〔 💻 SYSTEM SIMULATION 〕─╮\n\n${bar}\n\n╰────────────────╯`
            }, quoted);
        }

        const messages = [
            "⚙️ *Initializing fake terminal...*",
            "🌐 *Simulating proxy connection...*",
            "🔍 *Running fictional security scan...*",
            "🛡️ *Simulation complete — no device accessed.*",
            "✅ *FAKE HACKING ANIMATION COMPLETED!*"
        ];

        for (const message of messages) {
            await sleep(900);
            await conn.sendMessage(from, { text: message }, quoted);
        }

        await sleep(1000);

        await conn.sendMessage(from, {
            image: {
                url: "https://i.ibb.co/nN7pHgH4/3f6f01847f5e.jpg"
            },
            caption:
                `╭─〔 🎭 SIMULATION FINISHED 〕─╮\n\n` +
                `👤 User: *${name}*\n` +
                `💻 Status: *Completed*\n` +
                `🔐 Real data accessed: *No*\n\n` +
                `> ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ\n` +
                `╰────────────────╯`
        }, quoted);

    } catch (e) {
        console.error("[NIKKA HACK PLUGIN ERROR]", e);
        await reply("❌ Animation එකේ දෝෂයක් ඇති වුණා. නැවත උත්සාහ කරන්න.");
    }
});
