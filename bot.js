const axios = require("axios");

module.exports = (client) => {
  client.on("ready", () => {
    console.log("✅ WhatsApp Web client is ready!");
  });

  client.on("message", async (msg) => {
    const senderName = msg._data?.notifyName || "Unknown";
    const groupName =
      msg.from.endsWith("@g.us") ? msg._data?.notifyName || "Group" : "Private";

    try {
      const res = await axios.post(process.env.PSI09_API_URL, {
        message: msg.body,
        sender: senderName,
        group_name: groupName,
      });

      if (res.data.reply) {
        await msg.reply(res.data.reply);
      }
    } catch (err) {
      console.error("❌ Error talking to PSI-09:", err.message);
      await msg.reply("PSI-09 crashed. Try again later.");
    }
  });
};
