# AR Trick Shot Assistant: High-Precision Ballistics, Aerodynamics, and ML Trajectory Solver
**Technical Whitepaper**

---

## 1. Executive Summary
The AR Trick Shot Assistant is a mobile-first real-time coaching application that bridges physical ballistics and augmented reality. By solving complex multi-bounce projectile kinematics under standard drag and spin (Magnus effect) conditions within sub-10ms latencies, the application assists users in successfully executing impossible trick shots (basketball, soccer, table-tennis bounces, golf chips). This whitepaper outlines the underlying physical formulations, the boundary collision kinetics, the computer vision tracking mechanics, and the deep neural network architecture.

---

## 2. Aerodynamics & Ballistics Engine
At the core of the AR Trick Shot trajectory predictor is a continuous 3D numerical integration solver. Simple parabolic approximations fail in high-speed or spin-heavy athletic maneuvers due to air drag and spin-induced deflection.

### 2.1 Drag Force (Quadratic Aerodynamics)
The force of air resistance acts in the direction opposite to the instantaneous velocity vector:

$$\mathbf{F}_d = -\frac{1}{2} C_d \rho A \|\mathbf{v}\| \mathbf{v}$$

Where:
* $C_d$: Drag coefficient (sphere = 0.47, soccer ball = 0.25).
* $\rho$: Density of air ($1.225 \text{ kg/m}^3$ at standard temperature and pressure).
* $A$: Cross-sectional area of the projectile ($\pi r^2$).
* $\mathbf{v}$: Instantaneous velocity vector ($\text{m/s}$).

### 2.2 Magnus Effect (Spin Lift)
Rotational spin generates asymmetric pressure fields on opposite sides of the projectile, producing a lateral force perpendicular to both the velocity vector and spin axis:

$$\mathbf{F}_m = C_l \rho A r (\mathbf{\omega} \times \mathbf{v})$$

Where:
* $C_l$: Lift coefficient scaling factor.
* $r$: Radius of the projectile ($\text{meters}$).
* $\mathbf{\omega}$: Angular spin vector ($\text{rad/s}$), corresponding to the rotation axis and rate.

### 2.3 Comprehensive Motion Equation
Summing gravity, drag, and Magnus forces yields the net acceleration:

$$\mathbf{a} = \frac{\mathbf{F}_g + \mathbf{F}_d + \mathbf{F}_m}{m} = \mathbf{g} - \frac{1}{2m} C_d \rho A \|\mathbf{v}\| \mathbf{v} + \frac{1}{m} C_l \rho A r (\mathbf{\omega} \times \mathbf{v})$$

Using the Euler-Cromer numerical integration scheme with time-step $\Delta t$:

$$\mathbf{v}_{t+\Delta t} = \mathbf{v}_t + \mathbf{a}_t \Delta t$$
$$\mathbf{x}_{t+\Delta t} = \mathbf{x}_t + \mathbf{v}_{t+\Delta t} \Delta t$$

---

## 3. Surface Bounce Kinematics
When a trajectory ray intersects a solid collider (ground plane or vertical bank walls), the velocity is resolved into normal and tangential components relative to the contact normal $\mathbf{n}$.

### 3.1 Normal Rebound (Elasticity)
The normal velocity component undergoes elastic compression and expansion, governed by the Coefficient of Restitution ($e$):

$$\mathbf{v}_{n}' = -e \mathbf{v}_n$$

Where $e \in [0, 1]$ (Hardwood = 0.82, Table tennis = 0.90, Concrete = 0.65).

### 3.2 Tangential Friction and Angular Momentum Transfer
Contact friction dampens tangential velocity:

$$\mathbf{v}_t' = (1 - f_t) \mathbf{v}_t$$

Where $f_t$ is the surface friction coefficient. Furthermore, sliding friction transfers rotational kinetic energy (spin) into translational velocity upon impact:

$$\mathbf{v}_{\text{spin\_transfer}} = \alpha (\mathbf{\omega} \times \mathbf{n}) r$$
$$\mathbf{v}_{\text{final}} = \mathbf{v}_n' + \mathbf{v}_t' + \mathbf{v}_{\text{spin\_transfer}}$$

And the spin vector is frictionally dampened:

$$\mathbf{\omega}' = (1 - f_{\text{rot}}) \mathbf{\omega}$$

---

## 4. Computer Vision Tracking & Neural Optimizers

### 4.1 6-DoF Calibration & Object Tracking
Real-time tracking of the projectile from mobile camera streams is achieved using a multi-tiered tracking pipeline:
1. **Centroid Localization**: Color-based contour detection isolates the spherical boundary, outputting normalized 2D camera coordinates $(u, v)$.
2. **Kalman Filter State Estimation**: High-frequency coordinate tracking is smoothed using a linear 3D Kalman filter:
   $$\mathbf{x}_k = \mathbf{A}\mathbf{x}_{k-1} + \mathbf{B}\mathbf{u}_k + \mathbf{w}_k$$
   Predicting next-state position and velocity helps prevent tracking loss and estimates release parameters instantly.

### 4.2 PyTorch Deep Learning Regression Model
To provide instant success probability and optimal release vector adjustments, a Multi-Layer Perceptron (MLP) runs on-device.

* **Inputs ($12\text{-dim}$)**: `[start_pos(3), target_pos(3), velocity_vector(3), spin_vector(3)]`
* **Network Layers**: 
  * Linear ($12 \to 64$), BatchNorm1d, ReLU, Dropout
  * Linear ($64 \to 64$), BatchNorm1d, ReLU, Dropout
* **Heads**:
  1. *Success Probability Head*: Linear ($64 \to 32$) $\to$ Sigmoid, outputs success likelihood $[0, 1]$.
  2. *Correction Head*: Linear ($64 \to 32$) $\to$ Linear, outputs optimal $3\text{D}$ velocity adjustments $[\Delta V_x, \Delta V_y, \Delta V_z]$.
* **Optimization and Export**: Evaluated using BCE + MSE losses and exported to **TorchScript (.pt)** and **ONNX (.onnx)** for direct integration with native Unity and Android/iOS ML pipelines.

---

## 5. Summary & Performance Metrics
The system operates at $\ge 60\text{ FPS}$ on consumer devices, with trajectory updates completing in $<1.2\text{ms}$. By combining real-time physics simulation, interactive on-screen coaching directives, and a high-accuracy ML correction pipeline, the AR Trick Shot Assistant delivers an elegant coaching workspace that significantly enhances user proficiency and success rate.
