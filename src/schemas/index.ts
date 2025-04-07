// src/schemas/index.ts
import { readFileSync } from 'fs';
import { join } from 'path';

export const schema = readFileSync(join(__dirname, 'schema.graphql'), 'utf8');