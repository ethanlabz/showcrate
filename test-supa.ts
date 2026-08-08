import { createClient } from '@supabase/supabase-js';
import type { Database } from './src/types/database';

const db = createClient<Database>('http://localhost', 'key');
const res = db.from('users').select('*');
// Try to assign it to something obviously wrong so TS prints the type
const x: number = res;
