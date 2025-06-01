// See: https://rollupjs.org/introduction/

import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import { glob } from 'glob'

const typesFiles = glob
  .sync('src/repositories/types/*.ts')
  .reduce((acc, file) => {
    const name = file.replace('src/repositories/types/', '').replace('.ts', '')
    acc[`repositories/types/${name}`] = file
    return acc
  }, {})

const config = {
  input: {
    index: 'src/index.ts',
    ...typesFiles
  },
  output: {
    esModule: true,
    dir: 'dist',
    format: 'es',
    sourcemap: true
  },
  plugins: [typescript(), nodeResolve({ preferBuiltins: true }), commonjs()]
}

export default config
