using System;
using System.Collections.Generic;
using UnityEngine;

namespace ARTrickShot
{
    /// <summary>
    /// High-precision 3D ballistic trajectory solver with air resistance, Magnus spin forces, 
    /// and multi-bounce environmental physics. Designed for real-time <10ms execution on mobile AR.
    /// </summary>
    public class ARPhysicsSolver : MonoBehaviour
    {
        [Header("Global Environment")]
        public Vector3 gravity = new Vector3(0, -9.81f, 0);
        public float airDensity = 1.225f; // kg/m^3 (sea level standard)

        [Header("Object Properties")]
        public float mass = 0.62f;        // kg (standard basketball)
        public float radius = 0.12f;      // meters (standard basketball radius)
        public float dragCoeff = 0.47f;    // sphere drag coefficient
        public float liftCoeff = 1.5f;     // Magnus lift coefficient scaling
        public float restitution = 0.82f;  // coefficient of restitution (bounce elasticity)
        public float surfaceFriction = 0.4f; // bounce tangential friction

        [Header("Simulation Configuration")]
        public int maxSteps = 200;
        public float timeStep = 0.02f;     // dt in seconds
        public int maxBounces = 3;

        /// <summary>
        /// Struct to hold individual trajectory point telemetry data.
        /// </summary>
        public struct TrajectoryPoint
        {
            public Vector3 position;
            public Vector3 velocity;
            public Vector3 spin;
            public float time;
            public bool isBounce;
            public Vector3 normal;
        }

        /// <summary>
        /// Solves the full 3D ballistic trajectory using Euler-Cromer numerical integration.
        /// Incorporates Gravity, Drag Force, Magnus Force (Spin), and Surface Collisions (Raycasts).
        /// </summary>
        public List<TrajectoryPoint> SolveTrajectory(Vector3 startPos, Vector3 startVel, Vector3 spinAngularVel)
        {
            List<TrajectoryPoint> points = new List<TrajectoryPoint>();
            Vector3 currentPos = startPos;
            Vector3 currentVel = startVel;
            Vector3 currentSpin = spinAngularVel;
            float currentTime = 0f;
            int bounceCount = 0;

            // Pre-calculate physical areas for drag
            float crossSectionalArea = Mathf.PI * radius * radius;

            // Always add the starting point
            points.Add(new TrajectoryPoint
            {
                position = currentPos,
                velocity = currentVel,
                spin = currentSpin,
                time = currentTime,
                isBounce = false,
                normal = Vector3.zero
            });

            for (int i = 0; i < maxSteps; i++)
            {
                // 1. Calculate Forces
                // Gravity: Fg = m * g
                Vector3 F_gravity = mass * gravity;

                // Air Resistance (Quadratic Drag): F_drag = -0.5 * Cd * rho * A * v * v_unit
                float speed = currentVel.magnitude;
                Vector3 F_drag = Vector3.zero;
                if (speed > 0.001f)
                {
                    F_drag = -0.5f * dragCoeff * airDensity * crossSectionalArea * speed * currentVel;
                }

                // Magnus Effect (Spin Force): F_magnus = Cl * rho * A * radius * (omega x v)
                // Represents lateral curve or backspin lift based on rotation
                Vector3 F_magnus = Vector3.zero;
                if (speed > 0.001f && currentSpin.magnitude > 0.01f)
                {
                    F_magnus = liftCoeff * airDensity * crossSectionalArea * radius * Vector3.Cross(currentSpin, currentVel);
                }

                // Total Acceleration: a = F_total / m
                Vector3 acceleration = (F_gravity + F_drag + F_magnus) / mass;

                // 2. Numerical Integration Step (Euler-Cromer)
                Vector3 nextVel = currentVel + acceleration * timeStep;
                Vector3 displacement = nextVel * timeStep;
                Vector3 nextPos = currentPos + displacement;

                // 3. Environment Collision Detection (3D Raycast for bounces)
                float checkDist = displacement.magnitude;
                if (checkDist > 0.0001f)
                {
                    Ray ray = new Ray(currentPos, displacement.normalized);
                    RaycastHit hit;

                    // Spherecast or raycast against physics-colliders in the environment
                    if (Physics.Raycast(ray, out hit, checkDist + radius))
                    {
                        if (bounceCount < maxBounces)
                        {
                            // Calculate bounce position at contact boundary
                            currentPos = hit.point + hit.normal * radius;

                            // Normal velocity component
                            Vector3 v_normal = Vector3.Project(nextVel, hit.normal);
                            // Tangential velocity component
                            Vector3 v_tangent = nextVel - v_normal;

                            // Apply elasticity (restitution) to normal velocity
                            Vector3 next_v_normal = -v_normal * restitution;

                            // Apply friction to tangential velocity
                            Vector3 next_v_tangent = v_tangent * (1f - surfaceFriction);

                            // Incorporate spin bounce interaction
                            // Forward spin adds tangential velocity upon floor collision (transfer of angular momentum)
                            Vector3 spinTransfer = Vector3.Cross(currentSpin, hit.normal) * radius * 0.4f;
                            currentVel = next_v_normal + next_v_tangent + spinTransfer;

                            // Update spin after impact (friction dampens rotational kinetic energy)
                            currentSpin *= (1f - surfaceFriction * 0.5f);

                            bounceCount++;
                            currentTime += (hit.distance / speed);

                            points.Add(new TrajectoryPoint
                            {
                                position = currentPos,
                                velocity = currentVel,
                                spin = currentSpin,
                                time = currentTime,
                                isBounce = true,
                                normal = hit.normal
                            });

                            // Skip standard integration for this step to prevent double collision
                            continue;
                        }
                        else
                        {
                            // Max bounces reached, stop prediction
                            break;
                        }
                    }
                }

                // Advance standard step
                currentPos = nextPos;
                currentVel = nextVel;
                currentTime += timeStep;

                points.Add(new TrajectoryPoint
                {
                    position = currentPos,
                    velocity = currentVel,
                    spin = currentSpin,
                    time = currentTime,
                    isBounce = false,
                    normal = Vector3.zero
                });

                // End if movement drops to negligible levels
                if (currentVel.magnitude < 0.1f && points.Count > 10)
                {
                    break;
                }
            }

            return points;
        }
    }
}
