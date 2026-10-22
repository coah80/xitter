import { expect, test } from "bun:test";
import { renderSettingsShell, settingsChrome, settingsHome } from "../src/settings-shell";
import { tidyData } from "../src/tidy";
import { xitterSections, type MenuFacts } from "../src/xitter-menu";

function facts(over: Partial<MenuFacts> = {}): MenuFacts {
	return {
		role: null,
		localSuperadmin: false,
		instance: null,
		org: false,
		gold: false,
		notices: false,
		invitesOpen: false,
		federation: false,
		archiveImport: false,
		staffGate: null,
		instanceName: "Xitter",
		...over,
	};
}

function shell(path: string, sections = xitterSections(facts())) {
	return renderSettingsShell({
		path,
		title: "Theme",
		body: "<h1>Theme</h1>",
		back: { href: "/account/xitter", label: "Xitter" },
		sections,
		home: settingsHome({ premium: false, creatorStudio: false }),
		sourceName: "Xitter",
		sourceUrl: "https://example.com",
	});
}

test("settings chrome is the account pages, and X's own screens stay narrow", () => {
	for (const path of ["/account/xitter", "/account/theme", "/account/apps/developer", "/account/2fa/setup", "/account/notes/appeals", "/account/passkeys/remove"]) expect(settingsChrome(path)).toBe(true);
	for (const path of ["/account", "/account/switch", "/account/forgot", "/account/reset", "/account/email", "/account/email/confirm", "/account/passkey", "/appeal"]) expect(settingsChrome(path)).toBe(false);
});

test("the section is a list beside Settings, and a page replaces that list", () => {
	const home = shell("/account/xitter");
	expect(home).toContain('data-depth="1"');
	expect(home).toContain('href="/account/xitter"');
	expect(home).toContain("Appearance");
	expect(home).toContain('aria-label="Search Xitter"');
	expect(home).not.toContain('class="tabs"');
	expect(home).not.toContain('data-pane="page"');
	expect(home).not.toContain("/admin");
	const page = shell("/account/theme");
	expect(page).toContain('data-depth="2"');
	expect(page).toContain("<h1>Theme</h1>");
	expect(page).toContain('href="/account/xitter"');
	expect(page).toContain('aria-current="page"');
	const off = settingsHome({ premium: false, creatorStudio: false });
	expect(off.map((row) => row.title)).toEqual([
		"Your account",
		"Xitter",
		"Security and account access",
		"Privacy and safety",
		"Notifications",
		"Accessibility, display, and languages",
		"Additional resources",
		"Help Center",
	]);
	expect(off[1]).toEqual({ href: "/account/xitter", title: "Xitter" });
	expect(off.at(-1)).toEqual({ href: "https://support.x.com/", title: "Help Center", external: true });
	const slist = home.slice(home.indexOf('data-pane="settings"'), home.indexOf('data-pane="xitter"'));
	expect(slist).not.toContain("Monetization");
	expect(slist).not.toContain('class="xd"');
	expect(slist).toContain('target="_blank"');
	const on = settingsHome({ premium: true, creatorStudio: true }).map((row) => row.title);
	expect(on.indexOf("Xitter")).toBeLessThan(on.indexOf("Monetization"));
	expect(on.indexOf("Monetization")).toBeLessThan(on.indexOf("Premium"));
	expect(on.indexOf("Premium")).toBeLessThan(on.indexOf("Security and account access"));
});

test("a member payload has the Xitter row and no staff key", () => {
	const data = tidyData([]);
	expect(data.xitter.href).toBe("/account/xitter");
	expect("staff" in data).toBe(false);
	expect(JSON.stringify(data)).not.toContain("/admin");
	const staff = tidyData([], { nav: { href: "/admin", text: "Admin" }, tools: [] });
	expect(staff.staff?.nav).toEqual({ href: "/admin", text: "Admin" });
});
