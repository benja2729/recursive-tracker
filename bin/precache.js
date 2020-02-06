const fs = require('fs');
const path = require('path');

fs.readFile(path.join(__dirname, '../packages.har'), 'utf8', (error, data) => {
  if (error) {
    throw error;
  }
  const packageRaw = fs.readFileSync(
    path.join(__dirname, '../package.json'),
    'utf8'
  );
  const package = JSON.parse(packageRaw);

  const har = JSON.parse(data);
  const paths = ['/', 'index.html'].concat(
    har.log.entries.map(({ request }) => new URL(request.url).pathname)
  );
  const urls = JSON.stringify(paths)
    .replace(/^\[/, '[\n  ')
    .replace(/,/g, ',\n  ')
    .replace(/\]$/, '\n]');

  const content = `const PRECACHE_VERSION = '${package.name}--precache-v${package.version}';
const RUNTIME_VERSION = '${package.name}--runtime-v${package.version}';
const PRECACHE_URLS = ${urls};`;

  fs.writeFileSync(
    path.join(__dirname, '../src/workers/precache.js'),
    content,
    'utf8'
  );
});
