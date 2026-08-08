import ts from 'typescript';

const code = `
import type { Database } from './src/types/database';

type IsEqual<T, U> =
  (<G>() => G extends T ? 1 : 2) extends
  (<G>() => G extends U ? 1 : 2) ? true : false;

export type DB = Database;
`;
// Actually, let's just use `npm run build` and output the error with `tsc --noEmit`. We already did that.
