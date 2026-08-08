import { z } from 'zod';

// Trying z.email() instead of z.string().email()
const schema1 = z.email('Invalid email');
const schema2 = z.url('Invalid URL');
