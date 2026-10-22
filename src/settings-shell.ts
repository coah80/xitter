import type { XitterSection } from "./xitter-menu";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

const ROOTS = ["/account/xitter", "/account/apps", "/account/2fa", "/account/passkeys", "/account/notices", "/account/invites", "/account/api", "/account/notes", "/account/automation", "/account/instances", "/account/import", "/account/decoration", "/account/organisation", "/account/decor", "/account/theme", "/account/migrate"];

export function settingsChrome(pathname: string): boolean {
	return ROOTS.some((root) => pathname === root || pathname.startsWith(`${root}/`));
}

const CHEV = "M17.5 12 9 3.5 10.5 2l10 10-10 10L9 20.5 17.5 12z";
const EXTERNAL = "M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6v2H5v12h12v-6h2zM14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42L17.59 5H14V3z";
const SEARCH = "M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 5 1.5-1.5-5-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z";
const ARROW = "M7.414 13l5.043 5.04-1.414 1.42L3.586 12l7.457-7.46 1.414 1.42L7.414 11H21v2H7.414z";

export type HomeRow = { href: string; title: string; external?: boolean };

type SettingsEntry = HomeRow & { when?: "premium" | "creator_studio" };

export const SETTINGS_HOME: readonly SettingsEntry[] = [
	{ href: "/settings/account", title: "Your account" },
	{ href: "/account/xitter", title: "Xitter" },
	{ href: "/settings/monetization", title: "Monetization", when: "creator_studio" },
	{ href: "/i/premium", title: "Premium", when: "premium" },
	{ href: "/settings/security_and_account_access", title: "Security and account access" },
	{ href: "/settings/privacy_and_safety", title: "Privacy and safety" },
	{ href: "/settings/notifications", title: "Notifications" },
	{ href: "/settings/accessibility_display_and_languages", title: "Accessibility, display, and languages" },
	{ href: "/settings/about", title: "Additional resources" },
	{ href: "https://support.x.com/", title: "Help Center", external: true },
];

export function settingsHome(flags: { premium: boolean; creatorStudio: boolean }): HomeRow[] {
	return SETTINGS_HOME.flatMap((row) => {
		if (row.when === "premium" && !flags.premium) return [];
		if (row.when === "creator_studio" && !flags.creatorStudio) return [];
		return [{ href: row.href, title: row.title, ...(row.external ? { external: true as const } : {}) }];
	});
}

function searchBox(label: string): string {
	return `<label class="xsearch"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${SEARCH}"/></svg><input type="search" placeholder="${esc(label)}" aria-label="${esc(label)}" data-xfilter></label>`;
}

function linkRow(href: string, title: string, description: string, on: boolean, icon?: string, viewBox?: string, external?: boolean): string {
	const mark = on ? ' aria-current="page"' : "";
	const glyph = icon ? `<span class="xic"><svg viewBox="${esc(viewBox || "0 0 24 24")}" aria-hidden="true"><path d="${icon}"/></svg></span>` : "";
	const away = external ? ' target="_blank" rel="noopener noreferrer"' : "";
	const trail = external ? EXTERNAL : CHEV;
	return `<a class="xrow" href="${esc(href)}" data-find="${esc(`${title} ${description}`.toLowerCase())}"${mark}${away}>${glyph}<span class="xtx"><span class="xt">${esc(title)}</span>${description ? `<span class="xd">${esc(description)}</span>` : ""}</span><span class="xch" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="${trail}"/></svg></span></a>`;
}

function header(title: string, back?: { href: string; label: string }): string {
	const button = back ? `<a class="back" href="${esc(back.href)}" aria-label="${esc(back.label)}" title="${esc(back.label)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ARROW}"/></svg></a>` : "";
	return `<header class="bar">${button}<div class="heading"><div class="title">${esc(title)}</div></div></header>`;
}

export function renderSettingsShell(opts: { path: string; title: string; body: string; back: { href: string; label: string }; sections: XitterSection[]; home: HomeRow[]; sourceName: string; sourceUrl: string }): string {
	const home = opts.path === "/account/xitter";
	const depth = home ? "1" : "2";
	const here = (href: string) => opts.path === href || opts.path.startsWith(`${href}/`);
	const list = opts.home.map((row) => linkRow(row.href, row.title, "", row.href === "/account/xitter", undefined, undefined, row.external)).join("");
	const groups = opts.sections
		.map((section) => {
			const notes = (section.notes ?? []).map((note) => `<p class="xnote">${esc(note)}</p>`).join("");
			const rows = section.rows.map((row) => linkRow(row.href, row.text, row.description, here(row.href), row.icon, row.viewBox)).join("");
			return `<section data-group>${notes}<div class="xgrp">${esc(section.title)}</div><div class="xrows">${rows}</div></section>`;
		})
		.join("");
	const page = home
		? ""
		: `<div class="xpage" data-pane="page">${header(opts.title, opts.back)}<main>${opts.body}</main><footer class="source">${esc(opts.sourceName)} runs <a href="${esc(opts.sourceUrl)}">open source</a> software (AGPL-3.0)</footer></div>`;
	return `<div class="xshell" data-depth="${depth}">
<aside class="slist" data-pane="settings">${header("Settings", { href: "/home", label: "Home" })}${searchBox("Search settings")}<nav class="xrows" aria-label="Settings">${list}</nav></aside>
<div class="xlist" data-pane="xitter">${header("Xitter", { href: "/settings", label: "Settings" })}${searchBox("Search Xitter")}<div class="xrows">${groups}</div><footer class="source">${esc(opts.sourceName)} runs <a href="${esc(opts.sourceUrl)}">open source</a> software (AGPL-3.0)</footer></div>
${page}
</div>
<script>(function(){
document.querySelectorAll("[data-xfilter]").forEach(function(input){
var pane=input.closest("[data-pane]");
input.addEventListener("input",function(){
var q=input.value.trim().toLowerCase();
pane.querySelectorAll("[data-find]").forEach(function(row){row.hidden=!!q&&row.getAttribute("data-find").indexOf(q)<0});
pane.querySelectorAll("[data-group]").forEach(function(g){var any=false;g.querySelectorAll("[data-find]").forEach(function(r){if(!r.hidden)any=true});g.hidden=!!q&&!any});
});
});
})();</script>`;
}

export const SHELL_CSS = `
.xshell{display:flex;justify-content:center;align-items:flex-start;min-height:100vh}
.slist,.xlist,.xpage{min-height:100vh;display:flex;flex-direction:column;background:var(--bg)}
.slist{width:390px;flex:none;border-right:1px solid var(--border)}
.xlist,.xpage{width:600px;flex:none;border-right:1px solid var(--border)}
.xpage{min-width:0}
.xpage main{flex:1}
.xsearch{margin:4px 16px 12px;display:flex;align-items:center;gap:12px;height:42px;padding:0 16px;border:1px solid var(--border);border-radius:9999px;color:var(--muted)}
.xsearch:focus-within{border-color:var(--accent);color:var(--accent)}
.xsearch input{flex:1;min-width:0;border:0;background:transparent;outline:0;color:var(--text);font:inherit;min-height:0;padding:0;border-radius:0}
.xsearch svg{width:16px;height:16px;fill:currentColor;flex:none}
.xrows{display:flex;flex-direction:column}
.xrow{display:flex;align-items:center;gap:12px;padding:12px 16px;min-height:52px;color:var(--text);text-decoration:none;position:relative}
.xrow .xt{display:block;font-size:15px;line-height:20px}
.xrow .xd{display:block;color:var(--muted);font-size:13px;line-height:16px;margin-top:2px}
.xrow .xtx{flex:1;min-width:0}
.xrow .xic{color:var(--muted);display:grid}
.xrow .xch{color:var(--muted);display:grid}
.xrow .xic svg,.xrow .xch svg{width:18.75px;height:18.75px;fill:currentColor}
.xrow[aria-current]{background:var(--hover)}
.xrow[aria-current]::after{content:"";position:absolute;right:0;top:0;bottom:0;width:2px;background:var(--accent-fill,var(--accent))}
.xgrp{padding:16px 16px 4px;font-size:20px;line-height:24px;font-weight:800}
.xnote{margin:0;padding:12px 16px 0;color:var(--muted);font-size:15px;line-height:20px}
@media (hover:hover){.xrow:hover{background:var(--hover);text-decoration:none}}
@media (max-width:1100px) and (min-width:701px){.slist{width:300px}.xlist,.xpage{width:min(600px,calc(100vw - 300px))}}
@media (min-width:701px){.xshell[data-depth="1"] .xpage{display:none}.xshell[data-depth="2"] .xlist{display:none}.xlist>.bar .back,.slist>.bar .back{display:none}}
@media (max-width:700px){.xshell{display:block}.slist,.xlist,.xpage{width:100%;border-right:0}.xshell[data-depth="1"] .slist,.xshell[data-depth="1"] .xpage{display:none}.xshell[data-depth="2"] .slist,.xshell[data-depth="2"] .xlist{display:none}}
`;
