import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const loadDependency = createRequire(import.meta.url)
const testDirectory = path.dirname(fileURLToPath(import.meta.url))

// Run the pure TypeScript rules and route handler without a Next.js server or live database.
export function load(relative, mocks = {}, cache = new Map()) {
  const filename = path.resolve(testDirectory, '..', relative)
  if (cache.has(filename)) return cache.get(filename).exports
  const loadedModule = { exports: {} }
  cache.set(filename, loadedModule)
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const resolve = (name) => {
    if (name in mocks) return mocks[name]
    const target = name.startsWith('@/') ? name.slice(2) : name.startsWith('.') ? path.relative(path.resolve(testDirectory, '..'), path.resolve(path.dirname(filename), name)) : null
    return target ? load(fs.existsSync(path.resolve(testDirectory, '..', `${target}.ts`)) ? `${target}.ts` : `${target}.tsx`, mocks, cache) : loadDependency(name)
  }
  new Function('require', 'module', 'exports', output)(resolve, loadedModule, loadedModule.exports)
  return loadedModule.exports
}

