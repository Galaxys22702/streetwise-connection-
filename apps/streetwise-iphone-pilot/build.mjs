import { mkdir, readFile, writeFile } from 'node:fs/promises';

const assets = {};
for (const [route, name, type] of [
  ['/','index.html','text/html'],
  ['/app.js','app.js','text/javascript'],
  ['/call.js','call.js','text/javascript'],
  ['/style.css','style.css','text/css']
]) {
  assets[route] = { body:await readFile('public/' + name,'utf8'), contentType:type + '; charset=utf-8' };
}
await mkdir('dist/server',{ recursive:true });
await writeFile('dist/server/index.js', await readFile('worker/index.mjs','utf8') +
  '\nexport default makeWorker(' + JSON.stringify(assets) + ');\n');
