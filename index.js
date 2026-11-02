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
const os = require('os');
const { execFileSync } = require('child_process');
const qrcode = require('qrcode-terminal');
const { File } = require('megajs');

const config = require('./config');

const { sms } = require('./lib/msg');
const { getGroupAdmins } = require('./lib/functions');
const { commands, replyHandlers } = require('./command');

const app = express();
app.use(express.json());

const port = process.env.PORT || 8000;
const prefix = config.PREFIX || '.';

const ownerNumber = [
    String(config.BOT_OWNER || '94772194789').replace(/\D/g, '')
];

const authDir = path.join(__dirname, 'auth_info_baileys');
const credsPath = path.join(authDir, 'creds.json');

let socket = null;
let isConnecting = false;
let pluginsLoaded = false;
let reconnectTimer = null;
let pairingRequested = false;
let pairNumber = '';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));


// ======================================
// MEGA SESSION RESTORE
// ======================================

async function ensureSessionFile() {
    fs.mkdirSync(authDir, { recursive: true });

    if (fs.existsSync(credsPath)) {
        try {
            JSON.parse(fs.readFileSync(credsPath, 'utf8'));
            console.log('✅ Existing session found.');
            return true;
        } catch {
            console.log('⚠️ Invalid existing creds.json.');
        }
    }

    const sessionID = config.SESSION_ID || process.env.SESSION_ID;

    if (!sessionID) {
        console.error('❌ SESSION_ID missing.');
        return false;
    }

    let tempDir;

    try {
        console.log('🔄 Downloading session from MEGA...');

        let clean = String(sessionID).trim();

        clean = clean.replace(
            /^(NIKKA-XMD|THENUVA-XMD)=/,
            ''
        );

        const match = clean.match(/^([^#]+)#(.+)$/);

        if (!match) {
            throw new Error('Invalid MEGA URL format.');
        }

        const megaURL =
            `https://mega.nz/file/${match[1]}#${match[2]}`;

        const filer = File.fromURL(megaURL);

        const data = await new Promise((resolve, reject) => {
            filer.download((err, buffer) => {
                if (err) return reject(err);
                resolve(buffer);
            });
        });

        if (!data || !data.length) {
            throw new Error('Empty MEGA download.');
        }

        tempDir = fs.mkdtempSync(
            path.join(os.tmpdir(), 'nikka-session-')
        );

        const zipPath = path.join(tempDir, 'session.zip');
        const extractDir = path.join(tempDir, 'extracted');

        fs.mkdirSync(extractDir, { recursive: true });
        fs.writeFileSync(zipPath, data);

        if (data[0] === 0x50 && data[1] === 0x4B) {
            console.log('📦 ZIP session detected.');

            execFileSync(
                'unzip',
                ['-o', zipPath, '-d', extractDir],
                { stdio: 'pipe' }
            );

            function findCreds(dir) {
                const entries = fs.readdirSync(dir, {
                    withFileTypes: true
                });

                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);

                    if (
                        entry.isFile() &&
                        entry.name === 'creds.json'
                    ) {
                        return fullPath;
                    }

                    if (entry.isDirectory()) {
                        const found = findCreds(fullPath);
                        if (found) return found;
                    }
                }

                return null;
            }

            const foundCreds = findCreds(extractDir);

            if (!foundCreds) {
                throw new Error('creds.json not found in ZIP.');
            }

            JSON.parse(fs.readFileSync(foundCreds, 'utf8'));

            fs.cpSync(path.dirname(foundCreds), authDir, {
                recursive: true,
                force: true
            });

        } else {
            const parsed = JSON.parse(data.toString('utf8'));

            fs.writeFileSync(
                credsPath,
                JSON.stringify(parsed, null, 2)
            );
        }

        if (!fs.existsSync(credsPath)) {
            throw new Error('creds.json missing after restore.');
        }

        JSON.parse(fs.readFileSync(credsPath, 'utf8'));

        console.log('✅ MEGA SESSION RESTORED!');
        return true;

    } catch (error) {
        console.error('❌ SESSION ERROR:', error.message);
        return false;

    } finally {
        if (tempDir && fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, {
                recursive: true,
                force: true
            });
        }
    }
}


// ======================================
// PLUGIN LOADER
// ======================================

function loadPlugins() {
    if (pluginsLoaded) return;

    const pluginsDir = path.join(__dirname, 'plugins');

    if (!fs.existsSync(pluginsDir)) {
        console.log('⚠️ Plugins folder not found.');
        return;
    }

    const pluginFiles = fs.readdirSync(pluginsDir)
        .filter(file => file.endsWith('.js'));

    let loaded = 0;

    for (const plugin of pluginFiles) {
        try {
            require(path.join(pluginsDir, plugin));
            loaded++;

            console.log(`✅ Plugin loaded: ${plugin}`);

        } catch (error) {
            console.error(
                `❌ Plugin Error (${plugin}):`,
                error.message
            );
        }
    }

    pluginsLoaded = true;

    console.log(`🧬 TOTAL PLUGINS LOADED: ${loaded}`);
    console.log(`🧬 TOTAL COMMANDS: ${commands.length}`);
}


// ======================================
// WHATSAPP CONNECTION
// ======================================

async function connectToWA() {
    if (isConnecting) return;

    isConnecting = true;

    try {
        console.log('🧬 Connecting DANUWA-MD...');

        const { state, saveCreds } =
            await useMultiFileAuthState(authDir);

        const { version } = await fetchLatestBaileysVersion();

        console.log('📦 Baileys version:', version.join('.'));

        socket = makeWASocket({
            logger: P({ level: 'silent' }),
            printQRInTerminal: false,
            browser: Browsers.macOS('Firefox'),
            auth: state,
            version,
            syncFullHistory: false,
            markOnlineOnConnect: true,
            generateHighQualityLinkPreview: true,
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            keepAliveIntervalMs: 25000
        });

        socket.ev.on('creds.update', saveCreds);

        // PAIR CODE

        if (!state.creds.registered && pairingRequested && pairNumber) {
            await delay(3000);

            try {
                const code = await socket.requestPairingCode(pairNumber);

                console.log('================================');
                console.log('📱 WHATSAPP PAIR CODE');
                console.log(code);
                console.log('================================');

                pairingRequested = false;

            } catch (error) {
                console.error('❌ PAIR ERROR:', error.message);
            }
        }

        // CONNECTION UPDATE

        socket.ev.on('connection.update', async update => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                console.log('📱 SCAN WHATSAPP QR CODE');
                qrcode.generate(qr, { small: true });
            }

            if (connection === 'connecting') {
                console.log('🔄 Connecting to WhatsApp...');
            }

            if (connection === 'open') {
                isConnecting = false;
                pairingRequested = false;

                console.log('✅ DANUWA-MD CONNECTED TO WHATSAPP');

                loadPlugins();

                try {
                    await socket.sendMessage(
                        ownerNumber[0] + '@s.whatsapp.net',
                        {
                            text: `DANUWA-MD connected ✅\nPREFIX: ${prefix}`
                        }
                    );
                } catch (error) {
                    console.log('Owner notification failed:', error.message);
                }
            }

            if (connection === 'close') {
                isConnecting = false;

                const error = lastDisconnect?.error;
                const statusCode = error?.output?.statusCode;

                console.error('❌ CONNECTION CLOSED');
                console.error('STATUS CODE:', statusCode);
                console.error('ERROR MESSAGE:', error?.message || 'Unknown error');

                if (statusCode === DisconnectReason.loggedOut) {
                    console.log('❌ Session logged out. New authentication required.');
                    return;
                }

                if (
                    statusCode === DisconnectReason.badSession
                ) {
                    console.log('❌ Invalid session. Re-authentication required.');
                    return;
                }

                if (reconnectTimer) {
                    clearTimeout(reconnectTimer);
                }

                console.log('🔄 Reconnecting in 10 seconds...');

                reconnectTimer = setTimeout(() => {
                    connectToWA();
                }, 10000);
            }
        });

        // MESSAGE HANDLER

        socket.ev.on('messages.upsert', async ({ messages }) => {
            for (const mek of messages) {
                if (!mek || !mek.message) continue;

                try {
                    if (mek.key.remoteJid === 'status@broadcast') continue;

                    let type = getContentType(mek.message);

                    if (type === 'ephemeralMessage') {
                        mek.message = mek.message.ephemeralMessage.message;
                        type = getContentType(mek.message);
                    }

                    const m = sms(socket, mek);
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
                            .split(/\s+/)[0]
                            .toLowerCase()
                        : '';

                    const args = body.trim().split(/\s+/).slice(1);
                    const q = args.join(' ');

                    const sender = mek.key.fromMe
                        ? socket.user.id
                        : (mek.key.participant || mek.key.remoteJid);

                    const senderNumber =
                        sender.split('@')[0].split(':')[0];

                    const isGroup = from.endsWith('@g.us');
                    const botNumber = socket.user.id.split(':')[0];
                    const pushname = mek.pushName || 'User';
                    const isMe = botNumber === senderNumber;

                    const isOwner =
                        ownerNumber.includes(senderNumber) || isMe;

                    const botNumber2 =
                        await jidNormalizedUser(socket.user.id);

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

                    const reply = text =>
                        socket.sendMessage(
                            from,
                            { text: String(text) },
                            { quoted: mek }
                        );

                    // COMMAND HANDLER

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
                                console.error(
                                    `[COMMAND ERROR: ${commandName}]`,
                                    error
                                );

                                await reply(
                                    '❌ Command Error: ' + error.message
                                ).catch(() => {});
                            }
                        }
                    }

                    // REPLY HANDLERS

                    for (const handler of replyHandlers) {
                        try {
                            if (
                                handler.filter(body, {
                                    sender,
                                    message: mek
                                })
                            ) {
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

        reconnectTimer = setTimeout(() => {
            connectToWA();
        }, 10000);
    }
}


// ======================================
// PAIR ROUTE
// ======================================

app.get('/pair', async (req, res) => {
    const number = String(req.query.number || '').replace(/\D/g, '');

    if (!number) {
        return res.status(400).send('Add phone number: /pair?number=947XXXXXXXX');
    }

    if (number.length < 10 || number.length > 15) {
        return res.status(400).send('Invalid phone number.');
    }

    if (socket?.user) {
        return res.status(400).send('Bot is already connected.');
    }

    if (isConnecting) {
        return res.status(409).send('Connection is already starting. Try again shortly.');
    }

    if (fs.existsSync(credsPath)) {
        return res.status(409).send('Existing session found. Remove old session before pairing a new number.');
    }

    pairingRequested = true;
    pairNumber = number;

    res.send('Pair code requested. Check GitHub Actions logs.');

    connectToWA();
});


// ======================================
// EXPRESS SERVER
// ======================================

app.get('/', (req, res) => {
    res.send('DANUWA-MD is running ✅');
});

app.get('/health', (req, res) => {
    res.json({
        status: 'running',
        bot: 'DANUWA-MD',
        connected: Boolean(socket?.user),
        plugins: pluginsLoaded,
        commands: commands.length
    });
});


// ======================================
// START BOT
// ======================================

app.listen(port, () => {
    console.log(`🌐 Server listening on port ${port}`);
});

(async () => {
    const ready = await ensureSessionFile();

    if (ready) {
        await connectToWA();
    } else {
        console.log('❌ Bot not connected. Check SESSION_ID.');
    }
})();
