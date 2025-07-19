import { Client } from 'whatsapp-web.js';
import fs from 'fs';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const SESSION_FILE_PATH = './whatsapp-session.json';

// ✅ Load session data
if (!fs.existsSync(SESSION_FILE_PATH)) {
  console.error('❌ whatsapp-session.json not found. Cannot start bot.');
  process.exit(1);
}

const sessionData = JSON.parse(fs.readFileSync(SESSION_FILE_PATH));

// ✅ Initialize client with session
const client = new Client({
  session: sessionData,
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
  }
});

client.on('ready', () => {
  console.log('🤖 PSI-09 Bot is ready and connected to WhatsApp Web');
});

client.on('auth_failure', msg => {
  console.error('❌ Authentication failed:', msg);
});

client.on('disconnected', reason => {
  console.log('⚠️ Client was logged out:', reason);
});

client.on('message', async msg => {
  const contact = await msg.getContact();
  const chat = await msg.getChat();

  const isGroup = chat.isGroup;
  const senderName = contact.pushname || contact.number;
  const groupName = isGroup ? chat.name : null;

  if (!isGroup || msg.body.includes('@Supratim_H')) {
    console.log(`📩 ${isGroup ? `[${groupName}]` : ''} ${senderName}: ${msg.body}`);

    try {
      const res = await axios.post(process.env.PSI09_API_URL, {
        message: msg.body,
        sender: senderName,
        group_name: groupName,
      });

      const reply = res.data.reply || '[No reply]';
      msg.reply(reply);
      console.log('🤖 PSI-09:', reply);
    } catch (err) {
      console.error('❌ Error sending message to PSI-09 API:', err.message);
    }
  }
});

client.initialize();
