# FlowMinds Technical Documentation

## 1. Overview
FlowMinds is a specialized embodied interaction system built for the **Embodied Interaction (SS2026)** course. The core objective of the system is to bridge the gap between human kinetic expression and digital control. By completely replacing traditional presentation remotes, it allows presenters to fluidly control their slides using natural hand gestures. The system captures live webcam feeds, processes spatial data in real-time, and fires global OS-level hardware interrupts to control presentation software seamlessly.

## 2. Architecture / Pipeline
The project follows a linear, highly optimized data flow pipeline that guarantees low latency and deterministic outputs:

```text
[Webcam Hardware] 
       │
       ▼
[OpenCV Capture] (Extracts raw video frames)
       │
       ▼
[MediaPipe HandLandmarker] (Async/Live-stream inference via Task API)
       │
       ▼
[Gesture Classification Logic] (Mathematical evaluation & Temporal State Machines)
       │
       ▼
[PyAutoGUI Action Dispatcher] (Fires OS-level keyboard/mouse events)
```

## 3. Requirements
The system requires a strict environment configuration to guarantee compatibility, specifically due to the C++ bindings in MediaPipe.

- **Python:** `3.11.x` 
  > [!WARNING]  
  > You MUST use Python 3.11 (`py -3.11` on Windows). MediaPipe is currently incompatible with Python 3.14 and will fail to build.
- **MediaPipe:** `mediapipe==0.10.35` (Utilizes the new `Tasks API`, deprecating the legacy `mp.solutions.hands` which throws `AttributeError`).
- **OpenCV:** `opencv-python`
- **Automation:** `pyautogui`

## 4. Installation
Follow these exact steps to instantiate the local environment and launch the gesture controller. The `hand_landmarker.task` AI model is configured to download/load automatically on first boot.

```bash
# 1. Clone the repository
git clone https://github.com/basharhaidar98/hand-gesture-presentation-control-FlowMinds.git
cd hand-gesture-presentation-control-FlowMinds/src

# 2. Create and activate a virtual environment specifying Python 3.11
# Windows:
py -3.11 -m venv venv
venv\Scripts\activate
# macOS/Linux:
python3.11 -m venv venv
source venv/bin/activate

# 3. Install strictly versioned dependencies
pip install mediapipe==0.10.35 opencv-python pyautogui

# 4. Run the application
python gestures.py
```

## 5. Gesture Reference Table
The core algorithmic logic evaluates the 21 3D coordinates (Landmarks) yielded by the MediaPipe HandLandmarker.

| Gesture | Action | Landmark Points & Logic Constraints |
| :--- | :--- | :--- |
| **Victory Sign (✌️)** | Toggle Full Control Mode | Index & Middle OPEN (`tip < mid`), Ring & Pinky CLOSED (`tip > mid`). |
| **Closed Fist** | Jump to Last Slide | Tips `[8, 12, 16, 20]` > Mids `[6, 10, 14, 18]` (Y-axis). Requires 1.0s Hold. |
| **Open Right Hand** | Next Slide | Tips < Mids AND Thumb X-coordinate checks indicating Right Hand. |
| **Open Left Hand** | Previous Slide | Tips < Mids AND Thumb X-coordinate checks indicating Left Hand. |

## 6. Conflict Resolution Logic
To prevent erratic UX when the user is transitioning between gestures, strict conflict guards have been embedded within the evaluation loop.

- **V-Gesture Override:** A boolean state variable (`v_geste_erkannt`) tracks if the Victory gesture is actively recognized. A conflict guard (`if not v_geste_erkannt`) wraps the evaluation blocks for both the *Pinch* and *Open Hand* state machines. This mathematically guarantees that while the Victory sign is held, the system is physically incapable of misclassifying a partial hand-opening as a swipe.

## 7. Known Issues & Solutions

### Issue 1: Accidental Triggering of the Fist Gesture
- **Problem:** Momentary hand spasms or the natural mechanical transition between an open and closed hand briefly matched the "Fist" gesture constraints. This caused the presentation to erratically jump to the last slide.
- **Solution:** Implemented a Temporal State Machine (Hold Timer). The Fist logic now requires a continuous 1.0-second hold. A countdown timer is rendered via OpenCV directly onto the debug video feed. If the gesture constraints are broken before the 1.0s threshold is reached, the state machine instantly aborts and resets the timer.

### Issue 2: Unstable Laser Pointer / Control Activation via Swipe
- **Problem:** Originally, a generic swipe gesture was utilized to toggle the main control states (like the Laser Pointer/Pen). This proved highly unstable as standard slide-switching swipes frequently triggered the toggle state. Furthermore, a legacy "Pen Mode" (`Stift`) compounded the interference.
- **Solution:** The swipe toggle and legacy Pen Mode were completely deprecated. A dedicated **Victory (V) Gesture** was introduced solely as the toggle switch. Because the Victory gesture is mechanically distinct from an open hand, false positives were virtually eliminated.

## 8. Configuration Parameters
Key threshold values and configurations are exposed for rapid adjustment based on environmental factors (lighting, camera distance).

```python
# Cooldown between slide transitions (prevents rapid double-skips)
ACTION_COOLDOWN_MS = 1200

# Hold duration for the Fist gesture (Jump to Last Slide)
FIST_HOLD_DURATION_MS = 1000

# MediaPipe Confidence Thresholds
MIN_HAND_DETECTION_CONFIDENCE = 0.5
MIN_HAND_PRESENCE_CONFIDENCE = 0.5
```

## 9. Future Improvements
- **Dynamic Time Warping (DTW):** Implement sequence-based, spatio-temporal gesture recognition to allow users to draw specific shapes (e.g., circles to highlight areas) rather than relying purely on static poses.
- **Customizable Keybinding GUI:** Develop a local PyQt or Tkinter settings panel allowing end-users to dynamically map detected gestures to arbitrary OS-level keyboard shortcuts.

## 10. Contributors
- **[Bashar Haidar](https://www.linkedin.com/in/bashar-haidar-8494a618b/)** - Core Developer
- **Lana Kara Mohammed** - Core Developer

*Project Repository: [github.com/basharhaidar98/hand-gesture-presentation-control-FlowMinds](https://github.com/basharhaidar98/hand-gesture-presentation-control-FlowMinds)*
