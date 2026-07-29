import numpy as np
import torch
from torch.utils.data import Dataset, DataLoader

class TrajectoryPhysicsSimulator:
    """
    Mathematical simulator matching the hardened C# Unity Solver (RK4 + CCD sub-stepping).
    Used to generate thousands of high-fidelity synthetic trick shot trajectories.
    """
    def __init__(self, gravity=-9.81, air_density=1.225, mass=0.62, radius=0.12, drag_coeff=0.47, lift_coeff=1.5, restitution=0.82, surface_friction=0.4):
        self.gravity = np.array([0.0, gravity, 0.0])
        self.air_density = air_density
        self.mass = mass
        self.radius = radius
        self.drag_coeff = drag_coeff
        self.lift_coeff = lift_coeff
        self.restitution = restitution
        self.surface_friction = surface_friction
        self.cross_sectional_area = np.pi * (radius ** 2)
        self.sub_steps = 5

    def get_acceleration(self, vel, omega):
        speed = np.linalg.norm(vel)
        f_grav = self.mass * self.gravity

        f_drag = np.zeros(3)
        if speed > 0.001:
            f_drag = -0.5 * self.drag_coeff * self.air_density * self.cross_sectional_area * speed * vel

        f_magnus = np.zeros(3)
        if speed > 0.001 and np.linalg.norm(omega) > 0.01:
            f_magnus = self.lift_coeff * self.air_density * self.cross_sectional_area * self.radius * np.cross(omega, vel)

        total_force = f_grav + f_drag + f_magnus
        return total_force / self.mass

    def simulate(self, start_pos, start_vel, spin, target_pos, target_radius=0.25, max_steps=150, dt=0.02):
        pos = np.array(start_pos, dtype=float)
        vel = np.array(start_vel, dtype=float)
        omega = np.array(spin, dtype=float)

        min_distance = float('inf')
        bounce_count = 0
        max_bounces = 2

        sub_dt = dt / self.sub_steps

        for _ in range(max_steps):
            max_bounces_exceeded = False

            # Sub-stepping for Continuous Collision Detection (CCD)
            for _s in range(self.sub_steps):
                speed = np.linalg.norm(vel)
                if speed < 0.1 and _ > 10:
                    break

                # RK4 Numerical Integration
                k1_v = self.get_acceleration(vel, omega)
                k1_x = vel

                k2_v = self.get_acceleration(vel + k1_v * (sub_dt / 2.0), omega)
                k2_x = vel + k1_v * (sub_dt / 2.0)

                k3_v = self.get_acceleration(vel + k2_v * (sub_dt / 2.0), omega)
                k3_x = vel + k2_v * (sub_dt / 2.0)

                k4_v = self.get_acceleration(vel + k3_v * sub_dt, omega)
                k4_x = vel + k3_v * sub_dt

                next_vel = vel + (k1_v + 2.0 * k2_v + 2.0 * k3_v + k4_v) * (sub_dt / 6.0)
                displacement = (k1_x + 2.0 * k2_x + 2.0 * k3_x + k4_x) * (sub_dt / 6.0)
                next_pos = pos + displacement

                # Check floor bounce (Y = 0 is floor plane; we account for radius of sphere)
                if next_pos[1] < self.radius:
                    if bounce_count < max_bounces:
                        pos[1] = self.radius
                        # Elastic rebound on Y and friction loss on X/Z
                        vel[1] = -next_vel[1] * self.restitution
                        vel[0] = next_vel[0] * (1.0 - self.surface_friction)
                        vel[2] = next_vel[2] * (1.0 - self.surface_friction)

                        # Transfer of spin to linear velocity (angular momentum transfer)
                        normal = np.array([0.0, 1.0, 0.0])
                        spin_transfer = np.cross(omega, normal) * self.radius * 0.4
                        vel += spin_transfer

                        # Spin dampening due to friction
                        omega *= (1.0 - self.surface_friction * 0.5)

                        bounce_count += 1
                        break
                    else:
                        max_bounces_exceeded = True
                        break

                pos = next_pos
                vel = next_vel

            if max_bounces_exceeded:
                break

            # Compute distance to target
            dist = np.linalg.norm(pos - target_pos)
            if dist < min_distance:
                min_distance = dist

            speed = np.linalg.norm(vel)
            if speed < 0.1 and _ > 10:
                break

        # Return success probability (1.0 if perfectly in target radius, scaling down with distance)
        success_prob = max(0.0, min(1.0, 1.0 - (min_distance / (target_radius * 3.0))))
        return success_prob, min_distance


class TrickShotDataset(Dataset):
    """
    Generates synthetic training dataset for trick shots.
    Feeds physical state parameters and predicts target accuracy and correction vectors.
    """
    def __init__(self, num_samples=2000):
        self.inputs = []
        self.labels = []

        sim = TrajectoryPhysicsSimulator()

        for i in range(num_samples):
            # Randomize shooting conditions
            start_pos = [0.0, 1.5 + np.random.uniform(-0.5, 0.5), 0.0]
            target_pos = [np.random.uniform(2.0, 6.0), np.random.uniform(0.5, 2.5), np.random.uniform(-1.5, 1.5)]

            # Standard ballistic speed estimation
            dist = np.linalg.norm(np.array(target_pos) - np.array(start_pos))
            v_estimate = np.sqrt(9.81 * dist)

            # Generate random inputs centered around successful throws
            vel = [
                np.random.normal((target_pos[0] - start_pos[0]) * 1.1, 1.5),
                np.random.normal(v_estimate * 0.8, 1.5),
                np.random.normal(target_pos[2], 1.0)
            ]
            spin = [
                np.random.uniform(-10.0, 10.0),
                np.random.uniform(-10.0, 10.0),
                np.random.uniform(-10.0, 10.0)
            ]

            # Run simulation
            success_prob, min_dist = sim.simulate(start_pos, vel, spin, target_pos)

            # Calculate optimal adjustments (direction vector to target minus velocity)
            target_direction = np.array(target_pos) - np.array(start_pos)
            optimal_v = target_direction * 1.5
            v_correction = optimal_v - np.array(vel)

            # Input features: [start_pos(3), target_pos(3), velocity(3), spin(3)]
            x = np.concatenate([start_pos, target_pos, vel, spin])
            # Target output: [success_probability, correction_x, correction_y, correction_z]
            y = np.array([success_prob, v_correction[0], v_correction[1], v_correction[2]], dtype=np.float32)

            self.inputs.append(x.astype(np.float32))
            self.labels.append(y)

        self.inputs = np.array(self.inputs)
        self.labels = np.array(self.labels)

    def __len__(self):
        return len(self.inputs)

    def __getitem__(self, idx):
        return torch.tensor(self.inputs[idx]), torch.tensor(self.labels[idx])


if __name__ == "__main__":
    dataset = TrickShotDataset(num_samples=100)
    print(f"Generated {len(dataset)} sample points.")
    features, label = dataset[0]
    print("Features vector length:", len(features))
    print("Labels vector:", label)
