<div align="center">

# 🚀 𝔸ℝ 𝕋ℝ𝕀ℂ𝕂𝕊ℍ𝕆𝕋 𝔸𝕀

### *"Magic isn't breaking the laws of physics. It's understanding them so well that everyone else thinks you did."*

<img src="https://i.imgur.com/placeholder-ar-hud.gif" alt="AR Trickshot Demo" width="80%">

```
╔═══════════════════════════════════════════════════════════════════╗
║                                                                 ║
║   What if mathematics could feel like magic?                    ║
║                                                                 ║
║   This is an experiment to answer one question:                ║
║                                                                 ║
║   Can an AI calculate the perfect trick shot faster            ║
║   than a human can imagine it?                                 ║
║                                                                 ║
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

## 🌟 Where This Idea Came From

<div align="center">
  <img src="https://i.imgur.com/placeholder-infinite-mage.gif" alt="Infinite Mage Inspiration" width="60%">
</div>

<br>

This project started because of **one scene** in the novel *Infinite Mage*.

**One moment** completely changed the way I thought about engineering.

> Mage doesn't become amazing because of magic.  
> they becomes amazing because they performs **incredibly complex calculations almost instantly**—predicting trajectories, velocity, timing, angles, and countless possibilities before making a move.

To everyone around them, it looks like **magic**.

But underneath...

```
╔═══════════════════════════════════════════════════════════════════╗
║                                                                 ║
║                   It's just mathematics & Physics               ║
║                                                                 ║
╚═══════════════════════════════════════════════════════════════════╝
```

That idea stayed in my head for **days**.

Eventually I asked myself,

> *"What if a computer could perform those calculations in real time and show them through AR?"*

Just **physics**, **computer vision**, **artificial intelligence**, and a **lot of mathematics**.

This project is my attempt to bring that idea into the **real world**.

---

## 🎯 Project Goal

Every trick shot follows the **same rules**.

**Physics never changes.**

Humans simply **estimate** those rules from experience.

My idea is to let **AI perform those calculations continuously** while I focus on taking the shot.

Instead of

```
╔═══════════════════════════════════════════════════════════════════╗
║  "I think this might work..."                                     ║
╚═══════════════════════════════════════════════════════════════════╝
```

the system tells me

```
╔═══════════════════════════════════════════════════════════════════╗
║  "If you shoot here with this much force,                       ║
║   this is exactly what will happen."                            ║
╚═══════════════════════════════════════════════════════════════════╝
```

The experience almost feels like having the **calculation ability from *Infinite Mage***, except everything is happening through an **AR display**.

---

## 🔢 The Math Behind It

<div align="center">

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   At its core, this project isn't magic.                       │
│                                                                 │
│   It's just a lot of physics happening very quickly.           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

</div>

### The system constantly measures things like:

| Symbol | Meaning |
|:------:|:--------|
| 📍 | Position of the object |
| 📏 | Distance |
| 🎯 | Direction |
| 💨 | Initial force |
| ⚡ | Velocity |
| 🌍 | Gravity |
| 🪞 | Reflection from walls or cushions |
| 🔄 | Spin (planned) |

### Using these values, the AI predicts how the object will move over time.

**The basic motion follows:**

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   Position = InitialPosition + Velocity × t + ½ × Acceleration × t² │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**For bank shots it also applies:**

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   Angle of Incidence = Angle of Reflection                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### The interesting part isn't solving one equation.

The interesting part is solving **thousands of possible trajectories** every second, comparing them, and choosing the path with the **highest probability of success**.

Finally, that prediction is **rendered directly into the real world using AR**.

So instead of **imagining** the path...

> **You can actually see it.**

---

## ✨ Features

<div align="center">

| 🎯 | 🧠 | 🥽 |
|:--:|:--:|:--:|
| **Real-Time Trajectory Prediction** | **AI-Assisted Physics** | **Augmented Reality Guidance** |
| Predicts where the object will travel before you even take the shot | Uses computer vision together with physics simulation to calculate possible outcomes continuously | Displays the predicted path directly on top of the real world |

| ⚡ | 🎲 | 📈 |
|:--:|:--:|:--:|
| **Live Updates** | **Multi-Bounce Prediction** | **Shot Difficulty** |
| Move your hand. Change your angle. Adjust your position. The prediction updates instantly. | Supports complex bank shots involving multiple reflections | Shows how difficult a shot is and estimates the probability of success |

</div>

---

## 🚀 Future Plans

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   🔄  Spin prediction                                          │
│   🇬🇧  English effects                                         │
│   🧱  Dynamic obstacle detection                               │
│   👥  Multiplayer trick-shot mode                              │
│   📚  Learning from previous successful shots                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ How It Works

<div align="center">

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
                    │  👤 User     │
                    │  follows    │
                    │  projected  │
                    │  path       │
                    └─────────────┘

```

</div>

> Everything happens **continuously** while the camera is running.  
> The prediction changes in **real time** as the environment changes.

---

## 💻 Tech Stack

<div align="center">

| Layer | Technology | Icon |
|:------|:-----------|:----:|
| **Language** | Python 3.11+ | 🐍 |
| **AR Engine** | Unity 2022.3+ / AR Foundation 5.0+ | 🥽 |
| **Computer Vision** | OpenCV 4.8+ | 📷 |
| **AI Framework** | PyTorch 2.0+ | 🧠 |
| **AR Scripting** | C# | ⚙️ |
| **Physics** | Custom Physics Simulation | 📐 |

</div>

---

## 🚀 Why I Built This

I love projects that make people stop and ask,

> *"Wait... how did you even think of this?"*

This wasn't built because I wanted another AI project for my portfolio.

It started because a **fictional character** showed me a fascinating way of thinking.

The challenge became:

```
╔═══════════════════════════════════════════════════════════════════╗
║                                                                 ║
║   Can I recreate that feeling using real engineering            ║
║   instead of fantasy?                                          ║
║                                                                 ║
╚═══════════════════════════════════════════════════════════════════╝
```

That question eventually became **AR Trickshot AI**.

---

## 🌱 What I Hope You Take Away

<div align="center">

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   You don't always need a completely original idea.            │
│                                                                 │
│   Sometimes inspiration comes from a movie.                    │
│   Sometimes from a game.                                       │
│   Sometimes from an anime or a novel.                          │
│                                                                 │
│   The important part is asking,                                │
│                                                                 │
│   "Can I build a real version of this?"                        │
│                                                                 │
│   That's exactly what I tried to do here.                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

```

</div>

If this project inspires even **one person** to learn a little more physics, mathematics, computer vision, or augmented reality...

> **then it has already succeeded.**

---

## 📜 License

<div align="center">

```
╔═══════════════════════════════════════════════════════════════════╗
║                                                                 ║
║   MIT License                                                   ║
║                                                                 ║
║   Build something amazing with it.                              ║
║                                                                 ║
║   If you improve it, I'd genuinely love to see what you create.║
║                                                                 ║
╚═══════════════════════════════════════════════════════════════════╝
```

</div>

---

<div align="center">

### ⚡ *"Magic isn't breaking the laws of physics. It's understanding them so well that everyone else thinks you did."* ⚡

<br>

<img src="https://i.imgur.com/placeholder-qr-code.gif" alt="QR Code" width="150">

**⭐ Drop a star if this inspired you to build something weird and wonderful.** ⭐

</div>
