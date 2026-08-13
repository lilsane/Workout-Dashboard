import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export async function GET() {
  const radius = 112;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f4f3ec", borderRadius: radius }}>
        <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
          <div style={{ display: "flex", width: 64, height: 204, borderRadius: 16, backgroundColor: "#1c1b18" }} />
          <div style={{ display: "flex", width: 224, height: 42, backgroundColor: "#1c1b18", opacity: 0.85 }} />
          <div style={{ display: "flex", width: 64, height: 204, borderRadius: 16, backgroundColor: "#1c1b18" }} />
        </div>
      </div>
    ),
    { ...size }
  );
}
