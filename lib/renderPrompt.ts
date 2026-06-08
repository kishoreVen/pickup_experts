import nunjucks from 'nunjucks';
import fs from 'fs';
import path from 'path';

const PROMPTS_DIR = path.join(process.cwd(), 'prompts');

export function renderPrompt(template: string, context: Record<string, unknown>): string {
  const src = fs.readFileSync(path.join(PROMPTS_DIR, template), 'utf-8');
  return nunjucks.renderString(src, context);
}
