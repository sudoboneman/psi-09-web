import puppeteer from 'puppeteer-core';
import chromium from 'chrome-aws-lambda';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import axios from 'axios';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PSI09_API = process.env.PSI09_API_URL;

const SESSION_FILE = path.join(__dirname, 'whatsapp-session.json');

(async () => {
  console.log("🔁 Launching Puppeteer with chrome-aws-lambda...");

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath,
    headless: chromium.headless
  });

  const page = await browser.newPage();

  // 🔁 Load session if exists
  try {
    const sessionData = JSON.parse(await fs.readFile(SESSION_FILE, 'utf-8'));

    if (sessionData.cookies) {
      await page.setCookie(...sessionData.cookies);
      console.log("✅ Cookies restored");
    }

    if (sessionData.localStorage) {
      await page.goto('https://web.whatsapp.com', { waitUntil: 'domcontentloaded' });
      await page.evaluate(storage => {
        for (const [key, value] of Object.entries(storage)) {
          localStorage.setItem(key, value);
        }
      }, sessionData.localStorage);
      console.log("✅ LocalStorage restored");
    }
  } catch (err) {
    console.warn("⚠️ No session found or failed to load session:", err.message);
  }

  // ⏳ Login or validate session
  await page.goto('https://web.whatsapp.com');

  console.log("⏳ Waiting for chats to load...");
  await page.waitForSelector('[data-testid="chat-list"]', { timeout: 180000 });
  console.log("✅ Logged into WhatsApp Web");

  // 💾 Save session
  try {
    const cookies = await page.cookies();
    const localStorageData = await page.evaluate(() => {
      const data = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        data[key] = localStorage.getItem(key);
      }
      return data;
    });

    await fs.writeFile(SESSION_FILE, JSON.stringify({ cookies, localStorage: localStorageData }));
    console.log("💾 Session saved to whatsapp-session.json");
  } catch (err) {
    console.error("❌ Failed to save session:", err.message);
  }

  // 🔁 Main loop
  while (true) {
    try {
      const unreadMessages = await page.$$('span[aria-label="Unread message"]');
      for (const unread of unreadMessages) {
        const chat = await unread.evaluateHandle(el => el.closest('._2aBzC') || el.closest('[role="row"]'));
        if (chat) {
          await chat.click();
          await page.waitForTimeout(1000);

          const messages = await page.$$eval('div.selectable-text span[dir="ltr"]', spans =>
            spans.map(el => el.textContent).slice(-1)
          );

          const lastMessage = messages[messages.length - 1];
          console.log("📩 Incoming:", lastMessage);

          const chatTitle = await page.$eval('header span[title]', el => el.textContent);
          const isGroupChat = await page.$('header span[data-testid="default-group"]') !== null;

          let senderName = "Unknown Sender";
          let groupName = isGroupChat ? chatTitle : null;

          if (!isGroupChat) {
            senderName = chatTitle;
          }

          if (isGroupChat && lastMessage.includes("@Supratim_H")) {
            const senderElement = await page.$('div.message-in span[dir="auto"] strong');
            if (senderElement) {
              senderName = await page.evaluate(el => el.textContent, senderElement);
            }

            console.log("📨 Sender:", senderName);
            console.log("👥 Group:", groupName);

            const response = await axios.post(PSI09_API, {
              message: lastMessage,
              sender: senderName,
              group_name: groupName
            });

            const reply = response.data.reply || "[No reply]";
            console.log("🤖 PSI-09:", reply);

            const messageBox = await page.$('div[title="Type a message"]');
            await messageBox.click();
            await messageBox.type(reply);
            await messageBox.press('Enter');
          } else if (!isGroupChat) {
            console.log("📨 Sender:", senderName);

            const response = await axios.post(PSI09_API, {
              message: lastMessage,
              sender: senderName,
              group_name: null
            });

            const reply = response.data.reply || "[No reply]";
            console.log("🤖 PSI-09:", reply);

            const messageBox = await page.$('div[title="Type a message"]');
            await messageBox.click();
            await messageBox.type(reply);
            await messageBox.press('Enter');
          } else {
            console.log("⏭️ Skipped: PSI-09 not pinged in group chat.");
          }
        }
      }
    } catch (err) {
      console.error("❌ Error in loop:", err.message);
    }

    await page.waitForTimeout(5000);
  }
})();
