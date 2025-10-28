const http = require('http');
const fs = require('fs');
const path = require('path');

const port = Number(process.env.PORT || 5173);
const rootDir = path.resolve(__dirname, '..');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  if (!req.url) {
    res.statusCode = 400;
    res.end('Bad request');
    return;
  }

  let filePath;
  let requestedPath;
  try {
    requestedPath = decodeURIComponent(req.url.split('?')[0]);
  } catch (error) {
    res.statusCode = 400;
    res.end('Bad request');
    return;
  }

  if (requestedPath === '/' || requestedPath === '') {
    filePath = path.join(rootDir, 'index.html');
  } else {
    let safeSuffix = path
      .normalize(requestedPath)
      .replace(/^([.][.][\\/])+/, '')
      .replace(/^[/\\]+/, '');
    filePath = path.join(rootDir, safeSuffix);
  }

  if (!filePath.startsWith(rootDir)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }

    if (stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    const stream = fs.createReadStream(filePath);
    stream.on('open', () => {
      res.setHeader('Content-Type', contentType);
    });
    stream.on('error', () => {
      res.statusCode = 500;
      res.end('Internal server error');
    });
    stream.pipe(res);
  });
});

server.listen(port, () => {
  console.log(`Preview available at http://localhost:${port}`);
});
