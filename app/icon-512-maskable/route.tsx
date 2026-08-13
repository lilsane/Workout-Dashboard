import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

// Maskable variant: full-bleed background with the mark inset well within
// the "safe zone" so OS launcher masks (circle, squircle, ...) never crop it.
export async function GET() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#1c1b18" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ display: "flex", width: 44, height: 140, borderRadius: 12, backgroundColor: "#f4f3ec" }} />
          <div style={{ display: "flex", width: 154, height: 28, backgroundColor: "#f4f3ec", opacity: 0.9 }} />
          <div style={{ display: "flex", width: 44, height: 140, borderRadius: 12, backgroundColor: "#f4f3ec" }} />
        </div>
      </div>
    ),
    { ...size }
  );
}
