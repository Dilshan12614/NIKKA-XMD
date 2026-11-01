const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'botsettings.json');

const defaults = {
    autorecord: false,
    autotyping: false,
    alwaysonline: false
};

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadSettings() {
    try {
        if (!fs.existsSync(SETTINGS_FILE)) {
            fs.writeFileSync(
                SETTINGS_FILE,
                JSON.stringify(defaults, null, 2)
            );
        }

        return {
            ...defaults,
            ...JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'))
        };
    } catch (error) {
        console.error('[BOT SETTINGS] Load error:', error);
        return { ...defaults };
    }
}

let settings = loadSettings();

function saveSettings() {
    fs.writeFileSync(
        SETTINGS_FILE,
        JSON.stringify(settings, null, 2)
    );
}

function setSetting(name, value) {
    if (!Object.prototype.hasOwnProperty.call(defaults, name)) {
        return false;
    }

    settings[name] = Boolean(value);
    saveSettings();
    return true;
}

function getSettings() {
    return { ...settings };
}

module.exports = {
    setSetting,
    getSettings
};
