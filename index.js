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
const AdmZip = require('adm-zip');
const { File } = require('megajs');

const config = require('./config');
const { sms } = require('./lib/msg');
const { getGroupAdmins } = require('./lib/functions');
const { commands, replyHandlers } = require('./command');

const app = express();
const port = process.env.PORT || 8000;

const prefix = '.';

// මෙතැන ඔයාගේ දැනට භාවිත කරන Owner number එක දාන්න.
const ownerNumber = ['94772194789'];

const authFolder = path.join(__dirname, 'auth_info_baileys');
const credsPath = path.join(authFolder, 'creds.json');

let isConnecting = false;
let reconnectTimer = null;
let reconnectAttempts = 0;
let pluginsLoaded = false;
let activeSocket = null;


// =====================================
// MEGA SESSION DOWNLOAD
// =====================================

function getMegaUrl() {
  if (!config.SESSION_ID) {
    throw new Error('SESSION_ID is missing in config!');
  }

  let sessionId = String(config.SESSION_ID).trim();

  // Remove website prefix, e.g. DENETH-MD~
  if (!sessionId.startsWith('https://') &&
      !sessionId.startsWith('http://')) {
    if (sessionId.includes('~')) {
      sessionId = sessionId.substring(
        sessionId.indexOf('~') + 1
      );
    }

    return `https://mega.nz/file/${sessionId}`;
  }

  return sessionId;
}


function downloadMegaFile(url) {
  return new Promise((resolve, reject) => {
    try {
      const file = File.fromURL(url);

      file.loadAttributes((error) => {
        if (error) {
          return reject(error);
        }

        file.downloadBuffer((downloadError, buffer) => {
          if (downloadError) {
            return reject(downloadError);
          }

          if (!buffer || !buffer.length) {
            return reject(
              new Error('Downloaded MEGA file is empty!')
            );
          }

          resolve(buffer);
        });
      });

    } catch (error) {
      reject(error);
    }
  });
}


// =====================================
// ZIP EXTRACTION
// =====================================

function extractSessionZip(buffer) {
  fs.mkdirSync(authFolder, { recursive: true });

  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();

  if (!entries.length) {
    throw new Error('Session ZIP is empty!');
  }

  // Prevent unsafe ZIP paths.
  for (const entry of entries) {
    const target = path.resolve(
      authFolder,
      entry.entryName
    );

    if (
      target !== authFolder &&
      !target.startsWith(authFolder + path.sep)
    ) {
      throw new Error('Invalid path inside session ZIP!');
    }
  }

  zip.extractAllTo(authFolder, true);

  if (!fs.existsSync(credsPath)) {
    throw new Error(
      'creds.json not found after extracting session ZIP!'
    );
  }

  // Check whether creds.json contains valid JSON.
  const creds = JSON.parse(
    fs.readFileSync(credsPath, 'utf8')
  );

  if (creds.registered !== true) {
    throw new Error(
      'Session is not registered. Generate a new paired session.'
    );
  }

  console.log('✅ Complete Baileys session extracted!');
  console.log('✅ Session credentials verified!');
}


// =====================================
// SESSION CHECK
// =====================================

function hasValidSession() {
  try {
    if (!fs.existsSync(credsPath)) {
      return false;
    }

    const creds = JSON.parse(
      fs.readFileSync(credsPath, 'utf8')
    );

    return creds.registered === true;

  } catch (error) {
    return false;
  }
}


// =====================================
// DOWNLOAD AND PREPARE SESSION
// =====================================

async function ensureSessionFile() {
  try {
    if (!hasValidSession()) {
      console.log('🔄 Downloading NIKKA X MD Session...');

      // Remove previous invalid ZIP-as-creds file.
      fs.rmSync(authFolder, {
        recursive: true,
        force: true
      });

      const megaUrl = getMegaUrl();

      console.log('☁️ Connecting to MEGA...');

      const buffer = await downloadMegaFile(megaUrl);

      console.log('📦 Session ZIP downloaded.');
      console.log('📦 Extracting session files...');

      extractSessionZip(buffer);

      console.log('✅ NIKKA X MD Session Ready!');

    } else {
      console.log('✅ Existing valid session found!');
    }

    await connectToWA();

  } catch (error) {
    console.error('❌ SESSION ERROR:', error);
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
        console.error(
          `❌ Plugin Error (${plugin}):`,
          error
        );
      }
    }
  }

  pluginsLoaded = true;

  console.log('================================');
  console.log('✅ NIKKA X MD Plugins Loaded!');
  console.log('================================');
}


// =====================================
// RECONNECT SYSTEM
// =====================================

function scheduleReconnect() {
  if (reconnectTimer) return;

  const delayTime = Math.min(
    5000 * Math.pow(2, reconnectAttempts),
    30000
  );

  reconnectAttempts++;

  console.log(
    `🔄 Reconnecting in ${delayTime / 1000} seconds...`
  );

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectToWA();
  }, delayTime);
}


// =====================================
// WHATSAPP CONNECTION
// =====================================

async function connectToWA() {
  if (isConnecting) return;

  isConnecting = true;

  console.log('Connecting NIKKA X MD 🧬...');

  try {
    const { state, saveCreds } =
      await useMultiFileAuthState(authFolder);

    console.log('🔐 Session state loaded.');

    const { version, isLatest } =
      await fetchLatestBaileysVersion();

    console.log('📦 Baileys Version:', version);
    console.log('📦 Latest Version:', isLatest);

    const nikka = makeWASocket({
      logger: P({ level: 'warn' }),

      printQRInTerminal: false,

      browser: Browsers.macOS('Firefox'),

      auth: state,

      version,

      syncFullHistory: false,

      markOnlineOnConnect: true,

      generateHighQualityLinkPreview: true
    });

    activeSocket = nikka;

    // =====================================
    // CONNECTION UPDATE
    // =====================================

    nikka.ev.on('connection.update', async (update) => {
      const {
        connection,
        lastDisconnect,
        qr
      } = update;

      if (qr) {
        console.log(
          '⚠️ QR received. The downloaded session may be invalid or expired.'
        );
      }

      if (connection === 'connecting') {
        console.log(
          '⏳ NIKKA X MD Connecting to WhatsApp...'
        );
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

        if (activeSocket === nikka) {
          activeSocket = null;
        }

        if (statusCode === DisconnectReason.loggedOut) {
          console.log('❌ WhatsApp Logged Out!');
          console.log(
            '⚠️ Generate a new session using WEB-PAIR.'
          );
          return;
        }

        if (
          statusCode === DisconnectReason.badSession
        ) {
          console.log(
            '❌ Invalid session. A new session is required.'
          );
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
        console.log('✅ NIKKA X MD CONNECTED!');
        console.log('✅ WhatsApp Connection Successful');
        console.log('================================');

        const up = `╭━━━〔 NIKKA X MD 〕━━━┈⊷
┃
┃ 🟢 BOT CONNECTED
┃
┃ PREFIX : ${prefix}
┃ STATUS : ONLINE
┃
╰━━━━━━━━━━━━━━━━━━┈⊷`;

        await nikka.sendMessage(
          ownerNumber[0] + '@s.whatsapp.net',
          {
            image: {
              url: 'https://github.com/DANUWA-MD/DANUWA-MD/blob/main/images/DANUWA-MD.png?raw=true'
            },
            caption: up
          }
        ).catch(error => {
          console.log(
            '⚠️ Owner Notification Failed:',
            error.message
          );
        });

        loadPlugins();
      }
    });


    // =====================================
    // SAVE SESSION UPDATES
    // =====================================

    nikka.ev.on('creds.update', saveCreds);


    // =====================================
    // MESSAGE HANDLER
    // =====================================

    nikka.ev.on(
      'messages.upsert',
      async ({ messages }) => {

        for (const msg of messages) {
          if (msg.messageStubType === 68) {
            await nikka.sendMessageAck(msg.key)
              .catch(() => {});
          }
        }

        const mek = messages[0];

        if (!mek || !mek.message) return;

        mek.message =
          getContentType(mek.message) === 'ephemeralMessage'
            ? mek.message.ephemeralMessage.message
            : mek.message;

        if (mek.key.remoteJid === 'status@broadcast') {
          return;
        }

        const m = sms(nikka, mek);
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
          ? body.slice(prefix.length)
              .trim()
              .split(' ')[0]
              .toLowerCase()
          : '';

        const args = body.trim().split(/ +/).slice(1);
        const q = args.join(' ');

        const sender = mek.key.fromMe
          ? nikka.user.id
          : (
              mek.key.participant ||
              mek.key.remoteJid
            );

        const senderNumber = sender
          .split('@')[0]
          .split(':')[0];

        const isGroup = from.endsWith('@g.us');

        const botNumber = nikka.user.id
          .split(':')[0]
          .split('@')[0];

        const pushname = mek.pushName || 'User';

        const isMe = botNumber === senderNumber;

        const isOwner =
          ownerNumber.includes(senderNumber) || isMe;

        const botNumber2 =
          await jidNormalizedUser(nikka.user.id);

        const groupMetadata = isGroup
          ? await nikka.groupMetadata(from)
              .catch(() => null)
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
          nikka.sendMessage(
            from,
            { text },
            { quoted: mek }
          );


        // =====================================
        // COMMAND HANDLER
        // =====================================

        if (isCmd) {
          const cmd = commands.find((c) =>
            c.pattern === commandName ||
            (
              c.alias &&
              c.alias.includes(commandName)
            )
          );

          if (cmd) {
            if (cmd.react) {
              await nikka.sendMessage(from, {
                react: {
                  text: cmd.react,
                  key: mek.key
                }
              }).catch(() => {});
            }

            try {
              await cmd.function(
                nikka,
                mek,
                m,
                {
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
                }
              );

            } catch (error) {
              console.error(
                '[PLUGIN ERROR]',
                error
              );

              await reply(
                '❌ Command Error: ' + error.message
              );
            }
          }
        }


        // =====================================
        // REPLY HANDLERS
        // =====================================

        const replyText = body;

        for (const handler of replyHandlers) {
          if (
            handler.filter(replyText, {
              sender,
              message: mek
            })
          ) {
            try {
              await handler.function(
                nikka,
                mek,
                m,
                {
                  from,
                  quoted: mek,
                  body: replyText,
                  sender,
                  reply
                }
              );

              break;

            } catch (error) {
              console.log(
                'Reply Handler Error:',
                error
              );
            }
          }
        }
      }
    );

  } catch (error) {
    isConnecting = false;

    console.error(
      '❌ NIKKA X MD Connection Error:',
      error
    );

    scheduleReconnect();
  }
}


// =====================================
// EXPRESS SERVER
// =====================================

app.get('/', (req, res) => {
  res.send('Hey, NIKKA X MD started ✅');
});

app.listen(port, () => {
  console.log(
    `🌐 NIKKA X MD Server listening on port ${port}`
  );
});


// =====================================
// START BOT
// =====================================

ensureSessionFile();
