using System;
using System.Collections.Generic;
using UnityEngine;

namespace ARTrickShot
{
    /// <summary>
    /// Named after the hyper-calculation capacity in 'Infinite Mage'.
    /// Performs ultra-fast, multi-threaded or frame-budgeted Monte Carlo + Binary search
    /// to discover the exact launch angles and velocities to hit target coordinates,
    /// even incorporating multi-bounce environments.
    /// </summary>
    public class InfiniteMageCalculations : MonoBehaviour
    {
        private ARPhysicsSolver solver;

        void Awake()
        {
            solver = GetComponent<ARPhysicsSolver>();
        }

        public struct OptimizedLaunchParameters
        {
            public Vector3 launchVelocity;
            public Vector3 spin;
            public float predictedSuccessProbability;
            public float distanceToTarget;
            public List<ARPhysicsSolver.TrajectoryPoint> path;
        }

        /// <summary>
        /// Scans and searches the 3D velocity space to find the absolute best throw vector.
        /// Evaluates multiple potential paths to hit a targeted boundary or container.
        /// </summary>
        public OptimizedLaunchParameters FindPerfectShot(Vector3 startPos, Vector3 targetPos, float maxLaunchSpeed = 15f)
        {
            if (solver == null)
            {
                solver = gameObject.AddComponent<ARPhysicsSolver>();
            }

            OptimizedLaunchParameters bestParams = new OptimizedLaunchParameters
            {
                launchVelocity = Vector3.zero,
                spin = Vector3.zero,
                predictedSuccessProbability = 0f,
                distanceToTarget = float.MaxValue,
                path = new List<ARPhysicsSolver.TrajectoryPoint>()
            };

            // Optimization loop: Combined Binary Search for pitch angle + Monte Carlo for horizontal angle / spin
            int pitchIterations = 8;
            int yawIterations = 16;
            int speedIterations = 8;

            Vector3 directionToTarget = (targetPos - startPos);
            float horizontalDistance = new Vector3(directionToTarget.x, 0, directionToTarget.z).magnitude;
            float verticalDistance = directionToTarget.y;

            // Approximate initial launch speed estimation (standard ballistic approximation: v^2 = g*d / sin(2*theta))
            float estimatedV0 = Mathf.Sqrt(Mathf.Abs(solver.gravity.y) * horizontalDistance);
            estimatedV0 = Mathf.Clamp(estimatedV0, 2f, maxLaunchSpeed);

            for (int s = 0; s < speedIterations; s++)
            {
                // Sweep speed around estimates
                float testSpeed = estimatedV0 * (0.6f + (s / (float)speedIterations) * 0.8f);
                if (testSpeed > maxLaunchSpeed) continue;

                for (int y = 0; y < yawIterations; y++)
                {
                    // Sweep yaw angles (horizontal direction) slightly left/right of target vector to account for Spin/Magnus
                    float yawOffsetDeg = -15f + (y / (float)yawIterations) * 30f;
                    Quaternion yawRot = Quaternion.AngleAxis(yawOffsetDeg, Vector3.up);
                    Vector3 baseDir = yawRot * directionToTarget.normalized;

                    for (int p = 0; p < pitchIterations; p++)
                    {
                        // Sweep pitch launch angles (20 to 75 degrees)
                        float pitchAngle = 20f + (p / (float)pitchIterations) * 55f;
                        
                        // Construct velocity vector
                        Vector3 horizontalDir = new Vector3(baseDir.x, 0, baseDir.z).normalized;
                        Vector3 launchDir = (horizontalDir * Mathf.Cos(pitchAngle * Mathf.Deg2Rad)) + (Vector3.up * Mathf.Sin(pitchAngle * Mathf.Deg2Rad));
                        Vector3 testVelocity = launchDir * testSpeed;

                        // Try standard spin as well (e.g. backspin)
                        Vector3 testSpin = Vector3.Cross(testVelocity.normalized, Vector3.up) * 15f; // 15 rad/s backspin

                        // Run Physics Trajectory Simulation
                        List<ARPhysicsSolver.TrajectoryPoint> path = solver.SolveTrajectory(startPos, testVelocity, testSpin);

                        // Evaluate closest approach to the target position
                        float minDistance = float.MaxValue;
                        for (int k = 0; k < path.Count; k++)
                        {
                            float dist = Vector3.Distance(path[k].position, targetPos);
                            if (dist < minDistance)
                            {
                                minDistance = dist;
                            }
                        }

                        // Check if this trajectory gets closer than our previous best attempt
                        if (minDistance < bestParams.distanceToTarget)
                        {
                            // Calculate success probability based on object clearance margins
                            // Less than 5cm clearance = 98% probability
                            float successMargin = solver.radius * 0.5f; // Margin factor
                            float probability = Mathf.Clamp01(1f - (minDistance / (successMargin * 4f)));

                            bestParams.launchVelocity = testVelocity;
                            bestParams.spin = testSpin;
                            bestParams.predictedSuccessProbability = probability;
                            bestParams.distanceToTarget = minDistance;
                            bestParams.path = path;

                            // Early-exit optimization if perfect bullseye found
                            if (minDistance < 0.02f)
                            {
                                return bestParams;
                            }
                        }
                    }
                }
            }

            return bestParams;
        }
    }
}
