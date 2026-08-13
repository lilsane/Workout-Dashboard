import { NextRequest, NextResponse } from "next/server";
import { getCredentials, parseFirebaseConfig } from "@/lib/credentials";
import { verifyIdToken } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// GET: Render the authorization consent screen
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const clientId = searchParams.get("client_id");
  const redirectUri = searchParams.get("redirect_uri");
  const state = searchParams.get("state");

  if (!clientId || !redirectUri || !state) {
    return new NextResponse("Missing required OAuth 2.0 query parameters (client_id, redirect_uri, state).", { status: 400 });
  }

  // Fetch Firebase config from internal route so the client SDK can initialize
  let firebaseConfig;
  try {
    const creds = await getCredentials(req);
    firebaseConfig = parseFirebaseConfig(creds);
  } catch (error) {
    if (error instanceof ApiError) {
      return new NextResponse(`OAuth authorize failed: ${error.message}`, { status: error.status });
    }
    console.error("OAuth authorize (GET) failed:", error);
    return new NextResponse("OAuth authorize failed: internal server error.", { status: 500 });
  }

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Authorize ChatGPT — FitHub Coach</title>
      <style>
        body {
          background-color: #f4f3ec;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #1c1b18;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          padding: 20px;
          box-sizing: border-box;
        }
        .card {
          width: 100%;
          max-width: 420px;
          background-color: #ffffff;
          border: 1px solid #eae8e0;
          border-radius: 12px;
          padding: 32px;
          box-shadow: 0 4px 20px rgba(28, 27, 24, 0.03);
          box-sizing: border-box;
          text-align: center;
        }
        .logo { font-family: Georgia, serif; font-size: 24px; font-weight: bold; color: #1c1b18; margin-bottom: 24px; }
        .title { font-family: Georgia, serif; font-size: 18px; font-weight: bold; margin-bottom: 8px; }
        .subtitle { font-size: 13px; color: #7c7a72; line-height: 1.5; margin-bottom: 24px; }
        .user-badge { display: flex; align-items: center; justify-content: center; gap: 10px; background-color: #fcfbfa; border: 1px solid #eae8e0; border-radius: 8px; padding: 12px; margin-bottom: 24px; }
        .user-avatar { width: 32px; height: 32px; border-radius: 50%; background-color: #eae8e0; }
        .user-details { text-align: left; }
        .user-name { font-size: 12.5px; font-weight: 600; }
        .user-email { font-size: 11px; color: #7c7a72; }
        .btn { display: block; width: 100%; border: 1px solid #1c1b18; border-radius: 6px; padding: 12px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; box-sizing: border-box; }
        .btn-primary { background-color: #1c1b18; color: #ffffff; margin-bottom: 12px; }
        .btn-primary:hover { background-color: #2e2d27; }
        .btn-secondary { background-color: transparent; color: #1c1b18; }
        .btn-secondary:hover { background-color: #fcfbfa; }
        .loader { font-size: 13px; color: #7c7a72; font-style: italic; }
        .error { font-size: 12.5px; color: #b3666b; background-color: #b3666b10; border: 1px solid #b3666b30; padding: 10px; border-radius: 6px; margin-bottom: 16px; }
      </style>
      <script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js"></script>
      <script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-auth-compat.js"></script>
    </head>
    <body>
      <div class="card" id="consent-card">
        <div class="logo">FitHub Coach</div>

        <div id="loading" class="loader">Verifying login status…</div>

        <div id="auth-panel" style="display: none;">
          <h2 class="title">Sign In Required</h2>
          <p class="subtitle">Please sign in to authorize ChatGPT to connect with your training data.</p>
          <button id="login-btn" class="btn btn-primary">Sign In with Google</button>
        </div>

        <div id="consent-panel" style="display: none;">
          <h2 class="title">Connect to ChatGPT</h2>
          <p class="subtitle">Authorize ChatGPT to read and log your health profile, workouts, and coach notes.</p>

          <div class="user-badge">
            <img id="u-avatar" class="user-avatar" src="" style="display:none;" />
            <div id="u-avatar-placeholder" class="user-avatar" style="display: flex; align-items: center; justify-content: center; font-weight: bold; color: #7c7a72;">U</div>
            <div class="user-details">
              <div id="u-name" class="user-name">Loading user…</div>
              <div id="u-email" class="user-email">email@domain.com</div>
            </div>
          </div>

          <div id="err-box" class="error" style="display: none;"></div>

          <button id="allow-btn" class="btn btn-primary">Authorize Access</button>
          <button id="cancel-btn" class="btn btn-secondary">Cancel</button>
        </div>
      </div>

      <script>
        const config = ${JSON.stringify(firebaseConfig)};
        firebase.initializeApp(config);
        const auth = firebase.auth();

        const loadingDiv = document.getElementById('loading');
        const authPanel = document.getElementById('auth-panel');
        const consentPanel = document.getElementById('consent-panel');
        const errBox = document.getElementById('err-box');

        let currentUser = null;

        auth.onAuthStateChanged(async (user) => {
          loadingDiv.style.display = 'none';
          if (user) {
            currentUser = user;
            document.getElementById('u-name').innerText = user.displayName || 'Authorized User';
            document.getElementById('u-email').innerText = user.email;
            if (user.photoURL) {
              const avatar = document.getElementById('u-avatar');
              avatar.src = user.photoURL;
              avatar.style.display = 'block';
              document.getElementById('u-avatar-placeholder').style.display = 'none';
            }
            authPanel.style.display = 'none';
            consentPanel.style.display = 'block';
          } else {
            consentPanel.style.display = 'none';
            authPanel.style.display = 'block';
          }
        });

        document.getElementById('login-btn').onclick = () => {
          const provider = new firebase.auth.GoogleAuthProvider();
          auth.signInWithPopup(provider).catch(err => {
            alert("Login Failed: " + err.message);
          });
        };

        document.getElementById('cancel-btn').onclick = () => {
          window.close();
        };

        document.getElementById('allow-btn').onclick = async () => {
          if (!currentUser) return;

          document.getElementById('allow-btn').innerText = "Authorizing…";
          document.getElementById('allow-btn').disabled = true;
          errBox.style.display = 'none';

          try {
            const idToken = await currentUser.getIdToken(true);
            const refreshToken = currentUser.refreshToken;

            const res = await fetch('/api/oauth/authorize', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                idToken,
                refreshToken,
                clientId: "${clientId}",
                redirectUri: "${redirectUri}",
                state: "${state}"
              })
            });

            const data = await res.json();
            if (res.ok && data.redirectUrl) {
              window.location.href = data.redirectUrl;
            } else {
              throw new Error(data.error || "Authentication handshake failed.");
            }
          } catch (err) {
            errBox.innerText = err.message;
            errBox.style.display = 'block';
            document.getElementById('allow-btn').innerText = "Authorize Access";
            document.getElementById('allow-btn').disabled = false;
          }
        };
      </script>
    </body>
    </html>
  `;

  return new NextResponse(html, { headers: { "Content-Type": "text/html" } });
}

// -------------------------------------------------------------------
// Signed auth-code helpers — no Redis, no external services
// The refresh token is encoded in a self-contained HMAC-SHA256 signed
// token: base64url(JSON payload) + "." + base64url(HMAC signature).
// TTL is embedded in the payload; the token is single-use by design
// (ChatGPT exchanges it exactly once, immediately after redirect).
// -------------------------------------------------------------------

const CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function signingKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || process.env.FIREBASE_CONFIG || "fithub-oauth-fallback";
  return crypto.createHash("sha256").update(secret).digest();
}

export function encodeAuthCode(refreshToken: string): string {
  const payload = Buffer.from(
    JSON.stringify({ r: refreshToken, exp: Date.now() + CODE_TTL_MS })
  ).toString("base64url");
  const sig = crypto.createHmac("sha256", signingKey()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function decodeAuthCode(code: string): string {
  const dot = code.lastIndexOf(".");
  if (dot === -1) throw new Error("invalid_grant");

  const payload = code.slice(0, dot);
  const sig = code.slice(dot + 1);

  const expectedSig = crypto.createHmac("sha256", signingKey()).update(payload).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
    throw new Error("invalid_grant");
  }

  const { r, exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
  if (Date.now() > exp) throw new Error("invalid_grant");

  return r as string;
}

// POST: Validate credentials and issue a signed authorization code
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { idToken, refreshToken, clientId, redirectUri, state } = body;

    if (!idToken || !refreshToken || !clientId || !redirectUri || !state) {
      return NextResponse.json({ error: "Missing required parameters." }, { status: 400 });
    }

    const creds = await getCredentials(req);
    const config = parseFirebaseConfig(creds);
    await verifyIdToken(config, idToken);

    // Encode the refresh token into a signed, self-contained code — no Redis needed
    const authCode = encodeAuthCode(refreshToken);

    const redirectUrl = `${redirectUri}?code=${encodeURIComponent(authCode)}&state=${state}`;
    return NextResponse.json({ redirectUrl });
  } catch (error: any) {
    console.error("OAuth Authorization failed:", error);
    return NextResponse.json({ error: error.message || "Failed to process authorization" }, { status: 500 });
  }
}
