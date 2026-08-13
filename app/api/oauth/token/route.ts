import { NextRequest, NextResponse } from "next/server";
import { decodeAuthCode } from "@/app/api/oauth/authorize/route";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    const params = new URLSearchParams(text);

    const grantType = params.get("grant_type");
    const code = params.get("code");
    const clientRefreshToken = params.get("refresh_token");

    if (!grantType) {
      return NextResponse.json({ error: "invalid_request", error_description: "Missing grant_type." }, { status: 400 });
    }

    if (grantType === "authorization_code") {
      if (!code) {
        return NextResponse.json({ error: "invalid_request", error_description: "Missing authorization code." }, { status: 400 });
      }

      let refreshToken: string;
      try {
        // Decode and verify the self-contained signed auth code — no Redis needed
        refreshToken = decodeAuthCode(decodeURIComponent(code));
      } catch {
        return NextResponse.json({ error: "invalid_grant", error_description: "Invalid or expired authorization code." }, { status: 400 });
      }

      // The Firebase Refresh Token itself becomes ChatGPT's permanent access
      // token — Google handles verification, requireUser() resolves it back
      // into a live session on every request.
      return NextResponse.json({
        access_token: refreshToken,
        token_type: "Bearer",
        refresh_token: refreshToken,
        expires_in: 315360000, // 10 years (Firebase refresh tokens don't expire unless revoked)
      });
    }

    if (grantType === "refresh_token") {
      if (!clientRefreshToken) {
        return NextResponse.json({ error: "invalid_request", error_description: "Missing refresh_token." }, { status: 400 });
      }
      return NextResponse.json({
        access_token: clientRefreshToken,
        token_type: "Bearer",
        refresh_token: clientRefreshToken,
        expires_in: 315360000,
      });
    }

    return NextResponse.json({ error: "unsupported_grant_type", error_description: "Grant type not supported." }, { status: 400 });
  } catch (error: any) {
    console.error("OAuth Token Exchange failed:", error);
    return NextResponse.json({ error: "server_error", error_description: error.message || "Failed to exchange token" }, { status: 500 });
  }
}

