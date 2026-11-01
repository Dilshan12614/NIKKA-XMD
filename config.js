const fs = require('fs');

if (fs.existsSync('config.env')) {
    require('dotenv').config({ path: './config.env' });
}

function convertToBool(text, fault = 'true') {
    return text === fault;
}

module.exports = {
    // =====================================
    // NIKKA X MD SESSION
    // =====================================

    SESSION_ID:
        process.env.SESSION_ID ||
        'THENUVA-XMD=hnAhRZwZ#qRQ56xQS8eop537VDb2OBehQsytYY0VyCvHPnrmVMMI',

    // =====================================
    // BOT INFORMATION
    // =====================================

    BOT_NAME: 'NIKKA X MD',

    ALIVE_IMG:
        process.env.ALIVE_IMG ||
        'https://github.com/DANUWA-MD/DANUWA-MD/blob/main/images/DANUWA-MD.png?raw=true',

    ALIVE_MSG:
        process.env.ALIVE_MSG ||
        '*Hello 👋 NIKKA X MD Is Alive Now!*',

    BOT_OWNER:
        process.env.BOT_OWNER ||
        'YOUR_OWNER_NUMBER',

    // =====================================
    // SETTINGS
    // =====================================

    PREFIX: '.',

    MODE: 'public',

    PUBLIC_MODE: true,

};
