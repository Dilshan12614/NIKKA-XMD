const fs = require('fs');
const path = require('path');

const dataFolder = path.join(__dirname, '..', 'data');
const settingsFile = path.join(dataFolder, 'botsettings.json');

const defaults = {
    autorecord: false,
    autotyping: false,
    alwaysonline: false
};

function getSettings() {
    try {
        if (!fs.existsSync(settingsFile)) {
            saveSettings(defaults);
            return { ...defaults };
        }

        const data = JSON.parse(
            fs.readFileSync(settingsFile, 'utf8')
        );

        return {
            ...defaults,
            ...data
        };
    } catch (error) {
        console.error('[BOT SETTINGS ERROR]', error);
        return { ...defaults };
    }
}

function saveSettings(settings) {
    try {
        fs.mkdirSync(dataFolder, { recursive: true });

        fs.writeFileSync(
            settingsFile,
            JSON.stringify(settings, null, 2),
            'utf8'
        );

        return true;
    } catch (error) {
        console.error('[SETTINGS SAVE ERROR]', error);
        return false;
    }
}

function updateSetting(name, value) {
    const allowed = Object.keys(defaults);

    if (!allowed.includes(name)) {
        return false;
    }

    const settings = getSettings();

    settings[name] = Boolean(value);

    if (name === 'autorecord' && value) {
        settings.autotyping = false;
    }

    if (name === 'autotyping' && value) {
        settings.autorecord = false;
    }

    return saveSettings(settings);
}

module.exports = {
    getSettings,
    saveSettings,
    updateSetting
};
