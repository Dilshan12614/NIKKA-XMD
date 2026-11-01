const { cmd } = require('../command');

function getTargetJid(m, quoted, body) {
    // 1. Reply කරපු message එකේ sender
    const quotedJid =
        m?.quoted?.sender ||
        quoted?.sender ||
        m?.quoted?.participant;

    if (quotedJid && /@s\.whatsapp\.net$/.test(quotedJid)) {
        return quotedJid;
    }

    // 2. Command එකට number එකක් දීලා තිබුණොත්
    const args = String(body || '').trim().split(/\s+/);
    const number = (args[1] || '').replace(/\D/g, '');

    if (number.length >= 7 && number.length <= 15) {
        return `${number}@s.whatsapp.net`;
    }

    return null;
}

async function changeBlockStatus(
    conn,
    m,
    quoted,
    body,
    isOwner,
    reply,
    action
) {
    try {
        // Owner permission
        if (!isOwner) {
            return await reply(
                '╭─〔 *ᴀᴄᴄᴇss ᴅᴇɴɪᴇᴅ* 〕─●●►\n' +
                '│\n' +
                '│ ➤ ᴏᴡɴᴇʀ ᴏɴʟʏ ᴄᴏᴍᴍᴀɴᴅ\n' +
                '│\n' +
                '╰────────────────●●►'
            );
        }

        const jid = getTargetJid(m, quoted, body);

        if (!jid) {
            return await reply(
                '╭─〔 *ᴜsᴀɢᴇ* 〕─●●►\n' +
                '│\n' +
                '│ ➤ .block 947XXXXXXXX\n' +
                '│ ➤ .unblock 947XXXXXXXX\n' +
                '│\n' +
                '│ ➤ නැත්නම් user ගේ message එකකට\n' +
                '│    reply කරලා command එක යවන්න.\n' +
                '│\n' +
                '╰────────────────●●►'
            );
        }

        // Bot account එකම block/unblock කිරීම වළක්වන්න
        const botJid = conn.user?.id?.split(':')[0];
        const targetNumber = jid.split('@')[0];

        if (
            botJid &&
            targetNumber === botJid
        ) {
            return await reply('❌ Bot ගේම number එකට මේ command එක භාවිතා කරන්න බැහැ.');
        }

        await conn.updateBlockStatus(jid, action);

        const blocked = action === 'block';

        return await reply(
            '╭─〔 *' + (blocked ? 'ʙʟᴏᴄᴋ ᴘᴀɴᴇʟ' : 'ᴜɴʙʟᴏᴄᴋ ᴘᴀɴᴇʟ') + '* 〕─●●►\n' +
            '│\n' +
            '│ ➤ sᴛᴀᴛᴜs : ' + (blocked ? 'ʙʟᴏᴄᴋᴇᴅ ✅' : 'ᴜɴʙʟᴏᴄᴋᴇᴅ ✅') + '\n' +
            '│ ➤ ɴᴜᴍʙᴇʀ : ' + targetNumber + '\n' +
            '│\n' +
            '╰────────────────●●►\n\n' +
            
            '> ᴛʜᴇɴᴜᴠᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ Dilshan Ashinsa'
        );

    } catch (error) {
        console.error(`[${action.toUpperCase()} ERROR]`, error);

        return await reply(
            '❌ Command එක සාර්ථක වුණේ නැහැ.\n' +
            `Error: ${error.message}`
        );
    }
}

// BLOCK COMMAND
cmd(
    {
        pattern: 'block',
        alias: ['ban'],
        desc: 'Block a WhatsApp user',
        category: 'owner',
        filename: __filename
    },
    async (conn, mek, m, { quoted, body, isOwner, reply }) => {
        return changeBlockStatus(
            conn, m, quoted, body, isOwner, reply, 'block'
        );
    }
);

// UNBLOCK COMMAND
cmd(
    {
        pattern: 'unblock',
        alias: ['unban'],
        desc: 'Unblock a WhatsApp user',
        category: 'owner',
        filename: __filename
    },
    async (conn, mek, m, { quoted, body, isOwner, reply }) => {
        return changeBlockStatus(
            conn, m, quoted, body, isOwner, reply, 'unblock'
        );
    }
);
