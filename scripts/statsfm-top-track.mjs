// Pone en el README la canción más escuchada de la última semana según stats.fm (range=weeks).
// El perfil de stats.fm es público, así que no hace falta ningún secret.
import { readFile, writeFile } from "node:fs/promises";

const user = process.env.STATSFM_USER;
if (!user) {
  console.error("Falta STATSFM_USER.");
  process.exit(1);
}

// 1) Top track de los últimos 7 días
const res = await fetch(
  `https://api.stats.fm/api/v1/users/${encodeURIComponent(user)}/top/tracks?range=weeks&limit=1`,
  { headers: { "User-Agent": "github-profile-readme" } }
);
if (!res.ok) throw new Error(`stats.fm error ${res.status}: ${await res.text()}`);
const top = (await res.json()).items?.[0];

const esc = (s) => s.replace(/[|[\]<>"]/g, "");
let block;
if (!top) {
  block = "_No listening data this week._";
} else {
  const { track, streams } = top;
  const name = esc(track.name);
  const artists = esc(track.artists.map((a) => a.name).join(", "));
  // Portada de 300px en lugar de la de 640px
  const cover = track.albums[0]?.image?.replace("ab67616d0000b273", "ab67616d00001e02");
  const spotifyId = track.externalIds?.spotify?.[0];
  const url = spotifyId
    ? `https://open.spotify.com/track/${spotifyId}`
    : `https://stats.fm/track/${track.id}`;
  block = [
    `<a href="${url}"><img src="${cover}" width="80" align="left" alt="${name} cover"></a>`,
    ``,
    `**[${name}](${url})**  `,
    `${artists}  `,
    `<sub>My most played track on Spotify in the last week · ${streams} plays · via <a href="https://stats.fm/${user}">stats.fm</a></sub>`,
    ``,
    `<br clear="left"/>`,
  ].join("\n");
}

// 2) Reemplazar entre los marcadores
const readme = await readFile("README.md", "utf8");
const updated = readme.replace(
  /<!-- SPOTIFY:START -->[\s\S]*?<!-- SPOTIFY:END -->/,
  `<!-- SPOTIFY:START -->\n${block}\n<!-- SPOTIFY:END -->`
);
await writeFile("README.md", updated);
console.log(top ? `Top track: ${top.track.name} — ${top.track.artists[0].name}` : "Sin datos");
