const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    jidNormalizedUser,
    getContentType,
    fetchLatestBaileysVersion,
    Browsers,
    downloadMediaMessage
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
const { getSettings } = require('./lib/botsettings');

const app = express();
const port = process.env.PORT || 8000;
const prefix = '.';

// =====================================
// OWNER CONFIGURATION
// =====================================

let ownerNumber = String(config.BOT_OWNER || '94772194789')
    .replace(/\D/g, '');

if (ownerNumber.startsWith('0')) {
    ownerNumber = '94' + ownerNumber.slice(1);
}

// =====================================
// PATHS
// =====================================

const authFolder = path.join(__dirname, 'auth_info_baileys');
const credsPath = path.join(authFolder, 'creds.json');
const settingsPath = path.join(__dirname, 'data', 'antidelete.json');

let isConnecting = false;
let reconnectTimer = null;
let reconnectAttempts = 0;
let pluginsLoaded = false;
let activeSocket = null;

// =====================================
// ANTIDELETE SETTINGS
// =====================================

function loadAntiDeleteSettings() {
    try {
        if (!fs.existsSync(settingsPath)) {
            return { gc: false, dm: false };
        }

        const data = JSON.parse(
            fs.readFileSync(settingsPath, 'utf8')
        );

        return {
            gc: Boolean(data.gc),
            dm: Boolean(data.dm)
        };
    } catch (error) {
        console.error('[ANTIDELETE SETTINGS]', error);
        return { gc: false, dm: false };
    }
}

global.antiDeleteSettings = loadAntiDeleteSettings();

// =====================================
// ANTIDELETE CACHE
// =====================================

const antiDeleteCache = new Map();
const MAX_CACHE = 500;
const CACHE_AGE = 24 * 60 * 60 * 1000;

function cacheAntiDeleteMessage(msg) {
    if (!msg?.message || !msg?.key?.id) return;

    if (msg.key.remoteJid === 'status@broadcast') return;

    const cacheKey = `${msg.key.remoteJid}:${msg.key.id}`;

    antiDeleteCache.set(cacheKey, {
        message: msg,
        timestamp: Date.now()
    });

    while (antiDeleteCache.size > MAX_CACHE) {
        const oldest = antiDeleteCache.keys().next().value;
        antiDeleteCache.delete(oldest);
    }
}

function getAntiDeleteMessage(key) {
    if (!key?.id || !key?.remoteJid) return null;

    const cacheKey = `${key.remoteJid}:${key.id}`;
    const cached = antiDeleteCache.get(cacheKey);

    if (!cached) return null;

    if (Date.now() - cached.timestamp > CACHE_AGE) {
        antiDeleteCache.delete(cacheKey);
        return null;
    }

    return cached.message;
}

// =====================================
// SESSION ID / MEGA URL
// =====================================

function getMegaUrl() {
    if (!config.SESSION_ID) {
        throw new Error('SESSION_ID is missing in config!');
    }

    let sessionId = String(config.SESSION_ID).trim();
    sessionId = sessionId.replace(/^THENUVA-XMD=/i, '');

    if (sessionId.includes('~')) {
        sessionId = sessionId.substring(sessionId.indexOf('~') + 1);
    }

    if (
        sessionId.startsWith('https://') ||
        sessionId.startsWith('http://')
    ) {
        return sessionId;
    }

    return `https://mega.nz/file/${sessionId}`;
}

// =====================================
// MEGA DOWNLOAD
// =====================================

function downloadMegaFile(url) {
    return new Promise((resolve, reject) => {
        try {
            const file = File.fromURL(url);

            file.loadAttributes((error) => {
                if (error) return reject(error);

                file.downloadBuffer((downloadError, buffer) => {
                    if (downloadError) return reject(downloadError);

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
// EXTRACT SESSION ZIP
// =====================================

function extractSessionZip(buffer) {
    fs.mkdirSync(authFolder, { recursive: true });

    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();

    if (!entries.length) {
        throw new Error('Session ZIP is empty!');
    }

    for (const entry of entries) {
        const target = path.resolve(authFolder, entry.entryName);

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

    const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));

    if (creds.registered !== true) {
        throw new Error('Session is not registered!');
    }

    console.log('✅ Complete Baileys session extracted!');
}

// =====================================
// CHECK SESSION
// =====================================

function hasValidSession() {
    try {
        if (!fs.existsSync(credsPath)) return false;

        const creds = JSON.parse(
            fs.readFileSync(credsPath, 'utf8')
        );

        return creds.registered === true;
    } catch {
        return false;
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

    for (const plugin of fs.readdirSync(pluginFolder)) {
        if (path.extname(plugin).toLowerCase() !== '.js') continue;

        try {
            require(path.join(pluginFolder, plugin));
            console.log(`✅ Plugin Loaded: ${plugin}`);
        } catch (error) {
            console.error(`❌ Plugin Error (${plugin}):`, error);
        }
    }

    pluginsLoaded = true;
    console.log('✅ DANUWA-MD Plugins Loaded!');
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
// ANTIDELETE HANDLER
// =====================================

async function handleAntiDelete(nikka, updates) {
    for (const event of updates) {
        try {
            const protocol = event.update?.message?.protocolMessage;

            if (!protocol || protocol.type !== 0) continue;

            const deletedKey = protocol.key;

            if (!deletedKey?.id || !deletedKey?.remoteJid) continue;

            const chat = deletedKey.remoteJid;

            if (chat === 'status@broadcast') continue;

            const isGroup = chat.endsWith('@g.us');
            const settings = global.antiDeleteSettings || {};

            if (isGroup && !settings.gc) continue;
            if (!isGroup && !settings.dm) continue;

            const original = getAntiDeleteMessage(deletedKey);

            if (!original) {
                console.log(
                    '⚠️ AntiDelete: Original message not cached.'
                );
                continue;
            }

            const cacheKey = `${chat}:${deletedKey.id}`;
            antiDeleteCache.delete(cacheKey);

            const sender =
                deletedKey.participant ||
                original.key.participant ||
                original.key.remoteJid;

            if (!sender) continue;

            const content = original.message;
            const type = getContentType(content);

            if (!type) continue;

            const senderTag = sender.split('@')[0];

            const header =
                '*╭━━━〔 🛡️ DANUWA-MD 〕━━━┈⊷*\n' +
                '┃\n' +
                `┃ 👤 Sender: @${senderTag}\n` +
                `┃ 📍 Chat: ${isGroup ? 'Group' : 'Personal'}\n` +
                '┃\n' +
                '*╰━━━━━━━━━━━━━━━━━━┈⊷*\n\n';

            const mentions = { mentions: [sender] };

            // Skip view-once messages
            if (
                content.viewOnceMessage ||
                content.viewOnceMessageV2 ||
                content.viewOnceMessageV2Extension
            ) {
                console.log(
                    'ℹ️ AntiDelete: View-once message skipped.'
                );
                continue;
            }

            const mediaTypes = [
                'imageMessage',
                'videoMessage',
                'audioMessage',
                'documentMessage',
                'stickerMessage'
            ];

            if (mediaTypes.includes(type)) {
                const buffer = await downloadMediaMessage(
                    original,
                    'buffer',
                    {},
                    {
                        logger: P({ level: 'silent' }),
                        reuploadRequest: (message) =>
                            nikka.updateMediaMessage(message)
                    }
                );

                if (!buffer?.length) {
                    throw new Error(
                        'Media download returned empty buffer'
                    );
                }

                const media = content[type];
                let output;

                switch (type) {
                    case 'imageMessage':
                        output = {
                            image: buffer,
                            caption: header + (media.caption || ''),
                            ...mentions
                        };
                        break;

                    case 'videoMessage':
                        output = {
                            video: buffer,
                            caption: header + (media.caption || ''),
                            ...mentions
                        };
                        break;

                    case 'audioMessage':
                        await nikka.sendMessage(chat, {
                            text: header,
                            ...mentions
                        });

                        output = {
                            audio: buffer,
                            mimetype: media.mimetype || 'audio/mpeg',
                            ptt: Boolean(media.ptt)
                        };
                        break;

                    case 'documentMessage':
                        output = {
                            document: buffer,
                            mimetype:
                                media.mimetype ||
                                'application/octet-stream',
                            fileName: media.fileName || 'deleted-file',
                            caption: header + (media.caption || ''),
                            ...mentions
                        };
                        break;

                    case 'stickerMessage':
                        await nikka.sendMessage(chat, {
                            text: header,
                            ...mentions
                        });

                        output = { sticker: buffer };
                        break;
                }

                await nikka.sendMessage(chat, output);

            } else {
                const textContent =
                    content.conversation ||
                    content.extendedTextMessage?.text ||
                    content.imageMessage?.caption ||
                    content.videoMessage?.caption ||
                    content.documentMessage?.caption ||
                    content.buttonsResponseMessage?.selectedDisplayText ||
                    content.listResponseMessage?.title ||
                    content.templateButtonReplyMessage?.selectedDisplayText ||
                    '';

                if (!textContent) continue;

                await nikka.sendMessage(chat, {
                    text: header + textContent,
                    ...mentions
                });
            }

            console.log(
                `✅ AntiDelete recovered: ${deletedKey.id}`
            );

        } catch (error) {
            console.error(
                '[ANTIDELETE RECOVERY ERROR]',
                error
            );
        }
    }
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

        const { version, isLatest } =
            await fetchLatestBaileysVersion();

        console.log('📦 Baileys Version:', version);
        console.log('📦 Latest:', isLatest);

        const nikka = makeWASocket({
            logger: P({ level: 'warn' }),
            printQRInTerminal: false,
            browser: Browsers.macOS('Firefox'),
            auth: state,
            version,
            syncFullHistory: false,
            markOnlineOnConnect: false,
            generateHighQualityLinkPreview: true,
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            keepAliveIntervalMs: 25000
        });

        activeSocket = nikka;

        // =====================================
        // CONNECTION UPDATE
        // =====================================

        nikka.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                console.log('⚠️ QR received.');
            }

            if (connection === 'connecting') {
                console.log('⏳ DANUWA-MD Connecting...');
            }

            if (connection === 'close') {
                isConnecting = false;

                const statusCode =
                    lastDisconnect?.error?.output?.statusCode;

                console.log('❌ WhatsApp Connection Closed!');
                console.log('Status Code:', statusCode);

                if (activeSocket === nikka) {
                    activeSocket = null;
                }

                if (
                    statusCode === DisconnectReason.loggedOut ||
                    statusCode === DisconnectReason.badSession
                ) {
                    console.log('❌ New session required.');
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
                console.log('================================');

                const up =
                    '╭━━━〔 DANUWA-MD 〕━━━┈⊷\n' +
                    '┃ 🟢 BOT CONNECTED\n' +
                    `┃ PREFIX : ${prefix}\n` +
                    '┃ STATUS : ONLINE\n' +
                    '╰━━━━━━━━━━━━━━━━━━┈⊷';

                if (ownerNumber) {
                    await nikka.sendMessage(
                        ownerNumber + '@s.whatsapp.net',
                        {
                            image: { url: config.ALIVE_IMG },
                            caption: up
                        }
                    ).catch(error => {
                        console.log(
                            '⚠️ Owner Notification Failed:',
                            error.message
                        );
                    });
                }

                // ALWAYS ONLINE
                const botSettings = getSettings();

                if (botSettings.alwaysonline) {
                    try {
                        await nikka.sendPresenceUpdate('available');
                        console.log('🟢 Always Online Enabled');
                    } catch (error) {
                        console.error(
                            '[ALWAYS ONLINE ERROR]',
                            error
                        );
                    }
                }

                loadPlugins();
            }
        });

        // SAVE SESSION
        nikka.ev.on('creds.update', saveCreds);

        // ANTIDELETE EVENT
        nikka.ev.on('messages.update', async (updates) => {
            await handleAntiDelete(nikka, updates);
        });

        // =====================================
        // MESSAGE HANDLER
        // =====================================

        nikka.ev.on('messages.upsert', async ({ messages }) => {

            // Cache incoming messages
            for (const msg of messages) {
                cacheAntiDeleteMessage(msg);

                if (msg.messageStubType === 68) {
                    await nikka.sendMessageAck(msg.key).catch(() => {});
                }
            }

            for (const mek of messages) {
                if (!mek?.message) continue;

                if (
                    getContentType(mek.message) === 'ephemeralMessage'
                ) {
                    mek.message = mek.message.ephemeralMessage.message;
                }

                if (mek.key.remoteJid === 'status@broadcast') continue;

                const m = sms(nikka, mek);
                const type = getContentType(mek.message);
                const from = mek.key.remoteJid;

                // =====================================
                // AUTO RECORDING / AUTO TYPING
                // =====================================

                if (!mek.key.fromMe) {
                    const currentSettings = getSettings();

                    try {
                        if (currentSettings.autorecord) {
                            await nikka.sendPresenceUpdate(
                                'recording',
                                from
                            );
                        } else if (currentSettings.autotyping) {
                            await nikka.sendPresenceUpdate(
                                'composing',
                                from
                            );
                        }
                    } catch (error) {
                        console.error(
                            '[AUTO PRESENCE ERROR]',
                            error
                        );
                    }
                }

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
                    : (mek.key.participant || mek.key.remoteJid);

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
                    ownerNumber === senderNumber || isMe;

                const botNumber2 = await jidNormalizedUser(
                    nikka.user.id
                );

                const groupMetadata = isGroup
                    ? await nikka.groupMetadata(from).catch(() => null)
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

                const reply = (text) => nikka.sendMessage(
                    from,
                    { text },
                    { quoted: mek }
                );

                // =====================================
                
                // =====================================
                // COMMAND HANDLER
                // =====================================

                if (isCmd) {
                    const cmd = commands.find((c) =>
                        c.pattern === commandName ||
                        (c.alias && c.alias.includes(commandName))
                    );

                    if (cmd) {

                        // OWNER SECURITY
                        if (
                            cmd.category === 'owner' &&
                            !isOwner
                        ) {
                            continue;
                        }

                        if (cmd.fromMe && !isOwner) {
                            continue;
                        }

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

                for (const handler of replyHandlers) {
                    if (
                        handler.filter(body, {
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
                                    body,
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
        });

    } catch (error) {
        isConnecting = false;
        console.error(
            '❌ DANUWA-MD Connection Error:',
            error
        );
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
    console.log(
        `🌐 DANUWA-MD Server listening on port ${port}`
    );
});

// =====================================
// START BOT
// =====================================

async function ensureSessionFile() {
    try {
        if (!hasValidSession()) {
            console.log('🔄 Downloading DANUWA-MD Session...');

            fs.rmSync(authFolder, {
                recursive: true,
                force: true
            });

            const megaUrl = getMegaUrl();
            const buffer = await downloadMegaFile(megaUrl);

            extractSessionZip(buffer);

            console.log('✅ DANUWA-MD Session Ready!');
        } else {
            console.log('✅ Existing valid session found!');
        }

        await connectToWA();

    } catch (error) {
        console.error('❌ SESSION ERROR:', error);
        process.exit(1);
    }
}

ensureSessionFile();
