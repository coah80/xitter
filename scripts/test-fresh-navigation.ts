import { expect, test } from "bun:test";
import { runInNewContext } from "node:vm";
import { FRESH_SCRIPT } from "../src/tidy";

function browser() {
	const assigned: string[] = [];
	const pushed: string[] = [];
	const stored: Record<string, string> = {};
	const listeners: Record<string, () => void> = {};
	const location = { href: "https://example.test/home", pathname: "/home", search: "", assign: (path: string) => assigned.push(path), reload: () => assigned.push("reload") };
	const history = { pushState: (_state: unknown, _title: string, path: string) => pushed.push(path) };
	class Request {
		open() {}
		addEventListener() {}
	}
	const window = { fetch: async () => ({ ok: true }), addEventListener: (name: string, fn: () => void) => { listeners[name] = fn; } };
	runInNewContext(FRESH_SCRIPT, { window, history, location, URL, XMLHttpRequest: Request, sessionStorage: { setItem: (key: string, value: string) => { stored[key] = value; } } });
	return { assigned, pushed, stored, listeners, location, history, fetch: window.fetch as (url: string, init: { method: string }) => Promise<unknown> };
}

test("bookmark writes refresh only their affected destination", async () => {
	const b = browser();
	await b.fetch("/i/api/graphql/abc/CreateBookmark", { method: "POST" });
	b.history.pushState({}, "", "/settings/account");
	expect(b.assigned).toEqual([]);
	expect(b.pushed).toEqual(["/settings/account"]);
	b.history.pushState({}, "", "/i/bookmarks");
	expect(b.assigned).toEqual(["/i/bookmarks"]);
});

test("read-only POST queries do not invalidate native navigation", async () => {
	const b = browser();
	await b.fetch("/i/api/graphql/abc/BookmarkTimeline", { method: "POST" });
	b.history.pushState({}, "", "/i/bookmarks");
	expect(b.assigned).toEqual([]);
	expect(b.pushed).toEqual(["/i/bookmarks"]);
});

test("owned admin links still remember their opener", () => {
	const b = browser();
	b.history.pushState({}, "", "/admin#users");
	expect(b.assigned).toEqual(["/admin#users"]);
	expect(b.stored["xitter-admin-from"]).toBe("/home");
	expect(b.pushed).toEqual([]);
});
