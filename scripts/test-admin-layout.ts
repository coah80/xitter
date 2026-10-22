import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { actionNeed } from "../src/staff-permissions";

test("an action the role cannot run names the permission", () => {
	expect(actionNeed("deletePost", "moderator")).toBe("Delete posts");
	expect(actionNeed("appeals", "moderator")).toBe("See and answer appeals");
	expect(actionNeed("createPlatform", "admin")).toBe("the admin role");
});

test("the admin panel is a searchable grouped list with a detail column", () => {
	const html = readFileSync(new URL("../src/admin.html", import.meta.url), "utf8");
	expect(html).toContain('aria-label="Search admin"');
	for (const group of ["Moderation", "Accounts", "Content", "Instance", "Staff"]) expect(html).toContain(`"${group}"`);
	expect(html).toContain('id="back"');
	expect(html).toContain('data-depth="0"');
	expect(html).toContain("function allow(action, html)");
	expect(html).toContain('allow("createBadge"');
	expect(html).toContain('allow("deletePost"');
	expect(html).toContain('allow("createInvite"');
	expect(html).toContain('need("createStickerPack")');
	expect(html).not.toContain('can("createBadge") ?');
	expect(html).not.toContain('can("deletePost") ?');
	expect(html).toContain('needs: "platforms"');
	expect(html).toContain(".table, .table tbody { display: block;");
	expect(html).toContain("overflow-wrap: anywhere");
});

test("the admin panel has a way back out", async () => {
	const { railNav, RAIL_CSS, settingsChrome } = await import("../src/settings-shell");
	const html = readFileSync(new URL("../src/admin.html", import.meta.url), "utf8");
	expect(html).toContain("{{rail}}");
	expect(html).toContain("{{railcss}}");
	expect(html).toContain('id="navback" href="/account/xitter"');
	expect(html).toContain('<a class="home" href="/home"');
	expect(html).toContain('sessionStorage.getItem("xitter-admin-from")');
	const rail = railNav({ screenName: "coah", admin: true, name: "Xitter", current: "admin" });
	for (const href of ["/home", "/explore", "/notifications", "/i/chat", "/coah", "/settings", "/compose/post"]) expect(rail).toContain(`href="${href}"`);
	expect(rail).toContain('href="/admin" aria-label="Admin" aria-current="page"');
	expect(RAIL_CSS).toContain(".xrail{display:none}");
	// Superadmin opens in the settings shell, with its rail and back arrow
	expect(settingsChrome("/federation/superadmin")).toBe(true);
	expect(settingsChrome("/federation/superadminx")).toBe(false);
});
