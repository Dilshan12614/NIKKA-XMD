const { cmd } = require('../command');
const config = require('../config');

const BOT_NAME = 'NIKKA X MD';
const FOOTER = '> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ';
const OWNER_NUMBER = '94772194789';

let antiLinkEnabled = true;
const initializedConnections = new WeakSet();

const LINK_REGEX =
  /(?:https?:\/\/|www\.|chat\.whatsapp\.com\/|wa\.me\/|t\.me\/|telegram\.me\/|facebook\.com\/|fb\.me\/|instagram\.com\/|tiktok\.com\/|youtu\.be\/|youtube\.com\/|discord\.gg\/|discord\.com\/invite\/)[^\s]*/i;

function normalizeNumber(value) {
  let number = String(value || '').replace(/\D/g, '');
  if (number.startsWith('0')) number = '94' + number.slice(1);
  return number;
}

function getOwnerNumbers() {
  return [
    OWNER_NUMBER,
    config.OWNER_NUMBER,
    config.DEV,
    config.OWNER,
    config.ownerNumber
  ]
    .filter(Boolean)
    .map(normalizeNumber)
    .filter(Boolean);
}

function getJidNumber(jid) {
  return String(jid || '')
    .split('@')[0]
    .split(':')[0]
    .replace(/\D/g, '');
}

function isOwnerJid(jid, conn, fromMe = false) {
  if (fromMe) return true;

  const number = normalizeNumber(getJidNumber(jid));
  const owners = getOwnerNumbers();
  const botNumber = normalizeNumber(getJidNumber(conn?.user?.id));

  return Boolean(
    (number && owners.includes(number)) ||
    (number && botNumber && number === botNumber)
  );
}

function getMessageText(message) {
  const msg = message?.message;
  if (!msg) return '';

  return (
    msg.conversation ||
    msg.extendedTextMessage?.text ||
    msg.imageMessage?.caption ||
    msg.videoMessage?.caption ||
    msg.documentMessage?.caption ||
    msg.buttonsResponseMessage?.selectedDisplayText ||
    msg.listResponseMessage?.title ||
    msg.templateButtonReplyMessage?.selectedDisplayText ||
    msg.interactiveResponseMessage?.body?.text ||
    ''
  );
}

function makePanel(title, lines = []) {
  return [
    '╭━━━『 🤍 ɴɪᴋᴋᴀ x ᴍᴅ 🤍 』━━━╮',
    '┃',
    `┃  ✨ *${title}*`,
    '┃',
    ...lines.map(line => `┃  ${line}`),
    '┃',
    '╰━━━━━━━━━━━━━━━━━━━━━━╯',
    '',
    '      🤍 ──「 ᴀɴᴛɪʟɪɴᴋ ɴᴏᴛɪᴄᴇ 」── 🤍',
    FOOTER
  ].join('\n');
}

async function sendWarning(conn, jid, text) {
  try {
    await conn.sendMessage(jid, { text });
  } catch (error) {
    console.error('[ANTILINK WARNING ERROR]', error.message);
  }
}

async function isGroupAdmin(conn, groupJid, participantJid) {
  try {
    const metadata = await conn.groupMetadata(groupJid);
    const participant = metadata.participants?.find(item =>
      item.id === participantJid ||
      getJidNumber(item.id) === getJidNumber(participantJid)
    );

    return Boolean(
      participant &&
      (participant.admin === 'admin' ||
       participant.admin === 'superadmin')
    );
  } catch (error) {
    console.error('[ANTILINK ADMIN CHECK ERROR]', error.message);
    return false;
  }
}

async function handleIncomingMessages(conn, messages) {
  if (!antiLinkEnabled) return;

  for (const message of messages || []) {
    try {
      const key = message?.key;
      const chatJid = key?.remoteJid;

      if (!key || !chatJid || !chatJid.endsWith('@g.us')) continue;
      if (message.message?.protocolMessage) continue;

      const text = getMessageText(message);
      if (!text || !LINK_REGEX.test(text)) continue;

      const senderJid =
        key.participant ||
        (key.fromMe ? conn.user?.id : chatJid);

      // Group admins bypass AntiLink, but Owner does not.
      const senderIsOwner = isOwnerJid(senderJid, conn, key.fromMe);
      const senderIsAdmin = await isGroupAdmin(conn, chatJid, senderJid);

      if (senderIsAdmin && !senderIsOwner) continue;

      // Delete the link message, including the Owner's message.
      try {
        await conn.sendMessage(chatJid, { delete: key });
      } catch (error) {
        console.error('[ANTILINK DELETE ERROR]', error.message);

        await sendWarning(
          conn,
          chatJid,
          makePanel('ANTILINK WARNING', [
            '🔗 Link එකක් හඳුනාගත්තා!',
            '❌ Message එක delete කරන්න බැරි වුණා.',
            '🤖 Bot එකට group admin permission ලබා දෙන්න.'
          ])
        );
        continue;
      }

      if (senderIsOwner) {
        await sendWarning(
          conn,
          chatJid,
          makePanel('OWNER ANTILINK WARNING', [
            '👑 *NIKKA X MD Owner*',
            '🔗 ඔබ දැමූ link එකක් හඳුනාගත්තා!',
            '🗑️ Link message එක delete කළා.',
            '⚠️ Group එකේ link දැමීමෙන් වළකින්න.'
          ])
        );
      } else {
        await sendWarning(
          conn,
          chatJid,
          makePanel('ANTILINK WARNING', [
            '🚫 Group එකේ link දැමීම අවසර නැත!',
            `👤 Member: @${getJidNumber(senderJid)}`,
            '🗑️ Link message එක delete කළා.',
            '⚠️ නැවත link දැමීමෙන් වළකින්න.'
          ])
        );
      }
    } catch (error) {
      console.error('[ANTILINK MESSAGE ERROR]', error);
    }
  }
}

function initializeAntiLink(conn) {
  if (!conn || typeof conn !== 'object') return;
  if (initializedConnections.has(conn)) return;

  if (!conn.ev || typeof conn.ev.on !== 'function') {
    console.error('[ANTILINK] Connection event emitter unavailable.');
    return;
  }

  initializedConnections.add(conn);

  conn.ev.on('messages.upsert', async ({ messages }) => {
    await handleIncomingMessages(conn, messages);
  });

  console.log(`🤍 ${BOT_NAME} AntiLink listener initialized.`);
}

cmd({
  pattern: 'antilink',
  alias: ['antilinks'],
  react: '🔗',
  desc: 'Enable or disable AntiLink',
  category: 'group',
  filename: __filename
}, async (conn, mek, m, { reply, args }) => {
  try {
    initializeAntiLink(conn);

    const action = String(args?.[0] || '').toLowerCase();

    if (action === 'on') {
      antiLinkEnabled = true;
      return reply(
        makePanel('ANTILINK ENABLED', [
          '✅ AntiLink ක්‍රියාත්මකයි.',
          '🗑️ Owner ඇතුළු link දැමූ අයගේ messages delete කරනවා.',
          '⚠️ Link දැමූ අයට warning යවනවා.',
          '🛡️ Owner හැර group adminsලා bypass.'
        ])
      );
    }

    if (action === 'off') {
      antiLinkEnabled = false;
      return reply(
        makePanel('ANTILINK DISABLED', [
          '❌ AntiLink අක්‍රිය කළා.'
        ])
      );
    }

    return reply(
      makePanel('ANTILINK SETTINGS', [
        `📌 Status: ${antiLinkEnabled ? '✅ ON' : '❌ OFF'}`,
        '➤ .antilink on',
        '➤ .antilink off',
        '👑 Ownerටත් AntiLink ක්‍රියාත්මකයි.',
        '🛡️ Owner හැර group adminsලා bypass.'
      ])
    );
  } catch (error) {
    console.error('[ANTILINK COMMAND ERROR]', error);

    return reply(
      makePanel('ANTILINK ERROR', [
        `❌ ${error.message || 'Unknown error'}`
      ])
    );
  }
});
