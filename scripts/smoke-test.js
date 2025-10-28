const fs = require('fs');
const path = require('path');

const files = ['index.html', 'app.js', 'styles.css'];

const missing = files.filter((file) => !fs.existsSync(path.resolve(__dirname, '..', file)));

if (missing.length > 0) {
  console.error('Missing files:', missing.join(', '));
  process.exitCode = 1;
} else {
  console.log('All core assets are in place. Ready to preview.');
}
