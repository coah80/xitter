import { expect, test } from "bun:test";
import { clientPayload, publicMenuLinks, staffTools, xitterSections, type MenuFacts } from "../src/xitter-menu";

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

const hrefs = (rows: { href: string }[]) => rows.map((r) => r.href);
const staffHrefs = (role: MenuFacts["role"], over: Partial<MenuFacts> = {}) =>
	staffTools(facts({ role, ...over })).flatMap((t) => (t.kind === "link" ? [t.href] : []));

test("a member sees the pages menuLinks already allowed, and no staff data", () => {
	const member = facts();
	expect(publicMenuLinks(member).map((l) => [l.href, l.where])).toEqual([
		["/account/apps", "settings"],
		["/account/theme", "settings"],
		["/account/decoration", "both"],
		["/account/automation", "tabs"],
		["/account/passkeys", "settings"],
		["/account/migrate", "settings"],
		["/account/api", "settings"],
		["/account/notes/appeals", "settings"],
	]);
	const open = facts({ org: true, gold: true, notices: true, invitesOpen: true, federation: true, archiveImport: true });
	expect(hrefs(publicMenuLinks(open))).toEqual([
		"/account/apps",
		"/account/invites",
		"/account/organisation",
		"/account/decor",
		"/account/theme",
		"/account/decoration",
		"/account/automation",
		"/account/notices",
		"/account/instances",
		"/account/passkeys",
		"/account/import",
		"/account/migrate",
		"/account/api",
		"/account/notes/appeals",
	]);
	const payload = clientPayload(member);
	expect(payload.staff).toBeUndefined();
	expect(JSON.stringify(payload)).not.toContain("/admin");
	expect(JSON.stringify(payload)).not.toContain("/federation/superadmin");
	const sections = xitterSections(member);
	expect(sections.map((s) => s.id)).toEqual(["appearance", "account", "security", "notes"]);
	expect(hrefs(sections.find((s) => s.id === "security")!.rows)).toEqual(["/account/passkeys", "/account/2fa", "/account/apps", "/account/api"]);
	expect(hrefs(xitterSections(facts({ instance: "other.example" })).find((s) => s.id === "security")!.rows)).not.toContain("/account/2fa");
});

test("staff tools follow what each role can open", () => {
	const support = staffHrefs("support");
	expect(support).toContain("/admin");
	expect(support).toContain("/admin#reports");
	expect(support).toContain("/admin#users");
	expect(support).not.toContain("/admin#appeals");
	expect(support).not.toContain("/admin#apps");
	expect(support).not.toContain("/admin#errors");
	expect(support).not.toContain("/admin#switches");
	expect(support.some((h) => h === "/account/notes/appeals")).toBe(false);

	const moderator = staffHrefs("moderator");
	expect(moderator).toContain("/admin#appeals");
	expect(moderator).toContain("/account/notes/appeals");
	expect(moderator).not.toContain("/admin#apps");
	expect(moderator).not.toContain("/admin#errors");
	expect(moderator).not.toContain("/federation/superadmin");

	const admin = staffHrefs("admin");
	expect(admin).toContain("/admin#apps");
	expect(admin).toContain("/admin#errors");
	expect(admin).toContain("/admin#switches");
	expect(admin).toContain("/admin#permissions");
	expect(admin).not.toContain("/federation/superadmin");

	const home = staffHrefs("admin", { localSuperadmin: true });
	expect(home).toContain("/federation/superadmin");
	expect(staffHrefs("moderator", { localSuperadmin: true })).not.toContain("/federation/superadmin");

	const gated = staffTools(facts({ role: "admin", localSuperadmin: true, staffGate: "Staff need two-factor authentication." }));
	expect(gated).toEqual([{ kind: "note", text: "Staff need two-factor authentication." }]);
	const payload = clientPayload(facts({ role: "admin", staffGate: "blocked" }));
	expect(payload.staff?.nav).toBeUndefined();
	expect(JSON.stringify(payload.staff)).not.toContain("/admin");
	expect(clientPayload(facts({ role: "support" })).staff?.nav).toEqual({ href: "/admin", text: "Admin" });
});
