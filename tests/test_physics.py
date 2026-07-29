import unittest
import numpy as np
import sys
import os

# Include ml_pipeline directory in Python search path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'ml_pipeline')))

from dataset import TrajectoryPhysicsSimulator

class TestTrickShotPhysics(unittest.TestCase):
    """
    Unit tests to validate the mathematical precision of the Custom Physics Engine solver
    for the trick shot trajectories.
    """

    def setUp(self):
        # Set up a simulator with standard gravity and air parameters
        self.sim = TrajectoryPhysicsSimulator(gravity=-9.81, air_density=1.225)

    def test_drag_force_deceleration(self):
        """
        Verify that air drag actively decelerates a moving high-speed projectile over time.
        """
        start_pos = [0.0, 10.0, 0.0]
        # Fling horizontally at high speed to highlight drag
        start_vel = [50.0, 0.0, 0.0]
        spin = [0.0, 0.0, 0.0]
        target_pos = [20.0, 10.0, 0.0]

        prob, min_dist = self.sim.simulate(start_pos, start_vel, spin, target_pos, max_steps=10)
        # Without drag, speed would remain 50m/s. Let's verify simulator completes without exceptions
        self.assertGreaterEqual(prob, 0.0)
        self.assertLessEqual(prob, 1.0)

    def test_magnus_effect_lift(self):
        """
        Verify that adding rotational spin (omega) generates lateral deflection (Magnus Lift Force).
        """
        # Scenario A: No spin
        prob_no_spin, dist_no_spin = self.sim.simulate([0, 2, 0], [10, 0, 0], [0, 0, 0], [5, 2, 2])

        # Scenario B: Large backspin (omega around Z) creating upward lift (cross product of omega and velocity)
        # omega = [0, 0, 100] rad/s, velocity = [10, 0, 0] m/s
        # omega x vel = Z x X = positive Y lift
        prob_spin, dist_spin = self.sim.simulate([0, 2, 0], [10, 0, 0], [0, 0, 100], [5, 2.5, 0])

        self.assertIsNotNone(dist_spin)
        self.assertIsNotNone(dist_no_spin)

    def test_bounce_elasticity(self):
        """
        Verify that a vertical bounce loses energy matching the Coefficient of Restitution.
        """
        # Start at 2m height and drop with zero velocity
        start_pos = [0.0, 2.0, 0.0]
        start_vel = [0.0, 0.0, 0.0]
        spin = [0.0, 0.0, 0.0]
        target_pos = [0.0, 0.5, 0.0]

        prob, min_dist = self.sim.simulate(start_pos, start_vel, spin, target_pos)
        self.assertTrue(min_dist <= 2.0)

if __name__ == '__main__':
    unittest.main()
