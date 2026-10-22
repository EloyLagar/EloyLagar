// Pone en el README la canción más escuchada de los últimos ~30 días (time_range=short_term).
import { readFile, writeFile } from "node:fs/promises";

const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN } = process.env;
if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SPOTIFY_REFRESH_TOKEN) {
  console.error("Faltan los secrets de Spotify.");
  process.exit(1);
}

// 1) Refresh token -> access token
const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
  method: "POST",
  headers: {
    Authorization:
      "Basic " + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64"),
    "Content-Type": "application/x-www-form-urlencoded",
  },
  body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: SPOTIFY_REFRESH_TOKEN }),
});
if (!tokenRes.ok) throw new Error(`Token error ${tokenRes.status}: ${await tokenRes.text()}`);
const { access_token } = await tokenRes.json();

// 2) Top track de las últimas ~4 semanas
const topRes = await fetch("https://api.spotify.com/v1/me/top/tracks?time_range=short_term&limit=1", {
  headers: { Authorization: `Bearer ${access_token}` },
});
if (!topRes.ok) throw new Error(`Top tracks error ${topRes.status}: ${await topRes.text()}`);
const track = (await topRes.json()).items?.[0];

const esc = (s) => s.replace(/[|[\]<>]/g, "");
let block;
if (!track) {
  block = "_No listening data yet._";
} else {
  const name = esc(track.name);
  const artists = esc(track.artists.map((a) => a.name).join(", "));
  const cover = track.album.images.at(-2)?.url ?? track.album.images[0]?.url;
  const url = track.external_urls.spotify;
  block = [
    `<a href="${url}"><img src="${cover}" width="80" align="left" alt="${name} cover"></a>`,
    ``,
    `**[${name}](${url})**  `,
    `${artists}  `,
    `<sub>My most played track on Spotify in the last 4 weeks</sub>`,
    ``,
    `<br clear="left"/>`,
  ].join("\n");
}

// 3) Reemplazar entre los marcadores
const readme = await readFile("README.md", "utf8");
const updated = readme.replace(
  /<!-- SPOTIFY:START -->[\s\S]*?<!-- SPOTIFY:END -->/,
  `<!-- SPOTIFY:START -->\n${block}\n<!-- SPOTIFY:END -->`
);
await writeFile("README.md", updated);
console.log(track ? `Top track: ${track.name} — ${track.artists[0].name}` : "Sin datos");
