const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    jidNormalizedUser,
    fetchLatestBaileysVersion,
    Browsers,
    getContentType
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

// OWNER
let ownerNumber = String(config.BOT_OWNER || '94772194789')
    .replace(/\D/g, '');

if (ownerNumber.startsWith('0')) {
    ownerNumber = '94' + ownerNumber.slice(1);
}

// PATHS
const authFolder = path.join(__dirname, 'auth_info_baileys');
const credsPath = path.join(authFolder, 'creds.json');

let isConnecting = false;
let reconnectTimer = null;
let reconnectAttempts = 0;
let pluginsLoaded = false;

// SESSION URL
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

// MEGA DOWNLOAD
function downloadMegaFile(url) {
    return new Promise((resolve, reject) => {
        try {
            const file = File.fromURL(url);

            file.loadAttributes(error => {
                if (error) return reject(error);

                file.downloadBuffer((downloadError, buffer) => {
                    if (downloadError) return reject(downloadError);

                    if (!buffer || !buffer.length) {
                        return reject(new Error('Downloaded file is empty!'));
                    }

                    resolve(buffer);
                });
            });
        } catch (error) {
            reject(error);
        }
    });
}

// EXTRACT SESSION
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
        throw new Error('creds.json not found!');
    }

    const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));

    if (creds.registered !== true) {
        throw new Error('Session is not registered!');
    }

    console.log('✅ Session extracted successfully!');
}

// CHECK SESSION
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

// PLUGIN LOADER
function loadPlugins() {
    if (pluginsLoaded) return;

    const pluginFolder = path.join(__dirname, 'plugins');

    if (!fs.existsSync(pluginFolder)) {
        console.log('⚠️ Plugins folder not found!');
        return;
    }

    const files = fs.readdirSync(pluginFolder);

    for (const plugin of files) {
        if (path.extname(plugin).toLowerCase() !== '.js') continue;

        try {
            require(path.join(pluginFolder, plugin));
            console.log(`✅ Plugin Loaded: ${plugin}`);
        } catch (error) {
            console.error(`❌ Plugin Error (${plugin}):`, error);
        }
    }

    pluginsLoaded = true;
    console.log('✅ NIKKA X MD Plugins Loaded!');
}

// RECONNECT
function scheduleReconnect() {
    if (reconnectTimer) return;

    const delayTime = Math.min(
        5000 * Math.pow(2, reconnectAttempts),
        30000
    );

    reconnectAttempts++;

    console.log(`🔄 Reconnecting in ${delayTime / 1000} seconds...`);

    reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connectToWA();
    }, delayTime);
}

// WHATSAPP CONNECTION
async function connectToWA() {
    if (isConnecting) return;

    isConnecting = true;

    console.log('Connecting NIKKA X MD 🧬...');

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

        nikka.ev.on('creds.update', saveCreds);

        nikka.ev.on('connection.update', async update => {
            const { connection, lastDisconnect } = update;

            if (connection === 'connecting') {
                console.log('⏳ NIKKA X MD Connecting...');
            }

            if (connection === 'close') {
                isConnecting = false;

                const statusCode =
                    lastDisconnect?.error?.output?.statusCode;

                console.log('❌ WhatsApp Connection Closed!');
                console.log('Status Code:', statusCode);

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
                console.log('✅ NIKKA X MD CONNECTED!');
                console.log('================================');

                const up =
                    '╭━━━〔 NIKKA X MD 〕━━━┈⊷\n' +
                    '┃ 🟢 BOT CONNECTED\n' +
                    `┃ PREFIX : ${prefix}\n` +
                    '┃ STATUS : ONLINE\n' +
                    '╰━━━━━━━━━━━━━━━━━━┈⊷';

                if (ownerNumber) {
                    await nikka.sendMessage(
                        ownerNumber + '@s.whatsapp.net',
                        {
                            text: up
                        }
                    ).catch(error => {
                        console.log(
                            '⚠️ Owner Notification Failed:',
                            error.message
                        );
                    });
                }

                loadPlugins();
            }
        });

        // MESSAGE HANDLER
        nikka.ev.on('messages.upsert', async ({ messages }) => {
            for (const mek of messages) {
                try {
                    if (!mek?.message) continue;

                    if (
                        getContentType(mek.message) === 'ephemeralMessage'
                    ) {
                        mek.message = mek.message.ephemeralMessage.message;
                    }

                    const from = mek.key.remoteJid;

                    if (!from || from === 'status@broadcast') continue;

                    const m = sms(nikka, mek);
                    const type = getContentType(mek.message);

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

                    const botNumber2 = jidNormalizedUser(nikka.user.id);

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

                    const reply = text => nikka.sendMessage(
                        from,
                        { text },
                        { quoted: mek }
                    );

                    // COMMAND HANDLER
                    if (isCmd) {
                        const cmd = commands.find(c =>
                            c.pattern === commandName ||
                            (c.alias && c.alias.includes(commandName))
                        );

                        if (cmd) {
                            if (
                                cmd.category === 'owner' &&
                                !isOwner
                            ) continue;

                            if (cmd.fromMe && !isOwner) continue;

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
                                console.error('[PLUGIN ERROR]', error);

                                await reply(
                                    '❌ Command Error: ' + error.message
                                );
                            }
                        }
                    }

                    // REPLY HANDLERS
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
                                console.log('Reply Handler Error:', error);
                            }
                        }
                    }

                } catch (error) {
                    console.error('[MESSAGE HANDLER ERROR]', error);
                }
            }
        });

    } catch (error) {
        isConnecting = false;

        console.error('❌ NIKKA X MD Connection Error:', error);

        scheduleReconnect();
    }
}

// EXPRESS SERVER
app.get('/', (req, res) => {
    res.send('Hey, NIKKA X MD started ✅');
});

app.listen(port, () => {
    console.log(`🌐 NIKKA X MD Server listening on port ${port}`);
});

// START BOT
async function ensureSessionFile() {
    try {
        if (!hasValidSession()) {
            console.log('🔄 Downloading NIKKA X MD Session...');

            fs.rmSync(authFolder, {
                recursive: true,
                force: true
            });

            const megaUrl = getMegaUrl();
            const buffer = await downloadMegaFile(megaUrl);

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

ensureSessionFile();
