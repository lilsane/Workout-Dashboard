import { ImageResponse } from "next/og";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

// Standalone Route Handler (not the special icon.tsx convention) so the URL
// is stable and predictable for manifest.ts to reference directly.
export async function GET() {
  const radius = 42;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f4f3ec", borderRadius: radius }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", width: 24, height: 76, borderRadius: 6, backgroundColor: "#1c1b18" }} />
          <div style={{ display: "flex", width: 84, height: 16, backgroundColor: "#1c1b18", opacity: 0.85 }} />
          <div style={{ display: "flex", width: 24, height: 76, borderRadius: 6, backgroundColor: "#1c1b18" }} />
        </div>
      </div>
    ),
    { ...size }
  );
}
