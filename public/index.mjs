// only required for dev
// in prod, foundry loads index.mjs, which is compiled by vite/rollup
// in dev, foundry loads index.mjs, this file, which loads start.mjs

window.global = window; // some of your dependencies might need this
import './src/start.mjs';