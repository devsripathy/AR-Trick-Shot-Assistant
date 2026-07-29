<div align="center">

# 🚀 𝔸ℝ 𝕋ℝ𝕀ℂ𝕂𝕊ℍ𝕆𝕋 𝔸𝕀

### *"Magic isn't breaking the laws of physics. It's understanding them so well that everyone else thinks you did."*

<img src="https://i.imgur.com/placeholder-ar-hud.gif" alt="AR Trickshot Demo" width="80%">

```
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║   What if mathematics could feel like magic?                      ║
║                                                                   ║
║   This is an experiment to answer one question:                   ║
║                                                                   ║
║   Can an AI calculate the perfect trick shot faster              ║
║   than a human can imagine it?                                    ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
```

[![Python](https://img.shields.io/badge/Python-3.11+-magenta?style=for-the-badge&logo=python&logoColor=white&labelColor=black)](https://www.python.org/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.0+-red?style=for-the-badge&logo=pytorch&logoColor=white&labelColor=black)](https://pytorch.org/)
[![Unity](https://img.shields.io/badge/Unity-2022.3+-silver?style=for-the-badge&logo=unity&logoColor=white&labelColor=black)](https://unity.com/)
[![AR Foundation](https://img.shields.io/badge/AR%20Foundation-5.0+-cyan?style=for-the-badge&logo=googlear&logoColor=white&labelColor=black)](https://unity.com/unity/features/arfoundation)
[![OpenCV](https://img.shields.io/badge/OpenCV-4.8+-green?style=for-the-badge&logo=opencv&logoColor=white&labelColor=black)](https://opencv.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-gold?style=for-the-badge&logo=opensourceinitiative&logoColor=white&labelColor=black)](https://opensource.org/licenses/MIT)

</div>

---

## 🌟 Current Status

AR Trickshot AI features a cohesive set of tools for physics simulation, tracking, and deep learning across multiple platforms:
1. **Working 2D Cyberpunk Trajectory Simulator (Web):** Fully functional, web-based companion HUD with real-time vector inputs, customizable physics coefficients (mass, friction, drag, spin, gravity), preset scenarios, and a built-in computer vision (CV) color-based webcam tracker.
2. **Solid 3D Ballistic + Magnus Solver (C# / Unity):** Multi-bounce high-precision trajectory solver implementing air resistance, gravity, Magnus lift forces, and collision mechanics.
3. **Starter PyTorch Dual-Head Coaching Network + ONNX Export:** Machine learning pipeline including dataset generator, trainer, and ONNX conversion script to predict success probability and recommended trajectory adjustments.
4. **Runnable Unity AR Scaffolding:** A functional Unity 2022.3 project equipped with AR Foundation dependencies, AR physics solver integration, 3D line rendering, and simulated editor-mode operation.

---

## 🕹️ Quick Start: How to Run

### 1. Web Dashboard & Interactive Simulator
The web dashboard provides an interactive, client-side visual simulation with the 3D-aligned physical solver, real-time telemetry, and optional MediaPipe Hands color-based tracking overlay.

**To run the Dashboard locally:**
```bash
# Navigate to the dashboard directory
cd dashboard

# Install necessary server dependencies (Express)
npm install

# Start the local companion node server
npm start
```
*Once running, navigate to **http://localhost:3000** in your web browser to play, interact, and throw balls.*

---

### 2. Unity 2022.3 Project (Simulation & AR Deployment)
A fully wired AR scene scaffolding that integrates our C# physical solvers, trajectory rendering pipelines, and camera-telemetry tracking filters.

**To run in the Unity Editor:**
1. Open **Unity Hub** and select **Add** -> **Add project from disk**. Select the `UnityProject` directory.
2. Ensure you are using **Unity 2022.3 LTS** (e.g., `2022.3.20f1`).
3. Open `Assets/Scenes/ARTrickShotScene.unity` (or configure a scene with `ARTrickShotManager` coordinating system component scripts).
4. Assign target anchors (such as a target Transform representing the hoop/cup) and start release anchors.
5. Press **Play** in the Unity Editor.
6. Press the **Space** key to trigger a simulated ball release. The Editor will dynamically execute the 3D ballistic solver, render the glowing landing path, and log real-time precision telemetry onto the coaching HUD.

---

## 🌟 Where This Idea Came From

This project started because of **one scene** in the novel *Infinite Mage*.
*Infinite Mage* explores how incredible calculation speeds can look like pure magic to outside observers. Underneath, it is just mathematics and physics!

Can we calculate a trickshot's perfect path instantly and project it using augmented reality?

---

## 🎯 Project Goal

Humans simple estimate projectile paths from experience. My idea is to let AI calculate those trajectories continuously and guide us in real time.

---

## 🔢 The Math Behind It

At its core, this project uses a 3D ballistic numerical integrator with Magnus lift force and quadratic drag:

$$\mathbf{F}_{\text{net}} = \mathbf{F}_{\text{gravity}} + \mathbf{F}_{\text{drag}} + \mathbf{F}_{\text{magnus}}$$

Where:
- **Gravity:** $\mathbf{F}_{\text{gravity}} = m \mathbf{g}$
- **Quadratic Drag:** $\mathbf{F}_{\text{drag}} = -\frac{1}{2} C_d \rho A v \mathbf{v}$
- **Magnus Lift Force:** $\mathbf{F}_{\text{magnus}} = C_l \rho A r (\boldsymbol{\omega} \times \mathbf{v})$

A Runge-Kutta 4th Order (RK4) integrator is employed to compute highly stable trajectories even under extreme release speeds, combined with continuous collision detection (sub-stepping) to prevent tunneling.

---

## ✨ Features

- **Real-Time Trajectory Prediction:** Computes multi-bounce trajectories in under 10ms.
- **AI-Assisted Coaching:** Dual-head PyTorch neural network estimates shot success probability and real-time velocity corrections.
- **Augmented Reality Rendering:** Lines and landing zones displayed in 3D (Unity) or 2D (Web Dashboard).
- **Webcam Tracking (CV):** Built-in computer vision color tracker in JS with optional MediaPipe Hands integration to trace ball motion.

---

## 🛠️ How It Works

```
                    ┌─────────────┐
                    │   📷 Camera  │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  👁️ Computer  │
                    │    Vision    │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  🎯 Object   │
                    │  Detection  │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  🔬 Physics  │
                    │  Simulation │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  📊 Trajectory│
                    │  Prediction  │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  🧠 AI       │
                    │ Optimization│
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  🥽 AR       │
                    │  Rendering  │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  🥽 User     │
                    │  follows    │
                    │  projected  │
                    │  path       │
                    └─────────────┘
```

---

## 🗺️ Roadmap

- [x] **RK4 Integration & CCD:** Implement high-fidelity Runge-Kutta 4th order integrator with continuous sub-stepping collision checks to avoid tunneling.
- [x] **Web & Unity Solver Sync:** Unified physical logic shared between C#, JavaScript, and Python modeling environments.
- [x] **Synthetic Trajectory Generator:** Scale dataset generation to thousands of unique paths with varying release speed and spin parameters.
- [x] **TFLite & CoreML Export:** Multi-format conversion pipeline from PyTorch/ONNX to mobile runtimes.
- [ ] **On-Device AR Foundation Tracking:** Complete native object tracking and spatial anchor integration.
- [ ] **Dynamic Obstacle Meshing:** Real-time LiDAR spatial mapping for arbitrary room obstacles.

---

## 💻 Tech Stack

- **Python / PyTorch:** Custom training loop and dual-head regression architecture.
- **ONNX, CoreML, TFLite:** Cross-platform edge deployment.
- **Unity 2022.3 / AR Foundation:** Simulated editor execution and deployment on real devices.
- **HTML5 Canvas / Vanilla JS:** Zero-dependency companion dashboard.

---

## 📜 License

This project is licensed under the MIT License.
