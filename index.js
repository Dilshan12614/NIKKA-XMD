const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  jidNormalizedUser,
  getContentType,
  fetchLatestBaileysVersion,
  Browsers
} = require('@whiskeysockets/baileys');

const fs = require('fs');
const P = require('pino');
const express = require('express');
const path = require('path');
const { File } = require('megajs');

const config = require('./config');
const { sms } = require('./lib/msg');
const { getGroupAdmins } = require('./lib/functions');
const { commands, replyHandlers } = require('./command');

const app = express();
const port = process.env.PORT || 8000;

const prefix = '.';
const ownerNumber = ['94772194789'];

const authFolder = path.join(__dirname, 'auth_info_baileys');
const credsPath = path.join(authFolder, 'creds.json');

let isConnecting = false;
let reconnectTimer = null;
let reconnectAttempts = 0;
let pluginsLoaded = false;

let activeSocket = null;

// =====================================
// SESSION DOWNLOAD
// =====================================

async function ensureSessionFile() {
  try {
    if (!fs.existsSync(credsPath)) {

      if (!config.SESSION_ID) {
        console.error('❌ SESSION_ID is missing!');
        process.exit(1);
      }

      console.log('🔄 Downloading DANUWA-MD Session...');

      const sessdata = config.SESSION_ID.replace('THENUVA-XMD=', '');

      const filer = File.fromURL(
        `https://mega.nz/file/${sessdata}`
      );

      filer.download((err, data) => {
        if (err) {
          console.error('❌ Session Download Failed:', err);
          process.exit(1);
        }

        fs.mkdirSync(authFolder, { recursive: true });
        fs.writeFileSync(credsPath, data);

        console.log('✅ Session Downloaded Successfully!');

        connectToWA();
      });

    } else {
      console.log('✅ Existing Session Found!');
      connectToWA();
    }

  } catch (error) {
    console.error('❌ Session Error:', error);
    process.exit(1);
  }
}

// =====================================
// PLUGIN LOADER
// =====================================

function loadPlugins() {
  if (pluginsLoaded) return;

  const pluginFolder = path.join(__dirname, 'plugins');

  if (!fs.existsSync(pluginFolder)) {
    console.log('⚠️ Plugins folder not found!');
    return;
  }

  const pluginFiles = fs.readdirSync(pluginFolder);

  for (const plugin of pluginFiles) {
    if (path.extname(plugin).toLowerCase() === '.js') {
      try {
        require(path.join(pluginFolder, plugin));
        console.log(`✅ Plugin Loaded: ${plugin}`);
      } catch (error) {
        console.error(`❌ Plugin Error (${plugin}):`, error);
      }
    }
  }

  pluginsLoaded = true;
  console.log('✅ DANUWA-MD Plugins Loaded Successfully!');
}

// =====================================
// RECONNECT SYSTEM
// =====================================

function scheduleReconnect() {
  if (reconnectTimer) return;

  const delay = Math.min(
    5000 * Math.pow(2, reconnectAttempts),
    30000
  );

  reconnectAttempts++;

  console.log(
    `🔄 Reconnecting in ${delay / 1000} seconds...`
  );

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectToWA();
  }, delay);
}

// =====================================
// WHATSAPP CONNECTION
// =====================================

async function connectToWA() {

  if (isConnecting) return;

  isConnecting = true;

  console.log('Connecting DANUWA-MD 🧬...');

  try {

    const { state, saveCreds } =
      await useMultiFileAuthState(authFolder);

    const { version } = await fetchLatestBaileysVersion();

    const danuwa = makeWASocket({

      logger: P({ level: 'silent' }),

      printQRInTerminal: false,

      browser: Browsers.macOS('Firefox'),

      auth: state,

      version,

      syncFullHistory: false,

      markOnlineOnConnect: true,

      generateHighQualityLinkPreview: true

    });

    activeSocket = danuwa;

    // =====================================
    // CONNECTION UPDATE
    // =====================================

    danuwa.ev.on('connection.update', async (update) => {

      const { connection, lastDisconnect } = update;

      if (connection === 'connecting') {
        console.log('⏳ DANUWA-MD Connecting...');
      }

      if (connection === 'close') {

        isConnecting = false;

        const statusCode =
          lastDisconnect?.error?.output?.statusCode;

        console.log('❌ WhatsApp Connection Closed!');
        console.log('Status Code:', statusCode);
        console.log(
          'Reason:',
          lastDisconnect?.error?.message || 'Unknown'
        );

        if (activeSocket === danuwa) {
          activeSocket = null;
        }

        if (statusCode === DisconnectReason.loggedOut) {

          console.log('❌ WhatsApp Logged Out!');
          console.log('⚠️ A new session is required.');

          return;
        }

        scheduleReconnect();
      }

      if (connection === 'open') {

        isConnecting = false;
        reconnectAttempts = 0;

        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }

        console.log('================================');
        console.log('✅ DANUWA-MD CONNECTED!');
        console.log('✅ WhatsApp Connection Successful');
        console.log('================================');

        // OWNER NOTIFICATION

        const up = `╭━━━〔 DANUWA-MD 〕━━━┈⊷
┃
┃  🟢 BOT CONNECTED
┃
┃  PREFIX : ${prefix}
┃  STATUS : ONLINE
┃
╰━━━━━━━━━━━━━━━━━━┈⊷`;

        await danuwa.sendMessage(
          ownerNumber[0] + '@s.whatsapp.net',
          {
            image: {
              url: 'https://github.com/DANUWA-MD/DANUWA-MD/blob/main/images/DANUWA-MD.png?raw=true'
            },
            caption: up
          }
        ).catch(error => {
          console.log('⚠️ Owner Notification Failed:', error.message);
        });

        // LOAD PLUGINS

        loadPlugins();
      }
    });

    // =====================================
    // SAVE SESSION
    // =====================================

    danuwa.ev.on('creds.update', saveCreds);

    // =====================================
    // MESSAGE HANDLER
    // =====================================

    danuwa.ev.on('messages.upsert', async ({ messages }) => {

      for (const msg of messages) {
        if (msg.messageStubType === 68) {
          await danuwa.sendMessageAck(msg.key).catch(() => {});
        }
      }

      const mek = messages[0];

      if (!mek || !mek.message) return;

      mek.message =
        getContentType(mek.message) === 'ephemeralMessage'
          ? mek.message.ephemeralMessage.message
          : mek.message;

      if (mek.key.remoteJid === 'status@broadcast') return;

      const m = sms(danuwa, mek);

      const type = getContentType(mek.message);

      const from = mek.key.remoteJid;

      const body =
        type === 'conversation'
          ? mek.message.conversation
          : mek.message[type]?.text ||
            mek.message[type]?.caption ||
            '';

      const isCmd = body.startsWith(prefix);

      const commandName = isCmd
        ? body.slice(prefix.length).trim().split(' ')[0].toLowerCase()
        : '';

      const args = body.trim().split(/ +/).slice(1);

      const q = args.join(' ');

      const sender = mek.key.fromMe
        ? danuwa.user.id
        : (mek.key.participant || mek.key.remoteJid);

      const senderNumber = sender.split('@')[0].split(':')[0];

      const isGroup = from.endsWith('@g.us');

      const botNumber = danuwa.user.id.split(':')[0].split('@')[0];

      const pushname = mek.pushName || 'User';

      const isMe = botNumber === senderNumber;

      const isOwner =
        ownerNumber.includes(senderNumber) || isMe;

      const botNumber2 = await jidNormalizedUser(danuwa.user.id);

      const groupMetadata = isGroup
        ? await danuwa.groupMetadata(from).catch(() => null)
        : null;

      const groupName = isGroup
        ? groupMetadata?.subject || ''
        : '';

      const participants = isGroup
        ? groupMetadata?.participants || []
        : [];

      const groupAdmins = isGroup
        ? await getGroupAdmins(participants)
        : [];

      const isBotAdmins = isGroup
        ? groupAdmins.includes(botNumber2)
        : false;

      const isAdmins = isGroup
        ? groupAdmins.includes(sender)
        : false;

      const reply = (text) =>
        danuwa.sendMessage(
          from,
          { text },
          { quoted: mek }
        );

      // COMMAND HANDLER

      if (isCmd) {

        const cmd = commands.find((c) =>
          c.pattern === commandName ||
          (c.alias && c.alias.includes(commandName))
        );

        if (cmd) {

          if (cmd.react) {
            await danuwa.sendMessage(from, {
              react: {
                text: cmd.react,
                key: mek.key
              }
            }).catch(() => {});
          }

          try {

            await cmd.function(danuwa, mek, m, {

              from,
              quoted: mek,
              body,
              isCmd,
              command: commandName,
              args,
              q,

              isGroup,
              sender,
              senderNumber,

              botNumber2,
              botNumber,

              pushname,

              isMe,
              isOwner,

              groupMetadata,
              groupName,
              participants,
              groupAdmins,

              isBotAdmins,
              isAdmins,

              reply

            });

          } catch (error) {
            console.error('[PLUGIN ERROR]', error);
            await reply('❌ Command Error: ' + error.message);
          }
        }
      }

      // REPLY HANDLERS

      const replyText = body;

      for (const handler of replyHandlers) {

        if (handler.filter(replyText, {
          sender,
          message: mek
        })) {

          try {

            await handler.function(danuwa, mek, m, {
              from,
              quoted: mek,
              body: replyText,
              sender,
              reply
            });

            break;

          } catch (error) {
            console.log('Reply Handler Error:', error);
          }
        }
      }

    });

  } catch (error) {

    isConnecting = false;

    console.error('❌ DANUWA-MD Connection Error:', error);

    scheduleReconnect();
  }
}

// =====================================
// EXPRESS SERVER
// =====================================

app.get('/', (req, res) => {
  res.send('Hey, DANUWA-MD started ✅');
});

app.listen(port, () => {
  console.log(`🌐 Server listening on port ${port}`);
});

// =====================================
// START BOT
// =====================================

ensureSessionFile();
