const fs = require('fs');
const paths = [
  'node_modules/@supabase/supabase-js/dist/module/lib/types.d.ts', 
  'node_modules/@supabase/postgrest-js/dist/module/types.d.ts'
];
for (const p of paths) { 
  if (fs.existsSync(p)) {
    const content = fs.readFileSync(p, 'utf8');
    const index = content.indexOf('export interface GenericTable');
    if (index !== -1) {
      console.log('---', p, '---');
      console.log(content.substring(index, index + 500));
    }
  } 
}
