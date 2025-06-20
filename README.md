
# Authors

<div align="center">
  <img src="https://i.imgur.com/TM6qhgB.jpeg" alt="Profile Image" width="120" height="120" style="border-radius: 50%;">
</div>
<div align="center">
  <p><strong>Joshua Apostol & Cyril Encenso</strong></p>
</div>

<div align="center">
  <h2><strong>NASHBOT</strong></h2>
</div>

<div align="center">
  <p>Welcome to NASHBOT - your ultimate companion for managing Facebook group chats with ease!</p>
</div>

## ✨ Smart Commands System

NASH BOT features an intelligent command system that understands natural language! You can interact with the bot without needing to remember specific command prefixes.

### 🤖 AI Assistant
Just ask questions naturally:
- "What is the weather today?"
- "Tell me about artificial intelligence"
- "How do I cook pasta?"
- "Explain quantum physics"

### 📋 Available Commands

#### 🎥 Video Commands
- **Request videos**: "send video", "show me a video", "shoti", "girl video"
- **TikTok content**: "tiktok video", "random shoti"
- **Facebook content**: "download this...", "download [Link]"

#### 📞 Contact Information
- **Get owner info**: "contact", "owner info", "developer", "creator info"

#### 📖 Rules & Guidelines
- **View server rules**: "rules", "what are the rules", "guidelines", "regulations"

#### 🔊 Text-to-Speech
- **Voice synthesis**: "speech", "speak this", "say", "voice", "pronounce"

#### 🤖 Alternative AI
- **Aria AI**: "aria", "alternative ai"

#### 📊 Utility Commands
- **View all commands**: "help", "commands", "cmd list"

### 🌟 Natural Language Processing
The bot automatically detects what you want based on keywords in your message. No need to remember exact command syntax!

## HOW TO CREATE COMMANDS?

### 📁 File Structure
Commands should be placed in the `modules/commands/` directory as `.js` files.

### 🔧 Command Template
```javascript
module.exports = {
  name: "commandname",           // Command name (required)
  description: "Command description", // What the command does
  nashPrefix: true,              // true = requires prefix, false = works without prefix
  role: "user",                  // "admin" or "user" - restricts command access
  aliases: ["alias1", "alias2"], // Alternative names for the command
  cooldowns: 5,                  // Cooldown in seconds (0 = no cooldown)
  version: "1.0.0",             // Command version (optional)
  execute: async (api, event, args, prefix) => {
    // Your command logic here
    const { threadID, messageID, senderID, body } = event;
    
    // Send a message
    api.sendMessage("Hello from my command!", threadID, messageID);
  }
};
```

### 📝 Command Examples

#### 1. Basic Command with Prefix
```javascript
module.exports = {
  name: "hello",
  description: "Greets the user",
  nashPrefix: true,
  role: "user",
  aliases: ["hi", "greet"],
  cooldowns: 3,
  execute: (api, event, args, prefix) => {
    api.sendMessage(`Hello! Thanks for using NashBot`, event.threadID);
  }
};
```

#### 2. Smart Command (No Prefix Required)
```javascript
module.exports = {
  name: "weather",
  description: "Gets weather information",
  nashPrefix: false, // Works without prefix
  role: "user",
  cooldowns: 10,
  execute: async (api, event, args, prefix) => {
    const { threadID, messageID, body } = event;
    
    // Extract location from message
    const location = body.replace(/weather|in|for/gi, '').trim();
    
    if (!location) {
      return api.sendMessage("Please specify a location!", threadID, messageID);
    }
    
    // Your weather API logic here
    api.sendMessage(`Weather for ${location}: Sunny, 25°C`, threadID, messageID);
  }
};
```

#### 3. Admin-Only Command
```javascript
module.exports = {
  name: "restart",
  description: "Restarts the bot (admin only)",
  nashPrefix: true,
  role: "admin", // Only admins can use this
  cooldowns: 30,
  execute: (api, event, args, prefix) => {
    api.sendMessage("Restarting bot...", event.threadID, () => {
      process.exit(1);
    });
  }
};
```

#### 4. Command with File Attachments
```javascript
const fs = require("fs");
const path = require("path");

module.exports = {
  name: "image",
  description: "Sends an image",
  nashPrefix: true,
  role: "user",
  cooldowns: 5,
  execute: (api, event, args, prefix) => {
    const imagePath = path.join(__dirname, "assets", "sample.jpg");
    
    if (fs.existsSync(imagePath)) {
      api.sendMessage({
        body: "Here's your image!",
        attachment: fs.createReadStream(imagePath)
      }, event.threadID);
    } else {
      api.sendMessage("Image not found!", event.threadID);
    }
  }
};
```

### 🎯 Smart Command Integration

To add functionality to the smart command system (like in `smartCommands.js`), you can:

1. **Add Detection Function:**
```javascript
function isYourCommandRequest(message) {
  return message.includes('your keyword') || message.includes('trigger phrase');
}
```

2. **Add Handler Function:**
```javascript
async function handleYourCommand(api, event, body, threadID, messageID) {
  // Your command logic here
  api.sendMessage("Smart command response!", threadID, messageID);
}
```

3. **Add to Execute Function:**
```javascript
// Add this in the smartCommands.js execute function
if (isYourCommandRequest(message)) {
  return handleYourCommand(api, event, body, threadID, messageID);
}
```

### 📋 Command Properties Explained

- **name**: Unique identifier for the command
- **description**: Brief explanation of what the command does
- **nashPrefix**: 
  - `true` = Command requires the bot prefix (e.g., `/hello`)
  - `false` = Command works without prefix (smart detection)
- **role**: 
  - `"user"` = Anyone can use the command
  - `"admin"` = Only users in `config.json` adminUID can use
- **aliases**: Array of alternative names for the command
- **cooldowns**: Time in seconds before user can use command again
- **version**: Optional version number for your command

### 🔄 Event Object Properties

The `event` object contains:
- `threadID`: Group/chat ID where message was sent
- `messageID`: ID of the message that triggered the command
- `senderID`: Facebook user ID of the sender
- `body`: Full text content of the message
- `args`: Array of arguments (words after command name)
- `mentions`: Object containing mentioned users
- `attachments`: Array of attached files/media

### 💡 Best Practices

1. **Always handle errors** with try-catch blocks
2. **Use async/await** for API calls
3. **Validate user input** before processing
4. **Clean up temporary files** after use
5. **Use meaningful command names** and descriptions
6. **Test commands thoroughly** before deployment
7. **Follow the existing code style** in the project

## Features

- **Smart Command System**: 
  - Natural language processing for intuitive interactions
  - No prefix required for most commands
  - Intelligent keyword detection
  - Fallback to traditional prefix-based commands

- **Command Handling**: 
  - Supports dynamic command registration
  - Allows commands to be prefixed for easier access
  - Role-based command execution to restrict access to admin users
  - Cooldown system to prevent spam
  - Command aliases for flexibility

- **Automatic Login**: 
  - Automatically logs in using saved app state credentials
  - Maintains user sessions and handles reconnections gracefully
  - Retry mechanism with configurable attempts
  - Connection timeout handling

- **Event Handling**: 
  - Listens for events and executes corresponding handlers
  - Join/leave notifications with custom messages
  - Auto-reactions and unsend reactions
  - Keep-alive mechanism for stable connections

- **Custom Configuration**: 
  - Configurable through a `config.json` file
  - Allows setting command prefixes and admin user IDs
  - Customizable bot behavior and responses

- **Web Interface**:
  - Express server for monitoring and control
  - Status dashboard accessible via web browser
  - Real-time bot status information

## 🚀 Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure the Bot**:
   - Edit `config.json` with your settings
   - Set your admin UID and preferred prefix

3. **Set up Facebook Authentication**:
   - Follow the C3C tutorial below to get your appstate
   - Place the appstate in `appstate.json`

4. **Run the Bot**:
   ```bash
   node index.js
   ```

## Configuration

### config.json Example:
```json
{
  "prefix": "!",
  "adminUID": ["your_facebook_user_id_here"]
}
```

## Troubleshooting

- **Issue:** Bot fails to log in.
  - **Solution:** Check your credentials in `config.json` and ensure your app state is valid. Try generating a new appstate using the C3C method below.
  
- **Issue:** Commands not responding.
  - **Solution:** Ensure the command prefix is set correctly in `config.json`. Remember that smart commands work without prefixes!

- **Issue:** "Error retrieving userID" message.
  - **Solution:** Your appstate may be expired. Generate a new one using the C3C extension tutorial below.

- **Issue:** Bot keeps retrying login.
  - **Solution:** Check if your Facebook account needs verification. Log into Facebook normally in a browser first.

# Facebook AppState C3C Tutorial 

## Overview
This project allows you to utilize the Facebook app state for your bot. Follow the instructions below to download the C3C extension and obtain your app state.

## Requirements
- **Kiwi Browser** (available on the Google Play Store)
- **C3C Extension** (available on GitHub)

## Step 1: Download the C3C Extension
1. **Download the C3C ZIP File**:
   - Go to the [C3C GitHub Releases page](https://github.com/c3cbot/c3c-ufc-utility/releases/tag/2.0.1)
   - Download the ZIP file of the latest release.

2. **Extract the ZIP File**:
   - Locate the downloaded ZIP file in your device's file manager and extract its contents.

## Step 2: Install the C3C Extension in Kiwi Browser
1. **Open Kiwi Browser**:
   - Launch the Kiwi Browser on your device.

2. **Access Extensions**:
   - Tap on the three-dot menu in the upper-right corner.
   - Select **Extensions** from the dropdown.

3. **Enable Developer Mode**:
   - Toggle the **Developer mode** option at the top right corner.

4. **Install the Extension**:
   - Tap on **Load unpacked** and select the extracted folder from the ZIP file.

## Step 3: Obtain Your Facebook AppState
1. **Log into Facebook**:
   - With the C3C extension installed, navigate to the Facebook website and log in to your account.

2. **Access AppState**:
   - Click on the C3C extension icon in the Kiwi Browser.
   - Use the extension to generate your app state.

3. **Copy the AppState**:
   - Once generated, copy the app state JSON data.

## Step 4: Use AppState in Your Project
1. **Replace AppState in Your Code**:
   - In your project, locate the `appstate.json` file.
   - Replace the entire content with the copied app state JSON data.

2. **Run Your Project**:
   - Start the project to see the bot in action using the app state.

## 📝 Note
- Keep your app state secure and do not share it publicly
- App states expire periodically, so you may need to regenerate them
- If you encounter login issues, try generating a fresh app state
- Make sure to log into Facebook normally in a browser before generating the app state

## 🔧 Advanced Configuration

### Custom Smart Commands
You can extend the smart command system by modifying the `smartCommands.js` file. Add new keyword detection functions and corresponding command handlers.

### Adding New Events
Create new event handlers in the `modules/events/` directory following the existing pattern.

### Cooldown System
Commands support cooldowns to prevent spam. Set the `cooldowns` property in seconds in your command module.

## 🤝 Support
If you encounter any issues or need further assistance, please refer to the documentation or community forums.

---

## 🧠 Smart Command System Architecture

The smart command system in NASHBOT uses an intelligent priority-based detection mechanism that understands natural language without requiring command prefixes.

### 🔧 Core Components

#### 1. Priority-Based Command Detection
The system processes commands in order of specificity to avoid conflicts:
```javascript
// Specific commands (high priority)
- Download requests (Facebook URLs)
- TikTok searches
- Contact information
- Speech synthesis
- Rules queries

// General commands (medium priority)
- Video requests
- UID requests
- Help commands

// AI queries (lowest priority)
- General questions and conversations
```

#### 2. Keyword Detection Functions
Each command type has its own detection function:
- `isDownloadRequest()` - Detects Facebook video download requests
- `isTikTokSearch()` - Identifies TikTok search queries
- `isContactRequest()` - Recognizes contact information requests
- `isAIQuery()` - Smart AI detection with conflict avoidance

#### 3. Cooldown System
Prevents spam with a 3-second cooldown per user:
```javascript
const smartCooldowns = new Map();
// Each user has individual cooldown tracking
```

#### 4. Message Formatting with Cassidy-Styler
Enhanced message presentation using the `design()` function:
```javascript
function design(title, content) {
    return format({
        title,
        titleFont: "bold",
        contentFont: "none",
        titlePattern: "【 NASH 】{word} {emojis}",
        content,
    });
}
```

### 🎯 Conflict Resolution Strategy

The system resolves command conflicts by:
1. **Specific Pattern Matching**: Exact keyword matches get priority
2. **Context Analysis**: Excludes common phrases from AI detection
3. **Order of Operations**: Processes specific commands before general AI queries
4. **Fallback Mechanism**: Defaults to AI chat for unmatched queries

### 📊 Performance Features

- **Individual Cooldowns**: Per-user spam protection
- **Efficient Processing**: Priority-based early returns
- **Memory Management**: Automatic cooldown cleanup
- **Error Handling**: Graceful fallbacks for failed operations

## 🚀 Top Contributors

- Joshua Apostol 
- Cyril Encenso 
