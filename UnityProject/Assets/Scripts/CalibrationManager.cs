using System;
using UnityEngine;

namespace ARTrickShot
{
    /// <summary>
    /// Calibrates the physical attributes of objects and environment coefficients.
    /// Supports basketball, tennis ball, soccer ball, ping pong, golf, and frisbee presets.
    /// </summary>
    public class CalibrationManager : MonoBehaviour
    {
        public enum ObjectType
        {
            Basketball,
            SoccerBall,
            PingPongBall,
            GolfChip,
            Frisbee,
            Custom
        }

        public enum EnvironmentalSurface
        {
            WoodCourt,
            ConcreteGround,
            GrassTurf,
            PingPongTable,
            Custom
        }

        [Header("Active Selection")]
        public ObjectType activeObjectType = ObjectType.Basketball;
        public EnvironmentalSurface activeSurfaceType = EnvironmentalSurface.WoodCourt;

        private ARPhysicsSolver solver;

        void Awake()
        {
            solver = GetComponent<ARPhysicsSolver>();
            ApplyCalibrations();
        }

        /// <summary>
        /// Updates the ARPhysicsSolver properties based on the selected object and surface parameters.
        /// </summary>
        public void ApplyCalibrations()
        {
            if (solver == null) return;

            // 1. Calibrate Object Physics Presets
            switch (activeObjectType)
            {
                case ObjectType.Basketball:
                    solver.mass = 0.62f;       // kg
                    solver.radius = 0.12f;     // meters
                    solver.dragCoeff = 0.47f;  // Cd of sphere
                    break;
                case ObjectType.SoccerBall:
                    solver.mass = 0.43f;
                    solver.radius = 0.11f;
                    solver.dragCoeff = 0.25f;  // Soccer ball has dynamic drag
                    break;
                case ObjectType.PingPongBall:
                    solver.mass = 0.0027f;
                    solver.radius = 0.02f;
                    solver.dragCoeff = 0.40f;  // High relative drag due to light weight
                    break;
                case ObjectType.GolfChip:
                    solver.mass = 0.045f;
                    solver.radius = 0.021f;
                    solver.dragCoeff = 0.24f;  // Dimpled surface reduces drag
                    break;
                case ObjectType.Frisbee:
                    solver.mass = 0.175f;
                    solver.radius = 0.135f;
                    solver.dragCoeff = 0.15f;  // Highly aerodynamic lift-dominated
                    break;
            }

            // 2. Calibrate Material Restitutions and Frictions
            switch (activeSurfaceType)
            {
                case EnvironmentalSurface.WoodCourt:
                    solver.restitution = 0.82f;
                    solver.surfaceFriction = 0.35f;
                    break;
                case EnvironmentalSurface.ConcreteGround:
                    solver.restitution = 0.65f;
                    solver.surfaceFriction = 0.55f;
                    break;
                case EnvironmentalSurface.GrassTurf:
                    solver.restitution = 0.30f;
                    solver.surfaceFriction = 0.70f;
                    break;
                case EnvironmentalSurface.PingPongTable:
                    solver.restitution = 0.90f;
                    solver.surfaceFriction = 0.20f;
                    break;
            }

            Debug.Log($"Calibrations applied. Mass: {solver.mass}kg, Radius: {solver.radius}m, Elasticity: {solver.restitution}");
        }

        public void SetCustomProperties(float mass, float radius, float drag, float bounce, float friction)
        {
            if (solver == null) return;
            activeObjectType = ObjectType.Custom;
            activeSurfaceType = EnvironmentalSurface.Custom;
            solver.mass = mass;
            solver.radius = radius;
            solver.dragCoeff = drag;
            solver.restitution = bounce;
            solver.surfaceFriction = friction;
        }
    }
}
