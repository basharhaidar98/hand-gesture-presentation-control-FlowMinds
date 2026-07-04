import os
import mediapipe

mediapipe_path = os.path.dirname(mediapipe.__file__)

a = Analysis(
    ['gestures.py'],
    pathex=[],
    binaries=[],
    datas=[('hand_landmarker.task', '.'), (mediapipe_path, 'mediapipe')],
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['tkinter', 'PyQt5', 'PySide2', 'PyQt6', 'PySide6', 'IPython', 'jupyter', 'scipy', 'pandas', 'notebook', 'PyInstaller', 'matplotlib', 'PIL', 'PyQt4', 'pydoc'],
    noarchive=False,
    optimize=2,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='gestures',
    debug=False,
    bootloader_ignore_signals=False,
    strip=True,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=True,
    upx=True,
    upx_exclude=[],
    name='gestures',
)
app = BUNDLE(
    coll,
    name='gestures.app',
    icon=None,
    bundle_identifier=None,
    info_plist={
        'NSCameraUsageDescription': 'Diese App benoetigt Zugriff auf die Kamera fuer die Gestensteuerung.',
        'NSMicrophoneUsageDescription': 'Mikrofonzugriff wird von OpenCV benoetigt, um Kamera-Streams zu oeffnen.',
    },
)
