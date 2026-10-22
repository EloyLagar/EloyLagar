// Ejecútalo UNA vez en tu PC para conseguir el refresh token:
//   SPOTIFY_CLIENT_ID=xxx SPOTIFY_CLIENT_SECRET=yyy node scripts/get-refresh-token.mjs
// (En PowerShell: $env:SPOTIFY_CLIENT_ID="xxx"; $env:SPOTIFY_CLIENT_SECRET="yyy"; node scripts/get-refresh-token.mjs)
import http from "node:http";

const { SPOTIFY_CLIENT_ID: id, SPOTIFY_CLIENT_SECRET: secret } = process.env;
const redirect = "http://127.0.0.1:8888/callback";
const authUrl =
  "https://accounts.spotify.com/authorize?" +
  new URLSearchParams({
    client_id: id,
    response_type: "code",
    redirect_uri: redirect,
    scope: "user-top-read",
  });

console.log("Abre esta URL en el navegador y acepta:\n\n" + authUrl + "\n");

http
  .createServer(async (req, res) => {
    const code = new URL(req.url, redirect).searchParams.get("code");
    if (!code) return res.end("Sin código");
    const r = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirect }),
    });
    const data = await r.json();
    console.log("\nSPOTIFY_REFRESH_TOKEN =\n" + data.refresh_token + "\n");
    res.end("Listo, vuelve a la terminal.");
    process.exit(0);
  })
  .listen(8888);
