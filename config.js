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

const {
    sms,
    downloadMediaMessage
} = require('./lib/msg');

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
app.use(express.json());

const port = process.env.PORT || 8000;
const prefix = config.PREFIX || '.';

const ownerNumber = [
    String(config.BOT_OWNER || '94772194789')
];

const authDir = path.join(__dirname, 'auth_info_baileys');
const credsPath = path.join(authDir, 'creds.json');

let socket = null;
let isConnecting = false;
let pluginsLoaded = false;
let reconnectTimer = null;
let pairingRequested = false;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));


// ======================================
// MEGA SESSION RESTORE
// ======================================

async function ensureSessionFile() {
    fs.mkdirSync(authDir, { recursive: true });

    if (fs.existsSync(credsPath)) {
        console.log('✅ Existing session found.');
        return true;
    }

    const sessionID =
        config.SESSION_ID || process.env.SESSION_ID;

    if (!sessionID) {
        console.error('❌ SESSION_ID is missing.');
        return false;
    }

    try {
        console.log('🔄 Downloading session from MEGA...');

        let clean = String(sessionID).trim();

        if (clean.startsWith('THENUVA-XMD=')) {
            clean = clean.substring('THENUVA-XMD='.length);
        }

        const match = clean.match(/^([^#]+)#(.+)$/);

        if (!match) {
            throw new Error('Invalid session format.');
        }

        const fileId = match[1];
        const fileKey = match[2];

        const megaURL =
            `https://mega.nz/file/${fileId}#${fileKey}`;

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

        const parsed = JSON.parse(data.toString());

        if (!parsed || typeof parsed !== 'object') {
            throw new Error('Invalid session JSON.');
        }

        fs.writeFileSync(
            credsPath,
            JSON.stringify(parsed, null, 2)
        );

        console.log('✅ Session restored successfully!');
        return true;

    } catch (error) {
        console.error('❌ SESSION ERROR:', error.message);
        return false;
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
            const pluginPath = path.join(pluginsDir, plugin);

            require(pluginPath);

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


        // ======================================
        // PAIR CODE
        // ======================================

        if (!state.creds.registered && pairingRequested) {
            const number = process.env.PAIR_NUMBER;

            if (number) {
                await delay(3000);

                try {
                    const code =
                        await socket.requestPairingCode(number.replace(/\D/g, ''));

                    console.log('================================');
                    console.log('📱 WHATSAPP PAIR CODE');
                    console.log(code);
                    console.log('================================');

                } catch (error) {
                    console.error(
                        '❌ Pair code error:',
                        error.message
                    );
                }
            }
        }


        // ======================================
        // CONNECTION UPDATE
        // ======================================

        socket.ev.on('connection.update', async update => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                console.log('📱 SCAN WHATSAPP QR CODE BELOW');
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
                            text:
                                `DANUWA-MD connected ✅\n\nPREFIX: ${prefix}`
                        }
                    );
                } catch (error) {
                    console.log(
                        'Owner notification failed:',
                        error.message
                    );
                }
            }

            if (connection === 'close') {
                isConnecting = false;

                const statusCode =
                    lastDisconnect?.error?.output?.statusCode;

                if (statusCode === DisconnectReason.loggedOut) {
                    console.log(
                        '❌ WhatsApp logged out. Authentication required.'
                    );
                    return;
                }

                console.log('🔄 Connection closed. Reconnecting...');

                if (reconnectTimer) {
                    clearTimeout(reconnectTimer);
                }

                reconnectTimer = setTimeout(() => {
                    connectToWA();
                }, 5000);
            }
        });


        // ======================================
        // SAVE CREDS
        // ======================================

        socket.ev.on('creds.update', saveCreds);


        // ======================================
        // MESSAGE HANDLER
        // ======================================

        socket.ev.on('messages.upsert', async ({ messages }) => {

            for (const mek of messages) {

                if (!mek || !mek.message) continue;

                try {

                    if (mek.key.remoteJid === 'status@broadcast') {
                        continue;
                    }

                    let type = getContentType(mek.message);

                    if (type === 'ephemeralMessage') {
                        mek.message =
                            mek.message.ephemeralMessage.message;

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
                        : (
                            mek.key.participant ||
                            mek.key.remoteJid
                        );

                    const senderNumber =
                        sender.split('@')[0].split(':')[0];

                    const isGroup = from.endsWith('@g.us');

                    const botNumber =
                        socket.user.id.split(':')[0];

                    const pushname = mek.pushName || 'User';

                    const isMe = botNumber === senderNumber;

                    const isOwner =
                        ownerNumber.includes(senderNumber) || isMe;

                    const botNumber2 =
                        await jidNormalizedUser(socket.user.id);

                    const groupMetadata = isGroup
                        ? await socket.groupMetadata(from).catch(() => null)
                        : null;

                    const groupName =
                        groupMetadata?.subject || '';

                    const participants =
                        groupMetadata?.participants || [];

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


                    // ======================================
                    // COMMAND HANDLER
                    // ======================================

                    if (isCmd) {

                        const cmd = commands.find(c =>
                            c.pattern === commandName ||
                            (
                                c.alias &&
                                c.alias.includes(commandName)
                            )
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

                                await cmd.function(
                                    socket,
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
                                    `[COMMAND ERROR: ${commandName}]`,
                                    error
                                );

                                await reply(
                                    '❌ Command Error: ' + error.message
                                ).catch(() => {});
                            }
                        }
                    }


                    // ======================================
                    // REPLY HANDLERS
                    // ======================================

                    for (const handler of replyHandlers) {

                        try {

                            if (
                                handler.filter(body, {
                                    sender,
                                    message: mek
                                })
                            ) {

                                await handler.function(
                                    socket,
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
                            }

                        } catch (error) {

                            console.error(
                                '[REPLY HANDLER ERROR]',
                                error
                            );
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

        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
        }

        reconnectTimer = setTimeout(() => {
            connectToWA();
        }, 5000);
    }
}


// ======================================
// EXPRESS SERVER
// ======================================

app.get('/', (req, res) => {
    res.send('Hey, DANUWA-MD started ✅');
});

app.get('/health', (req, res) => {
    res.json({
        status: 'running',
        bot: 'DANUWA-MD',
        plugins: pluginsLoaded,
        commands: commands.length
    });
});


// ======================================
// START BOT
// ======================================

app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
});

(async () => {
    const ready = await ensureSessionFile();

    if (ready) {
        await connectToWA();
    } else {
        console.log(
            '❌ Bot not connected. Check your SESSION_ID.'
        );
    }
})();
