const { cmd } = require('../command');
const {
    getSettings,
    updateSetting
} = require('../lib/botsettings');

const settingNames = {
    autorecord: 'AUTO RECORDING',
    autotyping: 'AUTO TYPING',
    alwaysonline: 'ALWAYS ONLINE'
};

const status = (value) => value ? '🟢 ON' : '🔴 OFF';

cmd({
    pattern: 'settings',
    desc: 'Show bot settings',
    category: 'owner',
    fromMe: true
}, async (conn, mek, m, { reply }) => {

    const s = getSettings();

    const text = `
╭━━━〔 ⚙️ DANUWA-MD SETTINGS 〕━━━┈⊷

┃ 🎙️ AUTO RECORDING : ${status(s.autorecord)}
┃ ⌨️ AUTO TYPING : ${status(s.autotyping)}
┃ 🟢 ALWAYS ONLINE : ${status(s.alwaysonline)}

╰━━━━━━━━━━━━━━━━━━┈⊷

⚙️ SETTING COMMANDS

• .autorecord on/off
• .autotyping on/off
• .alwaysonline on/off
`;

    return reply(text);
});

for (const name of Object.keys(settingNames)) {
    cmd({
        pattern: name,
        desc: `Control ${settingNames[name]}`,
        category: 'owner',
        fromMe: true
    }, async (conn, mek, m, { q, reply }) => {

        const value = String(q || '').trim().toLowerCase();

        if (!['on', 'off'].includes(value)) {
            return reply(
                `❌ Use: .${name} on/off`
            );
        }

        const enabled = value === 'on';

        const success = updateSetting(name, enabled);

        if (!success) {
            return reply('❌ Settings save failed!');
        }

        if (name === 'alwaysonline') {
            try {
                await conn.sendPresenceUpdate(
                    enabled ? 'available' : 'unavailable'
                );
            } catch (e) {
                console.log('[PRESENCE]', e.message);
            }
        }

        return reply(
            `✅ ${settingNames[name]} ${enabled ? 'ENABLED' : 'DISABLED'}`
        );
    });
}
