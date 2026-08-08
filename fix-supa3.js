import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/types/database.ts';
let content = readFileSync(filePath, 'utf-8');

// The exact string that Supabase CLI uses:
const validBottom = "{\n      [_ in never]: never\n    }";

content = content.replace(/Views: \{ \[key: string\]: any; \};/g, `Views: ${validBottom};`);
content = content.replace(/Functions: \{ \[key: string\]: any; \};/g, `Functions: ${validBottom};`);
content = content.replace(/CompositeTypes: \{ \[key: string\]: any; \};/g, `CompositeTypes: ${validBottom};`);

// For Tables, we need to ensure they match GenericTable. 
// Supabase CLI uses: Relationships: { ... }[]
// Let's replace Relationships: { ... }[] with just Relationships: []
content = content.replace(/Relationships: \{ [^}]+\}\[\];/g, 'Relationships: [];');

writeFileSync(filePath, content, 'utf-8');
console.log('Fixed DB types with exact CLI string');
