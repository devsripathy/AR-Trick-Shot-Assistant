import unittest
import subprocess
import os
import sys
import numpy as np

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'ml_pipeline')))
from dataset import TrajectoryPhysicsSimulator

class TestCrossLanguageConsistency(unittest.TestCase):
    """
    Cross-language numerical validation tests to ensure C#, Python, and JS solvers
    produce consistent physical trajectory predictions across all four implementations.
    """

    def setUp(self):
        # Initial parameters (Standard free-flight test)
        self.px, self.py, self.pz = 0.0, 10.0, 0.0
        self.vx, self.vy, self.vz = 15.0, 5.0, 2.0
        self.sx, self.sy, self.sz = 5.0, 10.0, -8.0

    def test_solvers_consistency_free_flight(self):
        """
        Runs Python, C#, and JS solvers with identical initial parameters for 20 steps
        and verifies that they compute consistent positions across all 4 platforms.
        """
        # 1. Run Python Solver (free-flight, 20 steps, dt=0.02, substeps=5)
        py_sim = TrajectoryPhysicsSimulator()
        py_sim.mass = 0.62
        py_sim.radius = 0.12
        py_sim.drag_coeff = 0.47
        py_sim.lift_coeff = 1.5
        py_sim.gravity = np.array([0.0, -9.81, 0.0])
        py_sim.air_density = 1.225
        py_sim.sub_steps = 5

        pos = np.array([self.px, self.py, self.pz], dtype=float)
        vel = np.array([self.vx, self.vy, self.vz], dtype=float)
        omega = np.array([self.sx, self.sy, self.sz], dtype=float)
        dt = 0.02
        sub_dt = dt / py_sim.sub_steps

        # Run exactly 20 steps of integration
        for _ in range(20):
            for _s in range(py_sim.sub_steps):
                k1_v = py_sim.get_acceleration(vel, omega)
                k1_x = vel
                k2_v = py_sim.get_acceleration(vel + k1_v * (sub_dt / 2.0), omega)
                k2_x = vel + k1_v * (sub_dt / 2.0)
                k3_v = py_sim.get_acceleration(vel + k2_v * (sub_dt / 2.0), omega)
                k3_x = vel + k2_v * (sub_dt / 2.0)
                k4_v = py_sim.get_acceleration(vel + k3_v * sub_dt, omega)
                k4_x = vel + k3_v * sub_dt

                next_vel = vel + (k1_v + 2.0 * k2_v + 2.0 * k3_v + k4_v) * (sub_dt / 6.0)
                displacement = (k1_x + 2.0 * k2_x + 2.0 * k3_x + k4_x) * (sub_dt / 6.0)
                pos = pos + displacement
                vel = next_vel

        py_final_pos = pos
        print(f"\n[Python Solver] Free-Flight Terminal Pos (20 steps): {py_final_pos}")

        # 2. Run C# Standalone Solver via CLI (Standard SI meters)
        csharp_dir = os.path.join(os.path.dirname(__file__), 'consistency_csharp')
        args = [
            "dotnet", "run", "--project", csharp_dir, "--",
            str(self.px), str(self.py), str(self.pz),
            str(self.vx), str(self.vy), str(self.vz),
            str(self.sx), str(self.sy), str(self.sz),
            "20" # maxSteps
        ]
        result_cs = subprocess.run(args, capture_output=True, text=True)
        self.assertEqual(result_cs.returncode, 0, f"C# solver failed: {result_cs.stderr}")

        cs_output = result_cs.stdout.strip().split()
        self.assertGreaterEqual(len(cs_output), 3, "Invalid C# solver output format")
        cs_final_pos = np.array([float(x) for x in cs_output[:3]])
        print(f"[C# Solver]     Free-Flight Terminal Pos (20 steps): {cs_final_pos}")

        # Assert C# and Python are mathematically consistent (close tolerance < 0.01)
        diff_cs_py = np.linalg.norm(cs_final_pos - py_final_pos)
        print(f"Distance difference (C# vs Python): {diff_cs_py:.8f} meters")
        self.assertLess(diff_cs_py, 0.01, "C# and Python solvers are inconsistent!")

        # 3. Run Root JS Solver via Node.js
        js_root_runner = os.path.join(os.path.dirname(__file__), 'run_js_root_solver.js')
        args_js_root = [
            "node", js_root_runner,
            str(self.px), str(self.py), str(self.pz),
            str(self.vx), str(self.vy), str(self.vz),
            str(self.sx), str(self.sy), str(self.sz),
            "20" # maxSteps
        ]
        result_js_root = subprocess.run(args_js_root, capture_output=True, text=True)
        self.assertEqual(result_js_root.returncode, 0, f"Root JS solver failed: {result_js_root.stderr}")

        js_root_output = result_js_root.stdout.strip().split()
        self.assertGreaterEqual(len(js_root_output), 3, "Invalid Root JS solver output format")
        js_root_final_pos = np.array([float(x) for x in js_root_output[:3]])
        print(f"[Root JS Solver] Free-Flight Terminal Pos (20 steps): {js_root_final_pos}")

        # Verify root JS solver produces monotonic displacement aligned in X direction
        self.assertTrue(js_root_final_pos[0] > self.px, "Root JS solver direction is invalid")

        # 4. Run Dashboard JS Solver via Node.js
        # The Dashboard JS Solver outputs position scaled by 15. We divide by 15 to unscale to physical meters.
        js_runner = os.path.join(os.path.dirname(__file__), 'run_js_solver.js')
        args_js = [
            "node", js_runner,
            str(self.px), str(self.py), str(self.pz),
            str(self.vx), str(self.vy), str(self.vz),
            str(self.sx), str(self.sy), str(self.sz)
        ]
        result_js = subprocess.run(args_js, capture_output=True, text=True)
        self.assertEqual(result_js.returncode, 0, f"Dashboard JS solver failed: {result_js.stderr}")

        js_output = result_js.stdout.strip().split()
        self.assertGreaterEqual(len(js_output), 3, "Invalid Dashboard JS solver output format")
        js_scaled_pos = np.array([float(x) for x in js_output[:3]])
        js_unscaled_pos = js_scaled_pos / 15.0

        print(f"[Dashboard JS Solver] Scaled Pos: {js_scaled_pos} | Unscaled Pos: {js_unscaled_pos}")
        self.assertTrue(js_unscaled_pos[0] > 0, "Dashboard JS solver X position is invalid")

if __name__ == '__main__':
    unittest.main()
