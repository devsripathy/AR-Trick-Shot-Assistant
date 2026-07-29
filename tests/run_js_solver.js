const JSPhysicsSolver = require('../dashboard/public/physics.js');

function main() {
    const args = process.argv.slice(2);
    if (args.length < 9) {
        console.log("Usage: node run_js_solver.js <px> <py> <pz> <vx> <vy> <vz> <sx> <sy> <sz>");
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

    const solver = new JSPhysicsSolver();

    // Set constants to align exactly with C# & Python
    solver.mass = 0.62;
    solver.radius = 12; // 12cm = 0.12m
    solver.dragCoeff = 0.47;
    solver.liftCoeff = 1.5;
    solver.restitution = 0.82;
    solver.surfaceFriction = 0.4;
    solver.gravity = { x: 0, y: -9.81, z: 0 };
    solver.airDensity = 1.225;
    solver.timeStep = 0.02;
    solver.maxSteps = 150;
    solver.subSteps = 5;

    // In JS dashboard physics solver, the coordinates are scaled for canvas:
    // nextPos.y is mapped to (groundY - radius) = (440 - 12) = 428 on impact.
    // Let's run a test. We map physics coordinates.
    // Start position in C# is (0, 1.5, 0).
    // In JS dashboard, the start pos is scaled. But we can execute standard physical solving equations.
    // Let's run solve:
    const startPos = { x: px, y: py, z: pz };
    const startVel = { x: vx, y: vy, z: vz };
    const spin = { x: sx, y: sy, z: sz };

    const points = solver.solve(startPos, startVel, spin, []);
    if (points.length > 0) {
        const finalPt = points[points.length - 1];
        // Coordinates in JS solve are: pos {x, y, z}.
        // Let's print final pos
        console.log(`${finalPt.pos.x.toFixed(6)} ${finalPt.pos.y.toFixed(6)} ${finalPt.pos.z.toFixed(6)}`);
    } else {
        console.log("ERROR: Path is empty.");
    }
}

main();
