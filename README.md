# 3D Sudoku

A static 3D Sudoku puzzle workspace. The site is built from TypeScript and deployed to GitHub Pages by the workflow in `.github/workflows/deploy.yml`.

## Development

Install Node.js 24, then run:

```sh
npm ci
npm test
```

`npm run build` compiles the browser scripts and copies the HTML and CSS into `dist/`. Serve that directory with a static web server. The scripts currently use shared browser globals inherited from the original JavaScript implementation; TypeScript's `noCheck` option allows the existing code to be compiled while it is gradually given explicit types. Tests run against the compiled scripts.
