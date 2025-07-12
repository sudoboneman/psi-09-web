// index.js
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
require('dotenv').config();

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

const PSI09_API = process.env.PSI09_API_URL || 'https://psi-09-roastbot.onrender.com/psi09';

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('[!] Scan the QR code above to authenticate.');
});

client.on('ready', () => {
    console.log('[✓] WhatsApp client is ready.');
});

client.on('message', async msg => {
    if (msg.fromMe) return;

    const chat = await msg.getChat();
    const isGroup = chat.isGroup;

    const payload = {
        message: msg.body,
        sender: msg._data.notifyName || msg.from,
        group_name: isGroup ? chat.name : 'PrivateChat',
        phone: msg.from
    };

    try {
        const response = await axios.post(PSI09_API, payload, {
            headers: { 'Content-Type': 'application/json' }
        });

        const replyText = response.data.reply || '[Error] No reply generated';
        msg.reply(replyText);
    } catch (error) {
        console.error('[x] API Error:', error.message);
        msg.reply('[PSI-09] Server error. Try again later.');
    }
});

client.initialize();
