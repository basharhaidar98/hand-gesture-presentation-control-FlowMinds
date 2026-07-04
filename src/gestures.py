import os
# Suppress Google Logging (glog) telemetry/warnings from MediaPipe
os.environ['GLOG_minloglevel'] = '3'
os.environ['GLOG_logtostderr'] = '0'

import cv2
import pyautogui
import time
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python.vision import HandLandmarker, HandLandmarkerOptions, HandLandmarkerResult
from mediapipe.tasks.python.vision.core.vision_task_running_mode import VisionTaskRunningMode
import urllib.request

pyautogui.FAILSAFE = False

# ================================
# FlowMinds - Gestensteuerung
# Lana & Bashar - EI SS2026
# FINALE VERSION
# ================================

import sys

def get_model_path():
    # If running inside PyInstaller bundle, look in sys._MEIPASS
    if hasattr(sys, '_MEIPASS'):
        return os.path.join(sys._MEIPASS, "hand_landmarker.task")
    # Otherwise look in the script directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(script_dir, "hand_landmarker.task")

model_path = get_model_path()
if not os.path.exists(model_path):
    print("Lade Hand-Model herunter...")
    url = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
    try:
        urllib.request.urlretrieve(url, model_path)
        print("Model heruntergeladen!")
    except Exception as e:
        print(f"Fehler beim Herunterladen des Modells: {e}")
        # Fallback to current directory
        model_path = "hand_landmarker.task"
        if not os.path.exists(model_path):
            urllib.request.urlretrieve(url, model_path)


latest_result = None

def result_callback(result: HandLandmarkerResult, output_image, timestamp_ms):
    global latest_result
    latest_result = result

options = HandLandmarkerOptions(
    base_options=mp_python.BaseOptions(model_asset_path=model_path),
    running_mode=VisionTaskRunningMode.LIVE_STREAM,
    num_hands=2,
    min_hand_detection_confidence=0.5,
    min_hand_presence_confidence=0.5,
    min_tracking_confidence=0.5,
    result_callback=result_callback
)

cap = cv2.VideoCapture(0)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 320)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 240)

screen_w, screen_h = pyautogui.size()

# Variablen
start_x = None
start_y = None
last_action_time = 0
cooldown = 4
timestamp = 0
laser_aktiv = False
last_laser_gesture_time = 0
v_geste_seit = None
offene_hand_seit = None
faust_seit = None
faust_halte_dauer = 1.5
pause_halte_dauer = 2.0

def alle_finger_offen(lm):
    finger_tips = [8, 12, 16, 20]
    finger_mids = [6, 10, 14, 18]
    return all(lm[tip].y < lm[mid].y for tip, mid in zip(finger_tips, finger_mids))

def pinch_erkannt(lm):
    dx = lm[4].x - lm[8].x
    dy = lm[4].y - lm[8].y
    return (dx**2 + dy**2)**0.5 < 0.03

def faust_erkannt(lm):
    finger_tips = [8, 12, 16, 20]
    finger_mids = [6, 10, 14, 18]
    return all(lm[tip].y > lm[mid].y for tip, mid in zip(finger_tips, finger_mids))

def v_geste_erkannt(lm):
    # سبابة (8) ووسطى (12) مرفوعين
    zeigefinger_oben = lm[8].y < lm[6].y
    mittelfinger_oben = lm[12].y < lm[10].y
    # باقي الأصابع مطوية
    ringfinger_zu = lm[16].y > lm[14].y
    kleiner_zu = lm[20].y > lm[18].y
    # الإبهام مطوي (ما يتداخل مع بنش)
    daumen_zu = lm[4].x > lm[3].x if lm[5].x > lm[17].x else lm[4].x < lm[3].x
    return zeigefinger_oben and mittelfinger_oben and ringfinger_zu and kleiner_zu

def ist_rechte_hand(lm):
    return lm[4].x < lm[8].x

def ist_linke_hand(lm):
    return lm[4].x > lm[8].x

print("Kamera laeuft! Druecke Q zum Beenden.")
print("")
print("=== GESTEN ===")
print("Rechte Hand offen    -> Naechste Folie")
print("Linke Hand offen     -> Vorherige Folie")
print("V-Geste (Peace)      -> Laserpointer an/aus")
print("Offene Hand 2 Sek    -> Pause")
print("Pinch                -> Auswaehlen")
print("Faust 1 Sek          -> Letzte Folie")
print("==============")

with HandLandmarker.create_from_options(options) as landmarker:
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        frame = cv2.flip(frame, 1)
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        timestamp += 1
        landmarker.detect_async(mp_image, timestamp)

        jetzt = time.time()
        aktion = ""

        if latest_result and latest_result.hand_landmarks:

            h, w, _ = frame.shape
            for hand_landmarks in latest_result.hand_landmarks:
                lm = hand_landmarks
                for landmark in lm:
                    x = int(landmark.x * w)
                    y = int(landmark.y * h)
                    farbe = (0, 255, 0) if ist_rechte_hand(lm) else (255, 100, 0)
                    cv2.circle(frame, (x, y), 4, farbe, -1)

            lm = latest_result.hand_landmarks[0]
            cx = lm[9].x
            cy = lm[9].y

            # ================================
            # LASER MODUS — V-Geste halten mit 1.5s Puffer
            # ================================
            if laser_aktiv:
                maus_x = int(cx * screen_w)
                maus_y = int(cy * screen_h)
                pyautogui.moveTo(maus_x, maus_y, duration=0.05)
                aktion = "LASER AN"

                # Hand ist da, also den Auto-Turnoff-Timer aktualisieren
                last_laser_gesture_time = jetzt

                # V-Geste halten, um Laser AUS zu schalten (wie Faust)
                if v_geste_erkannt(lm):
                    if v_geste_seit is None:
                        v_geste_seit = jetzt
                    elif jetzt - v_geste_seit >= 1.5:
                        pyautogui.hotkey('ctrl', 'l')
                        laser_aktiv = False
                        aktion = "Laser AUS"
                        print("AKTION: Laser AUS")
                        last_action_time = jetzt
                        v_geste_seit = None
                        start_x = None
                        start_y = None
                    else:
                        verbleibend = 1.5 - (jetzt - v_geste_seit)
                        aktion = f"Laser aus in {verbleibend:.1f}s..."
                else:
                    v_geste_seit = None

            # ================================
            # NORMAL MODUS
            # ================================
            else:
                if jetzt - last_action_time > cooldown:

                    if start_x is None:
                        start_x = cx
                    if start_y is None:
                        start_y = cy

                    diff_x = cx - start_x
                    diff_y = cy - start_y

                    # V-GESTE -> Laser AN (muss 1.5 Sekunden gehalten werden wie Faust)
                    if v_geste_erkannt(lm):
                        if v_geste_seit is None:
                            v_geste_seit = jetzt
                        elif jetzt - v_geste_seit >= 1.5:
                            pyautogui.hotkey('ctrl', 'l')
                            laser_aktiv = True
                            last_laser_gesture_time = jetzt
                            aktion = "Laser AN"
                            print("AKTION: Laser AN")
                            last_action_time = jetzt
                            v_geste_seit = None
                            start_x = None
                            start_y = None
                            offene_hand_seit = None
                            faust_seit = None
                        else:
                            verbleibend = 1.5 - (jetzt - v_geste_seit)
                            aktion = f"Laser an in {verbleibend:.1f}s..."
                    else:
                        v_geste_seit = None

                    # RECHTE HAND offen -> Naechste Folie
                    if ist_rechte_hand(lm) and alle_finger_offen(lm) and abs(diff_x) < 0.04 and abs(diff_y) < 0.04:
                        pyautogui.press('right')
                        aktion = "Naechste Folie ->"
                        print("AKTION: Naechste Folie")
                        last_action_time = jetzt
                        start_x = None
                        start_y = None
                        offene_hand_seit = None
                        faust_seit = None

                    # LINKE HAND offen -> Vorherige Folie
                    elif ist_linke_hand(lm) and alle_finger_offen(lm) and abs(diff_x) < 0.04 and abs(diff_y) < 0.04:
                        pyautogui.press('left')
                        aktion = "Vorherige Folie <-"
                        print("AKTION: Vorherige Folie")
                        last_action_time = jetzt
                        start_x = None
                        start_y = None
                        offene_hand_seit = None
                        faust_seit = None

                    # FAUST 1 SEK -> Letzte Folie
                    elif faust_erkannt(lm):
                        if faust_seit is None:
                            faust_seit = jetzt
                        elif jetzt - faust_seit >= faust_halte_dauer:
                            pyautogui.press('end')
                            aktion = "Letzte Folie"
                            print("AKTION: Letzte Folie")
                            last_action_time = jetzt
                            faust_seit = None
                            start_x = None
                            start_y = None
                            offene_hand_seit = None
                        else:
                            verbleibend = faust_halte_dauer - (jetzt - faust_seit)
                            aktion = f"Faust halten... {verbleibend:.1f}s"
                    else:
                        faust_seit = None

                    # # PINCH -> Auswaehlen
                    # if not faust_erkannt(lm) and not v_geste_erkannt(lm) and pinch_erkannt(lm):
                    #     pyautogui.press('return')
                    #     aktion = "Auswaehlen"
                    #     print("AKTION: Auswaehlen")
                    #     last_action_time = jetzt
                    #     start_x = None
                    #     start_y = None
                    #     offene_hand_seit = None
                    #     faust_seit = None

                    # # OFFENE HAND 2 SEK -> Pause
                    # elif not faust_erkannt(lm) and not v_geste_erkannt(lm) and alle_finger_offen(lm):
                    #     if offene_hand_seit is None:
                    #         offene_hand_seit = jetzt
                    #     elif jetzt - offene_hand_seit >= pause_halte_dauer:
                    #         pyautogui.press('space')
                    #         aktion = "PAUSE!"
                    #         print("AKTION: Pause")
                    #         last_action_time = jetzt
                    #         offene_hand_seit = None
                    #         start_x = None
                    #         start_y = None
                    #     else:
                    #         verbleibend = pause_halte_dauer - (jetzt - offene_hand_seit)
                    #         aktion = f"Pause in {verbleibend:.1f}s..."
                    # else:
                    #     offene_hand_seit = None

        else:
            start_x = None
            start_y = None
            offene_hand_seit = None
            faust_seit = None
            v_geste_seit = None

        # Aktion anzeigen
        if aktion:
            cv2.putText(frame, aktion, (10, 60),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

        # Status oben
        cv2.putText(frame, "FlowMinds - Q=Beenden", (10, 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

        # Hand Info
        if latest_result and latest_result.hand_landmarks:
            anzahl = len(latest_result.hand_landmarks)
            cv2.putText(frame, f"Haende: {anzahl}", (10, 220),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)

        # Laser Status
        if laser_aktiv:
            cv2.putText(frame, "LASER AN - V-Geste zum AUS", (10, 100),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 255), 2)

        cv2.imshow("FlowMinds Gestensteuerung", frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

cap.release()
cv2.destroyAllWindows()