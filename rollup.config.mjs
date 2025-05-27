import { defineConfig } from 'rollup';
import swcPlugin from '@rollup/plugin-swc';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

const option = defineConfig({
  input: './src/simulation.ts',
  output: {
    file: './build/main.cjs',
    format: 'commonjs'
  },
  plugins: [
    resolve({ extensions: ['.ts', '.js', '.json'] }),
    commonjs(),
    swcPlugin({
      swc: {
        jsc: {
          parser: {
            syntax: 'typescript',
          },
          target: 'es2016'
        }
      }
    }),
  ]
});

export default option;