/**
 * AR Trickshot AI - Physics Simulation Engine
 * Core mechanics of pool, billiards, and trajectory kinematics.
 */

class PhysicsEngine {
    constructor() {
        // Physical Constants
        this.GRAVITY_CONSTANT = 0.15; // default gravity scale
        this.FRICTION_CONSTANT = 0.008; // sliding friction on table
        this.REST_THRESHOLD = 0.05; // speed below which ball stops
        this.CUSHION_RESTITUTION = 0.85; // bouncing elasticity
        this.SPIN_CUSHION_TRANSFER = 0.25; // sidespin effect multiplier on cushion bounce
        this.SPIN_DECAY = 0.015; // spin dissipation per frame
    }

    /**
     * Simulates a single frame/step for a ball
     * @param {Object} ball {x, y, vx, vy, radius, spinX, spinY, mass}
     * @param {Object} environment {width, height, gravity, friction, obstacles, pockets}
     * @returns {Object} Updated ball state & event info (bounce, pocketed, etc.)
     */
    step(ball, environment) {
        let nextBall = { ...ball };
        let events = [];

        // Apply environment gravity (if enabled)
        if (environment.gravity && (environment.gravity.x !== 0 || environment.gravity.y !== 0)) {
            nextBall.vx += environment.gravity.x * this.GRAVITY_CONSTANT;
            nextBall.vy += environment.gravity.y * this.GRAVITY_CONSTANT;
        }

        // Apply friction decay
        let frictionScale = environment.friction !== undefined ? environment.friction : 1.0;
        let speed = Math.sqrt(nextBall.vx * nextBall.vx + nextBall.vy * nextBall.vy);
        if (speed > 0) {
            let decay = this.FRICTION_CONSTANT * frictionScale;

            // Backspin / topspin (spinY) influences acceleration/friction
            // Negative spinY is backspin (draw shot), positive spinY is topspin (follow shot)
            if (nextBall.spinY !== 0) {
                // Spin gradually transfers into velocity
                let spinTransfer = nextBall.spinY * 0.02;
                // Spin acceleration direction is along the motion vector
                let dx = nextBall.vx / speed;
                let dy = nextBall.vy / speed;
                nextBall.vx += dx * spinTransfer;
                nextBall.vy += dy * spinTransfer;
                // Decay spinY
                nextBall.spinY *= 0.95;
            }

            if (speed <= decay + this.REST_THRESHOLD) {
                nextBall.vx = 0;
                nextBall.vy = 0;
            } else {
                nextBall.vx -= (nextBall.vx / speed) * decay;
                nextBall.vy -= (nextBall.vy / speed) * decay;
            }
        }

        // SpinX decay (sidespin / English)
        if (nextBall.spinX) {
            nextBall.spinX *= (1 - this.SPIN_DECAY);
            if (Math.abs(nextBall.spinX) < 0.01) nextBall.spinX = 0;
        }

        // Move ball
        nextBall.x += nextBall.vx;
        nextBall.y += nextBall.vy;

        // Check Cushion collisions (boundaries)
        const marginX = nextBall.radius;
        const marginY = nextBall.radius;

        // Left wall
        if (nextBall.x < marginX) {
            nextBall.x = marginX;
            nextBall.vx = -nextBall.vx * this.CUSHION_RESTITUTION;

            // Left/right sidespin (spinX) affects vertical rebound
            // spinX > 0 (right spin) deflections: when hitting left cushion, deflects upwards
            if (nextBall.spinX) {
                nextBall.vy += nextBall.spinX * this.SPIN_CUSHION_TRANSFER * 15;
                nextBall.spinX *= 0.6; // spin loses energy on impact
            }
            events.push({ type: 'cushion', x: nextBall.x, y: nextBall.y });
        }
        // Right wall
        else if (nextBall.x > environment.width - marginX) {
            nextBall.x = environment.width - marginX;
            nextBall.vx = -nextBall.vx * this.CUSHION_RESTITUTION;

            if (nextBall.spinX) {
                nextBall.vy -= nextBall.spinX * this.SPIN_CUSHION_TRANSFER * 15;
                nextBall.spinX *= 0.6;
            }
            events.push({ type: 'cushion', x: nextBall.x, y: nextBall.y });
        }

        // Top wall
        if (nextBall.y < marginY) {
            nextBall.y = marginY;
            nextBall.vy = -nextBall.vy * this.CUSHION_RESTITUTION;

            if (nextBall.spinX) {
                nextBall.vx -= nextBall.spinX * this.SPIN_CUSHION_TRANSFER * 15;
                nextBall.spinX *= 0.6;
            }
            events.push({ type: 'cushion', x: nextBall.x, y: nextBall.y });
        }
        // Bottom wall
        else if (nextBall.y > environment.height - marginY) {
            nextBall.y = environment.height - marginY;
            nextBall.vy = -nextBall.vy * this.CUSHION_RESTITUTION;

            if (nextBall.spinX) {
                nextBall.vx += nextBall.spinX * this.SPIN_CUSHION_TRANSFER * 15;
                nextBall.spinX *= 0.6;
            }
            events.push({ type: 'cushion', x: nextBall.x, y: nextBall.y });
        }

        // Check obstacle collisions
        if (environment.obstacles) {
            for (let obs of environment.obstacles) {
                if (obs.type === 'circle') {
                    // Circle-Circle collision
                    let dx = nextBall.x - obs.x;
                    let dy = nextBall.y - obs.y;
                    let dist = Math.sqrt(dx * dx + dy * dy);
                    let minDist = nextBall.radius + obs.radius;
                    if (dist < minDist) {
                        // Move ball out of collision
                        let overlap = minDist - dist;
                        let nx = dx / (dist || 1);
                        let ny = dy / (dist || 1);
                        nextBall.x += nx * overlap;

                        // Bounce velocity
                        let kx = nextBall.vx;
                        let ky = nextBall.vy;
                        let normalSpeed = kx * nx + ky * ny;

                        if (normalSpeed < 0) {
                            nextBall.vx = (kx - 2 * normalSpeed * nx) * this.CUSHION_RESTITUTION;
                            nextBall.vy = (ky - 2 * normalSpeed * ny) * this.CUSHION_RESTITUTION;
                            events.push({ type: 'obstacle', x: nextBall.x, y: nextBall.y });
                        }
                    }
                } else if (obs.type === 'rect') {
                    // Rect-Circle collision
                    let rx = Math.max(obs.x, Math.min(nextBall.x, obs.x + obs.w));
                    let ry = Math.max(obs.y, Math.min(nextBall.y, obs.y + obs.h));
                    let dx = nextBall.x - rx;
                    let dy = nextBall.y - ry;
                    let dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < nextBall.radius) {
                        // Collision occurred
                        let overlap = nextBall.radius - dist;
                        let nx = dx / (dist || 1);
                        let ny = dy / (dist || 1);

                        // If center is exactly on border/inside
                        if (dist === 0) {
                            nx = 0;
                            ny = -1;
                            overlap = nextBall.radius;
                        }

                        nextBall.x += nx * overlap;

                        let kx = nextBall.vx;
                        let ky = nextBall.vy;
                        let normalSpeed = kx * nx + ky * ny;

                        if (normalSpeed < 0) {
                            nextBall.vx = (kx - 2 * normalSpeed * nx) * this.CUSHION_RESTITUTION;
                            nextBall.vy = (ky - 2 * normalSpeed * ny) * this.CUSHION_RESTITUTION;
                            events.push({ type: 'obstacle', x: nextBall.x, y: nextBall.y });
                        }
                    }
                }
            }
        }

        // Check target / pocket collisions
        if (environment.pockets) {
            for (let pocket of environment.pockets) {
                let dx = nextBall.x - pocket.x;
                let dy = nextBall.y - pocket.y;
                let dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < pocket.radius) {
                    events.push({ type: 'pocket', pocketId: pocket.id, x: pocket.x, y: pocket.y });
                    nextBall.pocketed = true;
                    nextBall.vx = 0;
                    nextBall.vy = 0;
                    break;
                }
            }
        }

        return { ball: nextBall, events };
    }

    /**
     * Projects a complete trajectory until the ball stops or gets pocketed or max bounces reached.
     * @param {Object} ball Initial ball state
     * @param {Object} environment Environment details
     * @param {number} maxSteps Max simulation steps
     * @returns {Array} List of points (x, y) along trajectory, plus event points
     */
    predictTrajectory(ball, environment, maxSteps = 400) {
        let simulatedBall = { ...ball, pocketed: false };
        let trajectory = [{ x: simulatedBall.x, y: simulatedBall.y, vx: simulatedBall.vx, vy: simulatedBall.vy }];
        let events = [];
        let steps = 0;

        while (steps < maxSteps) {
            let speed = Math.sqrt(simulatedBall.vx * simulatedBall.vx + simulatedBall.vy * simulatedBall.vy);
            // Stop if ball stopped
            if (speed === 0 && simulatedBall.spinY === 0 && simulatedBall.spinX === 0) {
                break;
            }

            let result = this.step(simulatedBall, environment);
            simulatedBall = result.ball;

            trajectory.push({
                x: simulatedBall.x,
                y: simulatedBall.y,
                vx: simulatedBall.vx,
                vy: simulatedBall.vy
            });

            if (result.events.length > 0) {
                events.push(...result.events.map(e => ({ ...e, step: steps })));
            }

            if (simulatedBall.pocketed) {
                break;
            }

            steps++;
        }

        return { trajectory, events, finalState: simulatedBall };
    }
}

// Export for browser usage or Node imports if required
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PhysicsEngine;
} else {
    window.PhysicsEngine = PhysicsEngine;
}
