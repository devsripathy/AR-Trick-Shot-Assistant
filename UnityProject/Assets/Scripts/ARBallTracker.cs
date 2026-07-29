using System;
using UnityEngine;

namespace ARTrickShot
{
    /// <summary>
    /// Integrates Computer Vision/ML object tracking with AR Foundation 6-DoF telemetry.
    /// Incorporates a Kalman Filter to smooth camera-tracked objects and estimates real-world scale and velocity.
    /// </summary>
    public class ARBallTracker : MonoBehaviour
    {
        [Header("Tracking Parameters")]
        public string targetTagName = "TrickShotBall";
        public float kalmanMeasurementNoise = 0.05f; // R: covariance of measurement error
        public float kalmanProcessNoise = 0.005f;    // Q: covariance of process model acceleration
        public float releaseSpeedThreshold = 2.0f;  // m/s velocity to register a release
        public float scaleFactor = 1.0f;             // Calibrated real-world scale

        [Header("State Telemetry")]
        public bool isTracking = false;
        public bool isReleased = false;
        public Vector3 estimatedPosition;
        public Vector3 estimatedVelocity;
        public Vector3 estimatedSpin;

        // Kalman State Variables
        private Vector3 state_x; // estimated state (position)
        private Vector3 covariance_p; // state estimation error covariance
        private Vector3 previousRawPos;
        private Vector3 previousEstimatedPos;
        private float lastUpdateTime;

        // Events for trajectory triggering
        public Action<Vector3, Vector3, Vector3> OnBallReleased; // StartPos, StartVel, Spin

        void Start()
        {
            ResetTracker();
        }

        public void ResetTracker()
        {
            state_x = Vector3.zero;
            covariance_p = Vector3.one * 0.1f;
            isReleased = false;
            estimatedVelocity = Vector3.zero;
            estimatedSpin = Vector3.zero;
            lastUpdateTime = Time.time;
        }

        /// <summary>
        /// Updates the 1D/3D state estimators using standard Kalman equations.
        /// </summary>
        public void FeedRawTrackingPoint(Vector3 rawPosition, Vector3 rawRotationEuler)
        {
            float dt = Time.time - lastUpdateTime;
            if (dt <= 0f) dt = 0.016f;
            lastUpdateTime = Time.time;

            // 1. Prediction Step
            // Next position prediction assuming a slow-walk or stationary process
            Vector3 predicted_x = state_x + estimatedVelocity * dt;
            Vector3 predicted_p = covariance_p + Vector3.one * (kalmanProcessNoise * dt);

            // 2. Kalman Gain Calculation
            // K = P_pred / (P_pred + R)
            Vector3 kalmanGain = new Vector3(
                predicted_p.x / (predicted_p.x + kalmanMeasurementNoise),
                predicted_p.y / (predicted_p.y + kalmanMeasurementNoise),
                predicted_p.z / (predicted_p.z + kalmanMeasurementNoise)
            );

            // 3. Measurement Update (Correction)
            // x = x_pred + K * (z - x_pred)
            state_x = predicted_x + Vector3.Scale(kalmanGain, rawPosition - predicted_x);

            // P = (1 - K) * P_pred
            covariance_p = Vector3.Scale(Vector3.one - kalmanGain, predicted_p);

            // Scale correction
            estimatedPosition = state_x * scaleFactor;

            // Velocity Estimation
            if (dt > 0.001f)
            {
                Vector3 instantaneousVelocity = (estimatedPosition - previousEstimatedPos) / dt;
                // Apply exponential moving average to smooth velocity
                estimatedVelocity = Vector3.Lerp(estimatedVelocity, instantaneousVelocity, 0.4f);

                // Spin Estimation (relative to rolling/throwing friction)
                // Approximate angular velocity: omega = v x n / r
                estimatedSpin = Vector3.Cross(estimatedVelocity, Vector3.up) / 0.12f;
            }

            previousEstimatedPos = estimatedPosition;
            isTracking = true;

            // Check if ball release event has occurred
            if (!isReleased && estimatedVelocity.magnitude > releaseSpeedThreshold && previousRawPos != Vector3.zero)
            {
                isReleased = true;
                OnBallReleased?.Invoke(estimatedPosition, estimatedVelocity, estimatedSpin);
            }

            previousRawPos = rawPosition;
        }

        void Update()
        {
            // Fallback: If simulating, look for a tag in Unity hierarchy
            if (!isReleased)
            {
                GameObject trackedObj = GameObject.FindWithTag(targetTagName);
                if (trackedObj != null)
                {
                    FeedRawTrackingPoint(trackedObj.transform.position, trackedObj.transform.rotation.eulerAngles);
                }
                else
                {
                    isTracking = false;
                }
            }
        }
    }
}
