import { HandLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/vision_bundle.mjs";
import CONFIG from './config.js';

// 1. Page Layout & Interactive UI animations
const header = document.getElementById('siteHeader');
window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 20);
});

const revealEls = document.querySelectorAll('.reveal');
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => { 
    if(e.isIntersecting){ 
      e.target.classList.add('in'); 
      io.unobserve(e.target); 
    } 
  });
}, { threshold: 0.15 });
revealEls.forEach(el => io.observe(el));

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if(!prefersReduced){
  const skeleton = document.getElementById('handSkeleton');
  const dots = document.getElementById('handDots');
  const ring = document.getElementById('hudRing');
  let t = 0;
  function animateHand(){
    t += 0.015;
    const dy = Math.sin(t) * 3;
    if (skeleton) skeleton.setAttribute('transform', `translate(0, ${dy})`);
    if (dots) dots.setAttribute('transform', `translate(0, ${dy})`);
    if (ring) ring.setAttribute('transform', `rotate(${t * 8} 200 190)`);
    requestAnimationFrame(animateHand);
  }
  if (skeleton && dots && ring) {
    animateHand();
  }
}

// 2. PDF.js Worker Configuration
if (window.pdfjsLib) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
}

// 3. MediaPipe & Presentation Logic
const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement ? canvasElement.getContext("2d") : null;
const webcamButton = document.getElementById("webcamButton");
const statusText = document.getElementById("status-text");
const gestureText = document.getElementById("gesture-text");
const laserDot = document.getElementById("laser-dot");
const loadingOverlay = document.getElementById("loading-overlay");
const slideContainer = document.getElementById("slide-container");

// Presentation State
let currentSlide = 1;
const totalSlides = CONFIG.totalDemoSlides;
let isWebcamRunning = false;
let handLandmarker = undefined;
let lastVideoTime = -1;

// PDF Presentation State
let pdfDoc = null;
let pdfPageNum = 1;
let isPdfActive = false;
const pdfCanvas = document.getElementById("pdf-canvas");

// Hold Gesture Timers & Cooldown
let lastActionTime = 0;
const actionCooldownMs = CONFIG.actionCooldownMs;
let fistGestureStartTime = 0;
let vGestureStartTime = 0;
let laserActive = false;

// Load MediaPipe Model
async function loadModel() {
  if (!loadingOverlay || !statusText) return;
  loadingOverlay.style.display = "flex";
  statusText.textContent = "Loading AI...";
  
  try {
    const vision = await FilesetResolver.forVisionTasks(CONFIG.wasmFilesetResolverUrl);
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: CONFIG.mediapipeModelUrl,
        delegate: "GPU"
      },
      runningMode: "VIDEO",
      numHands: 2
    });
    statusText.textContent = "Ready";
    statusText.className = "status-val text-cyan";
  } catch (error) {
    console.error("Failed to load model:", error);
    statusText.textContent = "Load Error";
    statusText.className = "status-val text-danger";
  } finally {
    loadingOverlay.style.display = "none";
  }
}

// Initialize
if (video && webcamButton) {
  loadModel();
  webcamButton.addEventListener("click", toggleWebcam);
}

function toggleWebcam() {
  if (!handLandmarker) {
    alert("MediaPipe Hand Landmarker model is still loading, please wait...");
    return;
  }
  
  if (isWebcamRunning) {
    stopWebcam();
  } else {
    startWebcam();
  }
}

function startWebcam() {
  isWebcamRunning = true;
  webcamButton.textContent = "Disable Webcam";
  webcamButton.className = "btn btn-ghost";
  statusText.textContent = "Starting webcam...";
  
  navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
    .then(function (stream) {
      video.srcObject = stream;
      video.addEventListener("loadeddata", predictWebcam);
      statusText.textContent = "Tracking Active";
      statusText.className = "status-val text-cyan";
    })
    .catch(function (err) {
      console.error("Camera access error:", err);
      isWebcamRunning = false;
      webcamButton.textContent = "Enable Webcam";
      webcamButton.className = "btn btn-primary";
      statusText.textContent = "Cam Blocked";
      statusText.className = "status-val text-danger";
      alert("Camera access denied or unavailable. Please grant camera permissions.");
    });
}

function stopWebcam() {
  isWebcamRunning = false;
  webcamButton.textContent = "Enable Webcam";
  webcamButton.className = "btn btn-primary";
  statusText.textContent = "Ready";
  statusText.className = "status-val text-cyan";
  gestureText.textContent = "—";
  
  const stream = video.srcObject;
  if (stream) {
    const tracks = stream.getTracks();
    tracks.forEach(track => track.stop());
  }
  video.srcObject = null;
  laserActive = false;
  if (laserDot) laserDot.style.display = "none";
  if (canvasCtx && canvasElement) canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
}

// Frame Prediction Loop
async function predictWebcam() {
  if (!isWebcamRunning) return;
  
  try {
    canvasElement.width = video.videoWidth;
    canvasElement.height = video.videoHeight;
    
    let startTimeMs = performance.now();
    if (lastVideoTime !== video.currentTime) {
      lastVideoTime = video.currentTime;
      const results = handLandmarker.detectForVideo(video, startTimeMs);
      
      if (canvasCtx) canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      
      if (results.landmarks && results.landmarks.length > 0) {
        drawSkeleton(results.landmarks);
        
        // Use first hand detected
        const landmarks = results.landmarks[0];
        processGestures(landmarks);
      } else {
        gestureText.textContent = "None";
        if (laserDot) laserDot.style.display = "none";
        fistGestureStartTime = 0;
        vGestureStartTime = 0;
      }
    }
  } catch (err) {
    console.error("Webcam prediction loop error:", err);
    statusText.textContent = "Err: " + err.message;
    statusText.className = "status-val text-danger";
  }
  
  if (isWebcamRunning) {
    window.requestAnimationFrame(predictWebcam);
  }
}

// Draw hand skeleton
function drawSkeleton(allLandmarks) {
  if (!canvasCtx || !canvasElement) return;
  canvasCtx.save();
  canvasCtx.strokeStyle = "#33D6FF";
  canvasCtx.lineWidth = 3;
  canvasCtx.lineCap = "round";
  
  const connections = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [5, 6], [6, 7], [7, 8],
    [9, 10], [10, 11], [11, 12],
    [0, 13], [13, 14], [14, 15], [15, 16],
    [0, 17], [17, 18], [18, 19], [19, 20],
    [5, 9], [9, 13], [13, 17]
  ];
  
  allLandmarks.forEach(landmarks => {
    connections.forEach(([from, to]) => {
      const pFrom = landmarks[from];
      const pTo = landmarks[to];
      canvasCtx.beginPath();
      canvasCtx.moveTo(pFrom.x * canvasElement.width, pFrom.y * canvasElement.height);
      canvasCtx.lineTo(pTo.x * canvasElement.width, pTo.y * canvasElement.height);
      canvasCtx.stroke();
    });
    
    canvasCtx.fillStyle = "#00D8FF";
    landmarks.forEach(point => {
      canvasCtx.beginPath();
      canvasCtx.arc(point.x * canvasElement.width, point.y * canvasElement.height, 5, 0, 2 * Math.PI);
      canvasCtx.fill();
    });
  });
  canvasCtx.restore();
}

// Helper gesture detection functions
function areAllFingersOpen(lm) {
  const tips = [8, 12, 16, 20];
  const mids = [6, 10, 14, 18];
  return tips.every((tip, idx) => lm[tip].y < lm[mids[idx]].y);
}

function isFist(lm) {
  const tips = [8, 12, 16, 20];
  const mids = [6, 10, 14, 18];
  return tips.every((tip, idx) => lm[tip].y > lm[mids[idx]].y);
}

function isVGesture(lm) {
  const indexOpen = lm[8].y < lm[6].y;
  const middleOpen = lm[12].y < lm[10].y;
  const ringClosed = lm[16].y > lm[14].y;
  const pinkyClosed = lm[20].y > lm[18].y;
  return indexOpen && middleOpen && ringClosed && pinkyClosed;
}

function isRightHand(lm) {
  return lm[4].x > lm[8].x;
}

function isLeftHand(lm) {
  return lm[4].x < lm[8].x;
}

// Handle detected gestures
function processGestures(lm) {
  const now = Date.now();
  
  // 1. FAUST 1 SEK -> Letzte Folie
  if (isFist(lm) && !laserActive) {
    vGestureStartTime = 0; // Reset V timer
    if (fistGestureStartTime === 0) {
      fistGestureStartTime = now;
    }
    const elapsed = now - fistGestureStartTime;
    const remaining = (CONFIG.fistHoldDurationMs - elapsed) / 1000;
    
    if (remaining > 0) {
      gestureText.textContent = `✊ Fist (Hold ${remaining.toFixed(1)}s)`;
    } else {
      jumpToLastSlide();
      fistGestureStartTime = 0;
      gestureText.textContent = "✊ Last Slide";
    }
    if (laserDot) laserDot.style.display = "none";
    return;
  } else {
    fistGestureStartTime = 0;
  }
  
  // 2. V-GESTE 1.5 SEK -> Laser pointer switch
  if (isVGesture(lm)) {
    if (vGestureStartTime === 0) {
      vGestureStartTime = now;
    }
    const elapsed = now - vGestureStartTime;
    const remaining = (CONFIG.vGestureHoldDurationMs - elapsed) / 1000;
    
    if (remaining > 0) {
      gestureText.textContent = laserActive 
        ? `✌️ Laser off in ${remaining.toFixed(1)}s` 
        : `✌️ Laser on in ${remaining.toFixed(1)}s`;
    } else {
      laserActive = !laserActive;
      vGestureStartTime = now; // Prevent immediate double trigger
      if (!laserActive) {
        if (laserDot) laserDot.style.display = "none";
        gestureText.textContent = "✌️ Laser OFF";
      } else {
        gestureText.textContent = "✌️ Laser ON";
      }
    }
    
    // Update laser dot position if it is currently active
    if (laserActive) {
      updateLaserDot(lm);
    }
    return;
  } else {
    vGestureStartTime = 0;
  }
  
  // 3. Track index finger for Laser Pointer if active
  if (laserActive) {
    gestureText.textContent = "✌️ Laser Active";
    updateLaserDot(lm);
    return;
  }
  
  if (laserDot) laserDot.style.display = "none";
  
  // 4. Swipe Gestures
  if (areAllFingersOpen(lm)) {
    if (isRightHand(lm)) {
      gestureText.textContent = "🖐️ Right Hand (Next)";
      changeSlide(1);
    } else if (isLeftHand(lm)) {
      gestureText.textContent = "🖐️ Left Hand (Prev)";
      changeSlide(-1);
    }
    return;
  }
  
  gestureText.textContent = "Tracking (Ready)";
}

function updateLaserDot(lm) {
  if (!laserDot || !slideContainer) return;
  const rect = slideContainer.getBoundingClientRect();
  // Since video is scaleX(-1) mirrored, index finger x (landmark 8) maps:
  const laserX = (1 - lm[8].x) * rect.width;
  const laserY = lm[8].y * rect.height;
  
  laserDot.style.left = `${laserX}px`;
  laserDot.style.top = `${laserY}px`;
  laserDot.style.display = "block";
}

// Slide Controller
function changeSlide(direction) {
  const now = Date.now();
  if (now - lastActionTime < actionCooldownMs) return;
  lastActionTime = now;
  
  if (isPdfActive) {
    pdfPageNum += direction;
    if (pdfPageNum < 1) pdfPageNum = 1;
    if (pdfPageNum > pdfDoc.numPages) pdfPageNum = pdfDoc.numPages;
    renderPdfPage(pdfPageNum);
  } else {
    currentSlide += direction;
    if (currentSlide < 1) currentSlide = 1;
    if (currentSlide > totalSlides) currentSlide = totalSlides;
    showHtmlSlide(currentSlide);
  }
}

function jumpToLastSlide() {
  const now = Date.now();
  if (now - lastActionTime < actionCooldownMs) return;
  lastActionTime = now;
  
  if (isPdfActive) {
    pdfPageNum = pdfDoc.numPages;
    renderPdfPage(pdfPageNum);
  } else {
    currentSlide = totalSlides;
    showHtmlSlide(currentSlide);
  }
}

function showHtmlSlide(num) {
  isPdfActive = false;
  if (pdfCanvas) pdfCanvas.style.display = 'none';
  
  document.querySelectorAll('.slide').forEach((s, idx) => {
    if (idx + 1 === num) {
      s.classList.add('active-slide');
    } else {
      s.classList.remove('active-slide');
    }
  });
  
  const indicator = document.getElementById('slide-indicator');
  if (indicator) indicator.textContent = `${num} / ${totalSlides}`;
}

// Manual Slide Nav Buttons
const prevBtn = document.getElementById("prevSlideBtn");
const nextBtn = document.getElementById("nextSlideBtn");
if (prevBtn) prevBtn.addEventListener("click", () => changeSlide(-1));
if (nextBtn) nextBtn.addEventListener("click", () => changeSlide(1));

// Keyboard Navigation for Slides
document.addEventListener('keydown', function(event) {
  // Avoid triggering when user is interacting with input fields
  if (document.activeElement && (
      document.activeElement.tagName === 'INPUT' || 
      document.activeElement.tagName === 'TEXTAREA' || 
      document.activeElement.isContentEditable)) {
    return;
  }
  
  if (event.key === 'ArrowRight' || event.key === 'PageDown' || event.key === ' ') {
    if (event.key === ' ') {
      event.preventDefault(); // Prevent scrolling down when hitting spacebar
    }
    changeSlide(1);
  } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
    changeSlide(-1);
  } else if (event.key === 'Home') {
    if (isPdfActive) {
      pdfPageNum = 1;
      renderPdfPage(pdfPageNum);
    } else {
      currentSlide = 1;
      showHtmlSlide(currentSlide);
    }
  } else if (event.key === 'End') {
    jumpToLastSlide();
  }
});

// PDF Upload Handlers
const fileInput = document.getElementById('pdf-file');
const pdfNameText = document.getElementById('pdf-name');

if (fileInput) {
  fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file || file.type !== 'application/pdf') return;
    
    if (pdfNameText) {
      pdfNameText.innerHTML = `${file.name} <button id="clear-pdf-btn" class="pdf-clear">[Clear]</button>`;
      
      // Setup clear handler dynamically
      const clearBtn = document.getElementById("clear-pdf-btn");
      if (clearBtn) {
        clearBtn.addEventListener("click", function(ev) {
          ev.preventDefault();
          resetToDemoSlides();
        });
      }
    }
    
    const fileReader = new FileReader();
    fileReader.onload = function() {
      const typedarray = new Uint8Array(this.result);
      
      if (window.pdfjsLib) {
        window.pdfjsLib.getDocument(typedarray).promise.then(function(pdf) {
          pdfDoc = pdf;
          pdfPageNum = 1;
          isPdfActive = true;
          
          // Hide HTML slides
          document.querySelectorAll('.slide').forEach(s => s.classList.remove('active-slide'));
          
          if (pdfCanvas) pdfCanvas.style.display = 'block';
          
          renderPdfPage(pdfPageNum);
        }).catch(err => {
          console.error("PDF parsing error:", err);
          alert("Error loading PDF presentation.");
        });
      }
    };
    fileReader.readAsArrayBuffer(file);
  });
}

// Cross-browser fullscreen checks
function isFullscreen() {
  return !!(document.fullscreenElement || 
            document.webkitFullscreenElement || 
            document.mozFullScreenElement || 
            document.msFullscreenElement);
}

function renderPdfPage(num) {
  if (!pdfDoc) return;
  pdfDoc.getPage(num).then(function(page) {
    // Dynamically use scale 2.2 in fullscreen, 1.2 normally for crisp rendering
    const scale = isFullscreen() ? CONFIG.pdfFullscreenScale : CONFIG.pdfNormalScale;
    const viewport = page.getViewport({ scale: scale });
    if (pdfCanvas) {
      pdfCanvas.height = viewport.height;
      pdfCanvas.width = viewport.width;
      
      const renderContext = {
        canvasContext: pdfCanvas.getContext('2d'),
        viewport: viewport
      };
      
      page.render(renderContext).promise.then(function() {
        const indicator = document.getElementById('slide-indicator');
        if (indicator) indicator.textContent = `${num} / ${pdfDoc.numPages}`;
      });
    }
  });
}

function resetToDemoSlides() {
  pdfDoc = null;
  isPdfActive = false;
  if (pdfCanvas) pdfCanvas.style.display = 'none';
  if (pdfNameText) pdfNameText.textContent = "No PDF uploaded (playing Demo)";
  currentSlide = 1;
  showHtmlSlide(currentSlide);
}

// Fullscreen implementation with full Safari compatibility
const fullscreenBtn = document.getElementById("fullscreenBtn");
const presentBtn = document.getElementById("presentBtn");
const viewerPanel = document.querySelector(".viewer-panel");

if (fullscreenBtn && presentBtn && viewerPanel) {
  fullscreenBtn.addEventListener("click", () => {
    const activeEl = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
    if (activeEl !== viewerPanel) {
      const requestMethod = viewerPanel.requestFullscreen || 
                            viewerPanel.webkitRequestFullscreen || 
                            viewerPanel.mozRequestFullScreen || 
                            viewerPanel.msRequestFullscreen;
      if (requestMethod) {
        requestMethod.call(viewerPanel).catch(err => {
          alert(`Error: ${err.message}`);
        });
      }
    } else {
      exitFullscreen();
    }
  });

  presentBtn.addEventListener("click", () => {
    const activeEl = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
    if (activeEl !== slideContainer) {
      const requestMethod = slideContainer.requestFullscreen || 
                            slideContainer.webkitRequestFullscreen || 
                            slideContainer.mozRequestFullScreen || 
                            slideContainer.msRequestFullscreen;
      if (requestMethod) {
        requestMethod.call(slideContainer).catch(err => {
          alert(`Error: ${err.message}`);
        });
      }
    } else {
      exitFullscreen();
    }
  });

  function exitFullscreen() {
    const exitMethod = document.exitFullscreen || 
                       document.webkitExitFullscreen || 
                       document.mozCancelFullScreen || 
                       document.msExitFullscreen;
    if (exitMethod) {
      exitMethod.call(document);
    }
  }

  const fullscreenEvents = ["fullscreenchange", "webkitfullscreenchange", "mozfullscreenchange", "MSFullscreenChange"];
  fullscreenEvents.forEach(evt => {
    document.addEventListener(evt, () => {
      const activeEl = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
      
      // If a PDF is active, trigger re-render so it updates its resolution and scale to fill the screen
      if (isPdfActive && pdfDoc) {
        renderPdfPage(pdfPageNum);
      }
      
      // Reset button labels
      fullscreenBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="margin-right: 6px;"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
        Fullscreen
      `;
      presentBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="margin-right: 6px;"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        Presentation Mode
      `;
      
      // Update active button label based on which element is fullscreen
      if (activeEl === viewerPanel) {
        fullscreenBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="margin-right: 6px;"><path d="M4 14h6v6m10-6h-6v6M4 10h6V4m10 6h-6V4"/></svg>
          Exit Fullscreen
        `;
      } else if (activeEl === slideContainer) {
        presentBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="margin-right: 6px;"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/></svg>
          Exit Presenting
        `;
      }
    });
  });
}
