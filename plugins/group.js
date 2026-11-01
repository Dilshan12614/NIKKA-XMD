const config = require('../config');
const { cmd } = require('../command');

const prefix = config.PREFIX || '.';

// fetchJson helper (No functions2.js required)
async function fetchJson(url) {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
    }

    return await response.json();
}

// UPDATE GROUP DESCRIPTION
cmd({
    pattern: "updategdesc",
    alias: ["upgdesc", "gdesc"],
    react: "📜",
    desc: "Change the group description.",
    category: "group",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isAdmins, isBotAdmins, q, reply }) => {
    try {
        if (!isGroup) return reply("❌ This command can only be used in groups.");
        if (!isAdmins) return reply("❌ Only group admins can use this command.");
        if (!isBotAdmins) return reply("❌ I need to be an admin.");
        if (!q) return reply("❌ Please provide a new group description.");

        await conn.groupUpdateDescription(from, q);
        return reply("✅ Group description has been updated.");
    } catch (e) {
        console.error(e);
        return reply("❌ Failed to update group description.");
    }
});

// UPDATE GROUP NAME
cmd({
    pattern: "updategname",
    alias: ["upgname", "gname"],
    react: "📝",
    desc: "Change the group name.",
    category: "group",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isAdmins, isBotAdmins, q, reply }) => {
    try {
        if (!isGroup) return reply("❌ This command can only be used in groups.");
        if (!isAdmins) return reply("❌ Only group admins can use this command.");
        if (!isBotAdmins) return reply("❌ I need to be an admin.");
        if (!q) return reply("❌ Please provide a new group name.");

        await conn.groupUpdateSubject(from, q);
        return reply(`✅ Group name updated to: *${q}*`);
    } catch (e) {
        console.error(e);
        return reply("❌ Failed to update group name.");
    }
});

// GROUP INFO
cmd({
    pattern: "ginfo",
    react: "🥏",
    alias: ["groupinfo"],
    desc: "Get group information.",
    category: "group",
    use: '.ginfo',
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isAdmins, isDev, participants, reply }) => {
    try {
        const data = await fetchJson(
            'https://raw.githubusercontent.com/JawadTech3/KHAN-DATA/refs/heads/main/MSG/mreply.json'
        );

        const msr = data.replyMsg;

        if (!isGroup) return reply(msr.only_gp);
        if (!isAdmins && !isDev) return reply(msr.you_adm);

        const metadata = await conn.groupMetadata(from);

        let ppUrl;
        try {
            ppUrl = await conn.profilePictureUrl(from, 'image');
        } catch {
            ppUrl = 'https://i.ibb.co/KhYC4FY/1221bc0bdd2354b42b293317ff2adbcf-icon.png';
        }

        const adminsList = (metadata.participants || participants || [])
            .filter(p => p.admin)
            .map((v, i) => `${i + 1}. @${v.id.split('@')[0]}`)
            .join('\n');

        const owner = metadata.owner
            ? metadata.owner.split('@')[0]
            : 'Unknown';

        const gdata = `*「 Group Information 」*

*${metadata.subject}*

*Group JID:* ${metadata.id}
*Participant Count:* ${metadata.size}
*Group Creator:* ${owner}
*Group Description:* ${metadata.desc || 'No description'}

*Group Admins:*
${adminsList || 'No admins found'}`;

        await conn.sendMessage(from, {
            image: { url: ppUrl },
            caption: gdata,
            mentions: (metadata.participants || [])
                .filter(p => p.admin)
                .map(p => p.id)
        }, { quoted: mek });

    } catch (e) {
        console.error("GINFO ERROR:", e);
        reply(`❌ Group info error:\n${e.message}`);
    }
});

// JOIN GROUP
cmd({
    pattern: "join",
    react: "📬",
    alias: ["joinme", "f_join"],
    desc: "Join a group using invite link.",
    category: "group",
    use: '.join <Group Link>',
    filename: __filename
}, async (conn, mek, m, { from, q, args, isCreator, isDev, isOwner, isMe, reply }) => {
    try {
        if (!isCreator && !isDev && !isOwner && !isMe) {
            return reply("❌ Owner only command.");
        }

        if (!q) return reply("*Please provide a WhatsApp group link.*");

        const match = q.match(/chat\.whatsapp\.com\/([a-zA-Z0-9]+)/);

        if (!match) return reply("❌ Invalid WhatsApp group link.");

        await conn.groupAcceptInvite(match[1]);

        return reply("✅ Successfully joined the group!");

    } catch (e) {
        console.error("JOIN ERROR:", e);
        reply(`❌ Join failed:\n${e.message}`);
    }
});

// LOCK GROUP
cmd({
    pattern: "lockgc",
    alias: ["lock"],
    react: "🔒",
    desc: "Lock the group.",
    category: "group",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isAdmins, isBotAdmins, reply }) => {
    try {
        if (!isGroup) return reply("❌ Group only command.");
        if (!isAdmins) return reply("❌ Admins only.");
        if (!isBotAdmins) return reply("❌ Bot must be admin.");

        await conn.groupSettingUpdate(from, "locked");
        reply("🔒 Group has been locked.");

    } catch (e) {
        console.error(e);
        reply("❌ Failed to lock group.");
    }
});

// CREATE NEW GROUP
cmd({
    pattern: "newgc",
    category: "group",
    desc: "Create a new group.",
    filename: __filename
}, async (conn, mek, m, { body, reply }) => {
    try {
        if (!body) {
            return reply(`Usage: ${prefix}newgc group_name;number1,number2`);
        }

        const [groupName, numbersString] = body.split(";");

        if (!groupName || !numbersString) {
            return reply(`Usage: ${prefix}newgc group_name;number1,number2`);
        }

        const participantNumbers = numbersString
            .split(",")
            .map(number => number.trim())
            .filter(number => /^\d+$/.test(number))
            .map(number => `${number}@s.whatsapp.net`);

        if (participantNumbers.length === 0) {
            return reply("❌ Please provide valid phone numbers.");
        }

        const group = await conn.groupCreate(
            groupName.trim(),
            participantNumbers
        );

        const inviteLink = await conn.groupInviteCode(group.id);

        await conn.sendMessage(group.id, {
            text: "Hello everyone! 👋"
        });

        reply(`✅ Group created successfully!\n\n🔗 https://chat.whatsapp.com/${inviteLink}`);

    } catch (e) {
        console.error(e);
        reply(`❌ Group creation failed:\n${e.message}`);
    }
});

// REMOVE MEMBERS BY COUNTRY CODE
cmd({
    pattern: "out",
    alias: ["ck", "kickcc", "removecode", "ccout"],
    desc: "Remove members by country code.",
    category: "admin",
    react: "❌",
    filename: __filename
}, async (conn, mek, m, { from, q, isGroup, isBotAdmins, reply, groupMetadata, senderNumber }) => {
    try {
        if (!isGroup) return reply("❌ Group only command.");

        const botOwner = conn.user.id.split(":")[0].split("@")[0];

        if (senderNumber !== botOwner) {
            return reply("❌ Only bot owner can use this command.");
        }

        if (!isBotAdmins) return reply("❌ Bot must be admin.");
        if (!q) return reply("❌ Provide a country code. Example: .out 94");

        const countryCode = q.trim();

        if (!/^\d+$/.test(countryCode)) {
            return reply("❌ Invalid country code.");
        }

        const participants = groupMetadata.participants || [];

        const targets = participants.filter(participant =>
            participant.id.split("@")[0].startsWith(countryCode) &&
            !participant.admin
        );

        if (targets.length === 0) {
            return reply(`❌ No members found with country code +${countryCode}`);
        }

        const jids = targets.map(p => p.id);

        await conn.groupParticipantsUpdate(from, jids, "remove");

        reply(`✅ Successfully removed ${targets.length} members with country code +${countryCode}`);

    } catch (e) {
        console.error("OUT ERROR:", e);
        reply(`❌ Failed:\n${e.message}`);
    }
});

// CREATE POLL
cmd({
    pattern: "poll",
    category: "group",
    desc: "Create a group poll.",
    filename: __filename
}, async (conn, mek, m, { from, body, reply }) => {
    try {
        if (!body) {
            return reply(`Usage: ${prefix}poll question;option1,option2`);
        }

        const [question, optionsString] = body.split(";");

        if (!question || !optionsString) {
            return reply(`Usage: ${prefix}poll question;option1,option2`);
        }

        const options = optionsString
            .split(",")
            .map(option => option.trim())
            .filter(Boolean);

        if (options.length < 2) {
            return reply("❌ Please provide at least two options.");
        }

        await conn.sendMessage(from, {
            poll: {
                name: question.trim(),
                values: options,
                selectableCount: 1
            }
        }, { quoted: mek });

    } catch (e) {
        console.error(e);
        reply(`❌ Poll error:\n${e.message}`);
    }
});

// REVOKE GROUP LINK
cmd({
    pattern: "revoke",
    react: "🖇️",
    alias: ["revokegrouplink", "resetglink", "revokelink", "f_revoke", "resetgclink"],
    desc: "Reset group invite link.",
    category: "group",
    use: '.revoke',
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isAdmins, isDev, isBotAdmins, reply }) => {
    try {
        if (!isGroup) return reply("❌ Group only command.");
        if (!isAdmins && !isDev) return reply("❌ Admins only.");
        if (!isBotAdmins) return reply("❌ Bot must be admin.");

        await conn.groupRevokeInvite(from);

        await conn.sendMessage(from, {
            text: "*Group invite link has been reset!* ⛔"
        }, { quoted: mek });

    } catch (e) {
        console.error(e);
        reply(`❌ Revoke error:\n${e.message}`);
    }
});

// HIDETAG
cmd({
    pattern: "hidetag",
    react: "🔊",
    desc: "Tag all group members.",
    category: "group",
    use: '.hidetag Hi',
    filename: __filename
}, async (conn, mek, m, { from, q, isGroup, isAdmins, isDev, participants, reply }) => {
    try {
        if (!isGroup) return reply("❌ Group only command.");
        if (!isAdmins && !isDev) return reply("❌ Admins only.");
        if (!q) return reply("❌ Please provide a message.");

        await conn.sendMessage(from, {
            text: q,
            mentions: (participants || []).map(p => p.id)
        }, { quoted: mek });

    } catch (e) {
        console.error(e);
        reply(`❌ Hidetag error:\n${e.message}`);
    }
});

// UNLOCK GROUP
cmd({
    pattern: "unlockgc",
    alias: ["unlock"],
    react: "🔓",
    desc: "Unlock the group.",
    category: "group",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isAdmins, isBotAdmins, reply }) => {
    try {
        if (!isGroup) return reply("❌ Group only command.");
        if (!isAdmins) return reply("❌ Admins only.");
        if (!isBotAdmins) return reply("❌ Bot must be admin.");

        await conn.groupSettingUpdate(from, "unlocked");
        reply("🔓 Group has been unlocked.");

    } catch (e) {
        console.error(e);
        reply("❌ Failed to unlock group.");
    }
});

// UNMUTE GROUP
cmd({
    pattern: "unmute",
    alias: ["groupunmute"],
    react: "🔊",
    desc: "Unmute the group.",
    category: "group",
    filename: __filename
}, async (conn, mek, m, { from, isGroup, isAdmins, isBotAdmins, reply }) => {
    try {
        if (!isGroup) return reply("❌ Group only command.");
        if (!isAdmins) return reply("❌ Admins only.");
        if (!isBotAdmins) return reply("❌ Bot must be admin.");

        await conn.groupSettingUpdate(from, "not_announcement");
        reply("🔊 Group has been unmuted.");

    } catch (e) {
        console.error(e);
        reply("❌ Failed to unmute group.");
    }
});
