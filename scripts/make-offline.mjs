/**
 * Превращает проверенную статическую сборку Vite в один HTML для запуска двойным
 * щелчком. Скрипты/стили внедряются дословно. Если сборка станет многомодульной,
 * проверка остановит упаковку, чтобы в офлайн-файл не попали неразрешимые импорты.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
const site = path.resolve('dist');
const output = path.resolve('release');
let html = await fs.readFile(path.join(site, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g)];
const styles = [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)];
if (scripts.length !== 1 || /rel="modulepreload"/.test(html))
  throw new Error('Для офлайн-упаковки нужен один входной JS-файл.');
const local = (url) => path.join(site, url.replace(/^\//, ''));
for (const [tag, url] of scripts) {
  const js = (await fs.readFile(local(url), 'utf8')).replace(/<\/script/gi, '<\\/script');
  html = html.replace(tag, () => '<script type="module">' + js + '</script>');
}
for (const [tag, url] of styles) {
  const css = await fs.readFile(local(url), 'utf8');
  html = html.replace(tag, () => '<style>' + css + '</style>');
}
const icon = await fs.readFile(path.join(site, 'mark.svg'));
html = html.replace(
  'href="/mark.svg"',
  'href="data:image/svg+xml;base64,' + icon.toString('base64') + '"',
);
const notices = await fs.readFile(path.join(site, 'third-party.txt'), 'utf8');
html = html.replace(
  '</body>',
  () => '<script type="text/plain" id="third-party-notices">' + notices + '</script></body>',
);
await fs.mkdir(output, { recursive: true });
await fs.writeFile(path.join(output, 'PLAY.html'), html);
console.log('Готово: release/PLAY.html');
