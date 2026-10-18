// PostToolUse hook: format the file Claude just wrote/edited with Prettier.
// Reads the hook payload from stdin; skips files Prettier ignores or can't parse.
import { readFile, writeFile } from 'node:fs/promises'
import { isAbsolute, relative, resolve } from 'node:path'
import * as prettier from 'prettier'

let input = ''
for await (const chunk of process.stdin) input += chunk

const { tool_input, tool_response } = JSON.parse(input)
const file = tool_response?.filePath ?? tool_input?.file_path
if (!file) process.exit(0)

// Only format files inside this project
const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd()
const rel = relative(projectDir, resolve(file))
if (rel.startsWith('..') || isAbsolute(rel)) process.exit(0)

const info = await prettier.getFileInfo(file, {
  ignorePath: ['.gitignore', '.prettierignore'],
})
if (info.ignored || !info.inferredParser) process.exit(0)

const source = await readFile(file, 'utf8')
const options = await prettier.resolveConfig(file)
const formatted = await prettier.format(source, { ...options, filepath: file })
if (formatted !== source) await writeFile(file, formatted)
