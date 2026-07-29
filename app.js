/**
 * AR Trickshot AI - Main HUD Application Orchestrator
 * Connects Canvas UI, Physics, AI Solver, Scenarios, and Web Audio Sound Synth.
 */

class ARApp {
    constructor() {
        this.physics = new PhysicsEngine();
        this.ai = new AIOptimizer(this.physics);
        this.scenarios = PresetScenarios;
        this.currentScenarioIndex = 0;

        // Current Game Ball State (Mutable)
        this.ball = null;
        this.isSimulating = false;
        this.simulationTrajectory = [];
        this.simulationStep = 0;

        // Interactive Aiming state
        this.dragStart = null;
        this.isAiming = false;
        this.aimForce = 11.5;
        this.aimAngle = 35; // degrees

        // Spin state
        this.spinX = 0; // English sidespin
        this.spinY = 0; // Follow / Draw spin

        // AI HUD results cache
        this.aiResult = null;
        this.autoAimEnabled = false;

        // Audio synthesizer
        this.audioCtx = null;

        // DOM elements cache
        this.initDOMElements();

        // Canvas 2D Context
        this.ctx = this.canvas.getContext('2d');

        this.init();
    }

    initDOMElements() {
        this.canvas = document.getElementById('ar-canvas');
        this.scenariosContainer = document.getElementById('scenarios-list');
        this.descriptionEl = document.getElementById('scenario-description');

        // Stats
        this.probEl = document.getElementById('ai-probability');
        this.diffEl = document.getElementById('ai-difficulty');
        this.bouncesEl = document.getElementById('ai-bounces');
        this.accPercentEl = document.getElementById('accuracy-percent');
        this.accBarEl = document.getElementById('accuracy-bar');

        // Buttons
        this.btnFire = document.getElementById('btn-fire');
        this.btnReset = document.getElementById('btn-reset');
        this.btnAutoAim = document.getElementById('btn-auto-aim');
        this.autoAimBtnText = document.getElementById('autoaim-btn-text');
        this.autoAimStatusHud = document.getElementById('autoaim-status-hud');

        // Sliders
        this.slideGravity = document.getElementById('slide-gravity');
        this.slideFriction = document.getElementById('slide-friction');
        this.slideForce = document.getElementById('slide-force');
        this.slideAngle = document.getElementById('slide-angle');

        // Values display
        this.valGravity = document.getElementById('val-gravity');
        this.valFriction = document.getElementById('val-friction');
        this.valForce = document.getElementById('val-force');
        this.valAngle = document.getElementById('val-angle');

        // Camera mode selector
        this.camModeSel = document.getElementById('cam-mode');

        // Spin variables
        this.spinReticle = document.getElementById('spin-reticle');
        this.valSpinX = document.getElementById('val-spinx');
        this.valSpinY = document.getElementById('val-spiny');
    }

    init() {
        // Setup levels
        this.renderScenarios();
        this.loadScenario(0);

        // Bind events
        this.bindEvents();

        // Start render loop
        requestAnimationFrame((t) => this.loop(t));
    }

    // Lazy initialize Web Audio API
    initAudio() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    playSynthSound(type) {
        try {
            this.initAudio();
            if (!this.audioCtx) return;

            let osc = this.audioCtx.createOscillator();
            let gain = this.audioCtx.createGain();
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);

            if (type === 'hit') {
                // High frequency sharp pulse
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(450, this.audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(120, this.audioCtx.currentTime + 0.15);

                gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.15);

                osc.start();
                osc.stop(this.audioCtx.currentTime + 0.16);
            } else if (type === 'bounce') {
                // Low dull thud
                osc.type = 'sine';
                osc.frequency.setValueAtTime(150, this.audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(80, this.audioCtx.currentTime + 0.1);

                gain.gain.setValueAtTime(0.25, this.audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.1);

                osc.start();
                osc.stop(this.audioCtx.currentTime + 0.11);
            } else if (type === 'pocket') {
                // Retro sci-fi level-up ascending beep
                osc.type = 'square';
                osc.frequency.setValueAtTime(300, this.audioCtx.currentTime);
                osc.frequency.setValueAtTime(600, this.audioCtx.currentTime + 0.08);
                osc.frequency.setValueAtTime(1200, this.audioCtx.currentTime + 0.16);

                gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.35);

                osc.start();
                osc.stop(this.audioCtx.currentTime + 0.36);
            }
        } catch (e) {
            console.warn("Synth failed", e);
        }
    }

    renderScenarios() {
        this.scenariosContainer.innerHTML = '';
        this.scenarios.forEach((sc, idx) => {
            let card = document.createElement('div');
            card.className = `p-3 rounded-lg border cursor-pointer transition flex justify-between items-center ${
                idx === this.currentScenarioIndex
                    ? 'bg-cyber-blue/20 border-cyber-blue/80 neon-border-blue'
                    : 'bg-slate-900/60 border-slate-800 hover:border-cyber-blue/40'
            }`;
            card.innerHTML = `
                <div>
                    <h3 class="text-xs font-bold ${idx === this.currentScenarioIndex ? 'text-cyber-cyan' : 'text-slate-300'}">${sc.name}</h3>
                    <span class="text-[9px] px-1.5 py-0.5 rounded border ${
                        sc.difficulty === 'EASY' ? 'border-cyber-green/55 text-cyber-green bg-cyber-green/5' :
                        sc.difficulty === 'MEDIUM' ? 'border-cyber-yellow/55 text-cyber-yellow bg-cyber-yellow/5' :
                        sc.difficulty === 'HARD' ? 'border-cyber-magenta/55 text-cyber-magenta bg-cyber-magenta/5' :
                        'border-purple-400 text-purple-300 bg-purple-500/10'
                    }">${sc.difficulty}</span>
                </div>
                <span class="text-slate-500 text-xs">${idx === this.currentScenarioIndex ? '▶' : ''}</span>
            `;
            card.onclick = () => this.loadScenario(idx);
            this.scenariosContainer.appendChild(card);
        });
    }

    loadScenario(idx) {
        this.currentScenarioIndex = idx;
        let sc = this.scenarios[idx];
        this.descriptionEl.textContent = sc.description;

        // Clone level state to start fresh
        this.ball = JSON.parse(JSON.stringify(sc.ball));
        this.isSimulating = false;
        this.simulationTrajectory = [];
        this.simulationStep = 0;

        // Reset inputs/aim
        this.aimForce = 11.5;
        this.slideForce.value = 11.5;
        this.valForce.textContent = "11.5 N";

        this.aimAngle = 35;
        this.slideAngle.value = 35;
        this.valAngle.textContent = "35.0°";

        this.slideGravity.value = sc.environment.gravity.y;
        this.valGravity.textContent = `${sc.environment.gravity.y.toFixed(2)} G`;

        this.slideFriction.value = sc.environment.friction;
        this.valFriction.textContent = `${sc.environment.friction.toFixed(1)}x`;

        // Update levels styling selection
        this.renderScenarios();

        // Recalculate AI trajectories
        this.runAICalculation();
    }

    bindEvents() {
        // Force slide
        this.slideForce.oninput = (e) => {
            this.aimForce = parseFloat(e.target.value);
            this.valForce.textContent = `${this.aimForce.toFixed(1)} N`;
            this.runAICalculation();
        };

        // Angle slide
        this.slideAngle.oninput = (e) => {
            this.aimAngle = parseInt(e.target.value);
            this.valAngle.textContent = `${this.aimAngle.toFixed(1)}°`;
            this.runAICalculation();
        };

        // Gravity slide
        this.slideGravity.oninput = (e) => {
            let val = parseFloat(e.target.value);
            this.valGravity.textContent = `${val.toFixed(2)} G`;
            this.runAICalculation();
        };

        // Friction slide
        this.slideFriction.oninput = (e) => {
            let val = parseFloat(e.target.value);
            this.valFriction.textContent = `${val.toFixed(1)}x`;
            this.runAICalculation();
        };

        // Launch trick shot
        this.btnFire.onclick = () => {
            this.launchShot();
        };

        // Reset button
        this.btnReset.onclick = () => {
            this.loadScenario(this.currentScenarioIndex);
        };

        // AI Auto-Aim Toggler
        this.btnAutoAim.onclick = () => {
            this.toggleAutoAim();
        };

        // Canvas Click / Aim drag interactions
        this.canvas.onmousedown = (e) => {
            if (this.isSimulating) return;
            let rect = this.canvas.getBoundingClientRect();
            let clickX = (e.clientX - rect.left) * (this.canvas.width / rect.width);
            let clickY = (e.clientY - rect.top) * (this.canvas.height / rect.height);

            // Drag from the ball position to aim
            let dx = clickX - this.ball.x;
            let dy = clickY - this.ball.y;
            let dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 40) {
                this.isAiming = true;
                this.dragStart = { x: clickX, y: clickY };
            }
        };

        window.onmousemove = (e) => {
            if (!this.isAiming) return;
            let rect = this.canvas.getBoundingClientRect();
            let clickX = (e.clientX - rect.left) * (this.canvas.width / rect.width);
            let clickY = (e.clientY - rect.top) * (this.canvas.height / rect.height);

            // Calculate force vector pointing away from drag
            let dx = this.ball.x - clickX;
            let dy = this.ball.y - clickY;
            let dist = Math.sqrt(dx * dx + dy * dy);

            // Convert distance/force scale
            let force = Math.max(3, Math.min(22, dist * 0.15));
            this.aimForce = force;
            this.slideForce.value = force;
            this.valForce.textContent = `${force.toFixed(1)} N`;

            // Calculate angle
            let angleRad = Math.atan2(dy, dx);
            let angleDeg = Math.round((angleRad * 180) / Math.PI);
            if (angleDeg < 0) angleDeg += 360;
            this.aimAngle = angleDeg;
            this.slideAngle.value = angleDeg;
            this.valAngle.textContent = `${angleDeg.toFixed(1)}°`;

            this.runAICalculation();
        };

        window.onmouseup = () => {
            if (this.isAiming) {
                this.isAiming = false;
                this.dragStart = null;
            }
        };

        // English / Spin drag reticle
        this.initSpinControl();
    }

    initSpinControl() {
        let isSpinDragging = false;
        let parent = this.spinReticle.parentElement;

        let handleSpinMove = (clientX, clientY) => {
            let rect = parent.getBoundingClientRect();
            let cx = rect.left + rect.width / 2;
            let cy = rect.top + rect.height / 2;

            let dx = clientX - cx;
            let dy = clientY - cy;
            let dist = Math.sqrt(dx * dx + dy * dy);

            // Limit to circle radius minus reticle radius
            let limit = rect.width / 2 - 10;
            if (dist > limit) {
                dx = (dx / dist) * limit;
                dy = (dy / dist) * limit;
            }

            // Move element
            this.spinReticle.style.transform = `translate(${dx}px, ${dy}px)`;

            // Map values to physics spin ranges
            this.spinX = (dx / limit) * 2.5; // sidespin multiplier
            this.spinY = -(dy / limit) * 2.5; // topspin multiplier (negative draw, positive follow)

            this.valSpinX.textContent = this.spinX === 0 ? "0.0 (None)" : `${this.spinX > 0 ? '+' : ''}${this.spinX.toFixed(1)} (English)`;
            this.valSpinY.textContent = this.spinY === 0 ? "0.0 (None)" : `${this.spinY > 0 ? '+' : ''}${this.spinY.toFixed(1)} (${this.spinY > 0 ? 'Follow' : 'Draw'})`;

            this.runAICalculation();
        };

        this.spinReticle.onmousedown = (e) => {
            e.preventDefault();
            isSpinDragging = true;
        };

        window.addEventListener('mousemove', (e) => {
            if (isSpinDragging) {
                handleSpinMove(e.clientX, e.clientY);
            }
        });

        window.addEventListener('mouseup', () => {
            isSpinDragging = false;
        });

        // Click anywhere inside circle
        parent.onmousedown = (e) => {
            if (e.target === this.spinReticle) return;
            handleSpinMove(e.clientX, e.clientY);
            isSpinDragging = true;
        };
    }

    toggleAutoAim() {
        this.autoAimEnabled = !this.autoAimEnabled;
        if (this.autoAimEnabled) {
            this.btnAutoAim.classList.add('bg-cyber-green/30', 'border-cyber-green', 'text-cyber-green');
            this.btnAutoAim.classList.remove('bg-cyber-blue/20', 'border-cyber-blue/40', 'text-cyber-blue');
            this.autoAimBtnText.textContent = "AI Auto-Aim: ACTIVATED";
            this.autoAimStatusHud.textContent = "ACTIVATED (AUTO LOCK)";
            this.autoAimStatusHud.className = "text-cyber-green font-bold animate-pulse";

            // Apply optimal parameters to UI
            if (this.aiResult && this.aiResult.optimalPath) {
                let opt = this.aiResult.optimalPath;
                this.aimAngle = opt.angle;
                this.slideAngle.value = opt.angle;
                this.valAngle.textContent = `${opt.angle.toFixed(1)}°`;

                this.aimForce = opt.force;
                this.slideForce.value = opt.force;
                this.valForce.textContent = `${opt.force.toFixed(1)} N`;
            }
        } else {
            this.btnAutoAim.classList.remove('bg-cyber-green/30', 'border-cyber-green', 'text-cyber-green');
            this.btnAutoAim.classList.add('bg-cyber-blue/20', 'border-cyber-blue/40', 'text-cyber-blue');
            this.autoAimBtnText.textContent = "Enable AI Auto-Aim";
            this.autoAimStatusHud.textContent = "STANDBY";
            this.autoAimStatusHud.className = "text-cyber-cyan font-bold";
        }
    }

    launchShot() {
        if (this.isSimulating) return;

        // Apply any Auto-Aim before launching if active
        if (this.autoAimEnabled && this.aiResult && this.aiResult.optimalPath) {
            let opt = this.aiResult.optimalPath;
            this.aimAngle = opt.angle;
            this.aimForce = opt.force;
        }

        // Get starting configuration
        let sc = this.scenarios[this.currentScenarioIndex];
        let rad = (this.aimAngle * Math.PI) / 180;

        this.ball = {
            ...sc.ball,
            vx: Math.cos(rad) * this.aimForce,
            vy: Math.sin(rad) * this.aimForce,
            spinX: this.spinX,
            spinY: this.spinY,
            pocketed: false
        };

        this.isSimulating = true;
        this.simulationStep = 0;

        // Build current active environment variables
        let env = this.buildEnvironment();

        // Run full prediction to save steps/events
        let pred = this.physics.predictTrajectory(this.ball, env, 400);
        this.simulationTrajectory = pred.trajectory;
        this.simulationEvents = pred.events;

        this.playSynthSound('hit');
    }

    buildEnvironment() {
        let sc = this.scenarios[this.currentScenarioIndex];
        let gY = parseFloat(this.slideGravity.value);
        let fScale = parseFloat(this.slideFriction.value);

        return {
            width: sc.environment.width,
            height: sc.environment.height,
            friction: fScale,
            gravity: { x: 0, y: gY },
            pockets: sc.environment.pockets,
            obstacles: sc.obstacles
        };
    }

    runAICalculation() {
        if (this.isSimulating) return;

        let sc = this.scenarios[this.currentScenarioIndex];
        let env = this.buildEnvironment();

        // Run sweeping AI
        let baseBall = { ...sc.ball, spinX: this.spinX, spinY: this.spinY };
        let results = this.ai.findBestShots(baseBall, env, sc.target);

        this.aiResult = results;

        // Update HUD display
        this.probEl.textContent = `${results.successProbability}%`;
        this.diffEl.textContent = results.difficulty;
        this.bouncesEl.textContent = results.optimalPath ? results.optimalPath.bounces : "0";

        // Assign difficulty color styling
        this.diffEl.className = `font-bold text-sm uppercase ${
            results.difficulty === 'EASY' ? 'text-cyber-green' :
            results.difficulty === 'MEDIUM' ? 'text-cyber-yellow' :
            results.difficulty === 'HARD' ? 'text-cyber-magenta' :
            results.difficulty === 'MAGIC' ? 'text-purple-400 animate-pulse' : 'text-red-500'
        }`;

        let score = results.difficultyScore;
        this.accPercentEl.textContent = `${score}%`;
        this.accBarEl.style.width = `${score}%`;

        // Update Auto-aim lock if autoaim is enabled
        if (this.autoAimEnabled && results.optimalPath) {
            let opt = results.optimalPath;
            this.aimAngle = opt.angle;
            this.slideAngle.value = opt.angle;
            this.valAngle.textContent = `${opt.angle.toFixed(1)}°`;

            this.aimForce = opt.force;
            this.slideForce.value = opt.force;
            this.valForce.textContent = `${opt.force.toFixed(1)} N`;
        }
    }

    // Main interactive updates and Canvas loops
    loop(time) {
        this.update();
        this.render();
        requestAnimationFrame((t) => this.loop(t));
    }

    update() {
        if (this.isSimulating && this.simulationTrajectory.length > 0) {
            if (this.simulationStep < this.simulationTrajectory.length - 1) {
                this.simulationStep++;
                let pt = this.simulationTrajectory[this.simulationStep];
                this.ball.x = pt.x;
                this.ball.y = pt.y;
                this.ball.vx = pt.vx;
                this.ball.vy = pt.vy;

                // Fire sounds on collisions
                if (this.simulationEvents) {
                    let evs = this.simulationEvents.filter(e => e.step === this.simulationStep);
                    for (let ev of evs) {
                        if (ev.type === 'cushion' || ev.type === 'obstacle') {
                            this.playSynthSound('bounce');
                        } else if (ev.type === 'pocket') {
                            this.playSynthSound('pocket');
                            this.ball.pocketed = true;
                        }
                    }
                }
            } else {
                this.isSimulating = false;
            }
        }
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Render Background (Camera simulation)
        this.renderBackground();

        // Render Obstacles/Blocks
        this.renderObstacles();

        // Render Target / Pockets
        this.renderTargetPocket();

        // Render AI HUD Trajectory Assistance paths (Only when not launched)
        if (!this.isSimulating && this.aiResult) {
            this.renderAITrajectories();
        }

        // Render User Drag Aim Assist cue stick
        if (!this.isSimulating && !this.autoAimEnabled) {
            this.renderAimAssist();
        }

        // Render Ball (Glow & Ball texture)
        this.renderBall();
    }

    renderBackground() {
        let sc = this.scenarios[this.currentScenarioIndex];
        let mode = this.camModeSel.value;

        if (mode === 'cyber_grid') {
            // Futuristic blue grid lines
            this.ctx.strokeStyle = 'rgba(59, 130, 246, 0.08)';
            this.ctx.lineWidth = 1;
            let gridSize = 25;
            for (let x = 0; x < this.canvas.width; x += gridSize) {
                this.ctx.beginPath();
                this.ctx.moveTo(x, 0);
                this.ctx.lineTo(x, this.canvas.height);
                this.ctx.stroke();
            }
            for (let y = 0; y < this.canvas.height; y += gridSize) {
                this.ctx.beginPath();
                this.ctx.moveTo(0, y);
                this.ctx.lineTo(this.canvas.width, y);
                this.ctx.stroke();
            }
        } else if (mode === 'neon_pulse') {
            // Pulsating neon circular waves
            let time = Date.now() * 0.002;
            this.ctx.fillStyle = 'rgba(10, 5, 20, 1)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            this.ctx.strokeStyle = 'rgba(236, 72, 153, 0.06)';
            this.ctx.lineWidth = 2;
            let cx = this.canvas.width / 2;
            let cy = this.canvas.height / 2;
            for (let r = (time * 20) % 100; r < 500; r += 80) {
                this.ctx.beginPath();
                this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
                this.ctx.stroke();
            }
        } else if (mode === 'cosmic_vortex') {
            // Swirling gravitational force vortex
            let time = Date.now() * 0.0015;
            this.ctx.fillStyle = 'rgba(5, 5, 15, 1)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            this.ctx.strokeStyle = 'rgba(6, 182, 212, 0.08)';
            this.ctx.lineWidth = 1.5;
            let cx = this.canvas.width / 2;
            let cy = this.canvas.height / 2;

            this.ctx.beginPath();
            for (let i = 0; i < 180; i += 2) {
                let angle = (i * Math.PI) / 90 + time;
                let r = i * 3;
                let x = cx + Math.cos(angle) * r;
                let y = cy + Math.sin(angle) * r;
                if (i === 0) this.ctx.moveTo(x, y);
                else this.ctx.lineTo(x, y);
            }
            this.ctx.stroke();
        } else if (mode === 'virtual_webcam') {
            // High tech noisy simulated webcam image of table
            this.ctx.fillStyle = 'rgba(12, 28, 20, 1)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // simulated table margins / rails
            this.ctx.strokeStyle = 'rgba(34, 197, 94, 0.15)';
            this.ctx.lineWidth = 16;
            this.ctx.strokeRect(8, 8, this.canvas.width - 16, this.canvas.height - 16);

            // Render camera static scan dots
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
            for (let i = 0; i < 15; i++) {
                let rx = Math.random() * this.canvas.width;
                let ry = Math.random() * this.canvas.height;
                let r = Math.random() * 20 + 5;
                this.ctx.beginPath();
                this.ctx.arc(rx, ry, r, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
    }

    renderObstacles() {
        let sc = this.scenarios[this.currentScenarioIndex];
        if (!sc.obstacles) return;

        sc.obstacles.forEach(obs => {
            this.ctx.save();

            // Holographic glow
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = 'rgba(59, 130, 246, 0.6)';

            this.ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
            this.ctx.strokeStyle = 'rgba(59, 130, 246, 0.9)';
            this.ctx.lineWidth = 2;

            if (obs.type === 'circle') {
                this.ctx.beginPath();
                this.ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();

                // Draw center hub / core reticle
                this.ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
                this.ctx.beginPath();
                this.ctx.arc(obs.x, obs.y, obs.radius * 0.4, 0, Math.PI * 2);
                this.ctx.stroke();
            } else if (obs.type === 'rect') {
                this.ctx.beginPath();
                this.ctx.rect(obs.x, obs.y, obs.w, obs.h);
                this.ctx.fill();
                this.ctx.stroke();

                // Cyber grid diagonal overlay inside obstacle
                this.ctx.strokeStyle = 'rgba(59, 130, 246, 0.15)';
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                for (let o = 0; o < obs.w + obs.h; o += 15) {
                    this.ctx.moveTo(obs.x + o, obs.y);
                    this.ctx.lineTo(obs.x + o - obs.h, obs.y + obs.h);
                }
                this.ctx.stroke();
            }
            this.ctx.restore();
        });
    }

    renderTargetPocket() {
        let sc = this.scenarios[this.currentScenarioIndex];
        let t = sc.target;

        this.ctx.save();
        // Target tracking ring
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = 'rgba(236, 72, 153, 0.8)';

        // Pulse animation
        let pulseRadius = t.radius + Math.sin(Date.now() * 0.007) * 3;

        // Draw Pocket base
        this.ctx.fillStyle = '#050510';
        this.ctx.strokeStyle = 'rgba(236, 72, 153, 1)';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Draw external lock reticle ring
        this.ctx.strokeStyle = 'rgba(236, 72, 153, 0.4)';
        this.ctx.lineWidth = 1.5;
        this.ctx.setLineDash([4, 4]);
        this.ctx.beginPath();
        this.ctx.arc(t.x, t.y, pulseRadius + 6, 0, Math.PI * 2);
        this.ctx.stroke();

        // Crosshair ticks
        this.ctx.strokeStyle = 'rgba(236, 72, 153, 0.7)';
        this.ctx.setLineDash([]);
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        // Top tick
        this.ctx.moveTo(t.x, t.y - pulseRadius - 8);
        this.ctx.lineTo(t.x, t.y - pulseRadius - 2);
        // Bottom tick
        this.ctx.moveTo(t.x, t.y + pulseRadius + 2);
        this.ctx.lineTo(t.x, t.y + pulseRadius + 8);
        // Left tick
        this.ctx.moveTo(t.x - pulseRadius - 8, t.y);
        this.ctx.lineTo(t.x - pulseRadius - 2, t.y);
        // Right tick
        this.ctx.moveTo(t.x + pulseRadius + 2, t.y);
        this.ctx.lineTo(t.x + pulseRadius + 8, t.y);
        this.ctx.stroke();

        // Text Target Lock tag
        this.ctx.fillStyle = 'rgba(236, 72, 153, 0.9)';
        this.ctx.font = '9px "Share Tech Mono"';
        this.ctx.fillText("TARGET_LOCK", t.x + t.radius + 10, t.y + 3);

        this.ctx.restore();
    }

    renderAITrajectories() {
        if (!this.aiResult) return;

        // Render secondary paths in low opacity dotted cyber cyan
        if (this.aiResult.alternatives) {
            this.aiResult.alternatives.forEach((alt, idx) => {
                this.ctx.save();
                this.ctx.strokeStyle = 'rgba(6, 182, 212, 0.3)';
                this.ctx.lineWidth = 1.5;
                this.ctx.setLineDash([2, 5]);
                this.ctx.beginPath();
                alt.trajectory.forEach((pt, i) => {
                    if (i === 0) this.ctx.moveTo(pt.x, pt.y);
                    else this.ctx.lineTo(pt.x, pt.y);
                });
                this.ctx.stroke();

                // Draw secondary path numbers
                if (alt.trajectory.length > 30) {
                    let textPt = alt.trajectory[Math.floor(alt.trajectory.length * 0.4)];
                    this.ctx.fillStyle = 'rgba(6, 182, 212, 0.6)';
                    this.ctx.font = '8px monospace';
                    this.ctx.fillText(`ALT_PATH_#${idx + 1}`, textPt.x + 5, textPt.y - 5);
                }
                this.ctx.restore();
            });
        }

        // Render main optimal path in full glowing neon magenta
        if (this.aiResult.optimalPath && this.aiResult.optimalPath.score > 100) {
            let opt = this.aiResult.optimalPath;
            this.ctx.save();
            this.ctx.strokeStyle = 'rgba(236, 72, 153, 0.95)';
            this.ctx.shadowBlur = 12;
            this.ctx.shadowColor = 'rgba(236, 72, 153, 0.8)';
            this.ctx.lineWidth = 3;

            this.ctx.beginPath();
            opt.trajectory.forEach((pt, i) => {
                if (i === 0) this.ctx.moveTo(pt.x, pt.y);
                else this.ctx.lineTo(pt.x, pt.y);
            });
            this.ctx.stroke();

            // Draw hit reflection point hubs/bounces
            opt.events.forEach(ev => {
                this.ctx.fillStyle = 'rgba(236, 72, 153, 1)';
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 1.5;
                this.ctx.beginPath();
                this.ctx.arc(ev.x, ev.y, 5, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();

                // Bounce label tag
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                this.ctx.font = '8px monospace';
                this.ctx.fillText(`BOUNCE`, ev.x + 8, ev.y - 4);
            });

            this.ctx.restore();
        }
    }

    renderAimAssist() {
        // Line pointing from cue ball outward
        let rad = (this.aimAngle * Math.PI) / 180;
        let dx = Math.cos(rad);
        let dy = Math.sin(rad);

        let startX = this.ball.x;
        let startY = this.ball.y;
        let length = this.aimForce * 8; // scale force for display

        this.ctx.save();
        // Gradient vector arrow
        let grad = this.ctx.createLinearGradient(startX, startY, startX + dx * length, startY + dy * length);
        grad.addColorStop(0, 'rgba(59, 130, 246, 0.1)');
        grad.addColorStop(1, 'rgba(59, 130, 246, 0.85)');

        this.ctx.strokeStyle = grad;
        this.ctx.lineWidth = 2.5;
        this.ctx.beginPath();
        this.ctx.moveTo(startX, startY);
        this.ctx.lineTo(startX + dx * length, startY + dy * length);
        this.ctx.stroke();

        // Little arrow tip
        let tipX = startX + dx * length;
        let tipY = startY + dy * length;
        let angleTip1 = rad + Math.PI - 0.4;
        let angleTip2 = rad + Math.PI + 0.4;

        this.ctx.strokeStyle = 'rgba(59, 130, 246, 0.9)';
        this.ctx.beginPath();
        this.ctx.moveTo(tipX, tipY);
        this.ctx.lineTo(tipX + Math.cos(angleTip1) * 8, tipY + Math.sin(angleTip1) * 8);
        this.ctx.moveTo(tipX, tipY);
        this.ctx.lineTo(tipX + Math.cos(angleTip2) * 8, tipY + Math.sin(angleTip2) * 8);
        this.ctx.stroke();

        this.ctx.restore();
    }

    renderBall() {
        this.ctx.save();

        if (this.ball.pocketed) {
            // No ball to draw
            this.ctx.restore();
            return;
        }

        // Glow ring
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = 'rgba(59, 130, 246, 0.8)';

        // Draw physical cue ball body (Pure glowing white with cyan core styling)
        this.ctx.fillStyle = '#ffffff';
        this.ctx.strokeStyle = 'rgba(6, 182, 212, 1)';
        this.ctx.lineWidth = 2;

        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Draw direction vectors / spin rotation lines on the ball itself
        this.ctx.strokeStyle = 'rgba(5, 5, 20, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();

        // draw spin orientation coordinates
        let sx = (this.spinX / 2.5) * (this.ball.radius - 3);
        let sy = -(this.spinY / 2.5) * (this.ball.radius - 3);

        this.ctx.moveTo(this.ball.x + sx - 3, this.ball.y + sy);
        this.ctx.lineTo(this.ball.x + sx + 3, this.ball.y + sy);
        this.ctx.moveTo(this.ball.x + sx, this.ball.y + sy - 3);
        this.ctx.lineTo(this.ball.x + sx, this.ball.y + sy + 3);
        this.ctx.stroke();

        this.ctx.restore();
    }
}

// Instantiate on document ready
window.addEventListener('DOMContentLoaded', () => {
    window.app = new ARApp();
});
