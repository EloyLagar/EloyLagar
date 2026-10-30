// Genera assets/top-langs.svg con los lenguajes más usados en mis repos públicos.
// Sustituye a github-readme-stats.vercel.app, cuya instancia pública dejó de funcionar.
import { mkdir, writeFile } from "node:fs/promises";

const user = process.env.GH_USER ?? "EloyLagar";
const MAX_LANGS = 8;
// El repo del perfil solo tiene los scripts del README
const EXCLUDED_REPOS = new Set([user]);

const headers = { Accept: "application/vnd.github+json", "User-Agent": "github-profile-readme" };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

const gh = async (path) => {
  const res = await fetch(`https://api.github.com${path}`, { headers });
  if (!res.ok) throw new Error(`GitHub error ${res.status} en ${path}: ${await res.text()}`);
  return res.json();
};

// 1) Bytes por lenguaje sumando todos los repos propios (sin forks)
const repos = (await gh(`/users/${user}/repos?per_page=100&type=owner`)).filter(
  (r) => !r.fork && !r.archived && !EXCLUDED_REPOS.has(r.name)
);
const totals = {};
for (const repo of repos) {
  for (const [lang, bytes] of Object.entries(await gh(`/repos/${user}/${repo.name}/languages`))) {
    totals[lang] = (totals[lang] ?? 0) + bytes;
  }
}
const sum = Object.values(totals).reduce((a, b) => a + b, 0);
const langs = Object.entries(totals)
  .sort((a, b) => b[1] - a[1])
  .slice(0, MAX_LANGS)
  .map(([name, bytes]) => ({ name, pct: (bytes / sum) * 100 }))
  .filter((l) => l.pct >= 0.1);

// 2) Colores de GitHub Linguist
const COLORS = {
  Java: "#b07219", TypeScript: "#3178c6", JavaScript: "#f1e05a", PHP: "#4F5D95",
  Blade: "#f7523f", SCSS: "#c6538c", CSS: "#563d7c", HTML: "#e34c26",
  Dockerfile: "#384d54", Python: "#3572A5", Shell: "#89e051", Kotlin: "#A97BFF",
  "C#": "#178600", "C++": "#f34b7d", C: "#555555", Go: "#00ADD8", Vue: "#41b883",
  PLpgSQL: "#336790", TSQL: "#e38c00", Batchfile: "#C1F12E", PowerShell: "#012456",
};
const color = (name) => COLORS[name] ?? "#858585";

// 3) SVG con el estilo del card de rachas (fondo blanco, sin borde)
const W = 350;
const BAR_X = 25, BAR_Y = 55, BAR_W = W - 50;
const ROW_H = 25, LEGEND_Y = 90;
const rows = Math.ceil(langs.length / 2);
const H = LEGEND_Y + rows * ROW_H + 10;

let x = BAR_X;
const bar = langs
  .map(({ name, pct }) => {
    const w = (pct / 100) * BAR_W;
    const rect = `<rect x="${x.toFixed(2)}" y="${BAR_Y}" width="${w.toFixed(2)}" height="8" fill="${color(name)}"/>`;
    x += w;
    return rect;
  })
  .join("\n    ");

const legend = langs
  .map(({ name, pct }, i) => {
    const lx = BAR_X + (i % 2) * 155;
    const ly = LEGEND_Y + Math.floor(i / 2) * ROW_H;
    return `<g transform="translate(${lx}, ${ly})">
      <circle cx="5" cy="-4" r="5" fill="${color(name)}"/>
      <text x="15" y="0" class="lang">${name} ${pct.toFixed(2)}%</text>
    </g>`;
  })
  .join("\n    ");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="title">
  <title id="title">Most used languages</title>
  <style>
    .title { font: 600 18px 'Segoe UI', Ubuntu, sans-serif; fill: #2f80ed; }
    .lang { font: 400 11px 'Segoe UI', Ubuntu, sans-serif; fill: #434d58; }
  </style>
  <rect x="0.5" y="0.5" rx="4.5" width="${W - 1}" height="${H - 1}" fill="#fffefe"/>
  <text x="25" y="35" class="title">Most Used Languages</text>
  <mask id="bar-mask"><rect x="${BAR_X}" y="${BAR_Y}" width="${BAR_W}" height="8" rx="5" fill="white"/></mask>
  <g mask="url(#bar-mask)">
    ${bar}
  </g>
  ${legend}
</svg>
`;

await mkdir("assets", { recursive: true });
await writeFile("assets/top-langs.svg", svg);
console.log(langs.map((l) => `${l.name} ${l.pct.toFixed(1)}%`).join(", "));
