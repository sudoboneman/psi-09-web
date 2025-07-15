const axios = require("axios");

module.exports = function setupBot(client) {
  client.on("ready", () => {
    console.log("🤖 WhatsApp bot is ready!");
  });

  client.on("message", async (msg) => {
    // Ignore messages from groups that aren't text
    if (!msg.body || msg.type !== "chat") return;

    const chat = await msg.getChat();
    const isGroup = chat.isGroup;
    const senderName = msg._data.notifyName || "Unknown";
    const groupName = isGroup ? chat.name : "Private";

    try {
      const response = await axios.post(
        process.env.PSI09_API_URL, // <- Your Flask API URL
        {
          message: msg.body,
          sender: senderName,
          group_name: groupName
        }
      );

      const reply = response.data.reply;
      if (reply && typeof reply === "string") {
        msg.reply(reply);
      } else {
        msg.reply("❌ PSI-09 sent an invalid response.");
      }
    } catch (err) {
      console.error("Error calling PSI-09 API:", err.message);
      msg.reply("💥 Error contacting PSI-09 roastbot.");
    }
  });
};

