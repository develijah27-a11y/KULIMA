const esbuild = require('esbuild')

module.exports = {
  process(sourceText, sourcePath) {
    const result = esbuild.transformSync(sourceText, {
      loader: sourcePath.endsWith('.tsx') ? 'tsx' : 'ts',
      format: 'cjs',
      target: 'node18',
      sourcemap: 'inline',
    })
    return {
      code: result.code,
    }
  },
}
