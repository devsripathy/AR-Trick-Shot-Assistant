import numpy as np
import torch
from torch.utils.data import Dataset, DataLoader

class TrajectoryPhysicsSimulator:
    """
    Mathematical simulator that matches the C# Unity Solver.
    Used to generate thousands of high-fidelity synthetic trick shot trajectories.
    """
    def __init__(self, gravity=-9.81, air_density=1.225, mass=0.62, radius=0.12, drag_coeff=0.47, lift_coeff=1.5, restitution=0.82):
        self.gravity = np.array([0.0, gravity, 0.0])
        self.air_density = air_density
        self.mass = mass
        self.radius = radius
        self.drag_coeff = drag_coeff
        self.lift_coeff = lift_coeff
        self.restitution = restitution
        self.cross_sectional_area = np.pi * (radius ** 2)

    def simulate(self, start_pos, start_vel, spin, target_pos, target_radius=0.25, max_steps=150, dt=0.02):
        pos = np.array(start_pos, dtype=float)
        vel = np.array(start_vel, dtype=float)
        omega = np.array(spin, dtype=float)
        
        min_distance = float('inf')
        bounce_count = 0
        max_bounces = 2
        
        for _ in range(max_steps):
            speed = np.linalg.norm(vel)
            
            # F_gravity = m * g
            f_grav = self.mass * self.gravity
            
            # F_drag = -0.5 * Cd * rho * A * v * v_vec
            f_drag = np.zeros(3)
            if speed > 0.001:
                f_drag = -0.5 * self.drag_coeff * self.air_density * self.cross_sectional_area * speed * vel
            
            # F_magnus = Cl * rho * A * r * (omega x v)
            f_magnus = np.zeros(3)
            if speed > 0.001 and np.linalg.norm(omega) > 0.01:
                f_magnus = self.lift_coeff * self.air_density * self.cross_sectional_area * self.radius * np.cross(omega, vel)
                
            total_force = f_grav + f_drag + f_magnus
            acc = total_force / self.mass
            
            # Euler-Cromer integration
            vel = vel + acc * dt
            pos = pos + vel * dt
            
            # Check simple floor bounce (y = 0 is floor plane)
            if pos[1] < self.radius:
                if bounce_count < max_bounces:
                    pos[1] = self.radius
                    vel[1] = -vel[1] * self.restitution
                    vel[0] *= 0.8  # Friction dampening
                    vel[2] *= 0.8
                    omega *= 0.7  # Spin dampening
                    bounce_count += 1
                else:
                    break
                    
            # Compute distance to target
            dist = np.linalg.norm(pos - target_pos)
            if dist < min_distance:
                min_distance = dist
                
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
            # A simple rule-based correction target for training
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
