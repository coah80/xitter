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

const HOME = "M21.591 7.146 12.52 1.157c-.316-.21-.724-.21-1.04 0l-9.071 5.99c-.26.173-.409.456-.409.757v13.183c0 .502.418.913.929.913H9.14c.51 0 .929-.41.929-.913v-7.075h3.909v7.075c0 .502.417.913.928.913h6.165c.511 0 .929-.41.929-.913V7.904c0-.301-.158-.584-.408-.758z";
const EXPLORE = "M10.25 3.75c-3.59 0-6.5 2.91-6.5 6.5s2.91 6.5 6.5 6.5c1.795 0 3.419-.726 4.596-1.904 1.178-1.177 1.904-2.801 1.904-4.596 0-3.59-2.91-6.5-6.5-6.5zm-8.5 6.5c0-4.694 3.806-8.5 8.5-8.5s8.5 3.806 8.5 8.5c0 1.986-.682 3.815-1.824 5.262l4.781 4.781-1.414 1.414-4.781-4.781c-1.447 1.142-3.276 1.824-5.262 1.824-4.694 0-8.5-3.806-8.5-8.5z";
const BELL = "M19.993 9.042C19.48 5.017 16.054 2 11.996 2s-7.49 3.021-7.999 7.051L2.866 18H7.1c.463 2.282 2.481 4 4.9 4s4.437-1.718 4.9-4h4.236l-1.143-8.958zM12 20c-1.306 0-2.417-.835-2.829-2h5.658c-.412 1.165-1.523 2-2.829 2zm-6.866-4 .847-6.698C6.364 6.272 8.941 4 11.996 4s5.627 2.268 6.013 5.295L18.864 16H5.134z";
const CHAT = "M1.998 5.5c0-1.381 1.119-2.5 2.5-2.5h15c1.381 0 2.5 1.119 2.5 2.5v10c0 1.381-1.119 2.5-2.5 2.5h-15c-1.381 0-2.5-1.119-2.5-2.5v-10zm2.5-.5c-.276 0-.5.224-.5.5v2.764l8 3.638 8-3.638V5.5c0-.276-.224-.5-.5-.5h-15zm15.5 5.463-8 3.636-8-3.636V15.5c0 .276.224.5.5.5h15c.276 0 .5-.224.5-.5v-5.037z";
const PERSON = "M5.651 19h12.698c-.337-1.8-1.023-3.21-1.945-4.218C15.318 13.65 13.838 13 12 13s-3.317.65-4.404 1.782C6.675 15.79 5.99 17.2 5.651 19zm.486-14.09C7.115 3.81 8.42 3.25 10 3.25h4c1.58 0 2.885.56 3.863 1.66.96 1.087 1.387 2.616 1.387 4.34 0 1.725-.426 3.254-1.387 4.34-.978 1.1-2.283 1.66-3.863 1.66h-4c-1.58 0-2.885-.56-3.863-1.66C4.676 12.504 4.25 10.975 4.25 9.25c0-1.724.427-3.253 1.387-4.34zM12 21c-2.15 0-3.987-.705-5.292-2.01C5.415 17.697 4.75 16.01 4.75 14.25V9.25C4.75 7.49 5.415 5.803 6.708 4.51 8.013 3.205 9.85 2.5 12 2.5s3.987.705 5.292 2.01C18.585 5.803 19.25 7.49 19.25 9.25v5c0 1.76-.665 3.447-1.958 4.74C15.987 20.295 14.15 21 12 21z";
const MORE = "M3.75 12a8.25 8.25 0 1 1 16.5 0 8.25 8.25 0 0 1-16.5 0zM12 1.75C6.34 1.75 1.75 6.34 1.75 12S6.34 22.25 12 22.25 22.25 17.66 22.25 12 17.66 1.75 12 1.75zM7.25 13.25a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5zm4.75 0a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5zm4.75 0a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5z";
const SHIELD = "M12 1.5 3.5 5v6c0 5.2 3.6 10 8.5 11.5 4.9-1.5 8.5-6.3 8.5-11.5V5L12 1.5zm0 2.2 6.5 2.7V11c0 4.2-2.8 8.2-6.5 9.4-3.7-1.2-6.5-5.2-6.5-9.4V6.4L12 3.7z";
const PLUS = "M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7V4z";

export type ShellRail = { screenName: string; admin: boolean };

function railLink(href: string, label: string, icon: string): string {
	return `<a href="${esc(href)}" aria-label="${esc(label)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${icon}"/></svg><span class="xlabel">${esc(label)}</span></a>`;
}

function railNav(opts: { screenName: string; admin: boolean; name: string }): string {
	const items = [
		railLink("/home", "Home", HOME),
		railLink("/explore", "Explore", EXPLORE),
		railLink("/notifications", "Notifications", BELL),
		railLink("/i/chat", "Chat", CHAT),
		railLink(`/${encodeURIComponent(opts.screenName)}`, "Profile", PERSON),
		...(opts.admin ? [railLink("/admin", "Admin", SHIELD)] : []),
		railLink("/settings", "More", MORE),
	].join("");
	return `<nav class="xrail" aria-label="Primary"><a class="xmark" href="/home" aria-label="${esc(opts.name)}"></a><div class="xnav">${items}</div><a class="xpost" href="/compose/post"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${PLUS}"/></svg><span class="xlabel">Post</span></a></nav>`;
}

export function renderSettingsShell(opts: { path: string; title: string; body: string; back: { href: string; label: string }; sections: XitterSection[]; home: HomeRow[]; sourceName: string; sourceUrl: string; rail: ShellRail }): string {
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
	return `<div class="xapp">${railNav({ screenName: opts.rail.screenName, admin: opts.rail.admin, name: opts.sourceName })}<div class="xshell" data-depth="${depth}">
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
})();</script></div>`;
}

export const SHELL_CSS = `
.xapp{display:flex;justify-content:center;align-items:flex-start;min-height:100vh}
.xrail{position:sticky;top:0;height:100vh;width:275px;flex:none;display:flex;flex-direction:column;align-items:flex-start;padding:0 12px 16px;overflow-y:auto}
.xmark{display:block;width:150px;height:56px;margin-top:2px;border-radius:9999px;background:var(--logo) 12px center/128px auto no-repeat}
.xnav{display:flex;flex-direction:column;width:100%;align-items:stretch}
.xnav a{display:flex;align-items:center;gap:20px;min-height:50px;padding:12px;border-radius:9999px;color:var(--text);font-size:20px;line-height:24px;font-weight:400;text-decoration:none}
.xnav a svg{width:26.25px;height:26.25px;fill:currentColor;flex:none}
.xpost{display:flex;align-items:center;justify-content:center;width:calc(100% - 24px);max-width:226px;height:52px;margin:16px 12px 0;border-radius:9999px;background:var(--accent-fill,var(--accent));color:#fff;font-size:17px;line-height:20px;font-weight:700;text-decoration:none}
.xpost svg{display:none;width:24px;height:24px;fill:currentColor}
.xshell{display:flex;align-items:flex-start;min-height:100vh}
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
@media (hover:hover){
.xrow:hover,.xnav a:hover,.xmark:hover{background-color:var(--hover);text-decoration:none}
.xpost:hover{background:var(--accent-hover);text-decoration:none}
}
@media (max-width:1280px) and (min-width:701px){
.xrail{width:88px;padding:0 6px 16px;align-items:center}
.xmark{width:50px;background-image:var(--icon);background-size:30px;background-position:center}
.xnav{align-items:center;width:auto}
.xnav a{width:50px;height:50px;min-height:50px;padding:0;justify-content:center;gap:0}
.xlabel{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.xpost{width:50px;height:50px;margin:16px 0 0;padding:0}
.xpost svg{display:block}
.slist{width:300px}
.xlist,.xpage{width:min(600px,calc(100vw - 388px))}
}
@media (min-width:701px){.xshell[data-depth="1"] .xpage{display:none}.xshell[data-depth="2"] .xlist{display:none}.xlist>.bar .back,.slist>.bar .back{display:none}}
@media (max-width:700px){.xrail{display:none}.xshell{display:block}.slist,.xlist,.xpage{width:100%;border-right:0}.xshell[data-depth="1"] .slist,.xshell[data-depth="1"] .xpage{display:none}.xshell[data-depth="2"] .slist,.xshell[data-depth="2"] .xlist{display:none}}
`;
