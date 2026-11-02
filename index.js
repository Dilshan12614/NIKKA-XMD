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
const axios = require('axios');
const path = require('path');
const qrcode = require('qrcode-terminal');
const { File } = require('megajs');

const config = require('./config');
const { sms, downloadMediaMessage } = require('./lib/msg');

const {
  getBuffer,
  getGroupAdmins,
  getRandom,
  h2k,
  isUrl,
  Json,
  runtime,
  sleep,
  fetchJson
} = require('./lib/functions');

const { commands, replyHandlers } = require('./command');

const app = express();
const port = process.env.PORT || 8000;

const prefix = '.';
const ownerNumber = ['94772194789'];

const authDir = path.join(__dirname, 'auth_info_baileys');
const credsPath = path.join(authDir, 'creds.json');

let socket;
let isConnecting = false;
let reconnectTimer = null;
let pluginsLoaded = false;

function normalizeSessionId(value) {
  if (!value) return '';

  let session = String(value).trim();

  if (session.startsWith('THENUVA-XMD=')) {
    session = session.slice('THENUVA-XMD='.length);
  }

  if (session.startsWith('https://mega.nz/')) {
    return session;
  }

  throw new Error(
    'SESSION_ID must contain a complete MEGA URL. The prefix alone is not a URL.'
  );
}

async function ensureSessionFile() {
  fs.mkdirSync(authDir, { recursive: true });

  if (fs.existsSync(credsPath)) {
    console.log('✅ Existing WhatsApp session found.');
    return true;
  }

  const sessionID = config.SESSION_ID || process.env.SESSION_ID;

  if (!sessionID) {
    console.error('❌ SESSION_ID is missing.');
    return false;
  }

  try {
    const megaURL = normalizeSessionId(sessionID);

    console.log('🔄 Downloading session from MEGA...');

    const filer = File.fromURL(megaURL);

    const data = await new Promise((resolve, reject) => {
      filer.download((err, buffer) => {
        if (err) return reject(err);
        resolve(buffer);
      });
    });

    if (!data || !data.length) {
      throw new Error('Downloaded session file is empty.');
    }

    const parsed = JSON.parse(data.toString());

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid session JSON.');
    }

    fs.writeFileSync(credsPath, JSON.stringify(parsed, null, 2));

    console.log('✅ Session downloaded successfully.');
    return true;

  } catch (error) {
    console.error('❌ SESSION ERROR:', error.message);
    return false;
  }
}

function loadPlugins() {
  if (pluginsLoaded) return;

  const pluginsDir = path.join(__dirname, 'plugins');

  if (!fs.existsSync(pluginsDir)) {
    console.log('⚠️ Plugins folder not found.');
    return;
  }

  const files = fs.readdirSync(pluginsDir)
    .filter(file => path.extname(file).toLowerCase() === '.js');

  for (const plugin of files) {
    try {
      const pluginPath = path.join(pluginsDir, plugin);

      delete require.cache[require.resolve(pluginPath)];
      require(pluginPath);

      console.log(`✅ Plugin loaded: ${plugin}`);

    } catch (error) {
      console.error(`❌ Plugin Error (${plugin}):`, error.message);
    }
  }

  pluginsLoaded = true;
  console.log(`🧬 Total plugins loaded: ${files.length}`);
}

async function connectToWA() {
  if (isConnecting) return;

  isConnecting = true;

  try {
    console.log('Connecting DANUWA-MD 🧬...');

    const { state, saveCreds } =
      await useMultiFileAuthState(authDir);

    const { version } = await fetchLatestBaileysVersion();

    socket = makeWASocket({
      logger: P({ level: 'silent' }),
      printQRInTerminal: false,
      browser: Browsers.macOS('Firefox'),
      auth: state,
      version,
      syncFullHistory: true,
      markOnlineOnConnect: true,
      generateHighQualityLinkPreview: true
    });

    socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log('📱 Scan this QR code:');
        qrcode.generate(qr, { small: true });
      }

      if (connection === 'connecting') {
        console.log('🔄 Connecting to WhatsApp...');
      }

      if (connection === 'open') {
        isConnecting = false;

        console.log('✅ DANUWA-MD connected to WhatsApp.');

        loadPlugins();

        try {
          await socket.sendMessage(
            ownerNumber[0] + '@s.whatsapp.net',
            {
              text: `DANUWA-MD connected ✅\n\nPREFIX: ${prefix}`
            }
          );
        } catch (error) {
          console.log('Owner notification failed:', error.message);
        }
      }

      if (connection === 'close') {
        isConnecting = false;

        const statusCode =
          lastDisconnect?.error?.output?.statusCode;

        if (statusCode === DisconnectReason.loggedOut) {
          console.log('❌ WhatsApp logged out. New authentication required.');
          return;
        }

        console.log('🔄 Connection closed. Reconnecting...');

        if (reconnectTimer) clearTimeout(reconnectTimer);

        reconnectTimer = setTimeout(() => {
          connectToWA();
        }, 5000);
      }
    });

    socket.ev.on('creds.update', saveCreds);

    socket.ev.on('messages.upsert', async ({ messages }) => {
      for (const mek of messages) {
        if (!mek || !mek.message) continue;

        try {
          if (mek.messageStubType === 68) {
            await socket.sendMessageAck(mek.key);
          }

          if (mek.key.remoteJid === 'status@broadcast') continue;

          const messageType = getContentType(mek.message);

          if (messageType === 'ephemeralMessage') {
            mek.message = mek.message.ephemeralMessage.message;
          }

          const m = sms(socket, mek);
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
            ? body.slice(prefix.length).trim().split(/\s+/)[0].toLowerCase()
            : '';

          const args = body.trim().split(/\s+/).slice(1);
          const q = args.join(' ');

          const sender = mek.key.fromMe
            ? socket.user.id
            : (mek.key.participant || mek.key.remoteJid);

          const senderNumber = sender.split('@')[0].split(':')[0];

          const isGroup = from.endsWith('@g.us');

          const botNumber = socket.user.id.split(':')[0];
          const pushname = mek.pushName || 'User';

          const isMe = botNumber === senderNumber;

          const isOwner =
            ownerNumber.includes(senderNumber) || isMe;

          const botNumber2 = await jidNormalizedUser(socket.user.id);

          const groupMetadata = isGroup
            ? await socket.groupMetadata(from).catch(() => null)
            : null;

          const groupName = groupMetadata?.subject || '';

          const participants = groupMetadata?.participants || [];

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
            socket.sendMessage(from, { text }, { quoted: mek });

          if (isCmd) {
            const cmd = commands.find(c =>
              c.pattern === commandName ||
              (c.alias && c.alias.includes(commandName))
            );

            if (cmd) {
              if (cmd.react) {
                await socket.sendMessage(from, {
                  react: {
                    text: cmd.react,
                    key: mek.key
                  }
                }).catch(() => {});
              }

              try {
                await cmd.function(socket, mek, m, {
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
                console.error('[COMMAND ERROR]', error);
                await reply('❌ Command error: ' + error.message);
              }
            }
          }

          for (const handler of replyHandlers) {
            try {
              if (handler.filter(body, {
                sender,
                message: mek
              })) {
                await handler.function(socket, mek, m, {
                  from,
                  quoted: mek,
                  body,
                  sender,
                  reply
                });

                break;
              }
            } catch (error) {
              console.error('[REPLY HANDLER ERROR]', error);
            }
          }

        } catch (error) {
          console.error('[MESSAGE ERROR]', error);
        }
      }
    });

  } catch (error) {
    isConnecting = false;
    console.error('❌ CONNECTION ERROR:', error);

    if (reconnectTimer) clearTimeout(reconnectTimer);

    reconnectTimer = setTimeout(connectToWA, 5000);
  }
}

app.get('/', (req, res) => {
  res.send('Hey, DANUWA-MD started ✅');
});

app.get('/health', (req, res) => {
  res.json({
    status: 'running',
    bot: 'DANUWA-MD'
  });
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});

(async () => {
  const ready = await ensureSessionFile();

  if (ready) {
    await connectToWA();
  } else {
    console.log('⚠️ WhatsApp connection not started. Check SESSION_ID.');
  }
})();
