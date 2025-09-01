import type { UserConfig } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

const config: UserConfig = {
    publicDir: 'public',
    base: '/systems/sra2/',
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
            entry: 'src/start.mjs',
            formats: ['es'],
            fileName: 'index',
        },
    },
    plugins: [
        visualizer({
            gzipSize: true,
            template: "treemap",
        })
    ]
}

export default config;
