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

await browser.close();
if (failures.length) {
	console.error(failures.join("\n"));
	process.exit(1);
}
console.log(`direct load ok for ${paths.length} urls`);
