import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          background: "#fafaf9",
          padding: "80px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 72,
            height: 72,
            borderRadius: 16,
            background: "#d97757",
            color: "#fff",
            fontSize: 40,
            fontWeight: 700,
            marginBottom: 40,
          }}
        >
          C
        </div>
        <div style={{ fontSize: 64, fontWeight: 700, color: "#1c1917" }}>
          Claude Team Usage
        </div>
        <div
          style={{
            fontSize: 30,
            color: "#57534e",
            marginTop: 20,
            maxWidth: 900,
          }}
        >
          Ekibinizin Claude token kullanımını ve maliyetini kişi ve model
          bazında takip edin.
        </div>
      </div>
    ),
    size
  );
}
