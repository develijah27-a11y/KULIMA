const path = require('path')
const fs = require('fs')

module.exports = (request, options) => {
  let target = request

  // Handle @/ path alias
  if (request.startsWith('@/')) {
    target = path.resolve(options.rootDir || process.cwd(), 'src', request.slice(2))
  }

  const extensions = options.extensions || ['.ts', '.tsx', '.js', '.jsx', '.json', '.node']

  // If target is an absolute or relative path that exists directly as a file
  if (path.isAbsolute(target) || target.startsWith('.')) {
    const abs = path.isAbsolute(target) ? target : path.resolve(options.basedir, target)
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
      return abs
    }
    for (const ext of extensions) {
      if (fs.existsSync(abs + ext) && fs.statSync(abs + ext).isFile()) {
        return abs + ext
      }
      const indexFile = path.join(abs, 'index' + ext)
      if (fs.existsSync(indexFile) && fs.statSync(indexFile).isFile()) {
        return indexFile
      }
    }
  }

  // Otherwise, use Node resolution
  try {
    return require.resolve(target, {
      paths: [options.basedir, ...(options.paths || []), options.rootDir || process.cwd()],
    })
  } catch (e) {
    for (const ext of extensions) {
      try {
        return require.resolve(target + ext, {
          paths: [options.basedir, ...(options.paths || []), options.rootDir || process.cwd()],
        })
      } catch {}
      try {
        return require.resolve(path.join(target, 'index' + ext), {
          paths: [options.basedir, ...(options.paths || []), options.rootDir || process.cwd()],
        })
      } catch {}
    }
    throw e
  }
}
