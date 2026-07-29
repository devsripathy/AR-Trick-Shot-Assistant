/**
 * AR Trickshot AI - Artificial Intelligence Optimization Engine
 * Calculates, ranks, and filters paths for complex bank shots in real time.
 */

class AIOptimizer {
    constructor(physicsEngine) {
        this.physics = physicsEngine;
    }

    /**
     * Sweeps angles and forces to find optimal trajectories to strike a target / enter a pocket.
     * @param {Object} startBall Start ball parameters (x, y, radius, spinX, spinY, mass)
     * @param {Object} environment Current level environment
     * @param {Object} targetPosition Target coordinates (x, y, radius)
     * @returns {Object} { optimalPath, bestAlternativePaths, difficultyScore, successProbability }
     */
    findBestShots(startBall, environment, targetPosition) {
        const angleSteps = 360; // 360 angles of sweep
        const forceSteps = 8; // 8 force gradations (e.g., from 4 to 18)
        const candidates = [];

        // Check if there are pockets or a target specified
        const targetX = targetPosition.x;
        const targetY = targetPosition.y;
        const targetRadius = targetPosition.radius || 15;

        for (let a = 0; a < angleSteps; a++) {
            // angle in radians
            let rad = (a * Math.PI) / 180;
            for (let f = 0; f < forceSteps; f++) {
                // scale force from 4 to 20
                let force = 4 + (f * 2);

                let testBall = {
                    ...startBall,
                    vx: Math.cos(rad) * force,
                    vy: Math.sin(rad) * force,
                    pocketed: false
                };

                // Run trajectory prediction
                let result = this.physics.predictTrajectory(testBall, environment, 350);

                // Calculate score
                let scoreInfo = this.scoreTrajectory(result, targetX, targetY, targetRadius, force);

                candidates.push({
                    angle: a,
                    force: force,
                    score: scoreInfo.score,
                    minDist: scoreInfo.minDist,
                    bounces: scoreInfo.bounces,
                    pocketed: scoreInfo.pocketed,
                    trajectory: result.trajectory,
                    events: result.events
                });
            }
        }

        // Sort candidates by score descending
        candidates.sort((a, b) => b.score - a.score);

        // Filter alternatives to avoid showing highly overlapping paths
        const bestAlternativePaths = [];
        const seenAngles = new Set();

        let optimalPath = candidates[0];

        if (optimalPath) {
            seenAngles.add(Math.round(optimalPath.angle / 15)); // block angle segment

            for (let i = 1; i < candidates.length; i++) {
                let candidate = candidates[i];
                let angleSeg = Math.round(candidate.angle / 15);

                // Keep candidate if it's reasonably distinct and has a good score
                if (!seenAngles.has(angleSeg) && candidate.score > 20) {
                    bestAlternativePaths.push(candidate);
                    seenAngles.add(angleSeg);
                    if (bestAlternativePaths.length >= 3) break; // max 3 alternatives
                }
            }
        }

        // Calculate difficulty and probability based on hit sensitivity/tolerance
        let difficultyInfo = this.calculateDifficulty(startBall, environment, targetPosition, optimalPath);

        return {
            optimalPath: optimalPath || null,
            alternatives: bestAlternativePaths,
            difficulty: difficultyInfo.difficulty, // "EASY", "MEDIUM", "HARD", "MAGIC"
            difficultyScore: difficultyInfo.score, // 0 - 100
            successProbability: difficultyInfo.probability // 0 - 100%
        };
    }

    /**
     * Scores a trajectory based on closeness to target, velocity at target, and bounce complexity.
     */
    scoreTrajectory(prediction, targetX, targetY, targetRadius, initialForce) {
        let minDist = Infinity;
        let isPocketed = false;
        let pocketedIndex = -1;

        // Trace trajectory path
        for (let i = 0; i < prediction.trajectory.length; i++) {
            let pt = prediction.trajectory[i];
            let dx = pt.x - targetX;
            let dy = pt.y - targetY;
            let dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < minDist) {
                minDist = dist;
            }

            // Check if it got hit/pocketed
            if (dist <= targetRadius) {
                isPocketed = true;
                pocketedIndex = i;
                break;
            }
        }

        // Count cushion/obstacle bounces
        let bounces = prediction.events.filter(e => e.type === 'cushion' || e.type === 'obstacle').length;

        // Base scoring logic
        let score = 0;

        if (isPocketed) {
            // Excellent! Large base score
            score += 1000;

            // Prefer fewer steps (faster arrival)
            score += (400 - pocketedIndex) * 0.5;

            // Extra flair/complexity reward: cushion bounces add to the score!
            // Trick shots are cooler with more bounces
            score += bounces * 150;

            // Moderate force is ideal
            score -= Math.abs(initialForce - 10) * 5;
        } else {
            // If missed, score is purely based on how close it got
            score += Math.max(0, 500 - minDist * 1.5);
            // Deduct slightly for too many bounces if missed
            score -= bounces * 10;
        }

        return {
            score: Math.max(0, score),
            minDist,
            bounces,
            pocketed: isPocketed
        };
    }

    /**
     * Evaluates success probability & difficulty of the optimal shot.
     * High sensitivity (small angular variations miss the pocket) leads to High Difficulty.
     */
    calculateDifficulty(startBall, environment, targetPosition, optimalPath) {
        if (!optimalPath || optimalPath.score < 800) {
            return { difficulty: "IMPOSSIBLE", score: 100, probability: 0 };
        }

        const targetX = targetPosition.x;
        const targetY = targetPosition.y;
        const targetRadius = targetPosition.radius || 15;

        // Perform sensitivity analysis by slightly pertubing the optimal angle
        const testAngles = [-1.5, -0.75, 0.75, 1.5]; // degree deviations
        let hits = 0;

        for (let dev of testAngles) {
            let rad = ((optimalPath.angle + dev) * Math.PI) / 180;
            let testBall = {
                ...startBall,
                vx: Math.cos(rad) * optimalPath.force,
                vy: Math.sin(rad) * optimalPath.force,
                pocketed: false
            };

            let res = this.physics.predictTrajectory(testBall, environment, 350);
            let hitTarget = false;

            for (let pt of res.trajectory) {
                let dx = pt.x - targetX;
                let dy = pt.y - targetY;
                let dist = Math.sqrt(dx * dx + dy * dy);
                if (dist <= targetRadius) {
                    hitTarget = true;
                    break;
                }
            }
            if (hitTarget) hits++;
        }

        // Probability calculated as fraction of successful hits
        let probability = Math.round((hits / testAngles.length) * 100);
        if (probability < 10) probability = 10; // always minimum 10% chance if optimal path works perfectly

        let bounces = optimalPath.bounces;
        let score = 0;

        // Calculate difficulty based on bounces and probability tolerance
        if (bounces >= 3) {
            score = 90 - (probability * 0.4);
        } else if (bounces === 2) {
            score = 70 - (probability * 0.3);
        } else if (bounces === 1) {
            score = 45 - (probability * 0.2);
        } else {
            score = 25 - (probability * 0.1);
        }

        score = Math.max(5, Math.min(99, Math.round(score)));

        let difficulty = "EASY";
        if (score > 80) {
            difficulty = "MAGIC";
        } else if (score > 60) {
            difficulty = "HARD";
        } else if (score > 35) {
            difficulty = "MEDIUM";
        }

        return {
            difficulty,
            score,
            probability
        };
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AIOptimizer };
} else {
    window.AIOptimizer = AIOptimizer;
}
