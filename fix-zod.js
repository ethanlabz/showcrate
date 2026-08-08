import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

function walk(dir) {
  let results = [];
  const list = readdirSync(dir, { withFileTypes: true });
  list.forEach(file => {
    const res = join(dir, file.name);
    if (file.isDirectory()) {
      results = results.concat(walk(res));
    } else if (res.endsWith('.ts') || res.endsWith('.tsx')) {
      results.push(res);
    }
  });
  return results;
}

const files = [...walk('src/lib/validators'), ...walk('src/pages/api'), ...walk('src/middleware')];

for (const file of files) {
  let content = readFileSync(file, 'utf-8');
  let changed = false;
  
  if (content.includes('z.string().email(')) {
    content = content.replace(/z\.string\(\)\.email\(/g, 'z.string().email('); // wait! It was z.string().email('msg') that triggered a deprecation
    // wait, Zod 4 removed .email() from z.string() or just deprecated it?
    // I tested z.email('msg') earlier and it compiled. So I will replace:
    content = content.replace(/z\.string\(\)\.email\(/g, 'z.email(');
    changed = true;
  }
  if (content.includes('z.string().url(')) {
    content = content.replace(/z\.string\(\)\.url\(/g, 'z.url(');
    changed = true;
  }
  if (content.includes('z.string().uuid(')) {
    content = content.replace(/z\.string\(\)\.uuid\(/g, 'z.uuid(');
    changed = true;
  }
  
  if (content.includes('z.string().email()')) {
    content = content.replace(/z\.string\(\)\.email\(\)/g, 'z.email()');
    changed = true;
  }
  if (content.includes('z.string().url()')) {
    content = content.replace(/z\.string\(\)\.url\(\)/g, 'z.url()');
    changed = true;
  }
  if (content.includes('z.string().uuid()')) {
    content = content.replace(/z\.string\(\)\.uuid\(\)/g, 'z.uuid()');
    changed = true;
  }

  if (changed) {
    writeFileSync(file, content, 'utf-8');
    console.log(`Updated ${file}`);
  }
}
console.log('Done');
