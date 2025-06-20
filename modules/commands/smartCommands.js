const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const FormData = require("form-data");
const { format } = require("cassidy-styler");
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

        if (isDownloadRequest(message, body)) {
            return handleDownload(api, event, body, threadID, messageID);
        }

        if (isTikTokSearch(message)) {
            return handleTikTokSearch(api, event, body, threadID, messageID);
        }

        if (isContactRequest(message)) {
            return handleContact(api, threadID, messageID);
        }

        if (isSpeechRequest(message)) {
            return handleSpeech(api, event, body, threadID, messageID);
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

        if (isHelpRequest(message)) {
            return handleHelp(api, threadID, messageID, prefix);
        }

        if (isCommandListRequest(message)) {
            return handleCommandList(api, threadID, messageID, prefix);
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

        if (isAIQuery(message)) {
            return handleAIQuery(api, event, body, threadID, messageID);
        }
    }
};

function isAIQuery(message) {

    const specificAiKeywords = [
        'explain', 'tell me about', 'what is', 'how does', 'why does',
        'define', 'meaning of', 'calculate', 'solve', 'create', 'write',
        'generate', 'gpt', 'ai', 'chatgpt', 'openai', 'assistant'
    ];
    
    const questionWords = ['what', 'how', 'why', 'when', 'where', 'who'];
    
    if (specificAiKeywords.some(keyword => message.includes(keyword))) {
        return true;
    }
    
    if (message.endsWith('?') || questionWords.some(word => message.startsWith(word + ' '))) {
       
        const excludePatterns = [
            'what commands', 'what cmd', 'what are the rules', 'what is your prefix',
            'what\'s my uid', 'what\'s my id', 'how long', 'when did'
        ];
        
        if (!excludePatterns.some(pattern => message.includes(pattern))) {
            return true;
        }
    }
    
    return false;
}

function isContactRequest(message) {
    return message.includes('contact') || message.includes('owner info') || 
           message.includes('contacts') || message.includes('info') || 
           message.includes('developer') || message.includes('creator info');
}

function isSpeechRequest(message) {
    const speechKeywords = ['speech', 'speak', 'say', 'voice', 'talk', 'pronounce'];
    return speechKeywords.some(keyword => message.includes(keyword));
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
           message.includes('what are your features') || message.includes('smart');
}

function isCommandListRequest(message) {
    return message.includes('command') || message.includes('cmd') || 
           message.includes('list command') || message.includes('show command') ||
           message.includes('list cmd') || message.includes('show cmd') ||
           message.includes('available command') || message.includes('what commands');
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

async function handleAIQuery(api, event, body, threadID, messageID) {
    const prompt = body.trim();
    
    api.sendMessage("🤖 Thinking...", threadID, async (err, info) => {
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
    const contactContent = `👨‍💻 Developers: Joshua Apostol | Cyril Encenso
📧 Email: joshuaapostol909@gmail.com | Amigohaycyril10@gmail.com
📱 Facebook: https://www.facebook.com/joshuaapostol2006 | https://www.facebook.com/cyypookie
🌐 Website: joshua-portfolio.com
💻 GitHub: https://github.com/joshuaApos | https://github.com/atsushinakajima14

💬 For support or inquiries, feel free to reach out!`;
    
    const contactInfo = design("📞 Contact Information", contactContent);
    api.sendMessage(contactInfo, threadID, messageID);
}

async function handleSpeech(api, event, body, threadID, messageID) {
    const text = body.replace(/speech|speak|say|voice|talk|pronounce/gi, '').trim();
    
    if (!text) {
        return api.sendMessage("What would you like me to say?", threadID, messageID);
    }

    api.sendMessage("🔊 Generating speech...", threadID, async (err, info) => {
        try {
            const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(text)}`;
            const response = await axios.get(url, { responseType: 'stream' });
            
            const audioPath = path.join(__dirname, 'temp', `speech_${Date.now()}.mp3`);
            const writer = fs.createWriteStream(audioPath);
            
            response.data.pipe(writer);
            
            writer.on('finish', () => {
                api.sendMessage({
                    attachment: fs.createReadStream(audioPath)
                }, threadID, () => {
                    fs.unlinkSync(audioPath);
                    api.unsendMessage(info.messageID);
                });
            });
        } catch (error) {
            api.editMessage("❌ Failed to generate speech.", info.messageID);
        }
    });
}

async function handleAria(api, event, body, threadID, messageID) {
    const prompt = body.replace(/aria/gi, '').trim();
    
    if (!prompt) {
        return api.sendMessage("What would you like to ask Aria?", threadID, messageID);
    }

    api.sendMessage("🤖 Aria is thinking...", threadID, async (err, info) => {
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

            const videoPath = path.resolve(__dirname, 'temp', 'shoti.mp4');
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

function handleHelp(api, threadID, messageID, prefix) {
    const helpContent = `✨ Just talk naturally! I understand:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🤖 𝗔𝗜 & 𝗤𝘂𝗲𝘀𝘁𝗶𝗼𝗻𝘀
   • Ask anything naturally
   • Get intelligent responses
   • No special commands needed

📋 𝗥𝘂𝗹𝗲𝘀 & 𝗜𝗻𝗳𝗼
   • "What are the rules?"
   • "Contact info"
   • "Bot uptime"

📹 𝗠𝗲𝗱𝗶𝗮 & 𝗘𝗻𝘁𝗲𝗿𝘁𝗮𝗶𝗻𝗺𝗲𝗻𝘁
   • "Send me a video" or "shoti"
   • "Find TikTok video about..."
   • "Download [Facebook URL]"

🔧 𝗨𝘁𝗶𝗹𝗶𝘁𝗶𝗲𝘀
   • "Get ID/UID"
   • "List groups"
   • "Say something" (speech)
   • "Send notification"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💬 𝗡𝗼 𝗰𝗼𝗺𝗺𝗮𝗻𝗱𝘀 𝗻𝗲𝗲𝗱𝗲𝗱 - 𝗷𝘂𝘀𝘁 𝗰𝗵𝗮𝘁!`;
    
    const helpMessage = design("🤖 NASHBOT - SMART VERSION", helpContent);
    
    const imagePath = './nashbot.png';
    
    if (fs.existsSync(imagePath)) {
        const attachment = fs.createReadStream(imagePath);
        api.sendMessage({ body: helpMessage, attachment }, threadID);
    } else {
        api.sendMessage(helpMessage, threadID);
    }
}

function handleCommandList(api, threadID, messageID, prefix) {
    const { commands } = global.NashBoT;
    const commandArray = Array.from(commands.values());
    
    const uniqueCommands = commandArray.filter((cmd, index, self) => 
        index === self.findIndex(c => c.name === cmd.name)
    );
    
    const traditionalCommands = uniqueCommands.filter(cmd => 
        cmd.nashPrefix !== false && cmd.name !== 'smart'
    );
    
    const smartFeatures = [
        "🤖 AI Questions & Chat",
        "📋 Rules & Guidelines", 
        "📹 Video Entertainment",
        "🆔 User ID Information",
        "⬬ Facebook Downloads",
        "🎵 TikTok Search",
        "📊 Group Management",
        "👩 Special Content",
        "🔊 Text-to-Speech",
        "📞 Contact Information",
        "⏰ System Uptime",
        "📢 Notifications",
        "🚪 Group Exit"
    ];
    
    let smartContent = `✨ 𝗦𝗠𝗔𝗥𝗧 𝗙𝗘𝗔𝗧𝗨𝗥𝗘𝗦 (𝗡𝗼 𝗣𝗿𝗲𝗳𝗶𝘅 𝗡𝗲𝗲𝗱𝗲𝗱!)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;
    
    smartFeatures.forEach((feature, index) => {
        const number = (index + 1).toString().padStart(2, '0');
        smartContent += `${number}. ${feature}\n`;
    });
    
    smartContent += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    if (traditionalCommands.length > 0) {
        smartContent += `⚙️ 𝗧𝗥𝗔𝗗𝗜𝗧𝗜𝗢𝗡𝗔𝗟 𝗖𝗢𝗠𝗠𝗔𝗡𝗗𝗦 (${prefix})\n\n`;
        
        traditionalCommands.forEach((cmd, index) => {
            const number = (index + 1).toString().padStart(2, '0');
            smartContent += `${number}. ${prefix}${cmd.name}`;
            if (cmd.aliases && cmd.aliases.length > 0) {
                smartContent += ` [${cmd.aliases.map(alias => prefix + alias).join(', ')}]`;
            }
            smartContent += `\n    ╰─ ${cmd.description || 'No description available'}\n\n`;
        });
        
        smartContent += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    }
    
    smartContent += `💡 𝗧𝗜𝗣: Just type naturally!
Example: "What's the weather?" or "Send me a video"

🔧 For traditional commands, use ${prefix} prefix`;
    
    const commandListMessage = design("🤖 NASHBOT - AVAILABLE COMMANDS", smartContent);
    
    const imagePath = './josh.jpeg';
    
    if (fs.existsSync(imagePath)) {
        const attachment = fs.createReadStream(imagePath);
        api.sendMessage({ body: commandListMessage, attachment }, threadID, messageID);
    } else {
        api.sendMessage(commandListMessage, threadID, messageID);
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
