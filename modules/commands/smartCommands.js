const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const FormData = require("form-data");
const { format } = require("cassidy-styler");
const WebSocket = require("ws");
function design(title, content) {
    return format({
        title,
        titleFont: "bold",
        contentFont: "none",
        titlePattern: "【 NASH 】{word} {emojis}",
        content,
    });
}

const smartCooldowns = new Map();
const aiToggleStates = new Map(); 

const activeSessions = new Map();
const lastSentCache = new Map();
const PH_TIMEZONE = "Asia/Manila";

function pad(n) {
    return n < 10 ? "0" + n : n;
}

function getPHTime() {
    return new Date(new Date().toLocaleString("en-US", { timeZone: PH_TIMEZONE }));
}

function getCountdown(target) {
    const now = getPHTime();
    const msLeft = target - now;
    if (msLeft <= 0) return "00h 00m 00s";
    const h = Math.floor(msLeft / 3.6e6);
    const m = Math.floor((msLeft % 3.6e6) / 6e4);
    const s = Math.floor((msLeft % 6e4) / 1000);
    return `${pad(h)}h ${pad(m)}m ${pad(s)}s`;
}

function getNextRestocks() {
    const now = getPHTime();
    const timers = {};

    const nextEgg = new Date(now);
    nextEgg.setMinutes(now.getMinutes() < 30 ? 30 : 0);
    if (now.getMinutes() >= 30) nextEgg.setHours(now.getHours() + 1);
    nextEgg.setSeconds(0, 0);
    timers.egg = getCountdown(nextEgg);

    const next5 = new Date(now);
    const nextM = Math.ceil((now.getMinutes() + (now.getSeconds() > 0 ? 1 : 0)) / 5) * 5;
    next5.setMinutes(nextM === 60 ? 0 : nextM, 0, 0);
    if (nextM === 60) next5.setHours(now.getHours() + 1);
    timers.gear = timers.seed = getCountdown(next5);

    const nextSummerEvent = new Date(now);
    nextSummerEvent.setMinutes(0, 0, 0); 
    if (now.getMinutes() > 0 || now.getSeconds() > 0 || now.getMilliseconds() > 0) {
        nextSummerEvent.setHours(nextSummerEvent.getHours() + 1); 
    }
    timers.summerEvent = getCountdown(nextSummerEvent);

    const next7 = new Date(now);
    const totalHours = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
    const next7h = Math.ceil(totalHours / 7) * 7;
    next7.setHours(next7h, 0, 0, 0);
    timers.cosmetics = getCountdown(next7);

    return timers;
}

function formatValue(val) {
    if (val >= 1_000_000) return `x${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `x${(val / 1_000).toFixed(1)}K`;
    return `x${val}`;
}

function addEmoji(name) {
    const emojis = {
        "Common Egg": "🥚", "Uncommon Egg": "🐣", "Rare Egg": "🍳", "𝐋𝐞𝐠𝐞𝐧𝐝𝐚𝐫𝐲 𝐄𝐠𝐠": "🪺", "𝐌𝐲𝐭𝐡𝐢𝐜𝐚𝐥 𝐄𝐠𝐠": "🔮",
        "𝐁𝐮𝐠 𝐄𝐠𝐠": "🪲", "Common Summer Egg": "🥚", "Rare Summer Egg": "🍳", "𝐏𝐚𝐫𝐚𝐝𝐢𝐬𝐞 𝐄𝐠𝐠": "🪩",
        "Cleaning Spray": "🧴", "𝐅𝐫𝐢𝐞𝐧𝐝𝐬𝐡𝐢𝐩 𝐏𝐨𝐭": "🪴", "Watering Can": "🚿", "Trowel": "🛠️",
        "Recall Wrench": "🔧", "Basic Sprinkler": "💧", "Advanced Sprinkler": "💦", "𝐆𝐨𝐝𝐥𝐲 𝐒𝐩𝐫𝐢𝐧𝐤𝐥𝐞𝐫": "⛲",
        "𝐋𝐢𝐠𝐡𝐭𝐧𝐢𝐧𝐠 𝐑𝐨𝐝": "⚡", "𝐌𝐚𝐬𝐭𝐞𝐫 𝐒𝐩𝐫𝐢𝐧𝐤𝐥𝐞𝐫": "🌊", "Favorite Tool": "❤️", "Harvest Tool": "🌾",
        "𝐓𝐚𝐧𝐧𝐢𝐧𝐠 𝐌𝐢𝐫𝐫𝐨𝐫": "🪞", "Carrot": "🥕", "Strawberry": "🍓", "Blueberry": "🫐", "Cauliflower": "🌷",
        "Tomato": "🍅", "Green Apple": "🍏", "Avocado": "🥑", "Watermelon": "🍉", "Banana": "🍌",
        "Pineapple": "🍍", "𝐁𝐞𝐥𝐥 𝐏𝐞𝐩𝐩𝐞𝐫": "🌶️", "𝐏𝐫𝐢𝐜𝐤𝐥𝐲 𝐏𝐞𝐚𝐫": "🍐", "𝐋𝐨𝐪𝐮𝐚𝐭": "🍒",
        "𝐊𝐢𝐰𝐢": "🥝", "𝐅𝐞𝐢𝐣𝐨𝐚": "🍈", "𝐒𝐮𝐠𝐚𝐫 𝐀𝐩𝐩𝐥𝐞": "🍏"
    };

    const isBold = /[\u{1D400}-\u{1D7FF}]/u.test(name);

    const emoji = emojis[name] || "❓";

    if (isBold) {
        return `⭐ **${emoji} ${name}**`;
    } else {
        return `${emoji} ${name}`;
    }
}

async function isNaturalConversation(message) {
    try {

        const prompt = `Analyze this message and determine if it's a natural conversation or question that would benefit from an AI response. 

Message: "${message}"

Rules:
- Return "true" if it's a question, request for explanation, general conversation, or needs AI assistance
- Return "false" if it's a specific command like downloading, getting stock info, or administrative tasks
- Consider context: mathematical expressions, educational queries, casual chat all count as "true"
- Commands like "download", "stock", "prefix", "rules", "video" should be "false"

Respond with only "true" or "false":`;

        const response = await axios.get(`${global.NashBot.JOSHUA}api/gpt4o-latest?ask=${encodeURIComponent(prompt)}&uid=999&imageUrl=&apikey=609efa09-3ed5-4132-8d03-d6f8ca11b527`);
        const result = response.data.response.toLowerCase().trim();
        return result === "true";
    } catch (error) {
       
        const simpleConversationIndicators = [
            message.endsWith('?'),
            message.length > 10 && /\b(how|what|when|where|why|who|which|can you|could you|would you|tell me|explain|help)\b/i.test(message),
            /\d+\s*[\+\-\*\/\=]\s*\d+/.test(message), 
            message.split(' ').length > 3 && !/(download|stock|prefix|rules|video|command|cmd)/i.test(message)
        ];
        return simpleConversationIndicators.some(indicator => indicator);
    }
}

module.exports = {
    name: "smart",
    description: "Smart command detection without prefixes",
    nashPrefix: false,
    version: "1.0.0",
    cooldowns: 5,
    execute: async (api, event, args, prefix) => {
        const { threadID, messageID, senderID, body } = event;
        const message = body.toLowerCase().trim();

        const configPath = path.join(__dirname, '../../config.json');
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        const isAdmin = senderID === config.adminUID;

        const userId = senderID;
        const cooldownTime = 5000; 
        const now = Date.now();

        if (smartCooldowns.has(userId)) {
            const expirationTime = smartCooldowns.get(userId);
            if (now < expirationTime) {
                const timeLeft = 5; 
                return api.sendMessage(`⏰ Please wait ${timeLeft} seconds before using smart commands again.`, threadID, messageID);
            }
        }

        smartCooldowns.set(userId, now + cooldownTime);
        setTimeout(() => smartCooldowns.delete(userId), cooldownTime);

        if (isGagStockRequest(message)) {
            return handleGagStock(api, event, body, threadID, messageID);
        }

        if (isDownloadRequest(message, body)) {
            return handleDownload(api, event, body, threadID, messageID);
        }

        if (isTikTokSearch(message)) {
            return handleTikTokSearch(api, event, body, threadID, messageID);
        }

        if (isContactRequest(message)) {
            return handleContact(api, threadID, messageID);
        }

        if (isAIToggleRequest(message)) {
            return handleAIToggle(api, event, body, threadID, messageID);
        }

        if (isAriaRequest(message)) {
            return handleAria(api, event, body, threadID, messageID);
        }

        if (isRulesQuery(message)) {
            return handleRules(api, threadID, messageID);
        }

        if (isVideoRequest(message)) {
            return handleShoti(api, threadID, messageID);
        }

        if (isUIDRequest(message)) {
            return handleUID(api, event, args);
        }

        if (isUptimeRequest(message)) {
            return handleUptime(api, threadID, messageID);
        }

        if (isNotificationRequest(message)) {
            return handleSendNotification(api, event, args, threadID, messageID);
        }

        if (isHelpRequest(message) || isCommandListRequest(message)) {
            return handleComprehensiveHelp(api, threadID, messageID, prefix);
        }

        if (isPrefixRequest(message)) {
            return handlePrefix(api, threadID, prefix);
        }

        if (isOutRequest(message)) {
            return handleOut(api, event, threadID, messageID, isAdmin);
        }

        if (isAdmin) {
            if (isAddUserRequest(message)) {
                return handleAddUser(api, event, args, threadID, messageID);
            }

            if (isChangeAdminRequest(message)) {
                return handleChangeAdmin(api, event, args, threadID, messageID);
            }

            if (isShellCommand(message)) {
                return handleShell(api, event, args, threadID, messageID);
            }

            if (isEvalCommand(message)) {
                return handleEval(api, event, args, threadID, messageID);
            }
        }

        if (isListBoxRequest(message)) {
            return handleListBox(api, threadID, messageID);
        }

        if (message.includes('women') || message.includes('babae')) {
            return handleWomen(api, threadID, messageID);
        }

        const aiEnabled = aiToggleStates.get(threadID) || false;

        if (event.messageReply && event.messageReply.senderID === api.getCurrentUserID()) {
            return handleAIQuery(api, event, body, threadID, messageID);
        }

        if (aiEnabled) {
            return handleAIQuery(api, event, body, threadID, messageID);
        }

    }
};

function isGagStockRequest(message) {
    const gagKeywords = [
        'gag stock', 'stock gag', 'gagstock', 'grow a garden stock',
        'restock timer', 'stock timer', 'garden stock', 'stock', 'gag', 'grow a garden'
    ];

    return gagKeywords.some(keyword => message.includes(keyword));
}

function isContactRequest(message) {
    return message.includes('contact') || message.includes('owner info') || 
           message.includes('contacts') || message.includes('info') || 
           message.includes('developer') || message.includes('creator info');
}

function isAIToggleRequest(message) {
    return (message.includes('on ai') || message.includes('ai on') || 
            message.includes('enable ai') || message.includes('turn on ai') ||
            (message === 'on' || message === 'ai')) ||
           (message.includes('off ai') || message.includes('ai off') || 
            message.includes('disable ai') || message.includes('turn off ai') ||
            message === 'off');
}

function isAriaRequest(message) {
    return message.includes('aria') || message.includes('alternative ai');
}

function isRulesQuery(message) {
    return message.includes('rules') || message.includes('regulation') ||
           message.includes('rule') || message.includes('give the rules') ||
           message.includes('guideline') || message.includes('what are the rules');
}

function isVideoRequest(message) {
    const videoKeywords = ['video', 'shoti', 'girl', 'tiktok video', 'send video', 'show video', 'random shoti', 'shoti random'];
    return videoKeywords.some(keyword => message.includes(keyword));
}

function isUIDRequest(message) {
    return message.includes('uid') || message.includes('user id') || 
           message.includes('my id') || message.includes('get id');
}

function isUptimeRequest(message) {
    return message.includes('uptime') || message.includes('how long') ||
           message.includes('upt') || message.includes('run time') ||
           message.includes('running time') || message.includes('bot uptime');
}

function isDownloadRequest(message, fullBody) {
    return (message.includes('download') || message.includes('dl')) && 
           (fullBody.includes('facebook.com') || fullBody.includes('fb.watch'));
}

function isTikTokSearch(message) {
    return message.includes('tiktok') && !message.includes('download') && 
           !message.includes('facebook.com');
}

function isNotificationRequest(message) {
    return message.includes('notification') || message.includes('notify') ||
           message.includes('send noti') || message.includes('broadcast');
}

function isHelpRequest(message) {
    return message.includes('help') || message.includes('what can you do') ||
           message.includes('what are your features') || message.includes('smart') ||
           message.includes('command') || message.includes('cmd') || 
           message.includes('list command') || message.includes('show command') ||
           message.includes('list cmd') || message.includes('show cmd') ||
           message.includes('available command') || message.includes('what commands');
}

function isCommandListRequest(message) {
 
    return false;
}

function isPrefixRequest(message) {
    return message.includes('prefix') || message.includes('what is your prefix');
}

function isOutRequest(message) {
    return message.includes('leave') || message.includes('out') || 
           message.includes('exit') || message.includes('goodbye');
}

function isAddUserRequest(message) {
    return message.includes('add user') || message.includes('adduser');
}

function isChangeAdminRequest(message) {
    return message.includes('change admin') || message.includes('new admin') ||
           message.includes('transfer admin') || message.includes('changeadmin');
}

function isShellCommand(message) {
    return message.startsWith('shell ') || message.startsWith('run ');
}

function isEvalCommand(message) {
    return message.startsWith('eval ') || message.startsWith('execute ');
}

function isListBoxRequest(message) {
    return message.includes('list') && (message.includes('group') || message.includes('box'));
}

async function handleAIToggle(api, event, body, threadID, messageID) {
    const message = body.toLowerCase().trim();

    if (message.includes('on') || message === 'ai' || message.includes('enable')) {
        aiToggleStates.set(threadID, true);

        const onContent = `----------------------------------

🤖 𝗔𝗜 𝗠𝗢𝗗𝗘 𝗔𝗖𝗧𝗜𝗩𝗔𝗧𝗘𝗗

✅ AI responses are now ENABLED
🧠 I will respond to ANY message naturally
💬 No need for specific keywords anymore
🎯 Just talk to me like a normal conversation

----------------------------------

💡 Examples of what I can do:
   • Answer any questions
   • Help with coding problems
   • Solve math equations
   • Provide explanations
   • Have casual conversations

🔧 To disable: Type "off ai" or "ai off"`;

        const aiOnMessage = design("🤖 SMART AI ASSISTANT", onContent);
        return api.sendMessage(aiOnMessage, threadID, messageID);

    } else if (message.includes('off') || message.includes('disable')) {
        aiToggleStates.set(threadID, false);

        const offContent = `----------------------------------

🔇 𝗔𝗜 𝗠𝗢𝗗𝗘 𝗗𝗜𝗦𝗔𝗕𝗟𝗘𝗗

❌ AI responses are now COMPLETELY DISABLED
🚫 No automatic conversational detection
🎯 Only specific utility commands will work
⚡ Smart commands still active

----------------------------------

💡 I will ONLY respond to:
   • Specific smart commands (download, stock, etc.)
   • TikTok searches
   • Help commands
   • Other utility features
   • NOT general questions or conversations

🔧 To enable AI: Type "on ai" or "ai on"`;

        const aiOffMessage = design("🤖 SMART AI ASSISTANT", offContent);
        return api.sendMessage(aiOffMessage, threadID, messageID);
    }
}

async function handleAIQuery(api, event, body, threadID, messageID) {
    const prompt = body.trim();

    api.sendMessage("Processing...", threadID, async (err, info) => {
        if (err) return;

        try {
            const url = `${global.NashBot.JOSHUA}api/gpt4o-latest?ask=${encodeURIComponent(prompt)}&uid=1&imageUrl=&apikey=609efa09-3ed5-4132-8d03-d6f8ca11b527`;
            const response = await axios.get(url);
            const reply = response.data.response;
            api.editMessage(reply, info.messageID);
        } catch (error) {
            api.editMessage("❌ Failed to get AI response.", info.messageID);
        }
    }, messageID);
}

function handleContact(api, threadID, messageID) {
    const contactContent = `🧑‍💻 LEAD DEVELOPER
   Joshua Apostol
   📧 joshuaapostol909@gmail.com
   📱 fb.com/joshuaapostol2006
   💻 github.com/joshuaApos

👨‍💻 CO-LEAD DEVELOPER  
   Cyril Encenso
   📧 Amigohaycyril10@gmail.com
   📱 fb.com/cyypookie
   💻 github.com/atsushinakajima14

🌐 PORTFOLIO
   joshua-portfolio.com

💬 Support & Inquiries Welcome!`;

    const contactInfo = design("📞 DEVELOPER CONTACTS", contactContent);
    api.sendMessage(contactInfo, threadID, messageID);
}

async function handleAria(api, event, body, threadID, messageID) {
    const prompt = body.replace(/aria/gi, '').trim();

    if (!prompt) {
        return api.sendMessage("What would you like to ask Aria?", threadID, messageID);
    }

    api.sendMessage("Processing..", threadID, async (err, info) => {
        try {
            const url = `https://api.openai.com/v1/chat/completions`;

            const response = await axios.get(`${global.NashBot.JOSHUA}api/gpt4o-latest?ask=${encodeURIComponent(prompt)}&uid=2&imageUrl=&apikey=609efa09-3ed5-4132-8d03-d6f8ca11b527`);
            const reply = response.data.response;
            api.editMessage(`🎭 Aria: ${reply}`, info.messageID);
        } catch (error) {
            api.editMessage("❌ Aria is currently unavailable.", info.messageID);
        }
    });
}

function handleRules(api, threadID, messageID) {
    const rulesContent = `1. Be respectful: Treat everyone in the group with kindness and respect.
2. No spamming: Avoid sending repetitive or irrelevant messages.
3. Stay on topic: Keep discussions relevant to the group's purpose.
4. No personal information: Do not share personal details of yourself or others without permission.
5. Follow the group's purpose: Ensure your messages contribute to the educational or informational goals of the group.
6. Report issues: If you encounter any issues or have concerns, contact a group admin.`;

    const rules = design("📋 Rules", rulesContent);
    api.sendMessage(rules, threadID, messageID);
}

async function handleShoti(api, threadID, messageID) {
    api.sendMessage("📹 Getting video for you...", threadID, async (err, info) => {
        if (err) return;

        try {
            const { data } = await axios.post("https://shoti-rho.vercel.app/api/request/f");
            const videoUrl = data.url;
            const username = data.username;
            const nickname = data.nickname;

            const tempDir = path.resolve(__dirname, 'temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            const videoPath = path.resolve(tempDir, 'shoti.mp4');
            const writer = fs.createWriteStream(videoPath);

            const responseStream = await axios({
                url: videoUrl,
                method: 'GET',
                responseType: 'stream',
            });

            responseStream.data.pipe(writer);

            writer.on('finish', () => {
                api.sendMessage({
                    body: `Username: ${username}\nNickname: ${nickname}`,
                    attachment: fs.createReadStream(videoPath),
                }, threadID, () => {
                    fs.unlinkSync(videoPath);
                    api.editMessage("✅ Video sent!", info.messageID);
                }, messageID);
            });

            writer.on('error', () => {
                api.editMessage("❌ Error processing video.", info.messageID);
            });
        } catch (error) {
            api.editMessage("❌ Error fetching video.", info.messageID);
        }
    });
}

function handleUID(api, event, args) {
    const { threadID, senderID } = event;
    let id = senderID;

    if (event.type === 'message_reply') {
        id = event.messageReply.senderID;
    }

    if (event.mentions && Object.keys(event.mentions).length > 0) {
        id = Object.keys(event.mentions)[0];
    }

    api.shareContact(id, id, threadID);
}

function handleUptime(api, threadID, messageID) {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    const message = `⏰ Bot Uptime: ${hours}h ${minutes}m ${seconds}s`;
    api.sendMessage(message, threadID, messageID);
}

async function handleDownload(api, event, body, threadID, messageID) {
    const urlMatch = body.match(/(https?:\/\/[^\s]+)/);
    if (!urlMatch) {
        return api.sendMessage("Please provide a valid Facebook video URL.", threadID, messageID);
    }

    const fbUrl = urlMatch[0];

    api.sendMessage("⏳ Downloading video...", threadID, async (err, info) => {
        if (err) return;

        try {
            const form = new FormData();
            form.append("k_exp", "1749611486");
            form.append("k_token", "aa26d4a3b2bf844c8af6757179b85c10ab6975dacd30b55ef79d0d695f7ea764");
            form.append("q", fbUrl);
            form.append("lang", "en");
            form.append("web", "fdownloader.net");
            form.append("v", "v2");

            const headers = {
                ...form.getHeaders(),
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "Accept": "*/*"
            };

            const response = await axios.post("https://v3.fdownloader.net/api/ajaxSearch", form, { headers });

            if (response.data.status !== "ok") {
                throw new Error("Failed to fetch video data");
            }

            const html = response.data.data;
            const downloadLinks = [];

            const mp4Regex = /<a href="(https:\/\/dl\.snapcdn\.app\/download\?token=[^"]+)"[^>]*>Download<\/a>/g;
            let match;
            while ((match = mp4Regex.exec(html)) !== null) {
                const qualityMatch = html.substring(0, match.index).match(/video-quality[^>]*>([^<]+)</);
                if (qualityMatch) {
                    downloadLinks.push({
                        url: match[1],
                        quality: qualityMatch[1].trim()
                    });
                }
            }

            if (downloadLinks.length === 0) {
                throw new Error("No download links found");
            }

            downloadLinks.sort((a, b) => {
                const getQualityNum = (q) => parseInt(q.replace(/\D/g, "")) || 0;
                return getQualityNum(b.quality) - getQualityNum(a.quality);
            });

            const bestQuality = downloadLinks[0];

            const tempDir = path.join(__dirname, 'temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir);
            }

            const videoPath = path.join(tempDir, `fb_video_${Date.now()}.mp4`);
            const writer = fs.createWriteStream(videoPath);

            const videoResponse = await axios({
                method: 'get',
                url: bestQuality.url,
                responseType: 'stream'
            });

            videoResponse.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            const videoStream = fs.createReadStream(videoPath);
            api.sendMessage({
                attachment: videoStream
            }, threadID, () => {
                fs.unlinkSync(videoPath);
                api.unsendMessage(info.messageID);
            });

        } catch (error) {
            api.editMessage("❌ Error downloading video.", info.messageID);
        }
    }, messageID);
}

async function handleTikTokSearch(api, event, body, threadID, messageID) {
    const query = body.replace(/tiktok/gi, '').trim();
    if (!query) {
        return api.sendMessage("What TikTok video would you like me to find?", threadID, messageID);
    }

    api.sendMessage("🔍 Searching TikTok...", threadID, async (err, info) => {
        try {
            const res = await axios.get(`https://zen-api.gleeze.com/api/tiktok?query=${encodeURIComponent(query)}`);
            const data = res.data;

            if (!data || !data.no_watermark) {
                throw new Error("No video found.");
            }

            const tempDir = path.join(__dirname, "temp");
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

            const fileName = `tiktok_${Date.now()}.mp4`;
            const videoPath = path.join(tempDir, fileName);
            const writer = fs.createWriteStream(videoPath);

            const videoStream = await axios({
                method: "GET",
                url: data.no_watermark,
                responseType: "stream",
            });

            videoStream.data.pipe(writer);
            await new Promise((resolve, reject) => {
                writer.on("finish", resolve);
                writer.on("error", reject);
            });

            const attachment = fs.createReadStream(videoPath);
            api.sendMessage({
                body: `🎬 ${data.title || 'TikTok Video'}`,
                attachment,
            }, threadID, () => {
                fs.unlinkSync(videoPath);
                api.unsendMessage(info.messageID);
            });

        } catch (error) {
            api.editMessage("❌ Error finding TikTok video.", info.messageID);
        }
    }, messageID);
}

async function handleSendNotification(api, event, args, threadID, messageID) {
    const message = event.body.replace(/notification|notify|send noti|broadcast/gi, '').trim();

    if (!message) {
        return api.sendMessage("What notification would you like to send?", threadID, messageID);
    }

    try {
        const inbox = await api.getThreadList(100, null, ['INBOX']);
        const groups = inbox.filter(group => group.isSubscribed && group.isGroup);

        let sent = 0;
        for (const group of groups) {
            try {
                await api.sendMessage(`📢 Notification: ${message}`, group.threadID);
                sent++;
            } catch (err) {
                console.error(`Failed to send to ${group.threadID}`);
            }
        }

        api.sendMessage(`✅ Notification sent to ${sent} groups.`, threadID, messageID);
    } catch (error) {
        api.sendMessage("❌ Failed to send notifications.", threadID, messageID);
    }
}

function handleComprehensiveHelp(api, threadID, messageID, prefix) {
    const { commands } = global.NashBoT;
    const commandArray = Array.from(commands.values());

    const uniqueCommands = commandArray.filter((cmd, index, self) => 
        index === self.findIndex(c => c.name === cmd.name)
    );

    const traditionalCommands = uniqueCommands.filter(cmd => 
        cmd.nashPrefix !== false && cmd.name !== 'smart'
    );

    let helpContent = `----------------------------------

🤖 𝗔𝗜 & 𝗜𝗻𝘁𝗲𝗹𝗹𝗶𝗴𝗲𝗻𝗰𝗲
   • "on ai" / "ai on" - Enable AI mode
   • "off ai" / "ai off" - Disable AI mode
   • When AI ON: Responds to ANY message
   • When AI OFF: Smart NLP detection only
   • Ask questions naturally & get instant answers
   • Programming help, debugging & code review
   • Math calculations & complex problem solving
   • Educational explanations & tutorials
   • Text analysis, translation & generation
   • General conversation & casual chat
   • Reply to bot messages for context-aware responses

🎮 𝗚𝗿𝗼𝘄 𝗔 𝗚𝗮𝗿𝗱𝗲𝗻 𝗟𝗶𝘃𝗲 𝗧𝗿𝗮𝗰𝗸𝗲𝗿
   • "gag stock" - Current stock status with timers
   • "gag stock start" - Live WebSocket monitoring
   • "gag stock stop" - Stop real-time tracking
   • "restock timer" - View all countdown timers
   • Real-time updates every 10 seconds
   • Filter specific items: "gag stock start Sunflower | Watering Can"
   • Weather bonuses & event tracking included
   • Philippines timezone synchronized

📹 𝗠𝗲𝗱𝗶𝗮 & 𝗘𝗻𝘁𝗲𝗿𝘁𝗮𝗶𝗻𝗺𝗲𝗻𝘁
   • "video" / "shoti" / "girl" - Random TikTok videos
   • "TikTok [search term]" - Search specific content
   • "Download [Facebook URL]" - High-quality video downloads
   • "women" / "babae" - Special meme content
   • Auto-cleanup of temporary files

🔧 𝗨𝘁𝗶𝗹𝗶𝘁𝗶𝗲𝘀 & 𝗧𝗼𝗼𝗹𝘀
   • "uid" / "my id" - Get user identification
   • "list groups" - View all connected groups
   • "notification [message]" - Broadcast to all groups
   • "uptime" - Bot runtime & performance stats
   • Auto-unsend reactions on message deletions

📋 𝗜𝗻𝗳𝗼𝗿𝗺𝗮𝘁𝗶𝗼𝗻 & 𝗦𝘂𝗽𝗽𝗼𝗿𝘁
   • "rules" - Server guidelines & regulations
   • "contact" / "developer" - Creator information
   • "prefix" - View current command prefix
   • "help" / "commands" - This comprehensive guide

🎭 𝗔𝗜 𝗔𝗹𝘁𝗲𝗿𝗻𝗮𝘁𝗶𝘃𝗲𝘀
   • "aria [question]" - Alternative AI assistant

🚪 𝗔𝗱𝗺𝗶𝗻 𝗙𝗲𝗮𝘁𝘂𝗿𝗲𝘀 (𝗔𝗱𝗺𝗶𝗻 𝗢𝗻𝗹𝘆)
   • "leave" / "out" - Remove bot from group
   • "add user [UID]" - Add members to group
   • "change admin [UID]" - Transfer admin privileges
   • "shell [command]" - Execute system commands
   • "eval [code]" - Run JavaScript code directly

----------------------------------`;

    if (traditionalCommands.length > 0) {
        helpContent += `\n\n⚙️ 𝗧𝗥𝗔𝗗𝗜𝗧𝗜𝗢𝗡𝗔𝗟 𝗖𝗢𝗠𝗠𝗔𝗡𝗗𝗦 (${prefix})\n\n`;

        traditionalCommands.forEach((cmd, index) => {
            const number = (index + 1).toString().padStart(2, '0');
            helpContent += `${number}. ${prefix}${cmd.name}`;
            if (cmd.aliases && cmd.aliases.length > 0) {
                helpContent += ` [${cmd.aliases.map(alias => prefix + alias).join(', ')}]`;
            }
            helpContent += `\n    ╰─ ${cmd.description || 'No description available'}\n`;
            if (cmd.cooldowns && cmd.cooldowns > 0) {
                helpContent += `    ╰─ ⏱️ Cooldown: ${cmd.cooldowns}s\n`;
            }
            helpContent += `\n`;
        });

        helpContent += `----------------------------------`;
    }

    helpContent += `\n\n💡 𝗨𝘀𝗮𝗴𝗲 𝗧𝗶𝗽𝘀 & 𝗧𝗿𝗶𝗰𝗸𝘀:
   • Most features work WITHOUT prefixes
   • Use natural language for best results
   • Smart NLP detection understands context
   • Math expressions calculated automatically
   • URLs recognized and processed instantly
   • Questions ending with "?" auto-detected
   • AI mode remembers conversation context

🔧 𝗘𝘅𝗮𝗺𝗽𝗹𝗲 𝗜𝗻𝘁𝗲𝗿𝗮𝗰𝘁𝗶𝗼𝗻𝘀:
   • "What's 15 × 25 + 100?"
   • "How do I center a div in CSS?"
   • "Show me a funny TikTok video"
   • "Download this: [Facebook Video URL]"
   • "What are the rules of this group?"
   • "${prefix}help" (traditional command example)

🚀 𝗡𝗲𝘄 𝗙𝗲𝗮𝘁𝘂𝗿𝗲𝘀:
   • Reply context-awareness for AI responses
   • Enhanced mobile-friendly notifications
   • Improved error handling for "shoti" command
   • Real-time GAG stock WebSocket monitoring
   • Advanced natural language processing

📊 𝗧𝗼𝘁𝗮𝗹: ${uniqueCommands.length} available features`;

    const comprehensiveMessage = design("🤖 NASHBOT - COMPLETE FEATURE GUIDE", helpContent);

    const imagePath = './nashbot.png';

    if (fs.existsSync(imagePath)) {
        const attachment = fs.createReadStream(imagePath);
        api.sendMessage({ body: comprehensiveMessage, attachment }, threadID, messageID);
    } else {
        api.sendMessage(comprehensiveMessage, threadID, messageID);
    }
}

function handlePrefix(api, threadID, prefix) {
    const message = `My prefix is [ 𓆩 '${prefix}' 𓆪 ]\n\nBut guess what? You don't need it anymore! 🎉\nJust talk to me naturally and I'll understand! 💬`;

    const imagePath = './josh.jpeg';

    if (fs.existsSync(imagePath)) {
        const attachment = fs.createReadStream(imagePath);
        api.sendMessage({ body: message, attachment }, threadID);
    } else {
        api.sendMessage(message, threadID);
    }
}

function handleOut(api, event, threadID, messageID, isAdmin) {
    if (isAdmin) {
        api.sendMessage("👋 Goodbye! The bot is leaving this group.", threadID, () => {
            api.removeUserFromGroup(api.getCurrentUserID(), threadID);
        }, messageID);
    } else {
        api.sendMessage("❌ Only admins can make me leave the group.", threadID, messageID);
    }
}

function handleAddUser(api, event, args, threadID, messageID) {
    const uidMatch = event.body.match(/\d{10,}/);
    const uid = uidMatch ? uidMatch[0] : null;

    if (!uid) {
        return api.sendMessage("Please provide a valid UID to add.", threadID, messageID);
    }

    api.sendMessage("Adding user...", threadID, async (err, info) => {
        if (err) return;

        try {
            await api.addUserToGroup(uid, threadID);
            api.editMessage("✅ User added successfully!", info.messageID);
        } catch (error) {
            api.editMessage("❌ Failed to add user.", info.messageID);
        }
    }, messageID);
}

function handleChangeAdmin(api, event, args, threadID, messageID) {
    const uidMatch = event.body.match(/\d{10,}/);
    const newAdminUID = uidMatch ? uidMatch[0] : null;

    if (!newAdminUID) {
        return api.sendMessage("Please provide a valid UID for the new admin.", threadID, messageID);
    }

    try {
        const configPath = path.join(__dirname, '../../config.json');
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        config.adminUID = newAdminUID;
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        api.sendMessage(`✅ Admin changed to UID: ${newAdminUID}`, threadID, messageID);
    } catch (error) {
        api.sendMessage("❌ Failed to change admin.", threadID, messageID);
    }
}

function handleShell(api, event, args, threadID, messageID) {
    const command = event.body.replace(/^(shell|run)\s+/i, '');

    if (!command) {
        return api.sendMessage('What command should I run?', threadID, messageID);
    }

    exec(command, (error, stdout, stderr) => {
        if (error) {
            api.sendMessage(`Error: ${error.message}`, threadID, messageID);
            return;
        }
        if (stderr) {
            api.sendMessage(`Error: ${stderr}`, threadID, messageID);
            return;
        }
        api.sendMessage(`Output:\n${stdout}`, threadID, messageID);
    });
}

async function handleEval(api, event, args, threadID, messageID) {
    const command = event.body.replace(/^eval\s+/i, '');

    if (!command) {
        return api.sendMessage('What JavaScript should I evaluate?', threadID, messageID);
    }

    try {
        const chat = {
            reply: (msg) => {
                if (typeof msg === 'object' && msg.body) {
                    api.sendMessage(msg.body, threadID, messageID);
                } else {
                    api.sendMessage(msg, threadID, messageID);
                }
            }
        };

        await eval(command);
    } catch (error) {
        api.sendMessage(`Error: ${error.message}`, threadID, messageID);
    }
}

async function handleListBox(api, threadID, messageID) {
    try {
        const inbox = await api.getThreadList(100, null, ['INBOX']);
        const list = inbox.filter(group => group.isSubscribed && group.isGroup);

        const listthread = [];
        for (const groupInfo of list) {
            const data = await api.getThreadInfo(groupInfo.threadID);
            listthread.push({
                id: groupInfo.threadID,
                name: groupInfo.name,
                sotv: data.userInfo.length,
            });
        }

        const listbox = listthread.sort((a, b) => b.sotv - a.sotv);

        let msg = '📊 Group List:\n\n';
        listbox.forEach((group, i) => {
            msg += `${i + 1}. ${group.name}\n🧩TID: ${group.id}\n🐸Members: ${group.sotv}\n\n`;
        });

        api.sendMessage(msg, threadID, messageID);
    } catch (error) {
        api.sendMessage('Error fetching group list.', threadID, messageID);
    }
}

function handleGagStock(api, event, body, threadID, messageID) {
    const message = body.toLowerCase().trim();
    const action = extractAction(message);
    const filters = extractFilters(body);

    if (action === "off" || action === "stop") {
        return handleStopTracking(api, threadID, messageID);
    }

    if (action === "on" || action === "start") {
        return handleStartTracking(api, threadID, messageID, filters);
    }

    if (action === "status" || action === "current") {
        return handleCurrentStatus(api, threadID, messageID);
    }

    if (action === "timer" || action === "restock") {
        return handleRestockTimers(api, threadID, messageID);
    }

    const helpContent = `----------------------------------

🔥 𝗤𝗨𝗜𝗖𝗞 𝗔𝗖𝗧𝗜𝗢𝗡𝗦
   ▶️ gag stock start
   ⏹️ gag stock stop
   📊 gag stock status
   ⏰ restock timer

🎯 𝗔𝗗𝗩𝗔𝗡𝗖𝗘𝗗 𝗙𝗘𝗔𝗧𝗨𝗥𝗘𝗦
   🔍 gag stock start Sunflower | Watering Can
   📡 Real-time WebSocket monitoring
   🌐 Live updates across all groups
   ⚡ Instant restock notifications

----------------------------------

💡 𝗧𝗜𝗣𝗦 & 𝗧𝗥𝗜𝗖𝗞𝗦
   • Use filters to track specific items
   • Separate multiple filters with "|"
   • Timers auto-update in Philippines timezone
   • Weather bonuses included in status

🚀 𝗣𝗢𝗪𝗘𝗥𝗘𝗗 𝗕𝗬 𝗪𝗘𝗕𝗦𝗢𝗖𝗞𝗘𝗧
   Real-time data from Grow a Garden Stock`;

    const gagHelp = design("🌾 GROW A GARDEN STOCK TRACKER", helpContent);
    return api.sendMessage(gagHelp, threadID, messageID);
}

function extractAction(message) {
    if (message.includes('start') || message.includes('on') || message.includes('track')) {
        return 'start';
    }
    if (message.includes('stop') || message.includes('off') || message.includes('end')) {
        return 'stop';
    }
    if (message.includes('status') || message.includes('current')) {
        return 'status';
    }
    if (message.includes('timer') || message.includes('restock')) {
        return 'timer';
    }
    return 'unknown';
}

function extractFilters(body) {
    const parts = body.split('|');
    if (parts.length > 1) {
        return parts.slice(1).map(f => f.trim().toLowerCase()).filter(Boolean);
    }
    return [];
}

function handleStopTracking(api, threadID, messageID) {
    const session = activeSessions.get(threadID);
    if (session) {
        clearInterval(session.keepAlive);
        session.closed = true;
        session.ws?.terminate();
        activeSessions.delete(threadID);
        lastSentCache.delete(threadID);

    const stopContent = `----------------------------------

🛑 𝗧𝗥𝗔𝗖𝗞𝗜𝗡𝗚 𝗧𝗘𝗥𝗠𝗜𝗡𝗔𝗧𝗘𝗗

📡 WebSocket connection closed
🔄 Real-time monitoring disabled
💾 Session data cleared
✅ Successfully stopped

----------------------------------

🎮 Use 'gag stock start' to resume tracking`;

        const stopMessage = design("🌾 GAG STOCK TRACKER", stopContent);
        return api.sendMessage(stopMessage, threadID, messageID);
    } else {
        const notActiveContent = `----------------------------------

⚠️ 𝗡𝗢 𝗔𝗖𝗧𝗜𝗩𝗘 𝗦𝗘𝗦𝗦𝗜𝗢𝗡

📡 No tracking session found
🔄 Monitoring is not running
🎮 Use 'gag stock start' to begin`;

        const notActiveMessage = design("🌾 GAG STOCK TRACKER", notActiveContent);
        return api.sendMessage(notActiveMessage, threadID, messageID);
    }
}

function handleStartTracking(api, threadID, messageID, filters) {
    if (activeSessions.has(threadID)) {
        const alreadyActiveContent = `----------------------------------

⚠️ 𝗧𝗥𝗔𝗖𝗞𝗜𝗡𝗚 𝗔𝗟𝗥𝗘𝗔𝗗𝗬 𝗔𝗖𝗧𝗜𝗩𝗘

📡 Live monitoring is currently running
🔄 Real-time updates are being delivered
⏹️ Use 'gag stock stop' to terminate`;

        const alreadyActive = design("🌾 GAG STOCK TRACKER", alreadyActiveContent);
        return api.sendMessage(alreadyActive, threadID, messageID);
    }

    const startContent = `----------------------------------

✅ 𝗧𝗥𝗔𝗖𝗞𝗜𝗡𝗚 𝗜𝗡𝗜𝗧𝗜𝗔𝗟𝗜𝗭𝗘𝗗

📡 WebSocket connection established
🔄 Real-time monitoring activated
⚡ Instant notifications enabled
${filters.length > 0 ? `🎯 Filtered items: ${filters.join(', ')}` : '🌍 Monitoring all items'}

----------------------------------

🎮 Get ready for live GAG stock updates!`;

    const startMessage = design("🌾 GAG STOCK TRACKER", startContent);
    api.sendMessage(startMessage, threadID, messageID);

    let ws;
    let keepAliveInterval;

    function connectWebSocket() {
        ws = new WebSocket("wss://gagstock.gleeze.com");

        ws.on("open", () => {
            keepAliveInterval = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send("ping");
                }
            }, 10000);
        });

        ws.on("message", async (data) => {
            try {
                const payload = JSON.parse(data);
                if (payload.status !== "success") return;

                const backup = payload.data;
                const stockData = {
                    gearStock: backup.gear.items.map(i => ({ name: i.name, value: Number(i.quantity) })),
                    seedsStock: backup.seed.items.map(i => ({ name: i.name, value: Number(i.quantity) })),
                    eggStock: backup.egg.items.map(i => ({ name: i.name, value: Number(i.quantity) })),
                    cosmeticsStock: backup.cosmetics.items.map(i => ({ name: i.name, value: Number(i.quantity) })),
                    summerEventData: {
                        name: "Summer Event 2025",
                        status: "Active",
                        description: "Special summer activities and rewards"
                    }
                };

                const currentKey = JSON.stringify({
                    gearStock: stockData.gearStock,
                    seedsStock: stockData.seedsStock
                });

                const lastSent = lastSentCache.get(threadID);
                if (lastSent === currentKey) return;
                lastSentCache.set(threadID, currentKey);

                const restocks = getNextRestocks();
                const formatList = (arr) => arr.map(i => `- ${addEmoji(i.name)}: ${formatValue(i.value)}`).join("\n");

                let filteredContent = "";
                let matched = 0;

                const addSection = (label, items, restock) => {
                    const filtered = filters.length ? items.filter(i => filters.some(f => i.name.toLowerCase().includes(f))) : items;
                    if (label === "🛠️ 𝐆𝐄𝐀𝐑𝐒" || label === "🌱 𝐒𝐄𝐄𝐃𝐒") {
                        if (filtered.length > 0) {
                            matched += filtered.length;
                            filteredContent += `${label}:\n${formatList(filtered)}\n⏳ Restock In: ${restock}\n\n`;
                        }
                    } else {
                        filteredContent += `${label}:\n${formatList(items)}\n⏳ Restock In: ${restock}\n\n`;
                    }
                };

                addSection("🛠️ 𝐆𝐄𝐀𝐑𝐒", stockData.gearStock, restocks.gear);
                addSection("🌱 𝐒𝐄𝐄𝐃𝐒", stockData.seedsStock, restocks.seed);
                addSection("🥚 𝐄𝐆𝐆𝐒", stockData.eggStock, restocks.egg);
                addSection("🎨 𝐂𝐎𝐒𝐌𝐄𝐓𝐈𝐂𝐒", stockData.cosmeticsStock, restocks.cosmetics);

                filteredContent += `☀️ 𝐒𝐔𝐌𝐌𝐄𝐑 𝐄𝐕𝐄𝐍𝐓:\n🎯 Event: ${stockData.summerEventData.name}\n📊 Status: ${stockData.summerEventData.status}\n📝 ${stockData.summerEventData.description}\n⏳ Next Update: ${restocks.summerEvent}\n\n`;

                if (matched === 0 && filters.length > 0) return;

                const updatedAtPH = getPHTime().toLocaleString("en-PH", {
                    hour: "numeric", minute: "numeric", second: "numeric",
                    hour12: true, day: "2-digit", month: "short", year: "numeric"
                });

                const weather = await axios.get("https://growagardenstock.com/api/stock/weather").then(res => res.data).catch(() => null);
                const weatherInfo = weather ? `🌤️ 𝐖𝐄𝐀𝐓𝐇𝐄𝐑: ${weather.icon} ${weather.weatherType}\n📋 ${weather.description}\n🎯 ${weather.cropBonuses}\n\n` : "";

                const liveContent = `----------------------------------

${filteredContent}${weatherInfo}----------------------------------

📡 LIVE UPDATE • ${updatedAtPH}
🔄 Next refresh in ~10 seconds
⚡ Real-time WebSocket monitoring`;

                const liveMessage = design("🌾 GROW A GARDEN — LIVE TRACKER", liveContent);

                if (!activeSessions.has(threadID)) return;
                api.sendMessage(liveMessage, threadID);
            } catch (e) {
                console.error('GAG Stock WebSocket Error:', e);
            }
        });

        ws.on("close", () => {
            clearInterval(keepAliveInterval);
            const session = activeSessions.get(threadID);
            if (session && !session.closed) setTimeout(connectWebSocket, 3000);
        });

        ws.on("error", (error) => {
            console.error('GAG Stock WebSocket Error:', error);
            ws.close();
        });

        activeSessions.set(threadID, { ws, keepAlive: keepAliveInterval, closed: false });
    }

    connectWebSocket();
}

async function handleCurrentStatus(api, threadID, messageID) {
    try {
        const response = await axios.get('https://growagardenstock.com/api/stock');
        const stockData = response.data;

        const restocks = getNextRestocks();
        const formatList = (arr) => arr.map(i => `- ${addEmoji(i.name)}: ${formatValue(i.quantity)}`).join("\n");

        let content = "";
        content += `🛠️ 𝗚𝗘𝗔𝗥𝗦:\n${formatList(stockData.gear.items)}\n⏳ Restock In: ${restocks.gear}\n\n`;
        content += `🌱 𝗦𝗘𝗘𝗗𝗦:\n${formatList(stockData.seed.items)}\n⏳ Restock In: ${restocks.seed}\n\n`;
        content += `🥚 𝗘𝗚𝗚𝗦:\n${formatList(stockData.egg.items)}\n⏳ Restock In: ${restocks.egg}\n\n`;
        content += `🎨 𝗖𝗢𝗦𝗠𝗘𝗧𝗜𝗖𝗦:\n${formatList(stockData.cosmetics.items)}\n⏳ Restock In: ${restocks.cosmetics}\n\n`;
        content += `☀️ 𝗦𝗨𝗠𝗠𝗘𝗥 𝗘𝗩𝗘𝗡𝗧:\n🎯 Event: Summer Event 2025\n📊 Status: Active\n📝 Special summer activities and rewards\n⏳ Next Update: ${restocks.summerEvent}\n\n`;

        const updatedAtPH = getPHTime().toLocaleString("en-PH", {
            hour: "numeric", minute: "numeric", second: "numeric",
            hour12: true, day: "2-digit", month: "short", year: "numeric"
        });

        const weather = await axios.get("https://growagardenstock.com/api/stock/weather").then(res => res.data).catch(() => null);
        const weatherInfo = weather ? `🌤️ 𝗪𝗘𝗔𝗧𝗛𝗘𝗥: ${weather.icon} ${weather.weatherType}\n📋 ${weather.description}\n🎯 ${weather.cropBonuses}\n\n` : "";

        const statusContent = `----------------------------------

${content}${weatherInfo}----------------------------------

📊 STATUS UPDATE • ${updatedAtPH}
🎮 Use 'gag stock start' for live tracking
📡 Real-time monitoring available`;

        const statusMessage = design("🌾 GROW A GARDEN — CURRENT STOCK", statusContent);
        api.sendMessage(statusMessage, threadID, messageID);
    } catch (error) {
        console.error('Error fetching current stock:', error);
        api.sendMessage("❌ Failed to fetch current stock data.", threadID, messageID);
    }
}

function handleRestockTimers(api, threadID, messageID) {
    const timers = getNextRestocks();
    const currentTime = getPHTime().toLocaleTimeString('en-US', { 
        timeZone: PH_TIMEZONE,
        hour12: true 
    });

    const currentDate = getPHTime().toLocaleDateString('en-PH', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const timerContent = `----------------------------------

⏰ 𝗥𝗘𝗦𝗧𝗢𝗖𝗞 𝗧𝗜𝗠𝗘𝗥𝗦

🥚 Eggs: ${timers.egg}
☀️ Summer Event: ${timers.summerEvent}
⚙️ Gear: ${timers.gear}
🌱 Seeds: ${timers.seed}
💄 Cosmetics: ${timers.cosmetics}

----------------------------------

🕒 Current Time (PH): ${currentTime}
📅 ${currentDate}

💡 All timers shown in Philippines timezone
🔄 Use 'gag stock start' for live tracking`;

    const timerMessage = design("🌾 GROW A GARDEN — RESTOCK TIMERS", timerContent);
    api.sendMessage(timerMessage, threadID, messageID);
}

function handleWomen(api, threadID, messageID) {
    const msg = {
        body: "Women talaga",
        attachment: fs.createReadStream(__dirname + `/noprefix/Women.mp4`)
    };

    api.sendMessage(msg, threadID, messageID);
    api.setMessageReaction('☕', messageID, (err) => {
        if (err) console.error('Error setting reaction:', err);
    });
}
