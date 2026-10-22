// X's web client has its own screens at these paths. Every other /account,
// /admin, and /federation/superadmin URL is ours. If a signed-in GET misses
// an exact handler it must not fall through to the client shell: the client
// paints "Hmm...this page doesn't exist" for paths it does not own.

const CLIENT_ACCOUNT = new Set(["/account", "/account/switch"]);

export function blocksClientShell(pathname: string): boolean {
	if (CLIENT_ACCOUNT.has(pathname) || pathname.startsWith("/account/not_my_account/")) return false;
	if (pathname.startsWith("/account/")) return true;
	if (pathname === "/admin" || pathname.startsWith("/admin/")) return true;
	return pathname === "/federation/superadmin" || pathname.startsWith("/federation/superadmin/");
}

export function trailingSlashTarget(pathname: string): string | null {
	if (pathname.length <= 1 || !pathname.endsWith("/")) return null;
	const to = pathname.replace(/\/+$/, "");
	if (!to || to === pathname) return null;
	if (blocksClientShell(to) || blocksClientShell(pathname) || CLIENT_ACCOUNT.has(to) || to.startsWith("/account/not_my_account/")) return to;
	return null;
}

export function xitterNotFoundPage(): Response {
	const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page not found · Xitter</title></head>
<body data-xitter-page="missing"><h1>Xitter has no page here</h1><p><a href="/settings">Back to settings</a></p></body></html>`;
	return new Response(html, {
		status: 404,
		headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
	});
}
