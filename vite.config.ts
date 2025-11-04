import type { UserConfig } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

const config: UserConfig = {
    publicDir: 'public',
    base: '/systems/sra2/',
    root: '.',
    server: {
        port: 30001,
        open: true,
        proxy: {
            '^(?!/systems/sra2/)': 'http://localhost:30000/',
            '/socket.io': {
                target: 'ws://localhost:30000',
                ws: true,
            },
        }
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: true,
        lib: {
            name: 'sra2',
            entry: 'src/start.ts',
            formats: ['es'],
            fileName: 'index',
        },
        rollupOptions: {
            output: {
                assetFileNames: 'style/sra2.css'
            }
        },
        minify: 'terser',
        terserOptions: {
            mangle: {
                keep_classnames: true,
                keep_fnames: true
            }
        } as any
    },
    css: {
        preprocessorOptions: {
            scss: {
                // Add global SCSS variables/mixins here if needed
                // additionalData: `@import "./src/styles/variables.scss";`
            }
        }
    },
    resolve: {
        extensions: ['.ts', '.mjs', '.js', '.json', '.scss']
    },
    plugins: [
        visualizer({
            gzipSize: true,
            template: "treemap",
        })
    ]
}

export default config;
