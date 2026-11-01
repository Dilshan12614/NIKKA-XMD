const { cmd } = require("../command");
const getFbVideoInfo = require("@xaviabot/fb-downloader");

const BOT_NAME = "NIKKA X MD";
const OWNER_NAME = "Dilshan Ashinsa";

const NEWSLETTER_JID = "120363403804248705@newsletter";
const NEWSLETTER_NAME = "NIKKA X MD";

cmd(
  {
    pattern: "fb",
    alias: ["facebook", "fbdl"],
    react: "📥",
    desc: "Download Facebook videos in HD/SD quality.",
    category: "download",
    filename: __filename,
  },

  async (conn, mek, m, { from, q, pushname, reply }) => {
    let loadingMsg;

    try {
      const targetJid =
        typeof from === "string"
          ? from
          : mek?.key?.remoteJid;

      // Check URL
      if (!q) {
        return reply(
          "╭━━〔 📥 ɴɪᴋᴋᴀ x ᴍᴅ 〕━━➤\n" +
          "│\n" +
          "│ ⚠️ *ғᴀᴄᴇʙᴏᴏᴋ ᴜʀʟ ʀᴇǫᴜɪʀᴇᴅ!*\n" +
          "│\n" +
          "│ ➤ ᴜsᴀɢᴇ:\n" +
          "│ ➥ .fb https://facebook.com/...\n" +
          "│\n" +
          "╰━━━━━━━━━━━━━━━━━━➤"
        );
      }

      const fbRegex =
        /^(https?:\/\/)?(www\.|m\.|web\.)?(facebook\.com|fb\.watch)\/.+/i;

      if (!fbRegex.test(q.trim())) {
        return reply(
          "╭━━〔 ❌ ɪɴᴠᴀʟɪᴅ ᴜʀʟ 〕━━➤\n\n" +
          "➤ කරුණාකර නිවැරදි Facebook video link එකක් එවන්න.\n\n" +
          "╰━━━━━━〔 ɴɪᴋᴋᴀ x ᴍᴅ 〕━━➤"
        );
      }

      // Loading message
      loadingMsg = await conn.sendMessage(
        targetJid,
        {
          text:
            "╭━━〔 ⚡ ɴɪᴋᴋᴀ x ᴍᴅ 〕━━➤\n" +
            "│\n" +
            "│ 🔄 *ғᴇᴛᴄʜɪɴɢ ᴠɪᴅᴇᴏ ᴅᴀᴛᴀ...*\n" +
            "│ ➥ ᴘʟᴇᴀsᴇ ᴡᴀɪᴛ\n" +
            "│\n" +
            "╰━━━━━━━━━━━━━━━━━━➤",
        },
        { quoted: mek }
      );

      // Get video information
      const videoData = await getFbVideoInfo(q.trim());

      if (!videoData || (!videoData.sd && !videoData.hd)) {
        await conn.sendMessage(targetJid, {
          text:
            "╭━━〔 ❌ ᴅᴏᴡɴʟᴏᴀᴅ ғᴀɪʟᴇᴅ 〕━━➤\n\n" +
            "➤ වීඩියෝ link එක ලබාගත නොහැක.\n" +
            "➥ වීඩියෝව private විය හැකියි, නැත්නම් link එක වැරදි විය හැකියි.\n\n" +
            "╰━━━━━━〔 ɴɪᴋᴋᴀ x ᴍᴅ 〕━━➤",
          edit: loadingMsg.key,
        });

        return;
      }

      const { title, sd, hd } = videoData;

      // Video details
      let detailsText = `╭━━━〔 ⚡ ɴɪᴋᴋᴀ x ᴍᴅ 〕━━━➤\n`;
      detailsText += `│\n`;
      detailsText += `│ 👋 ʜᴇʟʟᴏ, *${pushname || "User"}* ❤️\n`;
      detailsText += `│ ➥ ᴡᴇʟᴄᴏᴍᴇ ᴛᴏ ${BOT_NAME}\n`;
      detailsText += `│\n`;
      detailsText += `╰━━━━━━━━━━━━━━━━━━➤\n\n`;

      detailsText += `╭━━〔 🎬 ᴠɪᴅᴇᴏ ɪɴғᴏ 〕━━➤\n`;
      detailsText += `│\n`;
      detailsText += `│ ➤ 📝 *ᴛɪᴛʟᴇ* : ${title || "Facebook Video"}\n`;
      detailsText += `│\n`;
      detailsText += `│ ➥ 🌐 *ᴜʀʟ* : ${q.trim()}\n`;
      detailsText += `│\n`;
      detailsText += `│ ➤ 🎞️ *ǫᴜᴀʟɪᴛʏ* : ${hd ? "ʜᴅ ᴀᴠᴀɪʟᴀʙʟᴇ" : "sᴅ ᴏɴʟʏ"}\n`;
      detailsText += `│\n`;
      detailsText += `│ ➥ 🔥 *ʜᴅ ᴍᴏᴅᴇ* : ${hd ? "✅ ᴀᴠᴀɪʟᴀʙʟᴇ" : "❌ ᴜɴᴀᴠᴀɪʟᴀʙʟᴇ"}\n`;
      detailsText += `│\n`;
      detailsText += `│ ➤ 🖼️ *sᴅ ᴍᴏᴅᴇ* : ${sd ? "✅ ᴀᴠᴀɪʟᴀʙʟᴇ" : "❌ ᴜɴᴀᴠᴀɪʟᴀʙʟᴇ"}\n`;
      detailsText += `│\n`;
      detailsText += `╰━━━━━━━━━━━━━━━━━━➤\n\n`;

      detailsText += `╭━━〔 👨‍💻 ᴄʏʙᴇʀ ᴛᴇᴀᴍ 〕━━➤\n`;
      detailsText += `│\n`;
      detailsText += `│ ⚡ ᴘᴏᴡᴇʀᴇᴅ ʙʏ ${BOT_NAME}\n`;
      detailsText += `│ 👑 ᴏᴡɴᴇʀ : ${OWNER_NAME}\n`;
      detailsText += `│\n`;
      detailsText += `╰━━━━━━━━━━━━━━━━━━➤\n\n`;

      detailsText += `╭━━〔 📥 ᴅᴏᴡɴʟᴏᴀᴅ 〕━━➤\n`;
      detailsText += `│\n`;
      detailsText += `│ 🔄 ᴘʀᴇᴘᴀʀɪɴɢ ᴠɪᴅᴇᴏ ғɪʟᴇ...\n`;
      detailsText += `│ ➤ ᴘʟᴇᴀsᴇ ᴡᴀɪᴛ\n`;
      detailsText += `│\n`;
      detailsText += `╰━━━━━━➤ ${BOT_NAME} 🚀\n\n`;
      detailsText += `> ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ`;

      // Update loading message
      await conn.sendMessage(
        targetJid,
        {
          text: detailsText,
          edit: loadingMsg.key,
          contextInfo: {
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: NEWSLETTER_JID,
              newsletterName: NEWSLETTER_NAME,
              serverMessageId: 1,
            },
          },
        }
      );

      // Prefer HD when available
      const downloadUrl = hd || sd;
      const finalQuality = hd ? "HD Quality" : "SD Quality";

      let videoCaption = `╭─〔 ✅ ᴅᴏᴡɴʟᴏᴀᴅ 〕─➤\n`;
         videoCaption += `│\n`;
         videoCaption += `│ 👤 *ᴜsᴇʀ* : ${pushname || "User"}\n`;
         videoCaption += `│ 🎬 *sᴛᴀᴛᴜs* : sᴜᴄᴄᴇss\n`;
         videoCaption += `│ 🎞️ *ǫᴜᴀʟɪᴛʏ* : ${finalQuality}\n`;
         videoCaption += `│\n`;
         videoCaption += `╰──────────➤\n\n`;
         videoCaption += `➤ ᴇɴᴊᴏʏ ʏᴏᴜʀ ᴠɪᴅᴇᴏ! ❤️\n\n`;
         videoCaption += `> ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ 🚀`;
      // Send video
      await conn.sendMessage(
        targetJid,
        {
          video: { url: downloadUrl },
          caption: videoCaption,
          contextInfo: {
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: NEWSLETTER_JID,
              newsletterName: NEWSLETTER_NAME,
              serverMessageId: 1,
            },
          },
        },
        { quoted: mek }
      );

    } catch (error) {
      console.error("[NIKKA X MD FB DOWNLOADER ERROR]", error);

      const errorText =
        `╭━━〔 ❌ ᴇʀʀᴏʀ 〕━━➤\n\n` +
        `➤ Facebook video එක බාගත කිරීම අසාර්ථකයි.\n` +
        `➥ ${error.message || "Unknown error"}\n\n` +
        `> ⚡ ${BOT_NAME}`;

      if (reply) {
        await reply(errorText);
      } else if (from) {
        await conn.sendMessage(from, { text: errorText }, { quoted: mek });
      }
    }
  }
);
