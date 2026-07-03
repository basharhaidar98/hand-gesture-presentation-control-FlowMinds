const CONFIG = {
  // Cooldown between slide transitions (in milliseconds)
  actionCooldownMs: 1200,

  // Duration in milliseconds to hold a fist to go to the last slide
  fistHoldDurationMs: 1000,

  // Duration in milliseconds to hold a victory sign to toggle the laser pointer
  vGestureHoldDurationMs: 1500,

  // PDF.js rendering scales
  pdfNormalScale: 1.2,
  pdfFullscreenScale: 2.2,

  // MediaPipe assets and WASM resolver URLs
  mediapipeModelUrl: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
  wasmFilesetResolverUrl: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm",

  // Total slides in HTML demo presentation
  totalDemoSlides: 5
};

export default CONFIG;
