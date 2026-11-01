const { cmd } = require('../command');

const API_KEY = process.env.SASA_API_KEY;

cmd({
    pattern: "anime",
    alias: ["animesearch"],
    desc: "Search anime",
    category: "search",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        const query = q && q.trim();

        if (!query) {
            return reply(
                "╭─〔 *ᴀɴɪᴍᴇ sᴇᴀʀᴄʜ* 〕\n" +
                "│\n" +
                "│ ❌ Anime නමක් ඇතුළත් කරන්න.\n" +
                "│\n" +
                "│ උදා: .anime Naruto\n" +
                "│ උදා: .anime One Piece\n" +
                "╰──────────────\n\n" +
                "> ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ"
            );
        }

        if (!API_KEY) {
            return reply(
                "❌ SASA_API_KEY GitHub Secret එක සකසා නැහැ.\n\n" +
                "> ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ"
            );
        }

        await reply("🔎 Anime සොයමින් පවතී...");

        const url = new URL(
            "https://sasa-dev-api.xyz/api/animost-lk/search"
        );

        url.searchParams.set("apikey", API_KEY);
        url.searchParams.set("q", query);
        url.searchParams.set("page", "1");

        const response = await fetch(url.toString(), {
            method: "GET",
            headers: {
                "Accept": "application/json"
            },
            signal: AbortSignal.timeout(30000)
        });

        if (!response.ok) {
            console.error("Anime API HTTP Error:", response.status);

            return reply(
                `❌ API Error: HTTP ${response.status}\n\n` +
                "> ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ"
            );
        }

        const data = await response.json();

        if (
            data.status === false ||
            data.success === false ||
            data.error
        ) {
            return reply(
                "❌ Anime search එක අසාර්ථකයි.\n" +
                `📄 හේතුව: ${data.message || data.error || "API error"}\n\n` +
                "> ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ"
            );
        }

        let results =
            data.results ??
            data.data?.results ??
            data.data?.anime ??
            data.anime ??
            data.data ??
            [];

        if (!Array.isArray(results)) {
            if (results && typeof results === "object") {
                results = Object.values(results);
            } else {
                results = [];
            }
        }

        if (results.length === 0) {
            return reply(
                `╭─〔 *ᴀɴɪᴍᴇ sᴇᴀʀᴄʜ* 〕\n` +
                `│ 🔎 Search: ${query}\n` +
                `│\n` +
                `│ ❌ Results හමු වුණේ නැහැ.\n` +
                `╰──────────────\n\n` +
                "> ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ"
            );
        }

        const list = results.slice(0, 10).map((anime, index) => {
            if (typeof anime === "string") {
                return `${index + 1}. ${anime}`;
            }

            const title =
                anime.title ||
                anime.name ||
                anime.animeTitle ||
                anime.englishTitle ||
                "Unknown Anime";

            const url =
                anime.url ||
                anime.link ||
                anime.animeUrl ||
                "";

            const type =
                anime.type ||
                anime.status ||
                "";

            return [
                `╭─〔 *${index + 1}. ${title}* 〕`,
                type ? `│ 🎬 Type: ${type}` : null,
                url ? `│ 🔗 Link: ${url}` : null,
                "╰──────────────"
            ].filter(Boolean).join("\n");
        }).join("\n\n");

        const message =
            `╭━━〔 *ᴀɴɪᴍᴇ sᴇᴀʀᴄʜ* 〕━━╮\n` +
            `┃ 🔎 Query: ${query}\n` +
            `┃ 📄 Page: 1\n` +
            `┃ 📌 Results: ${results.length}\n` +
            `╰━━━━━━━━━━━━━━━━╯\n\n` +
            `${list}\n\n` +
            `> ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ`;

        return reply(message);

    } catch (error) {
        console.error("Anime Search Error:", error);

        return reply(
            "❌ Anime search කිරීමේදී දෝෂයක් ඇති වුණා.\n" +
            "ටික වේලාවකින් නැවත උත්සාහ කරන්න.\n\n" +
            "> ɴɪᴋᴋᴀ x ᴍᴅ • ᴘᴏᴡᴇʀᴇᴅ ʙʏ ɴɪᴋᴋᴀ x ᴍᴅ"
        );
    }
});
