/**
 * AR Trickshot AI - Preset Scenarios & Trick Shot Challenges
 * Preconfigured layouts of cues, balls, targets, and obstacles.
 */

const PresetScenarios = [
    {
        id: "direct_shot",
        name: "1. The Direct Shot",
        difficulty: "EASY",
        description: "Clear line of sight to the target. Perfect for getting used to aiming and power adjustments.",
        ball: { x: 150, y: 250, vx: 0, vy: 0, radius: 12, spinX: 0, spinY: 0, mass: 1 },
        target: { x: 650, y: 250, radius: 18 },
        obstacles: [],
        environment: {
            width: 800,
            height: 500,
            friction: 1.0,
            gravity: { x: 0, y: 0 },
            pockets: [{ id: "target", x: 650, y: 250, radius: 18 }]
        }
    },
    {
        id: "cushion_kick",
        name: "2. Cushion Kick Bank",
        difficulty: "MEDIUM",
        description: "An obstacle blocks your direct path! Bounce the ball off the cushion to hit the target.",
        ball: { x: 150, y: 150, vx: 0, vy: 0, radius: 12, spinX: 0, spinY: 0, mass: 1 },
        target: { x: 650, y: 150, radius: 18 },
        obstacles: [
            { type: "rect", x: 380, y: 50, w: 40, h: 250, name: "Wall Obstacle" }
        ],
        environment: {
            width: 800,
            height: 500,
            friction: 1.0,
            gravity: { x: 0, y: 0 },
            pockets: [{ id: "target", x: 650, y: 150, radius: 18 }]
        }
    },
    {
        id: "double_bank",
        name: "3. Double Bank Trick Shot",
        difficulty: "HARD",
        description: "Use multiple wall reflections to bypass double security pillars and reach the pocket.",
        ball: { x: 150, y: 350, vx: 0, vy: 0, radius: 12, spinX: 0, spinY: 0, mass: 1 },
        target: { x: 650, y: 350, radius: 18 },
        obstacles: [
            { type: "circle", x: 300, y: 350, radius: 45, name: "Pillar A" },
            { type: "circle", x: 500, y: 150, radius: 45, name: "Pillar B" }
        ],
        environment: {
            width: 800,
            height: 500,
            friction: 1.0,
            gravity: { x: 0, y: 0 },
            pockets: [{ id: "target", x: 650, y: 350, radius: 18 }]
        }
    },
    {
        id: "infinite_mage",
        name: "4. The Magic Infinite Mage",
        difficulty: "MAGIC",
        description: "Channel the ultimate Mage calculation. Complete a narrow 3+ bounce path through a gate of spinning obstacles.",
        ball: { x: 100, y: 100, vx: 0, vy: 0, radius: 12, spinX: 0, spinY: 0, mass: 1 },
        target: { x: 700, y: 400, radius: 18 },
        obstacles: [
            { type: "rect", x: 0, y: 220, w: 280, h: 40 },
            { type: "rect", x: 420, y: 220, w: 380, h: 40 },
            { type: "circle", x: 350, y: 120, radius: 30 },
            { type: "circle", x: 350, y: 380, radius: 30 }
        ],
        environment: {
            width: 800,
            height: 500,
            friction: 0.8, // lower friction for sliding magic look
            gravity: { x: 0, y: 0 },
            pockets: [{ id: "target", x: 700, y: 400, radius: 18 }]
        }
    },
    {
        id: "gravity_well",
        name: "5. Gravity Well Curve",
        difficulty: "MEDIUM",
        description: "Warning: Heavy planetary pull. The trajectory curves dynamically under strong downward gravity.",
        ball: { x: 100, y: 150, vx: 0, vy: 0, radius: 12, spinX: 0, spinY: 0, mass: 1 },
        target: { x: 700, y: 300, radius: 18 },
        obstacles: [
            { type: "rect", x: 350, y: 180, w: 100, h: 140, name: "Black Box" }
        ],
        environment: {
            width: 800,
            height: 500,
            friction: 1.0,
            gravity: { x: 0.0, y: 0.6 }, // positive gravity pulls downwards
            pockets: [{ id: "target", x: 700, y: 300, radius: 18 }]
        }
    },
    {
        id: "english_curve",
        name: "6. English Spin Deflection",
        difficulty: "HARD",
        description: "Apply side-spin (English) to create unexpected angles off the cushions to curve behind the wall.",
        ball: { x: 150, y: 400, vx: 0, vy: 0, radius: 12, spinX: 1.8, spinY: 0, mass: 1 }, // initial right spin
        target: { x: 650, y: 120, radius: 18 },
        obstacles: [
            { type: "rect", x: 320, y: 150, w: 160, h: 350 }
        ],
        environment: {
            width: 800,
            height: 500,
            friction: 0.9,
            gravity: { x: 0, y: 0 },
            pockets: [{ id: "target", x: 650, y: 120, radius: 18 }]
        }
    }
];

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PresetScenarios;
} else {
    window.PresetScenarios = PresetScenarios;
}
