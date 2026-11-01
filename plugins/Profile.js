const { cmd } = require("../command");
const fs = require("fs");
const path = require("path");

const DB_DIR = path.join(__dirname, "../database");
const DB_FILE = path.join(DB_DIR, "nikka_profiles.json");

const BOT_NAME = "ɴɪᴋᴋᴀ x ᴍᴅ";
const FOOTER =
    "ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ";

// Create the database directory if needed
if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
}

function loadDB() {
    try {
        if (!fs.existsSync(DB_FILE)) {
            return {};
        }

        return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    } catch (error) {
        console.error("NIKKA PROFILE DB ERROR:", error);
        return {};
    }
}

function saveDB(data) {
    fs.writeFileSync(
        DB_FILE,
        JSON.stringify(data, null, 2),
        "utf8"
    );
}

function getUserId(mek, m) {
    return (
        m?.sender ||
        mek?.key?.participant ||
        mek?.key?.remoteJid ||
        ""
    ).split(":")[0];
}

function getProfile(db, jid, name) {
    if (!db[jid]) {
        db[jid] = {
            name: name || "NIKKA USER",
            bio: "Welcome to my profile!",
            joinedAt: new Date().toISOString(),
            profileViews: 0,
            commandsUsed: 0
        };
    }

    return db[jid];
}

function getLevel(commandsUsed) {
    return Math.floor(Math.sqrt(commandsUsed / 5)) + 1;
}

function getRank(level) {
    if (level >= 20) return "💎 LEGEND";
    if (level >= 10) return "👑 ELITE";
    if (level >= 5) return "🔥 PRO";
    return "🌱 BEGINNER";
}

function formatDate(date) {
    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
        return "Unknown";
    }

    return parsed.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC"
    });
}

// ======================================
// .profile [@user]
// ======================================

cmd(
    {
        pattern: "profile",
        alias: ["myprofile", "idcard"],
        desc: "View a NIKKA smart user profile",
        category: "main",
        filename: __filename
    },
    async (conn, mek, m, { from, reply, pushName }) => {
        try {
            const db = loadDB();
            const sender = getUserId(mek, m);

            if (!sender) {
                return reply("❌ User ID එක හොයාගන්න බැහැ.");
            }

            const mentioned =
                m?.mentionedJid?.[0] ||
                mek?.message?.extendedTextMessage
                    ?.contextInfo?.mentionedJid?.[0];

            const target = mentioned
                ? mentioned.split(":")[0]
                : sender;

            const isSelf = target === sender;
            const displayName = isSelf
                ? pushName || "NIKKA USER"
                : "NIKKA USER";

            const profile = getProfile(
                db,
                target,
                displayName
            );

            if (isSelf && pushName && profile.name === "NIKKA USER") {
                profile.name = pushName;
            }

            profile.profileViews =
                (profile.profileViews || 0) + 1;

            saveDB(db);

            const level = getLevel(
                profile.commandsUsed || 0
            );

            const card = `
╭━━〔 💎 *${BOT_NAME}* 〕━━╮
┃
┃ 👤 *USER PROFILE*
┃
┃ 🏷️ Name: ${profile.name}
┃ 📝 Bio: ${profile.bio}
┃ 🆔 ID: ${target.split("@")[0]}
┃ 📅 Joined: ${formatDate(profile.joinedAt)}
┃
┣━━〔 🏆 ACHIEVEMENTS 〕━━
┃
┃ ⭐ Level: ${level}
┃ 🎖️ Rank: ${getRank(level)}
┃ ⚡ Commands: ${profile.commandsUsed || 0}
┃ 👁️ Profile Views: ${profile.profileViews}
┃
╰━━━━━━━━━━━━━━━━━━╯

> ${FOOTER}
`.trim();

            // Use the target's WhatsApp profile picture if available
            try {
                const picture = await conn.profilePictureUrl(
                    target,
                    "image"
                );

                await conn.sendMessage(
                    from,
                    {
                        image: { url: picture },
                        caption: card
                    },
                    { quoted: mek }
                );
            } catch {
                await reply(card);
            }
        } catch (error) {
            console.error("NIKKA PROFILE ERROR:", error);
            await reply("❌ Profile එක ලබාගැනීමට නොහැකි වුණා.");
        }
    }
);

// ======================================
// .setbio Your bio
// ======================================

cmd(
    {
        pattern: "setbio",
        desc: "Change your profile bio",
        category: "main",
        filename: __filename
    },
    async (conn, mek, m, { reply, text, pushName }) => {
        try {
            const sender = getUserId(mek, m);
            const bio = (text || "").trim();

            if (!sender) return reply("❌ User ID එක හොයාගන්න බැහැ.");

            if (!bio) {
                return reply(
                    "📝 Bio එකක් ඇතුළත් කරන්න.\n\nඋදාහරණය:\n.setbio Hello, I'm a NIKKA user!"
                );
            }

            if (bio.length > 150) {
                return reply("❌ Bio එක අකුරු 150කට සීමා කරන්න.");
            }

            const db = loadDB();
            const profile = getProfile(db, sender, pushName);

            profile.bio = bio;

            saveDB(db);

            await reply(
                `✅ *PROFILE BIO UPDATED*\n\n📝 ${bio}\n\n> ${FOOTER}`
            );
        } catch (error) {
            console.error("NIKKA SETBIO ERROR:", error);
            await reply("❌ Bio එක update කරන්න බැරි වුණා.");
        }
    }
);

// ======================================
// .setname Your name
// ======================================

cmd(
    {
        pattern: "setname",
        desc: "Change your profile display name",
        category: "main",
        filename: __filename
    },
    async (conn, mek, m, { reply, text, pushName }) => {
        try {
            const sender = getUserId(mek, m);
            const name = (text || "").trim();

            if (!sender) return reply("❌ User ID එක හොයාගන්න බැහැ.");

            if (!name) {
                return reply(
                    "✍️ නමක් ඇතුළත් කරන්න.\n\nඋදාහරණය:\n.setname NIKKA USER"
                );
            }

            if (name.length > 40) {
                return reply("❌ නම අකුරු 40කට සීමා කරන්න.");
            }

            const db = loadDB();
            const profile = getProfile(db, sender, pushName);

            profile.name = name;

            saveDB(db);

            await reply(
                `✅ *PROFILE NAME UPDATED*\n\n👤 ${name}\n\n> ${FOOTER}`
            );
        } catch (error) {
            console.error("NIKKA SETNAME ERROR:", error);
            await reply("❌ නම update කරන්න බැරි වුණා.");
        }
    }
);

// ======================================
// .mystats
// ======================================

cmd(
    {
        pattern: "mystats",
        desc: "View your profile statistics",
        category: "main",
        filename: __filename
    },
    async (conn, mek, m, { reply, pushName }) => {
        try {
            const sender = getUserId(mek, m);

            if (!sender) return reply("❌ User ID එක හොයාගන්න බැහැ.");

            const db = loadDB();
            const profile = getProfile(db, sender, pushName);

            saveDB(db);

            await reply(`
╭━━〔 📊 *MY STATISTICS* 〕━━╮
┃
┃ 👤 ${profile.name}
┃ ⭐ Level: ${getLevel(profile.commandsUsed || 0)}
┃ 🏆 Rank: ${getRank(getLevel(profile.commandsUsed || 0))}
┃ ⚡ Commands: ${profile.commandsUsed || 0}
┃ 👁️ Profile Views: ${profile.profileViews || 0}
┃ 📅 Joined: ${formatDate(profile.joinedAt)}
┃
╰━━━━━━━━━━━━━━━━━━╯

> ${FOOTER}
`.trim());
        } catch (error) {
            console.error("NIKKA STATS ERROR:", error);
            await reply("❌ Statistics ලබාගැනීමට නොහැකි වුණා.");
        }
    }
);
