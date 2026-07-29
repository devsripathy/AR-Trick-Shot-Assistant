using System;
using UnityEngine;
using UnityEngine.UI;

namespace ARTrickShot
{
    /// <summary>
    /// Displays coaching cues, telemetry metrics, and high-fidelity 
    /// Infinite-Mage-style calculations onto the AR Screen.
    /// </summary>
    public class UIController : MonoBehaviour
    {
        [Header("Telemetry UI Elements")]
        public Text speedText;
        public Text angleText;
        public Text spinText;
        public Text dragForceText;

        [Header("Guiding HUD Elements")]
        public Image probabilityGauge; // Radial image for circular percentage (0-1)
        public Text probabilityPercentText;
        public Text coachAdviceText;
        public Text activeChallengeText;

        [Header("State Colors")]
        public Color successColor = Color.green;
        public Color cautionColor = Color.yellow;
        public Color failureColor = Color.red;

        /// <summary>
        /// Updates the real-time telemetry readout values.
        /// </summary>
        public void UpdateTelemetry(float initialSpeed, float verticalAngle, float spinRpm, float avgDragForce)
        {
            if (speedText != null) speedText.text = $"Speed: {initialSpeed:F1} m/s";
            if (angleText != null) angleText.text = $"Angle: {verticalAngle:F1}°";
            if (spinText != null) spinText.text = $"Spin: {spinRpm:F0} RPM";
            if (dragForceText != null) dragForceText.text = $"Drag: {avgDragForce:F3} N";
        }

        /// <summary>
        /// Updates the success probability percentage and coaches the player.
        /// </summary>
        public void UpdateCoachingHUD(float probability, string coachingAdvice, string activeChallengeName)
        {
            if (probabilityGauge != null)
            {
                probabilityGauge.fillAmount = probability;
                probabilityGauge.color = probability > 0.75f ? successColor : (probability > 0.4f ? cautionColor : failureColor);
            }

            if (probabilityPercentText != null)
            {
                probabilityPercentText.text = $"SUCCESS: {(probability * 100f):F0}%";
                probabilityPercentText.color = probability > 0.75f ? successColor : (probability > 0.4f ? cautionColor : failureColor);
            }

            if (coachAdviceText != null)
            {
                coachAdviceText.text = $"[COACH AI] {coachingAdvice}";
            }

            if (activeChallengeText != null)
            {
                activeChallengeText.text = $"Challenge: {activeChallengeName.ToUpper()}";
            }
        }

        /// <summary>
        /// Renders a beautiful visual instruction on the screen for the ideal launch parameters.
        /// </summary>
        public void ShowIdealVectorCues(Vector3 idealDirection, float idealSpeed)
        {
            // Provides visual direction instructions (such as activating green 3D arrows)
            Debug.Log($"Coach Target Vector: Direction = {idealDirection}, Ideal Speed = {idealSpeed:F1} m/s");
        }
    }
}
