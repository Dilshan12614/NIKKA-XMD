const { cmd } = require('../command');
const config = require('../config');
const fs = require('fs');
const path = require('path');

const ENV_PATH = path.join(process.cwd(), 'config.env');

const BOT_NAME = 'NIKKA X MD';
const NEWSLETTER_NAME = 'NIKKA X MD';
const NEWSLETTER_JID = '120363430604376029@newsletter';
const NEWSLETTER_MESSAGE_ID = 143;

const PANEL_IMAGE = 'https://i.ibb.co/Gfh06qLr/046ccbf06dee.jpg';

const FOOTER = '© ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ';

function cleanNumber(value) {
    return String(value || '').replace(/\D/g, '');
}

function isBotOwner(sender, conn) {
    const senderNumber = cleanNumber(
        String(sender || '').split('@')[0]
    );

    const owners = [
        config.OWNER_NUMBER,
        config.DEV
    ].map(cleanNumber).filter(Boolean);

    const botNumber = cleanNumber(
        conn?.user?.id
            ? conn.user.id.split(':')[0].split('@')[0]
            : ''
    );

    return owners.includes(senderNumber) ||
        (!!botNumber && senderNumber === botNumber);
}

function saveSetting(key, value) {
    let content = fs.existsSync(ENV_PATH)
        ? fs.readFileSync(ENV_PATH, 'utf8')
        : '';

    const lines = content ? content.split(/\r?\n/) : [];
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(
        '^\\s*(?:export\\s+)?' + escaped + '\\s*='
    );

    const line = `${key}=${String(value).replace(/\r?\n/g, '\\n')}`;
    let found = false;

    for (let i = 0; i < lines.length; i++) {
        if (regex.test(lines[i])) {
            lines[i] = line;
            found = true;
            break;
        }
    }

    if (!found) {
        if (lines.length && lines[lines.length - 1] !== '') {
            lines.push('');
        }
        lines.push(line);
    }

    fs.writeFileSync(
        ENV_PATH,
        lines.join('\n').replace(/\n*$/, '\n'),
        'utf8'
    );

    config[key] = String(value);
}

function status(value) {
    return String(value).toLowerCase() === 'true'
        ? '🟢 ON'
        : '⚪ OFF';
}

const settings = {
    antilink: {
        key: 'ANTI_LINK',
        label: 'Anti-Link'
    },
    antiviewonce: {
        key: 'ANTI_VV',
        label: 'Anti View Once'
    },
    statusseen: {
        key: 'AUTO_STATUS_SEEN',
        label: 'Status Seen'
    },
    statusreact: {
        key: 'AUTO_STATUS_REACT',
        label: 'Status React'
    },
    alwaysonline: {
        key: 'ALWAYS_ONLINE',
        label: 'Always Online'
    },
    autotyping: {
        key: 'AUTO_TYPING',
        label: 'Auto Typing'
    },
    autorecording: {
        key: 'AUTO_RECORDING',
        label: 'Auto Recording'
    },
    autoreact: {
        key: 'AUTO_REACT',
        label: 'Auto React'
    },
    antidelete: {
        key: 'ANTI_DELETE',
        label: 'Anti Delete'
    },
    autoread: {
        key: 'READ_MESSAGE',
        label: 'Auto Read'
    }
};

function makePanel(title, lines = []) {
    return [
        '╭━━━〔 🤍 NIKKA X MD 🤍 〕━━━╮',
        '┃',
        `┃  ✨ *${title}*`,
        '┃',
        ...lines.map(line => `┃  ${line}`),
        '┃',
        '╰━━━━━━━━━━━━━━━━━━━━━━╯',
        '',
        FOOTER
    ].join('\n');
}

function getSettingsPanel() {
    return [
        '╭━━━〔 🤍 NIKKA X MD 🤍 〕━━━╮',
        '┃',
        '┃  ⚙️ *NIKKA X MD SETTING PANEL*',
        '┃  ✨ Owner Control Centre',
        '┃',
        '┣━━〔 🛡️ SECURITY SETTINGS 〕━➤',
        `┃  ↳ 🔗 Anti-Link      : ${status(config.ANTI_LINK)}`,
        `┃  ↳ 👁️ Anti View Once : ${status(config.ANTI_VV)}`,
        `┃  ↳ 🗑️ Anti Delete    : ${status(config.ANTI_DELETE)}`,
        '┃',
        '┣━━〔 🤖 AUTOMATION SETTINGS 〕━➤',
        `┃  ↳ 📖 Status Seen    : ${status(config.AUTO_STATUS_SEEN)}`,
        `┃  ↳ 💗 Status React   : ${status(config.AUTO_STATUS_REACT)}`,
        `┃  ↳ 🟢 Always Online  : ${status(config.ALWAYS_ONLINE)}`,
        `┃  ↳ ⌨️ Auto Typing    : ${status(config.AUTO_TYPING)}`,
        `┃  ↳ 🎙️ Auto Recording : ${status(config.AUTO_RECORDING)}`,
        `┃  ↳ ✨ Auto React     : ${status(config.AUTO_REACT)}`,
        `┃  ↳ 📩 Auto Read      : ${status(config.READ_MESSAGE)}`,
        '┃',
        '┣━━〔 🌐 MODE SETTINGS 〕━➤',
        `┃  ↳ Current Mode: ${config.MODE || 'public'}`,
        '┃  ➤ .set mode public',
        '┃  ➤ .set mode private',
        '┃  ➤ .set mode groups',
        '┃',
        '┣━━〔 🧰 CONTROL COMMANDS 〕━➤',
        '┃  ➤ .set antilink on/off',
        '┃  ➤ .set antiviewonce on/off',
        '┃  ➤ .set statusseen on/off',
        '┃  ➤ .set statusreact on/off',
        '┃  ➤ .set alwaysonline on/off',
        '┃  ➤ .set autotyping on/off',
        '┃  ➤ .set autorecording on/off',
        '┃  ➤ .set autoreact on/off',
        '┃  ➤ .set antidelete on/off',
        '┃  ➤ .set autoread on/off',
        '┃',
        '╰━━━━━━━━━━━━━━━━━━━━━━━➤',
        '',
        '💾 Settings are saved to config.env',
        FOOTER
    ].join('\n');
}

async function sendPanel(conn, from, quoted, text) {
    return conn.sendMessage(
        from,
        {
            image: { url: PANEL_IMAGE },
            caption: text,
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                newsletterJid: '120363430604376029@newsletter',
                newsletterName: 'NIKKA XMD',
                 serverMessageId: 143
                }
            }
        },
        { quoted }
    );
}

// SETTINGS PANEL
cmd({
    pattern: 'setting',
    alias: ['settings', 'settingmenu', 'panel'],
    desc: 'Show NIKKA X MD Setting Panel',
    category: 'owner',
    filename: __filename
}, async (conn, m, store, { from, reply, sender }) => {
    if (!isBotOwner(sender, conn)) {
        return reply(makePanel('ACCESS DENIED', [
            '❌ මෙම command එක Owner සඳහා පමණි.'
        ]));
    }

    try {
        return await sendPanel(
            conn,
            from,
            m,
            getSettingsPanel()
        );
    } catch (error) {
        console.error('[NIKKA X MD SETTING PANEL]', error);
        return reply('❌ Setting Panel එක යැවීමට නොහැකි වුණා. Console logs බලන්න.');
    }
});

// CHANGE SETTINGS
cmd({
    pattern: 'set',
    alias: ['setconfig'],
    desc: 'Change NIKKA X MD settings',
    category: 'owner',
    filename: __filename
}, async (conn, m, store, { from, q, reply, sender }) => {
    if (!isBotOwner(sender, conn)) {
        return reply('❌ මෙම command එක Owner සඳහා පමණි.');
    }

    if (!q || !q.trim()) {
        return reply(makePanel('SETTING HELP', [
            '➤ .setting',
            '➤ .set antilink on',
            '➤ .set autoread off',
            '➤ .set mode public'
        ]));
    }

    const input = q.trim();
    const firstSpace = input.search(/\s/);

    if (firstSpace < 0) {
        return reply('❌ Setting එක සහ value එක දෙන්න.');
    }

    const key = input.slice(0, firstSpace)
        .toLowerCase()
        .replace(/[-_]/g, '');

    const rawValue = input.slice(firstSpace).trim();

    if (!rawValue) {
        return reply('❌ Value එක හිස්ව තියන්න බැහැ.');
    }

    try {
        if (key === 'mode') {
            const mode = rawValue.toLowerCase();

            if (!['public', 'private', 'groups'].includes(mode)) {
                return reply(makePanel('INVALID MODE', [
                    '❌ public / private / groups වලින් එකක් තෝරන්න.'
                ]));
            }

            saveSetting('MODE', mode);

            return sendPanel(
                conn,
                from,
                m,
                makePanel('MODE UPDATED', [
                    `🌐 New Mode: ${mode}`,
                    '💾 config.env එකට save කළා.',
                    '⚠️ සමහර handlers සඳහා restart අවශ්‍ය විය හැක.'
                ])
            );
        }

        const setting = settings[key];

        if (!setting) {
            return reply(makePanel('UNKNOWN SETTING', [
                `❌ Setting එක හඳුනාගන්න බැහැ: ${key}`,
                '📌 .setting මඟින් settings list එක බලන්න.'
            ]));
        }

        const value = rawValue.toLowerCase();

        if (!['true', 'false', 'on', 'off'].includes(value)) {
            return reply('❌ Value එක on/off හෝ true/false විය යුතුයි.');
        }

        const normalized = ['true', 'on'].includes(value)
            ? 'true'
            : 'false';

        saveSetting(setting.key, normalized);

        return sendPanel(
            conn,
            from,
            m,
            makePanel('SETTING UPDATED', [
                `⚙️ ${setting.label}: ${status(normalized)}`,
                '💾 config.env එකට save කළා.',
                '🤍 NIKKA X MD Settings'
            ])
        );
    } catch (error) {
        console.error('[NIKKA X MD SET ERROR]', error);

        return reply(makePanel('ERROR', [
            `❌ Save කරන්න බැරි වුණා: ${error.message}`
        ]));
    }
});
