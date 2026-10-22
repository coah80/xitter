// Direct load, reload, and back/forward for every Xitter page.
// Run with the server up: node scripts/check-direct-load.mjs
// Not part of test:unit. It needs Chrome and a signed-in session.

import { createRequire } from "node:module";

const require = createRequire("/workspace/xitterbadge/package.json");
const puppeteer = require("puppeteer-core");

const origin = process.env.ORIGIN || "http://localhost:3000";
const user = process.env.XITTER_USER || "coah";
const password = process.env.XITTER_PASSWORD || "testpass123";

const paths = [
	"/account/xitter",
	"/account/theme",
	"/account/decor",
	"/account/decoration",
	"/account/organisation",
	"/account/automation",
	"/account/import",
	"/account/invites",
	"/account/migrate",
	"/account/passkeys",
	"/account/2fa",
	"/account/apps",
	"/account/apps/developer",
	"/account/api",
	"/account/instances",
	"/account/notices",
	"/account/notes/appeals",
	"/account/theme/",
	"/admin",
	"/admin/",
	"/federation/superadmin",
	"/account/no-such-page",
];

const login = await fetch(`${origin}/login`, { method: "POST", body: new URLSearchParams({ username: user, password }), redirect: "manual" });
if (login.status !== 303) throw new Error(`login ${login.status}`);
const jar = Object.fromEntries(login.headers.getSetCookie().map((c) => {
	const pair = c.split(";")[0];
	const cut = pair.indexOf("=");
	return [pair.slice(0, cut), pair.slice(cut + 1)];
}));

const browser = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
const host = new URL(origin).hostname;
await page.setCookie(...Object.entries(jar).map(([name, value]) => ({ name, value, domain: host, path: "/" })));

async function owned(label) {
	const html = await page.content();
	const text = await page.evaluate(() => (document.body && document.body.innerText || "").trim());
	const shell = html.includes('id="react-root"') || text.includes("Hmm");
	const ours = html.includes('data-xitter-page') || html.includes('class="xshell"') || html.includes('class="app"') || text === "not found";
	if (shell || !ours) throw new Error(`${label} showed the client shell`);
}

const failures = [];
for (const path of paths) {
	const url = origin + path;
	try {
		await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
		await owned(`${path} direct`);
		await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 });
		await owned(`${path} reload`);
		await page.goto(origin + "/home", { waitUntil: "domcontentloaded", timeout: 30000 });
		await page.goBack({ waitUntil: "domcontentloaded", timeout: 30000 });
		await owned(`${path} back`);
		await page.goForward({ waitUntil: "domcontentloaded", timeout: 30000 });
		const home = await page.content();
		if (!home.includes('id="react-root"')) throw new Error(`${path} forward did not return to the client`);
		console.log("ok", path);
	} catch (error) {
		failures.push(`${path}: ${error.message}`);
		console.error("fail", path, error.message);
	}
}

// every staff page has a way out: back to Settings > Xitter and to Home
async function fresh(width = 1280, height = 800) {
	const ctx = await browser.createBrowserContext();
	const p = await ctx.newPage();
	await p.setViewport({ width, height });
	await p.setCookie(...Object.entries(jar).map(([name, value]) => ({ name, value, domain: host, path: "/" })));
	return { ctx, p };
}
async function click(p, selector) {
	await p.waitForSelector(selector, { visible: true, timeout: 15000 });
	await Promise.all([p.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 30000 }), p.click(selector)]);
}
async function expectPath(p, want, label) {
	const got = new URL(p.url()).pathname;
	if (got !== want) throw new Error(`${label}: landed on ${got}, wanted ${want}`);
	if (want === "/account/xitter" && !(await p.$('a[href="/settings"]'))) throw new Error(`${label}: no way on to Settings`);
	if (want === "/home" && !(await p.content()).includes('id="react-root"')) throw new Error(`${label}: Home is not the client`);
}
const exits = [
	["from /admin opened from the rail", async () => {
		const { ctx, p } = await fresh();
		await p.goto(origin + "/account/theme", { waitUntil: "domcontentloaded" });
		await click(p, '.xrail a[href="/admin"]');
		await p.waitForSelector("#nav [data-page]", { timeout: 15000 });
		await click(p, "#navback");
		await expectPath(p, "/account/theme", "back arrow returns to the opener");
		await p.goto(origin + "/admin", { waitUntil: "domcontentloaded" });
		await click(p, '.xrail a[href="/home"]');
		await expectPath(p, "/home", "rail Home");
		await ctx.close();
	}],
	["from a deep hash", async () => {
		const { ctx, p } = await fresh();
		await p.goto(origin + "/admin#backups", { waitUntil: "domcontentloaded" });
		await p.waitForSelector('#nav [data-page="reports"]', { timeout: 15000 });
		await p.click('#nav [data-page="reports"]');
		await p.waitForFunction(() => location.hash === "#reports");
		await click(p, "#navback");
		await expectPath(p, "/account/xitter", "back arrow falls back to Settings > Xitter");
		await p.goto(origin + "/admin#audit", { waitUntil: "domcontentloaded" });
		await click(p, "#nav .navhead a.home");
		await expectPath(p, "/home", "logo goes Home");
		await ctx.close();
	}],
	["from a direct load on a phone", async () => {
		const { ctx, p } = await fresh(390, 844);
		await p.goto(origin + "/admin#reports", { waitUntil: "domcontentloaded" });
		await p.waitForSelector("#back", { visible: true, timeout: 15000 });
		await p.click("#back");
		await click(p, "#navback");
		await expectPath(p, "/account/xitter", "phone list back arrow");
		await ctx.close();
	}],
	["from note-appeal review and superadmin", async () => {
		const { ctx, p } = await fresh();
		for (const path of ["/account/notes/appeals", "/federation/superadmin"]) {
			const r = await p.goto(origin + path, { waitUntil: "domcontentloaded" });
			if (r.status() === 404 && (await p.evaluate(() => document.body.innerText.trim())) === "not found") continue; // not this viewer's page
			await click(p, ".xpage .bar a.back");
			await expectPath(p, "/account/xitter", `${path} back arrow`);
			await p.goto(origin + path, { waitUntil: "domcontentloaded" });
			await click(p, '.xrail a[href="/home"]');
			await expectPath(p, "/home", `${path} rail Home`);
		}
		await ctx.close();
	}],
];
for (const [label, run] of exits) {
	try {
		await run();
		console.log("ok exit", label);
	} catch (error) {
		failures.push(`exit ${label}: ${error.message}`);
		console.error("fail exit", label, error.message);
	}
}

await browser.close();
if (failures.length) {
	console.error(failures.join("\n"));
	process.exit(1);
}
console.log(`direct load ok for ${paths.length} urls, and every staff page has a way out (${exits.length} checks)`);
