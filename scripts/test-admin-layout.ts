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
	expect(html).toContain('needs: "platforms"');
	expect(html).toContain(".table, .table tbody { display: block;");
	expect(html).toContain("overflow-wrap: anywhere");
});
