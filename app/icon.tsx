import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f4f3ec" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
          <div style={{ display: "flex", width: "5px", height: "14px", borderRadius: "1px", backgroundColor: "#1c1b18" }} />
          <div style={{ display: "flex", width: "16px", height: "3px", backgroundColor: "#1c1b18", opacity: 0.85 }} />
          <div style={{ display: "flex", width: "5px", height: "14px", borderRadius: "1px", backgroundColor: "#1c1b18" }} />
        </div>
      </div>
    ),
    { ...size }
  );
}
