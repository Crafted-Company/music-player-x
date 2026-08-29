# Crafted Co. Music Player 🎵

A retro iPod Classic-inspired music player built with React, TypeScript, Tailwind CSS, and Capacitor for Android & Web.

![License](https://img.shields.io/badge/license-MIT-orange)
![Platform](https://img.shields.io/badge/platform-Android%20%7C%20Web-blue)
![React](https://img.shields.io/badge/react-19-61dafb)
![TypeScript](https://img.shields.io/badge/typescript-5.9-blue)

---

## ✨ Features

- 🎧 **Retro iPod Experience**: Authentic mechanical click wheel, analog stick navigation, sound effects, and haptic feedback.
- 🌐 **Navidrome & Subsonic Streaming**: Connects seamlessly to any Subsonic-compatible server (Navidrome, LMS, Gonic, Airsonic).
- 🎤 **Live Synced Karaoke Lyrics**: Automatically fetches real-time synchronized karaoke lyrics powered by LRCLIB.
- 🎨 **Smart High-Res Artwork**: Automatic album art extraction and dynamic 1-4 cover collage mosaic generation.
- 🎚️ **Built-in Equalizer**: Audio presets with real-time parametric frequency curve adjustment.
- 📁 **Local Audio Scanner**: Import local music folders directly from device storage.
- 🔁 **Automatic Library Sync**: Seamless background library synchronization every time the app opens.

---

## 🚀 Getting Started

### Web Development
```bash
npm install
npm run dev
```

### Build Web Bundle & Sync Android
```bash
npm run build
npx cap sync android
```

### Build Android APK
```bash
cd android
./gradlew assembleDebug
```

---

## 📱 Server Setup (Navidrome / Subsonic)
1. Open the app.
2. Navigate to **Navidrome Server** from the main menu.
3. Enter your server URL (`http://<server-ip>:4533`), username, and password.
4. Tap **Test/Sync** to connect and stream your library.

---

## 📄 License
MIT License.
