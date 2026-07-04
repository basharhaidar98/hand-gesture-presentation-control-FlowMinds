# FlowMinds - Hand Gesture Presentation Control

An embodied interaction project developed for the **Embodied Interaction (SS2026)** course. FlowMinds allows you to control your presentations seamlessly and naturally using just your webcam and hand gestures.

## 🚀 Live Web Application (Demo)
You can test the gesture tracking and try the interactive demo directly in your browser without installing anything!
👉 **[Open FlowMinds Web App](https://basharhaidar98.github.io/hand-gesture-presentation-control-FlowMinds/)**

## ✨ Features
- **Next Slide:** Open right hand
- **Previous Slide:** Open left hand
- **Laser Pointer (On/Off):** Hold V-gesture for 1.5 seconds. Tracks your index finger.
- **Last Slide:** Hold fist for 4 seconds (Disabled while laser pointer is active to prevent accidental triggers).

## 📁 Project Structure (Monorepo)
This project follows clean architecture and is divided into three main components:

### 1. `web/` (Browser Web App)
A modern, responsive, and beautifully designed web application built with HTML, CSS, and JS.
- Utilizes `MediaPipe Tasks Vision` (WASM) for fully client-side inference.
- Contains a built-in PDF renderer (`pdf.js`) to load and present your own PDF presentations directly in the browser using gestures.
- Centralized configuration available in `web/js/config.js`.

### 2. `src/` (Python Desktop App)
A standalone desktop application for macOS and Windows.
- Captures the webcam feed and processes hand landmarks using `mediapipe`.
- Translates natural hand gestures into global keyboard and mouse actions using `PyAutoGUI` to control native applications (like Microsoft PowerPoint or Keynote).
- Compiled automatically using GitHub Actions into standalone executables via `PyInstaller`.

### 3. `docs/` (Presentations & Documentation)
Contains the academic presentation files, PDF exports, and project documentation for the Embodied Interaction course.

## ⚙️ How to Run Locally

### Web Application
Due to modern browser security policies (CORS) regarding ES Modules (`import/export`), you cannot open the `index.html` file directly. You must use a local development server.

1. Navigate to the `web` directory:
   ```bash
   cd web
   ```
2. Start a local server:
   - **Using Python:** `python3 -m http.server 8000`
   - **Using Node.js:** `npx serve`
   - Or use the **Live Server** extension in VS Code.
3. Open `http://localhost:8000` in your browser.

### Python Desktop App
1. Ensure you have Python 3.11 installed.
2. Install the requirements:
   ```bash
   cd src
   pip install opencv-python mediapipe pyautogui pyinstaller
   ```
3. Run the application:
   ```bash
   python gestures.py
   ```

## 🤖 CI/CD Automation
- **GitHub Pages:** Automatically deploys the contents of the `web/` folder to GitHub Pages whenever changes are pushed to the `main` branch.
- **PyInstaller Build:** Automatically builds standalone `.zip` executables for macOS and Windows and uploads them as workflow artifacts upon every push.

---
**Developed by [Bashar Haidar](https://www.linkedin.com/in/bashar-haidar-8494a618b/) & [Lana Kara Mohammed](https://github.com/Lana3267)**  
*Universität - SS2026*
