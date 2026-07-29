/**
 * Core Application Controller for AR Trick Shot Assistant Dashboard.
 * Binds Canvas, CV Object tracking, 3D Physics engine, and Infinite Mage AI optimizations.
 */

// Global Application State
const state = {
    // Selected level configurations
    activeLevel: 1,
    levels: {
        1: {
            title: "Level 1: Direct Basketball Free-Throw",
            desc: "Throw the ball directly into the green target hoop on the right. Calibrate your angle to about 45 degrees and speed around 7 m/s to combat air drag and make a clean swish.",
            ball: { x: 80, y: 350, z: 0 },
            target: { x: 500, y: 150, z: 0, r: 25 },
            obstacles: []
        },
        2: {
            title: "Level 2: The Backboard Bank Shot",
            desc: "Bounce the ball off the blue wall at x = 450 so it ricochets cleanly and lands directly inside the green hoop on the floor. Pay close attention to surface restitution energy loss!",
            ball: { x: 80, y: 380, z: 0 },
            target: { x: 300, y: 440, z: 0, r: 25 },
            obstacles: [
                { type: 'wall', x: 450, yMin: 50, yMax: 400 }
            ]
        },
        3: {
            title: "Level 3: Cup Ping Pong Bounce",
            desc: "First bounce the ball off the hardwood floor plane (y = 440) and drop it straight down into the cup target. Precision speed control is vital to avoid bouncing completely over the cup.",
            ball: { x: 80, y: 200, z: 0 },
            target: { x: 480, y: 440, z: 0, r: 20 },
            obstacles: []
        },
        4: {
            title: "Level 4: Soccer Curve Kick",
            desc: "Utilize high spin rates (Magnus effect) to curve the ball's trajectory around obstacles. Add a large spin value (e.g., +800 RPM) to make the ball curve upward or downward towards the target hoop.",
            ball: { x: 80, y: 380, z: 0 },
            target: { x: 520, y: 220, z: 0, r: 20 },
            obstacles: []
        }
    },

    // Physical state
    ball: { x: 80, y: 350, z: 0 },
    ballVel: { x: 0, y: 0, z: 0 },
    ballSpin: { x: 0, y: 0, z: 0 },
    isFlying: false,
    flightPoints: [],
    flightIndex: 0,

    // Interactive dragging state
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    dragCurrent: { x: 0, y: 0 },

    // Tracking pipeline
    useWebcam: false,
    mageModeEnabled: true,
    fps: 60.0,
    lastFrameTime: performance.now(),
    lastAttemptSuccess: false,
    landingSuccessCount: 0,
    totalAttempts: 0
};

// Instantiations
const physics = new JSPhysicsSolver();
const tracker = new CSCVTracker();

// UI elements cache
const el = {
    canvas: document.getElementById('ar-viewport'),
    video: document.getElementById('webcam-stream'),
    btnToggleCamera: document.getElementById('btn-toggle-camera'),
    btnClearCanvas: document.getElementById('btn-clear-canvas'),
    telemetrySpeed: document.getElementById('telemetry-speed'),
    telemetryAngle: document.getElementById('telemetry-angle'),
    telemetrySpin: document.getElementById('telemetry-spin'),
    telemetryDrag: document.getElementById('telemetry-drag'),
    telemetryMagnus: document.getElementById('telemetry-magnus'),
    telemetryBounces: document.getElementById('telemetry-bounces'),
    presetObject: document.getElementById('preset-object'),
    presetSurface: document.getElementById('preset-surface'),
    inputSpin: document.getElementById('input-spin'),
    labelSpin: document.getElementById('label-spin-input'),
    inputGravity: document.getElementById('input-gravity'),
    labelGravity: document.getElementById('label-gravity'),
    challengeTitle: document.getElementById('challenge-title'),
    challengeDesc: document.getElementById('challenge-desc'),
    challengeStatus: document.getElementById('challenge-status'),
    gaugeRing: document.getElementById('gauge-ring'),
    gaugePercent: document.getElementById('gauge-percent'),
    gaugeTier: document.getElementById('gauge-tier'),
    coachTipBox: document.getElementById('coach-tip-box'),
    cameraStatus: document.getElementById('camera-status'),
    fpsDisplay: document.getElementById('fps-display'),
    checkboxMageMode: document.getElementById('checkbox-mage-mode'),
    btnLvl1: document.getElementById('btn-lvl-1'),
    btnLvl2: document.getElementById('btn-lvl-2'),
    btnLvl3: document.getElementById('btn-lvl-3'),
    btnLvl4: document.getElementById('btn-lvl-4')
};

const ctx = el.canvas.getContext('2d');

// Initialize sizing
function resizeCanvas() {
    el.canvas.width = el.canvas.parentElement.clientWidth;
    el.canvas.height = el.canvas.parentElement.clientHeight || 480;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Setup Level UI
function setupLevel(lvlId) {
    state.activeLevel = lvlId;
    const config = state.levels[lvlId];

    // Clear flying state
    state.isFlying = false;
    state.flightPoints = [];
    state.flightIndex = 0;

    // Reset positions
    state.ball = { ...config.ball };
    state.ballVel = { x: 0, y: 0, z: 0 };

    // Update texts
    el.challengeTitle.innerText = config.title;
    el.challengeDesc.innerText = config.desc;
    el.challengeStatus.innerText = "NOT LANDED";
    el.challengeStatus.className = "px-2 py-0.5 bg-red-900/40 border border-red-500 text-red-400 text-xs rounded font-bold animate-pulse";

    // Reset buttons styles
    [el.btnLvl1, el.btnLvl2, el.btnLvl3, el.btnLvl4].forEach((btn, idx) => {
        if ((idx + 1) === lvlId) {
            btn.className = "py-2 bg-blue-600 text-white font-bold rounded border border-blue-400/50 text-center";
        } else {
            btn.className = "py-2 bg-gray-900 text-gray-400 hover:bg-gray-800 rounded border border-gray-700 text-center";
        }
    });

    // Preset calibrations per level
    if (lvlId === 3) {
        el.presetObject.value = "pingpong";
        el.presetSurface.value = "table";
    } else if (lvlId === 4) {
        el.presetObject.value = "soccer";
        el.presetSurface.value = "grass";
        el.inputSpin.value = "800";
        el.labelSpin.innerText = "+800 RPM";
    } else {
        el.presetObject.value = "basketball";
        el.presetSurface.value = "wood";
    }

    applyCalibrationDropdowns();
    updateCoachAIAdvice(null, 0);
}

// Update coaching HUD circular gauge
function updateSuccessGauge(probability) {
    const percent = Math.round(probability * 100);
    el.gaugePercent.innerText = `${percent}%`;

    // SVG radial perimeter: 2 * PI * r = 2 * 3.14 * 70 = 440
    const offset = 440 - (percent / 100) * 440;
    el.gaugeRing.style.strokeDashoffset = offset;

    let tier = "MISS";
    if (probability > 0.75) {
        tier = "BULLSEYE";
        el.gaugeRing.setAttribute("class", "circle-gauge stroke-emerald-500");
    } else if (probability > 0.4) {
        tier = "CLOSE ATTEMPT";
        el.gaugeRing.setAttribute("class", "circle-gauge stroke-yellow-500");
    } else {
        el.gaugeRing.setAttribute("class", "circle-gauge stroke-red-500");
    }
    el.gaugeTier.innerText = tier;
}

// Coherent AI Coaching message updates
function updateCoachAIAdvice(minDistance, successProb) {
    const config = state.levels[state.activeLevel];
    if (minDistance === null) {
        el.coachTipBox.innerText = `Preparing Level ${state.activeLevel}... Click and drag backwards on the orange ball to pull back a launch vector, then release to shoot. Optimize your values on the left panel!`;
        updateSuccessGauge(0);
        return;
    }

    let msg = "";
    if (successProb > 0.85) {
        msg = `⭐ EXCELLENT! High-accuracy trajectory detected. Your release velocity matches our computer vision calculations perfectly. Take the shot!`;
    } else if (successProb > 0.4) {
        msg = `⚠️ CLOSE CALIBRATION: The simulated path is within ${Math.round(minDistance)}px of the target target. `;
        if (state.activeLevel === 1) {
            msg += "Try adjusting your vertical launch angle slightly higher (around 45°-50°) to swish.";
        } else if (state.activeLevel === 2) {
            msg += "Verify that the bounce off the bank wall (x=450) hits exactly at the correct angle of reflection.";
        } else if (state.activeLevel === 3) {
            msg += "Reduce your release speed. Let gravity pull the ping-pong ball down right after the table bounce.";
        } else if (state.activeLevel === 4) {
            msg += "Increase spin (RPM) up towards 900 to maximize Magnus lift forces to wrap around the target hoop.";
        }
    } else {
        msg = `🔴 CRITICAL MISALIGNMENT: Trajectory misses target by ${Math.round(minDistance)}px. `;
        if (state.activeLevel === 1) {
            msg += "Adjust your velocity vector. Pull back further to add release speed or throw higher.";
        } else if (state.activeLevel === 2) {
            msg += "Aim directly towards the blue bank wall. You must hit the wall first to ricochet back into the hoop.";
        } else if (state.activeLevel === 3) {
            msg += "Aim your trajectory to impact the hardwood table first, then let the elastic bounce guide it in.";
        } else if (state.activeLevel === 4) {
            msg += "Add high positive spin to lift the soccer ball or high negative spin to drive it downward.";
        }
    }
    el.coachTipBox.innerText = msg;
    updateSuccessGauge(successProb);
}

// Apply inputs and dropdown selections to the physics solver
function applyCalibrationDropdowns() {
    const objType = el.presetObject.value;
    const surfaceType = el.presetSurface.value;
    const spinVal = parseFloat(el.inputSpin.value);
    const gravityVal = parseFloat(el.inputGravity.value);

    // Physics calibrator mappings
    if (objType === 'basketball') {
        physics.mass = 0.62;
        physics.radius = 12; // Scale visually in pixels for 2D representation
        physics.dragCoeff = 0.47;
    } else if (objType === 'soccer') {
        physics.mass = 0.43;
        physics.radius = 11;
        physics.dragCoeff = 0.25;
    } else if (objType === 'pingpong') {
        physics.mass = 0.0027;
        physics.radius = 6;
        physics.dragCoeff = 0.40;
    } else if (objType === 'golf') {
        physics.mass = 0.045;
        physics.radius = 6;
        physics.dragCoeff = 0.24;
    } else if (objType === 'frisbee') {
        physics.mass = 0.175;
        physics.radius = 14;
        physics.dragCoeff = 0.15;
    }

    if (surfaceType === 'wood') {
        physics.restitution = 0.82;
        physics.surfaceFriction = 0.35;
    } else if (surfaceType === 'concrete') {
        physics.restitution = 0.65;
        physics.surfaceFriction = 0.55;
    } else if (surfaceType === 'grass') {
        physics.restitution = 0.30;
        physics.surfaceFriction = 0.70;
    } else if (surfaceType === 'table') {
        physics.restitution = 0.90;
        physics.surfaceFriction = 0.20;
    }

    physics.gravity.y = gravityVal;

    // Update labels
    el.labelGravity.innerText = `${gravityVal.toFixed(2)} m/s²`;
}

// Canvas Event Bindings (Fling & Launch actions)
el.canvas.addEventListener('mousedown', (e) => {
    const rect = el.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Check click near the ball to drag
    const dist = Math.hypot(mouseX - state.ball.x, mouseY - state.ball.y);
    if (dist < 30) {
        state.isDragging = true;
        state.dragStart = { x: state.ball.x, y: state.ball.y };
        state.dragCurrent = { x: mouseX, y: mouseY };
        state.isFlying = false;
    }
});

el.canvas.addEventListener('mousemove', (e) => {
    const rect = el.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (state.isDragging) {
        state.dragCurrent = { x: mouseX, y: mouseY };
    } else if (state.useWebcam) {
        // Sample color on tap/click if webcam active
        tracker.sampleColor(ctx, mouseX, mouseY, el.canvas.width);
    }
});

el.canvas.addEventListener('mouseup', () => {
    if (state.isDragging) {
        state.isDragging = false;

        // Calculate launching velocity based on drag offsets
        const dx = state.dragStart.x - state.dragCurrent.x;
        const dy = state.dragStart.y - state.dragCurrent.y;

        // Scale vectors into physics space
        const v0 = {
            x: dx * 0.15,
            y: dy * 0.15,
            z: 0
        };

        const spinVal = parseFloat(el.inputSpin.value);
        // Spin vector mapping Z-rotation from RPM
        const spinVector = { x: 0, y: 0, z: spinVal * 0.1 };

        // Solve flying trajectory
        const config = state.levels[state.activeLevel];
        const flightPoints = physics.solve(state.ball, v0, spinVector, config.obstacles);

        if (flightPoints.length > 0) {
            state.isFlying = true;
            state.flightPoints = flightPoints;
            state.flightIndex = 0;
            state.totalAttempts++;

            // Extract initial kinematics for telemetry readout
            const launchSpeed = Math.sqrt(v0.x * v0.x + v0.y * v0.y);
            const launchAngle = Math.atan2(-v0.y, v0.x) * (180 / Math.PI);

            el.telemetrySpeed.innerText = `${launchSpeed.toFixed(1)} m/s`;
            el.telemetryAngle.innerText = `${launchAngle.toFixed(1)}°`;
            el.telemetrySpin.innerText = `${spinVal.toFixed(0)} RPM`;

            // Calculate drag force: F = 0.5 * Cd * rho * A * v^2
            const area = Math.PI * Math.pow(physics.radius / 100, 2);
            const dragForce = 0.5 * physics.dragCoeff * physics.airDensity * area * (launchSpeed * launchSpeed);
            el.telemetryDrag.innerText = `${dragForce.toFixed(3)} N`;

            // Calculate Magnus force: F = Cl * rho * A * r * (omega x v)
            const magnusForce = physics.liftCoeff * physics.airDensity * area * (physics.radius / 100) * (spinVal * (Math.PI / 30)) * launchSpeed * 0.05;
            el.telemetryMagnus.innerText = `${magnusForce.toFixed(3)} N`;
        }
    }
});

// "Infinite Mage Mode" Multi-trajectory Finder
// Performs real-time binary searches to find the optimal paths to hit target
function calculateMageAlternativeTrajectories() {
    if (!state.mageModeEnabled || state.isFlying) return [];

    const config = state.levels[state.activeLevel];
    const solutions = [];
    const target = config.target;
    
    // Perform standard searches with 3 different angle styles
    const launchAngles = [35, 45, 55];
    
    for (let angle of launchAngles) {
        // Simple search loop to estimate speed to reach target
        const dx = target.x - state.ball.x;
        const dy = target.y - state.ball.y;
        const rad = angle * (Math.PI / 180);

        // Approximate gravity ballistic speed
        const g = Math.abs(physics.gravity.y);
        let speedEst = Math.sqrt((g * dx * dx) / (2 * Math.cos(rad) * Math.cos(rad) * (dx * Math.tan(rad) - dy)));
        if (isNaN(speedEst) || speedEst > 50) speedEst = 12;

        const v0 = {
            x: Math.cos(rad) * speedEst,
            y: -Math.sin(rad) * speedEst, // Negative is up in canvas Y
            z: 0
        };

        const spinRPM = parseFloat(el.inputSpin.value);
        const spinVector = { x: 0, y: 0, z: spinRPM * 0.1 };

        const path = physics.solve(state.ball, v0, spinVector, config.obstacles);
        solutions.push(path);
    }

    return solutions;
}

// Render loop running at 60 FPS
function draw() {
    // 1. FPS computation
    const now = performance.now();
    const frameDt = now - state.lastFrameTime;
    state.lastFrameTime = now;
    state.fps = 1000 / frameDt;
    el.fpsDisplay.innerText = state.fps.toFixed(1);

    // 2. Refresh backgrounds
    ctx.clearRect(0, 0, el.canvas.width, el.canvas.height);

    // Draw video background if webcam streaming is active
    if (state.useWebcam && el.video.readyState === el.video.HAVE_ENOUGH_DATA) {
        ctx.drawImage(el.video, 0, 0, el.canvas.width, el.canvas.height);
    } else {
        // Fallback grid backgrounds
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, el.canvas.width, el.canvas.height);

        ctx.strokeStyle = 'rgba(59, 130, 246, 0.08)';
        ctx.lineWidth = 1;
        for (let x = 0; x < el.canvas.width; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, el.canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < el.canvas.height; y += 40) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(el.canvas.width, y);
            ctx.stroke();
        }
    }

    const config = state.levels[state.activeLevel];

    // 3. Render level structures & walls
    config.obstacles.forEach(obs => {
        if (obs.type === 'wall') {
            ctx.fillStyle = 'rgba(59, 130, 246, 0.25)';
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 3;
            ctx.fillRect(obs.x - 10, obs.yMin, 20, obs.yMax - obs.yMin);
            ctx.strokeRect(obs.x - 10, obs.yMin, 20, obs.yMax - obs.yMin);

            // Add glowing label
            ctx.fillStyle = '#60a5fa';
            ctx.font = '10px Share Tech Mono';
            ctx.fillText("REFLECTION SURFACE", obs.x - 50, obs.yMin - 10);
        }
    });

    // 4. Render Target Hoop/Cup
    ctx.beginPath();
    ctx.arc(config.target.x, config.target.y, config.target.r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 4;
    ctx.fill();
    ctx.stroke();

    // Inner target bullseye
    ctx.beginPath();
    ctx.arc(config.target.x, config.target.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#34d399';
    ctx.fill();

    // 5. Render Glowing Preview Trajectory Arc & Infinite Mage paths
    if (state.isDragging) {
        // Calculate dynamic launching velocity based on drag length
        const dx = state.dragStart.x - state.dragCurrent.x;
        const dy = state.dragStart.y - state.dragCurrent.y;

        
        const v0 = { x: dx * 0.15, y: dy * 0.15, z: 0 };
        const spinVal = parseFloat(el.inputSpin.value);
        const spinVector = { x: 0, y: 0, z: spinVal * 0.1 };

        // Solve preview flight points
        const previewPoints = physics.solve(state.ball, v0, spinVector, config.obstacles);

        // Compute closest point to target in preview
        let minDistance = 999999;
        previewPoints.forEach(p => {
            const dist = Math.hypot(p.pos.x - config.target.x, p.pos.y - config.target.y);
            if (dist < minDistance) minDistance = dist;
        });

        // Compute preview probability score
        const previewSuccessProb = Math.max(0, Math.min(1.0, 1.0 - (minDistance / (config.target.r * 3.5))));

        
        // Render dynamic neon path
        ctx.beginPath();
        previewPoints.forEach((p, idx) => {
            if (idx === 0) ctx.moveTo(p.pos.x, p.pos.y);
            else ctx.lineTo(p.pos.x, p.pos.y);
        });

        
        ctx.lineWidth = 4;
        ctx.strokeStyle = previewSuccessProb > 0.85 ? '#10b981' : (previewSuccessProb > 0.4 ? '#f59e0b' : '#ef4444');
        ctx.shadowBlur = 10;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.stroke();
        ctx.shadowBlur = 0; // reset shadow

        // Render landing indicator circle
        if (previewPoints.length > 0) {
            const finalPt = previewPoints[previewPoints.length - 1];
            ctx.beginPath();
            ctx.arc(finalPt.pos.x, finalPt.pos.y, 8, 0, Math.PI * 2);
            ctx.fillStyle = previewSuccessProb > 0.85 ? 'rgba(16, 185, 129, 0.6)' : 'rgba(239, 68, 68, 0.6)';
            ctx.fill();
        }

        // Run UI telemetry feeds in real-time drag
        const curSpeed = Math.sqrt(v0.x * v0.x + v0.y * v0.y);
        const curAngle = Math.spanAngle = Math.atan2(-v0.y, v0.x) * (180 / Math.PI);
        el.telemetrySpeed.innerText = `${curSpeed.toFixed(1)} m/s`;
        el.telemetryAngle.innerText = `${curAngle.toFixed(1)}°`;

        
        // Feed live AI coach tips
        updateCoachAIAdvice(minDistance, previewSuccessProb);

        // Render launch vector drag line helper
        ctx.beginPath();
        ctx.moveTo(state.dragStart.x, state.dragStart.y);
        ctx.lineTo(state.dragCurrent.x, state.dragCurrent.y);
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]); // clear dash
    } else {
        // Multi-trajectory optimization predictions (Infinite Mage Mode)
        const mathPaths = calculateMageAlternativeTrajectories();
        mathPaths.forEach((path, pathIdx) => {
            ctx.beginPath();
            path.forEach((p, idx) => {
                if (idx === 0) ctx.moveTo(p.pos.x, p.pos.y);
                else ctx.lineTo(p.pos.x, p.pos.y);
            });
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = `rgba(167, 139, 250, ${0.15 + (pathIdx * 0.1)})`; // Purple traces
            ctx.stroke();
        });
    }

    // 6. Flying ball update & physics step
    if (state.isFlying) {
        const point = state.flightPoints[state.flightIndex];
        state.ball.x = point.pos.x;
        state.ball.y = point.pos.y;

        
        // Draw real-time flying coordinate tracking lines
        ctx.strokeStyle = 'rgba(96, 165, 250, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, state.ball.y);
        ctx.lineTo(el.canvas.width, state.ball.y);
        ctx.moveTo(state.ball.x, 0);
        ctx.lineTo(state.ball.x, el.canvas.height);
        ctx.stroke();

        // Check success target intersection
        const distToTarget = Math.hypot(state.ball.x - config.target.x, state.ball.y - config.target.y);
        if (distToTarget < config.target.r) {
            state.lastAttemptSuccess = true;
            el.challengeStatus.innerText = "SUCCESS Swish!";
            el.challengeStatus.className = "px-2 py-0.5 bg-green-900/40 border border-green-500 text-green-400 text-xs rounded font-bold animate-bounce";
        }

        // Draw bounces text
        if (point.isBounce) {
            ctx.fillStyle = '#fbbf24';
            ctx.font = '10px Share Tech Mono';
            ctx.fillText("BOUNCE IMPACT", state.ball.x + 15, state.ball.y - 10);

            
            // Increment bounce counters
            const currentBounces = parseInt(el.telemetryBounces.innerText) || 0;
            el.telemetryBounces.innerText = `${currentBounces + 1} Bounces`;
        }

        // Proceed state index
        state.flightIndex += 2; // Fast forward flying animation slightly
        if (state.flightIndex >= state.flightPoints.length) {
            state.isFlying = false;
            // Freeze final placement
            state.ball.x = state.flightPoints[state.flightPoints.length - 1].pos.x;
            state.ball.y = state.flightPoints[state.flightPoints.length - 1].pos.y;
        }
    }

    // 7. Render Object Ball
    ctx.beginPath();
    ctx.arc(state.ball.x, state.ball.y, physics.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#f97316'; // Ball Orange
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#f97316';
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0; // reset shadow

    // Represent spinning with a single line across the center
    const spinVal = parseFloat(el.inputSpin.value);
    ctx.beginPath();
    const angleRad = (spinVal * 0.05) * (Math.PI / 180);
    ctx.moveTo(state.ball.x - Math.cos(angleRad) * physics.radius, state.ball.y - Math.sin(angleRad) * physics.radius);
    ctx.lineTo(state.ball.x + Math.cos(angleRad) * physics.radius, state.ball.y + Math.sin(angleRad) * physics.radius);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 8. Execute Camera CV tracking overlays if enabled
    if (state.useWebcam) {
        const tracking = tracker.track(ctx, el.canvas.width, el.canvas.height);
        if (tracking) {
            ctx.beginPath();
            ctx.arc(tracking.x, tracking.y, tracking.radius + 6, 0, Math.PI * 2);
            ctx.strokeStyle = '#a78bfa';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = '#c084fc';
            ctx.font = '10px Share Tech Mono';
            ctx.fillText(`TRACKING OBJ (${Math.round(tracking.confidence*100)}%)`, tracking.x + tracking.radius + 10, tracking.y);
        }
    }

    requestAnimationFrame(draw);
}

// Controls: Enable live web camera access
el.btnToggleCamera.addEventListener('click', async () => {
    if (!state.useWebcam) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            el.video.srcObject = stream;
            el.video.play();
            state.useWebcam = true;
            el.btnToggleCamera.innerText = "DISABLE CAMERA";
            el.cameraStatus.innerText = "CONNECTED";
            el.cameraStatus.className = "neon-text-green";
        } catch (err) {
            console.error("Camera access blocked or unavailable:", err);
            // Display simulated video stream as fallback
            state.useWebcam = true;
            el.btnToggleCamera.innerText = "DISABLE CAMERA";
            el.cameraStatus.innerText = "SIMULATED CAMERA";
            el.cameraStatus.className = "neon-text-blue";
        }
    } else {
        if (el.video.srcObject) {
            el.video.srcObject.getTracks().forEach(track => track.stop());
        }
        state.useWebcam = false;
        el.btnToggleCamera.innerText = "USE LIVE CAMERA";
        el.cameraStatus.innerText = "DISCONNECTED";
        el.cameraStatus.className = "neon-text-blue";
    }
});

// Controls: Reset ball pos
el.btnClearCanvas.addEventListener('click', () => {
    const config = state.levels[state.activeLevel];
    state.ball = { ...config.ball };
    state.isFlying = false;
    state.flightPoints = [];
    state.flightIndex = 0;
    el.telemetryBounces.innerText = "0 Bounces";
    el.challengeStatus.innerText = "NOT LANDED";
    el.challengeStatus.className = "px-2 py-0.5 bg-red-900/40 border border-red-500 text-red-400 text-xs rounded font-bold animate-pulse";
});

// Calibration slider events
el.presetObject.addEventListener('change', applyCalibrationDropdowns);
el.presetSurface.addEventListener('change', applyCalibrationDropdowns);
el.inputGravity.addEventListener('input', applyCalibrationDropdowns);
el.inputSpin.addEventListener('input', () => {
    const spinVal = parseFloat(el.inputSpin.value);
    el.labelSpin.innerText = `${spinVal > 0 ? '+' : ''}${spinVal} RPM`;
});

// Mage Mode checkbox bind
el.checkboxMageMode.addEventListener('change', (e) => {
    state.mageModeEnabled = e.target.checked;
});

// Level selector bindings
el.btnLvl1.addEventListener('click', () => setupLevel(1));
el.btnLvl2.addEventListener('click', () => setupLevel(2));
el.btnLvl3.addEventListener('click', () => setupLevel(3));
el.btnLvl4.addEventListener('click', () => setupLevel(4));

// Kickstart
setupLevel(1);
draw();
