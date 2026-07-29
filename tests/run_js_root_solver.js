const PhysicsEngine = require('../physics.js');

function main() {
    const args = process.argv.slice(2);
    if (args.length < 9) {
        console.log("Usage: node run_js_root_solver.js <px> <py> <pz> <vx> <vy> <vz> <sx> <sy> <sz> [maxSteps]");
        process.exit(1);
    }

    const px = parseFloat(args[0]);
    const py = parseFloat(args[1]);
    const pz = parseFloat(args[2]);

    const vx = parseFloat(args[3]);
    const vy = parseFloat(args[4]);
    const vz = parseFloat(args[5]);

    const sx = parseFloat(args[6]);
    const sy = parseFloat(args[7]);
    const sz = parseFloat(args[8]);

    let maxSteps = 150;
    if (args.length >= 10) {
        maxSteps = parseInt(args[9]);
    }

    const engine = new PhysicsEngine();

    // Set constants to align exactly with C# & Python
    engine.GRAVITY_CONSTANT = 1.0; // standard gravity scale
    engine.FRICTION_CONSTANT = 0.4; // match C# surface friction
    engine.REST_THRESHOLD = 0.1;
    engine.CUSHION_RESTITUTION = 0.82; // match restitution

    const ball = {
        x: px,
        y: py,
        vx: vx,
        vy: vy,
        radius: 0.12,
        spinX: sx,
        spinY: sz, // map sz to spinY
        mass: 0.62,
        pocketed: false
    };

    const environment = {
        width: 100000,
        height: 100000,
        friction: 1.0,
        gravity: { x: 0, y: 9.81 }, // downward in root JS coordinates
        pockets: [],
        obstacles: []
    };

    // Run prediction
    const pred = engine.predictTrajectory(ball, environment, maxSteps);
    if (pred.trajectory.length > 0) {
        const finalPt = pred.trajectory[pred.trajectory.length - 1];
        console.log(`${finalPt.x.toFixed(6)} ${finalPt.y.toFixed(6)} 0.000000`);
    } else {
        console.log("ERROR: Path is empty.");
    }
}

main();
