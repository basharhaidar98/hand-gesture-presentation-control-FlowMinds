# hand-gesture-presentation-control-FlowMinds
"Control your slides and presentation laser pointer in real-time using hand gestures. Built with Python, MediaPipe, and OpenCV.# FlowMinds - Hand Gesture Presentation Control

An embodied interaction project developed for the **Embodied Interaction (SS2026)** course at university. 
This application captures the webcam feed, processes hand landmarks locally using **Google MediaPipe**, and translates natural hand gestures into keyboard actions using **PyAutoGUI** to control slide presentations (PowerPoint/PDF).

## Features
- **Next Slide:** Open hand (Right hand)
- **Previous Slide:** Open hand (Left hand)
- **Laser Pointer (On/Off):** Hold V-gesture for 1.5 seconds (toggles presentation laser and tracks hand cursor)
- **Last Slide:** Hold fist for 1.5 seconds
