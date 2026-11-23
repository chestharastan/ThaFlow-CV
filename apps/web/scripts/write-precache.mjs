// Runs after `next build`. Lists everything the service worker should store at install so the app works
// offline after one visit (pages, route data, scripts, styles), and stamps the worker with a build id so
// each release replaces the previous cache. Fonts and other media are cached the first time they are used.
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const out = fileURLToPath(new URL("../out", import.meta.url));

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)])));
  return files.flat();
}

const urls = [];
for (const file of await walk(out)) {
  const path = "/" + relative(out, file).split(sep).join("/");
  if (path === "/sw.js" || path === "/precache.json") continue;
  if (path.endsWith("/index.html")) urls.push(path.slice(0, -"index.html".length));
  else if (/\.(txt|webmanifest|svg|mjs)$/.test(path) || /^\/_next\/static\/.+\.(js|css)$/.test(path)) urls.push(path);
}
urls.sort();
await writeFile(join(out, "precache.json"), JSON.stringify(urls));

const build = createHash("sha256").update(urls.join("\n")).digest("hex").slice(0, 12);
const workerPath = join(out, "sw.js");
await writeFile(workerPath, (await readFile(workerPath, "utf8")).replace("__BUILD__", build));
console.log(`precache: ${urls.length} files, build ${build}`);
