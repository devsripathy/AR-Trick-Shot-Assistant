using System;
using System.Collections.Generic;
using UnityEngine;

namespace ARTrickShot
{
    /// <summary>
    /// High-precision 3D ballistic trajectory solver with air resistance, Magnus spin forces,
    /// and multi-bounce environmental physics. Incorporates a 4th-order Runge-Kutta (RK4) integrator
    /// and Continuous Collision Detection (CCD) via sub-stepping to prevent tunneling.
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
        public int subSteps = 5;          // Sub-steps per timeStep for CCD

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
        /// Computes the instantaneous 3D acceleration based on gravity, drag, and Magnus spin lift forces.
        /// </summary>
        public Vector3 GetAcceleration(Vector3 vel, Vector3 spin, float crossSectionalArea)
        {
            // Gravity: F_gravity = m * g
            Vector3 F_gravity = mass * gravity;

            // Air Resistance (Quadratic Drag): F_drag = -0.5 * Cd * rho * A * v * v_vec
            float speed = vel.magnitude;
            Vector3 F_drag = Vector3.zero;
            if (speed > 0.001f)
            {
                F_drag = -0.5f * dragCoeff * airDensity * crossSectionalArea * speed * vel;
            }

            // Magnus Effect (Spin Force): F_magnus = Cl * rho * A * radius * (omega x v)
            Vector3 F_magnus = Vector3.zero;
            if (speed > 0.001f && spin.magnitude > 0.01f)
            {
                F_magnus = liftCoeff * airDensity * crossSectionalArea * radius * Vector3.Cross(spin, vel);
            }

            // a = F_total / m
            return (F_gravity + F_drag + F_magnus) / mass;
        }

        /// <summary>
        /// Solves the full 3D ballistic trajectory using RK4 numerical integration and CCD sub-stepping.
        /// </summary>
        public List<TrajectoryPoint> SolveTrajectory(Vector3 startPos, Vector3 startVel, Vector3 spinAngularVel)
        {
            List<TrajectoryPoint> points = new List<TrajectoryPoint>();
            Vector3 currentPos = startPos;
            Vector3 currentVel = startVel;
            Vector3 currentSpin = spinAngularVel;
            float currentTime = 0f;
            int bounceCount = 0;

            float crossSectionalArea = Mathf.PI * radius * radius;

            // Add the starting point
            points.Add(new TrajectoryPoint
            {
                position = currentPos,
                velocity = currentVel,
                spin = currentSpin,
                time = currentTime,
                isBounce = false,
                normal = Vector3.zero
            });

            float dt = timeStep / subSteps;

            for (int i = 0; i < maxSteps; i++)
            {
                bool maxBouncesReached = false;

                // Perform sub-stepping for CCD
                for (int s = 0; s < subSteps; s++)
                {
                    // Run 4th-Order Runge-Kutta (RK4) integration for this sub-step
                    // k1
                    Vector3 k1_v = GetAcceleration(currentVel, currentSpin, crossSectionalArea);
                    Vector3 k1_x = currentVel;

                    // k2
                    Vector3 k2_v = GetAcceleration(currentVel + k1_v * (dt / 2f), currentSpin, crossSectionalArea);
                    Vector3 k2_x = currentVel + k1_v * (dt / 2f);

                    // k3
                    Vector3 k3_v = GetAcceleration(currentVel + k2_v * (dt / 2f), currentSpin, crossSectionalArea);
                    Vector3 k3_x = currentVel + k2_v * (dt / 2f);

                    // k4
                    Vector3 k4_v = GetAcceleration(currentVel + k3_v * dt, currentSpin, crossSectionalArea);
                    Vector3 k4_x = currentVel + k3_v * dt;

                    // Update states via weighted average
                    Vector3 nextVel = currentVel + (k1_v + 2f * k2_v + 2f * k3_v + k4_v) * (dt / 6f);
                    Vector3 displacement = (k1_x + 2f * k2_x + 2f * k3_x + k4_x) * (dt / 6f);
                    Vector3 nextPos = currentPos + displacement;

                    // Continuous Collision Detection (CCD) using Raycast / Spherecast
                    float checkDist = displacement.magnitude;
                    if (checkDist > 0.0001f)
                    {
                        Ray ray = new Ray(currentPos, displacement.normalized);
                        RaycastHit hit;

                        if (Physics.Raycast(ray, out hit, checkDist + radius))
                        {
                            if (bounceCount < maxBounces)
                            {
                                // Calculate bounce position at contact boundary
                                currentPos = hit.point + hit.normal * radius;

                                // Normal and tangential velocity components
                                Vector3 v_normal = Vector3.Project(nextVel, hit.normal);
                                Vector3 v_tangent = nextVel - v_normal;

                                // Apply coefficient of restitution and friction
                                Vector3 next_v_normal = -v_normal * restitution;
                                Vector3 next_v_tangent = v_tangent * (1f - surfaceFriction);

                                // Spin bounce interaction (transfer of angular momentum)
                                Vector3 spinTransfer = Vector3.Cross(currentSpin, hit.normal) * radius * 0.4f;
                                currentVel = next_v_normal + next_v_tangent + spinTransfer;

                                // Rotational friction dampening
                                currentSpin *= (1f - surfaceFriction * 0.5f);

                                bounceCount++;
                                currentTime += (hit.distance / (currentVel.magnitude + 0.001f));

                                points.Add(new TrajectoryPoint
                                {
                                    position = currentPos,
                                    velocity = currentVel,
                                    spin = currentSpin,
                                    time = currentTime,
                                    isBounce = true,
                                    normal = hit.normal
                                });

                                // Break sub-stepping loop to recalculate after bounce
                                break;
                            }
                            else
                            {
                                maxBouncesReached = true;
                                break;
                            }
                        }
                    }

                    // Advance sub-step state
                    currentPos = nextPos;
                    currentVel = nextVel;
                    currentTime += dt;
                }

                if (maxBouncesReached) break;

                // Record step trajectory point
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
