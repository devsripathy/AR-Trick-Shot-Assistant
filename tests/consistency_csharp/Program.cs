using System;
using System.Globalization;
using UnityEngine;

namespace ARTrickShot
{
    class Program
    {
        static void Main(string[] args)
        {
            if (args.Length < 9)
            {
                Console.WriteLine("Usage: dotnet run -- <px> <py> <pz> <vx> <vy> <vz> <sx> <sy> <sz> [maxSteps]");
                return;
            }

            try
            {
                // Parse arguments
                float px = float.Parse(args[0], CultureInfo.InvariantCulture);
                float py = float.Parse(args[1], CultureInfo.InvariantCulture);
                float pz = float.Parse(args[2], CultureInfo.InvariantCulture);

                float vx = float.Parse(args[3], CultureInfo.InvariantCulture);
                float vy = float.Parse(args[4], CultureInfo.InvariantCulture);
                float vz = float.Parse(args[5], CultureInfo.InvariantCulture);

                float sx = float.Parse(args[6], CultureInfo.InvariantCulture);
                float sy = float.Parse(args[7], CultureInfo.InvariantCulture);
                float sz = float.Parse(args[8], CultureInfo.InvariantCulture);

                int maxSteps = 150;
                if (args.Length >= 10)
                {
                    maxSteps = int.Parse(args[9], CultureInfo.InvariantCulture);
                }

                // Set up solver
                var solver = new ARPhysicsSolver();
                // Match default constants to align exactly with Python
                solver.mass = 0.62f;
                solver.radius = 0.12f;
                solver.dragCoeff = 0.47f;
                solver.liftCoeff = 1.5f;
                solver.restitution = 0.82f;
                solver.surfaceFriction = 0.4f;
                solver.gravity = new Vector3(0, -9.81f, 0);
                solver.airDensity = 1.225f;
                solver.timeStep = 0.02f;
                solver.maxSteps = maxSteps;
                solver.subSteps = 5;

                var path = solver.SolveTrajectory(new Vector3(px, py, pz), new Vector3(vx, vy, vz), new Vector3(sx, sy, sz));

                // Get the final position from path
                if (path.Count > 0)
                {
                    var finalPt = path[path.Count - 1];
                    Console.WriteLine(string.Format(CultureInfo.InvariantCulture, "{0:F6} {1:F6} {2:F6}", finalPt.position.x, finalPt.position.y, finalPt.position.z));
                }
                else
                {
                    Console.WriteLine("ERROR: Path is empty.");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("ERROR: " + ex.Message);
            }
        }
    }
}
