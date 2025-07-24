import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

function configure({
  path,
  input = 'src/index.ts',
  peerDependencies = false,
  sourcemap = false,
}) {
  if (!path) throw new Error('A `path` is required.');

  const packageDirectory = dirname(fileURLToPath(path));
  const packageJSON = require(join(packageDirectory, 'package.json'));
  const rootDirectory = dirname(fileURLToPath(import.meta.url));

  return {
    external: [
      // Include package's own dependencies.
      ...Object.keys(packageJSON.dependencies || {}),
      // Optionally include package dependencies.
      ...(peerDependencies
        ? Object.keys(packageJSON.peerDependencies || {})
        : []),
    ],
    input,
    output: [
      {
        file: packageJSON.main,
        format: 'cjs',
        sourcemap,
        plugins: [],
      },
      {
        file: packageJSON.module,
        format: 'es',
        sourcemap,
        plugins: [],
      },
      {
        file: packageJSON.main.replace('.cjs', '.min.cjs'),
        format: 'cjs',
        sourcemap,
        plugins: [terser()],
      },
    ],
    plugins: [
      nodeResolve({
        modulePaths: [`${rootDirectory}/node_modules`],
      }),
      commonjs(),
      typescript({
        declaration: true,
        declarationDir: 'dist',
        outputToFilesystem: true,
        tsconfig: './tsconfig.json',
      }),
    ],
  };
}

export default configure;
