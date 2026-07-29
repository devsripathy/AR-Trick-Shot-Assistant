/**
 * High-performance lightweight 3D Physics & Ballistics Solver in JS.
 * Used for real-time sub-millisecond path generation in the browser.
 */
class JSPhysicsSolver {
    constructor() {
        // Default physical constants (Basketball on hardwood standard)
        this.gravity = { x: 0, y: -9.81, z: 0 };
        this.airDensity = 1.225; // kg/m^3

        
        this.mass = 0.62;        // kg
        this.radius = 12;        // m (scaled for canvas representation)
        this.dragCoeff = 0.47;   // sphere
        this.liftCoeff = 1.5;    // Magnus coefficient
        this.restitution = 0.82; // bounce elasticity
        this.surfaceFriction = 0.35; // friction loss

        
        this.timeStep = 0.016;   // ~60 FPS dt
        this.maxSteps = 200;
        this.maxBounces = 3;
    }

    /**
     * Solves full 3D trajectory path.
     * Bounces against floor plane (y = 440) and optional walls / targets.
     */
    solve(startPos, startVel, spin, obstacles = []) {
        const points = [];
        let currentPos = { ...startPos };
        let currentVel = { ...startVel };
        let currentSpin = { ...spin };
        let currentTime = 0;
        let bounceCount = 0;

        const crossSectionalArea = Math.PI * Math.pow(this.radius / 100, 2);

        // Save starting state
        points.push({
            pos: { ...currentPos },
            vel: { ...currentVel },
            spin: { ...currentSpin },
            time: currentTime,
            isBounce: false,
            normal: { x: 0, y: 0, z: 0 }
        });

        // Use ground boundary at y = 440 (scaled for dashboard representation)
        const groundY = 440;

        for (let i = 0; i < this.maxSteps; i++) {
            const speed = Math.sqrt(
                currentVel.x * currentVel.x +
                currentVel.y * currentVel.y +
                currentVel.z * currentVel.z
            );

            // 1. Air resistance (Quadratic Drag)
            let fDrag = { x: 0, y: 0, z: 0 };
            if (speed > 0.001) {
                const dragMag = 0.5 * this.dragCoeff * this.airDensity * crossSectionalArea * speed;
                fDrag = {
                    x: -dragMag * currentVel.x,
                    y: -dragMag * currentVel.y,
                    z: -dragMag * currentVel.z
                };
            }

            // 2. Magnus Effect (Spin Force): Fm = Cl * rho * A * r * (omega x v)
            let fMagnus = { x: 0, y: 0, z: 0 };
            if (speed > 0.001) {
                const spinSpeed = Math.sqrt(
                    currentSpin.x * currentSpin.x +
                    currentSpin.y * currentSpin.y +
                    currentSpin.z * currentSpin.z
                );
                if (spinSpeed > 0.01) {
                    // Cross product: omega x v
                    const crossX = currentSpin.y * currentVel.z - currentSpin.z * currentVel.y;
                    const crossY = currentSpin.z * currentVel.x - currentSpin.x * currentVel.z;
                    const crossZ = currentSpin.x * currentVel.y - currentSpin.y * currentVel.x;

                    const liftMag = this.liftCoeff * this.airDensity * crossSectionalArea * (this.radius / 100);
                    fMagnus = {
                        x: liftMag * crossX,
                        y: liftMag * crossY,
                        z: liftMag * crossZ
                    };
                }
            }

            // 3. Gravity (multiplied by scaling factors for canvas space Y)
            const fGravity = {
                x: this.mass * this.gravity.x,
                // Negative physics gravity is downward, which is positive in canvas pixels
                y: -this.mass * this.gravity.y * 10,
                y: -this.mass * this.gravity.y * 10, 
                z: this.mass * this.gravity.z
            };

            // Net forces and acceleration
            const fNet = {
                x: fGravity.x + fDrag.x + fMagnus.x,
                y: fGravity.y + fDrag.y + fMagnus.y,
                z: fGravity.z + fDrag.z + fMagnus.z
            };

            const acc = {
                x: fNet.x / this.mass,
                y: fNet.y / this.mass,
                z: fNet.z / this.mass
            };

            // Update velocity and displacement
            const nextVel = {
                x: currentVel.x + acc.x * this.timeStep,
                y: currentVel.y + acc.y * this.timeStep,
                z: currentVel.z + acc.z * this.timeStep
            };

            const disp = {
                x: nextVel.x * this.timeStep * 15, // scale physics distance to pixels
                y: nextVel.y * this.timeStep * 15,
                z: nextVel.z * this.timeStep * 15
            };

            let nextPos = {
                x: currentPos.x + disp.x,
                y: currentPos.y + disp.y,
                z: currentPos.z + disp.z
            };

            // 4. Multi-surface Boundary Collision Detection
            let collisionOccurred = false;

            // Floor boundary collision (y = groundY - radius)
            if (nextPos.y > (groundY - this.radius)) {
                if (bounceCount < this.maxBounces) {
                    collisionOccurred = true;
                    bounceCount++;

                    // Positional correction
                    currentPos.y = groundY - this.radius;

                    // Elastic rebound on Y axis (invert direction)
                    currentVel.y = -nextVel.y * this.restitution;

                    // Friction loss on horizontal axis
                    currentVel.x = nextVel.x * (1 - this.surfaceFriction);
                    currentVel.z = nextVel.z * (1 - this.surfaceFriction);

                    // Forward spin adds forward linear velocity upon bounce
                    currentVel.x += currentSpin.z * (this.radius / 100) * 0.4 * 10;
                    currentVel.z -= currentSpin.x * (this.radius / 100) * 0.4 * 10;

                    // Friction slows spin down
                    currentSpin.x *= (1 - this.surfaceFriction * 0.5);
                    currentSpin.y *= (1 - this.surfaceFriction * 0.5);
                    currentSpin.z *= (1 - this.surfaceFriction * 0.5);

                    points.push({
                        pos: { ...currentPos },
                        vel: { ...currentVel },
                        spin: { ...currentSpin },
                        time: currentTime,
                        isBounce: true,
                        normal: { x: 0, y: -1, z: 0 }
                    });
                } else {
                    // Maximum bounces exceeded, stop trajectory simulation
                    break;
                }
            }

            // Obstacle Bounces (e.g., custom walls or bank targets)
            if (!collisionOccurred && obstacles.length > 0) {
                for (const obs of obstacles) {
                    if (obs.type === 'wall') {
                        // Vertical wall intersection check at x = obs.x
                        const crossedWall = (currentPos.x < obs.x && nextPos.x >= obs.x) || (currentPos.x > obs.x && nextPos.x <= obs.x);
                        const withinHeight = nextPos.y >= obs.yMin && nextPos.y <= obs.yMax;

                        
                        if (crossedWall && withinHeight) {
                            if (bounceCount < this.maxBounces) {
                                collisionOccurred = true;
                                bounceCount++;

                                // Positional correction
                                currentPos.x = obs.x - Math.sign(disp.x) * this.radius;

                                // Normal component is X
                                currentVel.x = -nextVel.x * this.restitution;
                                currentVel.y = nextVel.y * (1 - this.surfaceFriction);
                                currentVel.z = nextVel.z * (1 - this.surfaceFriction);

                                points.push({
                                    pos: { ...currentPos },
                                    vel: { ...currentVel },
                                    spin: { ...currentSpin },
                                    time: currentTime,
                                    isBounce: true,
                                    normal: { x: -Math.sign(disp.x), y: 0, z: 0 }
                                });
                            }
                        }
                    }
                }
            }

            if (!collisionOccurred) {
                currentPos = nextPos;
                currentVel = nextVel;
                currentTime += this.timeStep;

                points.push({
                    pos: { ...currentPos },
                    vel: { ...currentVel },
                    spin: { ...currentSpin },
                    time: currentTime,
                    isBounce: false,
                    normal: { x: 0, y: 0, z: 0 }
                });
            }

            // Exit simulation if ball is basically stopped
            const currentSpeed = Math.sqrt(currentVel.x * currentVel.x + currentVel.y * currentVel.y + currentVel.z * currentVel.z);
            if (currentSpeed < 0.1 && i > 15) {
                break;
            }
        }

        return points;
    }
}

// Export for module systems or attach to global scope
if (typeof module !== 'undefined' && module.exports) {
    module.exports = JSPhysicsSolver;
} else {
    window.JSPhysicsSolver = JSPhysicsSolver;
}
