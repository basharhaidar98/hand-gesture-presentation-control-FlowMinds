# 🚀 FlowMinds: Final Project Achievement Report
**Course:** Embodied Interaction (SS 2026)
**Developers:** [Bashar Haidar](https://www.linkedin.com/in/bashar-haidar-8494a618b/) & [Lana Kara Mohammed](https://github.com/Lana3267)

---

## 1. Executive Summary
FlowMinds is a state-of-the-art, gesture-based presentation control system designed to eliminate the need for traditional hardware peripherals (mouse, keyboard, clicker). By leveraging advanced Computer Vision and Machine Learning, the system allows presenters to interact with their slides naturally through physical hand gestures, embodying the core principles of human-computer interaction (HCI).

---

## 2. Technical Architecture & Modernization
The project was built using a robust and modern technology stack. A significant portion of the development effort was dedicated to migrating and modernizing outdated frameworks to ensure long-term stability and performance.

* **Core Engine:** Python 3.11
* **Computer Vision:** OpenCV (for robust camera stream handling and matrix math)
* **OS Emulation:** PyAutoGUI (translating AI detections into system-level keystrokes)
* **Machine Learning:** 
  * Successfully migrated from the deprecated `mp.solutions.hands` API to the modern, high-performance **MediaPipe Tasks Vision API**.
  * Implemented `VisionTaskRunningMode.LIVE_STREAM` for asynchronous, zero-latency inference.
  * The AI model (`hand_landmarker.task`) is dynamically downloaded and cached on first run to keep the repository lightweight.

---

## 3. Gestural State Machine (The 4 Core Gestures)
To prevent accidental triggers (false positives) and ensure a seamless user experience, we engineered a robust state machine with cooldown mechanisms (`ACTION_COOLDOWN_MS = 1200`) and time-based tracking.

1. **Victory Sign ✌️ (Toggle Switch):** 
   * Acts as a master switch to toggle the control mode on/off.
   * *Engineering Decision:* We deprecated the highly unstable "swipe" toggle in favor of this distinct pose, virtually eliminating accidental mode switches.
2. **Right Hand 🖐️ (Next Slide):** 
   * Triggers the `Right Arrow` key. Designed to be highly responsive for continuous flow.
3. **Left Hand 🖐️ (Previous Slide):** 
   * Triggers the `Left Arrow` key. Includes anatomical mirroring logic to account for webcam feed mirroring.
4. **Closed Fist ✊ (Jump to Last Slide):** 
   * Triggers the `End` key. 
   * *Engineering Decision:* Implemented a continuous holding requirement (1 second hold). This prevents a user briefly closing their hand from accidentally skipping the entire presentation.

---

## 4. Production & Deployment Pipeline (CI/CD)
Rather than submitting a raw Python script that requires professors and end-users to install complex environments, we engineered a professional CI/CD (Continuous Integration / Continuous Deployment) pipeline.

* **Standalone Desktop Apps:** Used `PyInstaller` to compile the Python code into native, standalone executables for **Windows (.exe)** and **macOS Apple Silicon (.app)**.
* **GitHub Actions:** Automated the entire build process. Every time code is pushed, cloud servers automatically install dependencies, compile the binaries, and publish them to GitHub Releases.
* **macOS Security Engineering:** Overcame severe Apple Gatekeeper and ARM64 architecture constraints. We integrated `codesign` and Apple's native `ditto` compression in the cloud pipeline to preserve Mach-O signatures, preventing the OS from instantly killing the app (`SIGKILL 9`).

---

## 5. Web Platform & Interactive Demo (WASM)
To showcase the project globally without requiring downloads, we built a stunning, modern Single Page Application (SPA).

* **Design:** Developed a premium dark-mode UI utilizing Glassmorphism, smooth CSS micro-animations, and dynamic visual feedback.
* **Web Demo (MediaPipe for Web):** Ported the Python AI logic into JavaScript using MediaPipe's WebAssembly (WASM) bundles. Users can turn on their webcam and test the gestures directly inside their browser!
* **PDF.js Integration:** Built a custom presentation engine inside the browser. Users can upload their own PDF files into the website and control them using their hand gestures in real-time.
* **Hosting:** Automatically deployed and hosted on GitHub Pages for high availability.

---

## 6. Conclusion & Academic Value
The FlowMinds project successfully bridges the gap between complex Machine Learning models and user-friendly software engineering. By combining robust AI gesture recognition with professional deployment pipelines and cross-platform compatibility, we delivered not just a script, but a complete, production-ready product.
