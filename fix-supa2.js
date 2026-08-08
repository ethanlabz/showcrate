import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/types/database.ts';
let content = readFileSync(filePath, 'utf-8');

// Fix Views, Functions, CompositeTypes
content = content.replace(/Views: \{\s*\[_ in never\]: never;\s*\};/g, 'Views: { [key: string]: any; };');
content = content.replace(/Functions: \{\s*\[_ in never\]: never;\s*\};/g, 'Functions: { [key: string]: any; };');
content = content.replace(/CompositeTypes: \{\s*\[_ in never\]: never;\s*\};/g, 'CompositeTypes: { [key: string]: any; };');

// Fix Relationships
content = content.replace(/Relationships: any\[\];/g, 'Relationships: { foreignKeyName: string; columns: string[]; isOneToOne: boolean; referencedRelation: string; referencedColumns: string[]; }[];');

writeFileSync(filePath, content, 'utf-8');
console.log('Fixed DB types fully');
