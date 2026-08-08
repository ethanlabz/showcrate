import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/types/database.ts';
let content = readFileSync(filePath, 'utf-8');

// The line pattern looks like:
// users: { Row: UserRow; Insert: UserInsert; Update: Partial<UserInsert> };
// We want to add `Relationships: any[];` before the closing brace.
content = content.replace(/(Row:\s*[^;]+;\s*Insert:\s*[^;]+;\s*Update:\s*[^;]+)\s*}/g, '$1; Relationships: any[]; }');

writeFileSync(filePath, content, 'utf-8');
console.log('Fixed relationships');
