using System.Collections.Generic;
using UnityEngine;

namespace ARTrickShot
{
    /// <summary>
    /// Generates glowing 3D trajectory visualization inside Unity.
    /// Dynamically shifts color themes based on simulated success probabilities.
    /// </summary>
    [RequireComponent(typeof(LineRenderer))]
    public class TrajectoryRenderer : MonoBehaviour
    {
        private LineRenderer lineRenderer;

        [Header("Visualization Settings")]
        public float startWidth = 0.04f;
        public float endWidth = 0.02f;
        public Material glowMaterial;

        [Header("Gradient Color Presets")]
        public Gradient successGradient;   // Green glow
        public Gradient closeGradient;     // Yellow/Orange glow
        public Gradient missGradient;      // Red/Purple glow

        [Header("Impact Indicator")]
        public GameObject landingMarkerPrefab;
        private GameObject landingMarkerInstance;

        void Awake()
        {
            lineRenderer = GetComponent<LineRenderer>();
            ConfigureLineRenderer();
        }

        private void ConfigureLineRenderer()
        {
            lineRenderer.startWidth = startWidth;
            lineRenderer.endWidth = endWidth;
            lineRenderer.useWorldSpace = true;
            if (glowMaterial != null)
            {
                lineRenderer.material = glowMaterial;
            }
        }

        /// <summary>
        /// Updates the Line Renderer vertex array and places the landing marker.
        /// Probability: 0 = Miss, 1 = Close, 2 = Perfect Success
        /// </summary>
        public void RenderPath(List<ARPhysicsSolver.TrajectoryPoint> trajectory, int probabilityLevel)
        {
            if (trajectory == null || trajectory.Count == 0)
            {
                lineRenderer.positionCount = 0;
                if (landingMarkerInstance != null) landingMarkerInstance.SetActive(false);
                return;
            }

            // Assign proper color theme based on success likelihood
            if (probabilityLevel == 2)
            {
                lineRenderer.colorGradient = successGradient;
            }
            else if (probabilityLevel == 1)
            {
                lineRenderer.colorGradient = closeGradient;
            }
            else
            {
                lineRenderer.colorGradient = missGradient;
            }

            // Populate coordinates
            lineRenderer.positionCount = trajectory.Count;
            for (int i = 0; i < trajectory.Count; i++)
            {
                lineRenderer.SetPosition(i, trajectory[i].position);
            }

            // Handle the predicted target or bounce landing marker
            if (landingMarkerPrefab != null)
            {
                if (landingMarkerInstance == null)
                {
                    landingMarkerInstance = Instantiate(landingMarkerPrefab);
                }

                // Place marker at the final predicted point (landing zone)
                Vector3 finalPos = trajectory[trajectory.Count - 1].position;
                landingMarkerInstance.transform.position = finalPos;
                landingMarkerInstance.SetActive(true);

                // Set marker color matching the success tier
                Renderer markerRenderer = landingMarkerInstance.GetComponentInChildren<Renderer>();
                if (markerRenderer != null)
                {
                    Color markerColor = probabilityLevel == 2 ? Color.green : (probabilityLevel == 1 ? Color.yellow : Color.red);
                    markerRenderer.material.SetColor("_Color", markerColor);
                }
            }
        }
    }
}
