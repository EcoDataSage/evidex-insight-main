import { copyFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const source = join(__dirname, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs');
const dest = join(__dirname, 'public', 'pdf.worker.min.mjs');

try {
  copyFileSync(source, dest);
  console.log('✓ PDF.js worker file copied to public folder');
} catch (error) {
  console.error('✗ Failed to copy PDF.js worker file:', error.message);
  process.exit(1);
}
