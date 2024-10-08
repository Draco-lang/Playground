import { createTokenAuth } from '@octokit/auth-token';
import { build } from 'esbuild';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { createThemeBasedLogo as getFavicon } from './favicon-downloader.js';
import { Octokit } from '@octokit/rest';
import JSON5 from 'json5';
import YAML from 'yaml';
import { defineConfig, build as viteBuild } from 'vite';
import { convertTheme } from './theme-converter.js';
import { esbuildPluginVersionInjector } from 'esbuild-plugin-version-injector';
// This file manage the build process of the webapp.

const distDir = '../wwwroot';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const generatedDir = path.join(__dirname,'generated');
const outDir = path.join(__dirname, distDir);
const binFolder = process.argv[2];
const debug = binFolder.includes('Debug');

// rebundling the dotnet.js with vite bundler
// this was needed because firefox didn't supported esmodule in webworker
// it does now (the bugzilla ticket i followed on the subject was completed), so it may not be needed anymore.
async function dotnetjsBuild() {
    await viteBuild(defineConfig({ // Yes, I'm using another bundler, because this one bundle correctly dotnet.js to CJS...
        build: {
            lib: {
                entry: path.resolve(binFolder, 'dotnet.js'),
                name: 'dotnet',
                fileName: 'dotnet',
                formats: ['umd']
            },
            rollupOptions: {
                external: ['dotnet.native.wasm'],
                output: {
                    esModule: false,
                    format: 'cjs',
                    compact: true
                }
            },
            outDir: outDir
        }
    }));
    // Problem #1: ASP.NET DevServer doesn't send the correct MIME Type on cjs files.
    // Problem #2: I lost 30 mins trying to configure rollup to output `dotnet.js` instead of `dotnet.cjs` without success.
    // So I rename the file by hand instead...
    fs.renameSync(path.join(outDir, 'dotnet.umd.cjs'), path.join(outDir, 'dotnet.js'));

    fs.copyFileSync(path.join(binFolder, 'dotnet.native.wasm'), path.join(outDir, 'dotnet.native.wasm'));
}

await dotnetjsBuild();

// fetch updated syntax highlighting file
const dracoTmLanguage = await (await fetch('https://raw.githubusercontent.com/Draco-lang/Compiler/main/src/Draco.SyntaxHighlighting/draco.tmLanguage.json')).text();
if (!fs.existsSync(generatedDir)) fs.mkdirSync(generatedDir);
fs.writeFileSync(path.join(generatedDir, 'draco.tmLanguage.json'), dracoTmLanguage);

// this is a plugin to handle wasm file. We handle it like it was a binary file.
let wasmPlugin = {
    name: 'wasm',
    setup(build) {
        build.onLoad({ filter: /.wasm$/ }, async (args) => ({
            contents: await fs.promises.readFile(args.path),
            loader: 'binary'
        }));
    },
};

const workerEntryPoints = [
    'vs/editor/editor.worker.js'
];

// Bundle monaco editor workers.
await build({
    entryPoints: workerEntryPoints.map((entry) => `node_modules/monaco-editor/esm/${entry}`),
    bundle: true,
    minify: !debug,
    format: 'iife',
    outdir: outDir
});

// Bundle our app.
await build({
    entryPoints: ['ts/app.ts', 'css/app.css'],
    bundle: true,
    minify: !debug,
    format: 'esm',
    outdir: outDir,
    loader: {
        '.ttf': 'file',
        '.png': 'dataurl'
    },
    inject: ['ts/process.ts'],
    plugins: [wasmPlugin,
        esbuildPluginVersionInjector(
            {
                versionOrCurrentDate: 'current-date',
                filter: /metadata.ts$/,
            })
    ],
    external: ['dotnet.native.wasm']
});

// Bundle the worker.
await build({
    entryPoints: ['ts/worker.ts'],
    bundle: true,
    minify: true,
    format: 'cjs',
    outfile: path.join(outDir, 'worker.js'),
});

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
fs.copyFileSync('index.html', path.join(outDir, 'index.html'),); // Copy index.html to wwwroot.

console.log('Downloading logo svgs...');
const favicon = await getFavicon();
fs.writeFileSync(path.join(outDir, 'favicon.svg'), favicon); // Write favicon to wwwroot.

console.log('Downloading vs themes...');

let octokit;
if (process.env.GITHUB_TOKEN !== undefined && process.env.GITHUB_TOKEN.length > 0) {
    const auth = createTokenAuth(process.env.GITHUB_TOKEN);
    const authentication = await auth();
    octokit = new Octokit({
        auth: authentication.token,
    });
} else {
    octokit = new Octokit();
}


const response = await octokit.repos.getContent({
    owner: 'microsoft',
    repo: 'vscode',
    path: 'extensions/theme-defaults/themes'
});

const themes = await Promise.all(response.data.map(async s => {
    const resp = await fetch(s.download_url);
    const txt = await resp.text();
    const parsed = JSON5.parse(txt);
    const converted = convertTheme(parsed);
    return {
        name: parsed.name,
        filename: s.name,
        theme: converted
    };
}));
const themeObj = {};
const themePackageJson = await (await fetch('https://raw.githubusercontent.com/microsoft/vscode/main/extensions/theme-defaults/package.json')).json();
const themesMetadata = themePackageJson.contributes.themes;

themes.forEach(s => {
    themeObj[s.name] = s.theme;
    themeObj[s.name].base = themesMetadata.find(t => path.basename(t.path) == s.filename).uiTheme;
});

const themeListJson = JSON.stringify(themeObj);
fs.writeFileSync(path.join(outDir, 'themes.json'), themeListJson);
const csharpTextmateYml = await (await fetch('https://raw.githubusercontent.com/dotnet/csharp-tmLanguage/main/src/csharp.tmLanguage.yml')).text();
const csharpTextmate = JSON.stringify(YAML.parse(csharpTextmateYml));
fs.writeFileSync(path.join(outDir, 'csharp.tmLanguage.json'), csharpTextmate);
const ilTextmate = await (await fetch('https://raw.githubusercontent.com/soltys/vscode-il/master/syntaxes/il.json')).text();
fs.writeFileSync(path.join(outDir, 'il.tmLanguage.json'), ilTextmate);
