#!/usr/bin/env bun

import fs from 'fs';

const server = Bun.serve({
	async fetch(req: Request): Promise<Response> {
		const url = new URL(req.url);
		if (url.pathname === '/')
			return new Response(Bun.file('html/index.html'));
		else if (url.pathname.startsWith('/credits'))
			return new Response(Bun.file('html/credits.html'));
		else if (url.pathname.startsWith('/static/')) {
			let file = Bun.file(url.pathname.substring(1));
			if (url.pathname.endsWith('.js') && await needsBuild()) {
				const output = await Bun.build({
					entrypoints: ['frontend/index.ts'],
					outdir: 'static',
					minify: false,
					sourcemap: 'linked',
					splitting: true,
				});
				for (const log of output.logs)
					console.log(log);
				if (!output.success)
					return new Response('500\n', {status: 500});
				file = Bun.file(url.pathname.substring(1));
			}
			if (!await file.exists())
				return new Response('404\n', {status: 404});
			return new Response(file);
		}
		return new Response('404\n', {status: 404});
	},
});
console.log(`listening on ${server.url.toString()}`);

async function needsBuild(): Promise<boolean> {
	const index = Bun.file('static/index.js');
	if (!await index.exists())
		return true;

	for (const filename of await readdir('frontend')) {
		if (!filename.endsWith('.ts'))
			continue;
		if (Bun.file('frontend/' + filename).lastModified > index.lastModified) {
			console.log(`needs build because frontend/${filename} is newer than static/index.js`);
			return true;
		}
	}
	return false;
}

async function readdir(dir: fs.PathLike): Promise<string[]> {
	const {promise, resolve, reject} = Promise.withResolvers<string[]>();
	fs.readdir(dir, (err, files) => {
		if (err === null)
			resolve(files);
		else
			reject(err);
	});
	return promise;
};
