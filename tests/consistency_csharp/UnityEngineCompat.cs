using System;

namespace UnityEngine
{
    public struct Vector3
    {
        public float x, y, z;
        public Vector3(float x, float y, float z) { this.x = x; this.y = y; this.z = z; }
        public float magnitude => (float)Math.Sqrt(x * x + y * y + z * z);
        public Vector3 normalized => magnitude > 0.0001f ? new Vector3(x / magnitude, y / magnitude, z / magnitude) : zero;

        public static Vector3 zero => new Vector3(0, 0, 0);
        public static Vector3 up => new Vector3(0, 1, 0);

        public static Vector3 operator +(Vector3 a, Vector3 b) => new Vector3(a.x + b.x, a.y + b.y, a.z + b.z);
        public static Vector3 operator -(Vector3 a, Vector3 b) => new Vector3(a.x - b.x, a.y - b.y, a.z - b.z);
        public static Vector3 operator -(Vector3 a) => new Vector3(-a.x, -a.y, -a.z);
        public static Vector3 operator *(Vector3 a, float b) => new Vector3(a.x * b, a.y * b, a.z * b);
        public static Vector3 operator *(float b, Vector3 a) => new Vector3(a.x * b, a.y * b, a.z * b);
        public static Vector3 operator /(Vector3 a, float b) => new Vector3(a.x / b, a.y / b, a.z / b);

        public static float Distance(Vector3 a, Vector3 b) => (a - b).magnitude;
        public static float Angle(Vector3 from, Vector3 to) => 0f; // placeholder

        public static Vector3 Cross(Vector3 lhs, Vector3 rhs) => new Vector3(
            lhs.y * rhs.z - lhs.z * rhs.y,
            lhs.z * rhs.x - lhs.x * rhs.z,
            lhs.x * rhs.y - lhs.y * rhs.x
        );

        public static Vector3 Project(Vector3 vector, Vector3 onNormal)
        {
            float sqrMag = onNormal.x * onNormal.x + onNormal.y * onNormal.y + onNormal.z * onNormal.z;
            if (sqrMag < 1e-5f) return zero;
            float dot = vector.x * onNormal.x + vector.y * onNormal.y + vector.z * onNormal.z;
            return onNormal * (dot / sqrMag);
        }

        public static Vector3 ProjectOnPlane(Vector3 vector, Vector3 planeNormal)
        {
            return vector - Project(vector, planeNormal);
        }

        public static Vector3 Scale(Vector3 a, Vector3 b) => new Vector3(a.x * b.x, a.y * b.y, a.z * b.z);

        public override string ToString() => $"({x:F4}, {y:F4}, {z:F4})";
    }

    public struct Quaternion
    {
        public static Quaternion identity => new Quaternion();
        public static Quaternion AngleAxis(float angle, Vector3 axis) => new Quaternion();
        public static Vector3 operator *(Quaternion rotation, Vector3 point) => point;
    }

    public class MonoBehaviour
    {
    }

    public class HeaderAttribute : Attribute
    {
        public HeaderAttribute(string header) {}
    }

    public struct Ray
    {
        public Vector3 origin;
        public Vector3 direction;
        public Ray(Vector3 origin, Vector3 direction) { this.origin = origin; this.direction = direction; }
    }

    public struct RaycastHit
    {
        public Vector3 point;
        public Vector3 normal;
        public float distance;
    }

    public static class Physics
    {
        // Standalone has no colliders, so Raycast always returns false
        public static bool Raycast(Ray ray, out RaycastHit hit, float maxDistance)
        {
            hit = new RaycastHit();
            return false;
        }
    }

    public static class Mathf
    {
        public const float PI = (float)Math.PI;
        public const float Deg2Rad = PI / 180f;
        public const float Rad2Deg = 180f / PI;

        public static float Sin(float f) => (float)Math.Sin(f);
        public static float Cos(float f) => (float)Math.Cos(f);
        public static float Sqrt(float f) => (float)Math.Sqrt(f);
        public static float Abs(float f) => Math.Abs(f);
        public static float Clamp01(float value) => value < 0f ? 0f : (value > 1f ? 1f : value);
        public static float Clamp(float value, float min, float max) => value < min ? min : (value > max ? max : value);
    }

    public static class Application
    {
        public static bool isEditor => false;
    }

    public static class Input
    {
        public static bool GetKeyDown(int key) => false;
    }

    public enum KeyCode
    {
        Space
    }
}
