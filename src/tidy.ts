// What the page changes in the client: features this instance switches off
// (admin panel > Settings > Features), links to x.com pages, X's own sign-in
// screens, and the announcement banner. CSS where an element has a stable link
// or test id, a small script where only its text tells it apart.

import { FEDERATION_ON, INSTANCE_ID } from "./federation";
import { sql } from "./db";
import { type Feature, feature, settings } from "./settings";
import type { Viewer } from "./auth";
import { staffGate } from "./staff-access";
import { superadminOf } from "./superadmins";
import { publicMenuLinks, type ClientPayload, type MenuFacts, type MenuLink } from "./xitter-menu";

export type { MenuLink };

const links = (...hrefs: string[]) => hrefs.map((h) => `a[href="${h}"],a[href^="${h}?"]`);
const ids = (...testIds: string[]) => testIds.map((t) => `[data-testid="${t}"]`);

const BY_FEATURE: Record<Feature, string[]> = {
	communities: ['[role="menu"] a[href$="/communities"]'],
	lists: ['[role="menu"] a[href$="/lists"]'],
	gifs: ids("gifSearchButton"),
	polls: ids("createPollButton"),
	location: ids("geoButton"),
	scheduling: ids("scheduleOption"),
	grok: [...links("/i/grok"), ...ids("GrokDrawer")],
	image_gen: [...ids("grokImgGen"), '[role="dialog"] [aria-label="Edit with Imagine"]'],
	premium: [
		...links("/i/premium_sign_up", "/settings/premium", "/i/premium"),
		...ids("premium-signup-tab"),
		// the sidebar's upsell boxes ("Subscribe to Premium", "Spend $1k, Get $1k", ...) are
		// asides; the account suggestions are the asides worth keeping
		'[data-testid="sidebarColumn"] div:has(> aside:not([aria-label="Who to follow"]):not([aria-label="Relevant people"]))',
		'[data-testid="sidebarColumn"] aside:not([aria-label="Who to follow"]):not([aria-label="Relevant people"])',
	],
	calls: [...links("/i/calls"), ...ids("AppTabBar_Calls_Link")],
	// only the menu entries: the History page itself holds the Bookmarks tab and its folders
	history: ["header", '[role="menu"]', '[data-testid="sidebarColumn"]'].flatMap((root) => links("/i/history").map((l) => `${root} ${l}`)),
	creator_studio: links("/i/jf/creators/studio", "/i/monetization", "/settings/monetization"),
	spaces: links("/i/spaces/start"),
	business: links("/i/verified-orgs-signup"),
};

// never offered: ads, x.com's help and footer pages, paid partnerships, jobs
const ALWAYS = [
	...links("/jobs"),
	...ids("contentDisclosureButton", "ProfessionalButton_Switch_To_Professional"),
	'a[href^="https://ads.x.com"]',
	'a[href^="https://help.x.com"]',
	'[data-testid="sidebarColumn"] nav[aria-label="Footer"]',
	// the signed-out home page's footer keeps Terms and Privacy (our rules page)
	'nav[aria-label="Footer"] > div:has(> a[href^="http"]:not([href$="/tos"]):not([href$="/privacy"]))',
	'nav[aria-label="Footer"] > div:has(> a[href^="/i/jf/stories"])',
];

export function hideCss(): string {
	const off = (Object.keys(BY_FEATURE) as Feature[]).filter((f) => !feature(f)).flatMap((f) => BY_FEATURE[f]);
	return `${[...ALWAYS, ...off].join(",")}{display:none!important}
#xitter-announcement{display:flex;gap:12px;align-items:flex-start;padding:12px 16px;background:var(--xt-accent-fill,var(--xt-accent,#1d9bf0));color:#fff;font:15px TwitterChirp,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
#xitter-announcement .xa-body{flex:1;min-width:0;display:grid;gap:10px}
#xitter-announcement .xa-text{white-space:pre-wrap;overflow-wrap:break-word}
#xitter-announcement .xa-buttons{display:flex;flex-wrap:wrap;gap:8px}
#xitter-announcement .xa-buttons a{display:inline-flex;align-items:center;min-height:32px;padding:0 14px;border-radius:8px;background:rgb(255 255 255 / .2);color:#fff;font-weight:700;font-size:14px;text-decoration:none;white-space:nowrap;transition:background-color 120ms ease-out}
#xitter-announcement .xa-buttons a:focus-visible{outline:2px solid #fff;outline-offset:2px}
@media (hover:hover){#xitter-announcement .xa-buttons a:hover{background:rgb(255 255 255 / .3)}}
#xitter-announcement button{border:0;background:none;color:#fff;font-size:20px;line-height:1;cursor:pointer;padding:0 4px}`;
}

// The More menu and Settings get a subset of these. `where` says which.
export async function loadMenuFacts(req: Request, viewer: Viewer): Promise<MenuFacts> {
	const s = settings();
	const [u] = await sql`select coalesce(u.verified_type in ('business', 'government'), false) or exists (select 1 from affiliations where org_id = u.id)
			or exists (select 1 from affiliations where user_id = u.id) or exists (select 1 from affiliation_requests where user_id = u.id) as org,
		exists (select 1 from staff_messages where user_id = u.id and revoked_at is null) or exists (select 1 from moderation_appeals where user_id = u.id) as notices,
		coalesce(u.verified_type in ('business', 'government', 'government_individual'), false) as gold
		from users u where u.id = ${viewer.id}::bigint`;
	const role = viewer.role ?? null;
	return {
		role,
		localSuperadmin: role === "admin" && !viewer.instance && !!superadminOf(INSTANCE_ID, viewer.screen_name, viewer.id),
		instance: viewer.instance ?? null,
		org: !!u?.org,
		gold: !!u?.gold,
		notices: !!u?.notices,
		invitesOpen: !!(s.invite_quota.enabled && s.signup_mode === "invite"),
		federation: FEDERATION_ON,
		archiveImport: feature("archive_import"),
		staffGate: role ? await staffGate(req, viewer) : null,
		instanceName: s.instance_name,
	};
}

export async function menuLinks(req: Request, viewer: Viewer): Promise<MenuLink[]> {
	return publicMenuLinks(await loadMenuFacts(req, viewer));
}

// what the script needs to know, as window.__XITTER__.tidy
const XITTER_ROW = {
	href: "/account/xitter",
	text: "Xitter",
	description: "Theme, profile decor, apps, and the other things this instance adds.",
	icon: "M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z",
	viewBox: "0 0 24 24",
};

export function tidyData(links: MenuLink[] = [], staff?: ClientPayload["staff"]) {
	const s = settings();
	const menuItems = ["Embed post"];
	if (!feature("lists")) menuItems.push("Add/remove from Lists");
	return {
		menuItems,
		premium: feature("premium"),
		imageGen: feature("image_gen"),
		announcement: s.announcement.text
			? {
					id: s.announcement.id,
					text: s.announcement.text,
					buttons: s.announcement.buttons?.length ? s.announcement.buttons : s.announcement.link ? [{ label: "More", url: s.announcement.link }] : [],
				}
			: null,
		instance: s.instance_name,
		source: s.source_url,
		links,
		xitter: XITTER_ROW,
		...(staff ? { staff } : {}),
	};
}

// The client caches the lists it already fetched and doesn't know our mutations
// change them (a new community, list or bookmark stays missing until a reload).
// After one of those mutations succeeds, the next navigation loads the page
// fresh instead of from the cache.
export const FRESH_SCRIPT = `(function(){
	var stale=false;
	var own=/(List|Communit|PinTimeline|Scheduled|Draft|Bookmark|Poll)/;
	function seen(url,method){
		var m=/\\/graphql\\/[^/]+\\/(\\w+)/.exec(String(url));
		return !!m&&String(method||"GET").toUpperCase()==="POST"&&own.test(m[1])&&!/^(Fetch|Get)/.test(m[1]);
	}
	var f=window.fetch;
	window.fetch=function(input,init){
		var p=f.apply(this,arguments);
		try{
			var hit=seen(typeof input==="string"?input:input.url,(init&&init.method)||(input&&input.method));
			if(hit)p.then(function(r){if(r.ok)stale=true},function(){});
		}catch(e){}
		return p;
	};
	var open=XMLHttpRequest.prototype.open;
	XMLHttpRequest.prototype.open=function(method,url){
		try{
			if(seen(url,method))this.addEventListener("load",function(){if(this.status<400)stale=true});
		}catch(e){}
		return open.apply(this,arguments);
	};
	var push=history.pushState;
	history.pushState=function(s,t,u){
		if(u&&ownedPath(u)){location.assign(String(u));return;}
		if(stale&&u&&!/\\/(compose|i\\/flow|i\\/bookmarks\\/add)/.test(String(u))){
			stale=false;
			location.assign(u);
			return;
		}
		return push.apply(this,arguments);
	};
	window.addEventListener("popstate",function(){
		if(stale){stale=false;location.reload()}
	});
	function ownedPath(u){
		var path="";
		try{path=new URL(String(u),location.origin).pathname}catch(e){return false}
		if(path==="/account"||path==="/account/switch"||path.indexOf("/account/not_my_account/")===0)return false;
		if(path.indexOf("/account/")===0)return true;
		if(path==="/admin"||path.indexOf("/admin/")===0)return true;
		return path==="/federation/superadmin"||path.indexOf("/federation/superadmin/")===0;
	}
})();`;

// The dialog's "Forgot password?" has no screen behind it here: it goes to our
// own reset page, with the username typed so far.
export const FORGOT_SCRIPT = `(function(){
	document.addEventListener("click",function(e){
		var el=e.target;
		while(el&&el!==document.body){
			if(el.textContent==="Forgot password?"&&(/^(BUTTON|A)$/.test(el.tagName)||el.getAttribute("role")==="button")){
				e.preventDefault();e.stopPropagation();
				var field=document.querySelector('input[name="username"],input[name="username_or_email"]');
				location.assign("/account/forgot"+(field&&field.value?"?u="+encodeURIComponent(field.value):""));
				return;
			}
			el=el.parentElement;
		}
	},true);
	// Settings > Two-factor: the authenticator app row opens our set-up page
	document.addEventListener("click",function(e){
		if(location.pathname.indexOf("/settings/account/login_verification")!==0)return;
		var el=e.target;
		while(el&&el!==document.body){
			var t=el.textContent||"";
			if(t.indexOf("Authentication app")===0&&t.length<260){
				e.preventDefault();e.stopPropagation();
				location.assign("/account/2fa");
				return;
			}
			el=el.parentElement;
		}
	},true);
})();`;

export const TIDY_SCRIPT = `(function(){
	var T=(window.__XITTER__||{}).tidy||{menuItems:[]};
	// X's old sign-up flow talks to its servers; ours is in the dialog on the signed-out home page
	function ownScreens(){
		var p=location.pathname;
		if(p.indexOf("/i/flow/signup")===0)location.replace("/");
		// Settings > Email's "Update email address": our page, not X's flow
		if(p.indexOf("/i/flow/add_email")===0)location.replace("/account/email");
		// Settings > Automation's "Set up account automation" (automation.ts)
		if(p.indexOf("/i/flow/enable_automated_account")===0)location.replace("/account/automation");
		// Settings > Security's passkey screens and X's add-a-passkey flow talk to its servers (passkeys.ts)
		if(/passkey/i.test(p)&&(p.indexOf("/settings/")===0||p.indexOf("/i/flow/")===0))location.replace("/account/passkeys");
	}
	// the signed-out footer ends with X's copyright (its name already the
	// instance's, patch.ts): the instance's name and source instead
	function footer(){
		var nav=document.querySelector('nav[aria-label="Footer"]');
		if(!nav||nav.querySelector("[data-xitter-source]"))return;
		var c=[].find.call(nav.querySelectorAll("span"),function(s){return /^\u00a9 \d{4} .* Corp\.$/.test(s.textContent)});
		if(!c)return;
		c.textContent=T.instance+" · ";
		var a=document.createElement("a");
		a.href=T.source;a.target="_blank";a.rel="noopener";a.textContent="source code";a.style.color="inherit";
		a.setAttribute("data-xitter-source","");
		c.appendChild(a);
	}
	// the More menu's "Settings and privacy" copied for each of our pages; the
	// copy has none of the client's handlers, so it is a plain link
	function leave(a,href){
		a.setAttribute("href",href);a.setAttribute("data-xitter-link","");
		a.addEventListener("click",function(e){e.preventDefault();e.stopPropagation();location.assign(href)},true);
	}
	function copy(a,l){
		leave(a,l.href);a.removeAttribute("data-testid");
		var text=[l.text,l.description];
		[].filter.call(a.querySelectorAll("span"),function(n){return !n.childElementCount&&n.textContent.trim()}).forEach(function(n,i){if(text[i])n.textContent=text[i]});
		var svg=a.querySelector("svg"),path=svg&&svg.querySelector("path");
		if(path){[].slice.call(svg.querySelectorAll("path")).slice(1).forEach(function(p){p.remove()});path.removeAttribute("fill-rule");path.removeAttribute("clip-rule");path.setAttribute("d",l.icon);if(l.viewBox)svg.setAttribute("viewBox",l.viewBox)}
		// the client hovers its entries from script, which the copy doesn't
		// get: X's hover grey for the theme (light, dim, dark)
		a.addEventListener("mouseenter",function(){
			var bg=getComputedStyle(document.body).backgroundColor;
			a.style.backgroundColor=bg==="rgb(255, 255, 255)"?"rgb(247, 249, 249)":bg==="rgb(21, 32, 43)"?"rgb(30, 39, 50)":"rgb(22, 24, 28)";
		});
		a.addEventListener("mouseleave",function(){a.style.backgroundColor=""});
	}
	function menuLinks(){
		var items=(T.links||[]).filter(function(l){return l.where==="menu"||l.where==="both"});
		if(!items.length)return;
		// each entry sits alone in a row wrapper, so the copy takes the wrapper along
		var s=document.querySelector('[role="menu"] a[href="/settings"]');
		var row=s&&s.parentNode;
		if(!row||row.parentNode.querySelector("[data-xitter-link]"))return;
		items.forEach(function(l){
			var box=row.cloneNode(true);
			copy(box.querySelector('a[href="/settings"]'),l);
			row.parentNode.insertBefore(box,row);
		});
	}
	function xitterRow(){
		var spec=T.xitter;
		if(!spec||document.querySelector("a[data-xitter-settings]"))return;
		var account=document.querySelector('a[href="/settings/account"]');
		var sample=document.querySelector('a[href="/settings/monetization"]')||document.querySelector('a[href="/settings/privacy_and_safety"]')||account;
		var accountBox=account&&account.parentElement;
		var sampleBox=sample&&sample.parentElement;
		if(!accountBox||!sampleBox||!accountBox.parentElement||accountBox.parentElement!==sampleBox.parentElement)return;
		var box=sampleBox.cloneNode(true);
		var link=box.querySelector("a");
		if(!link)return;
		leave(link,spec.href);
		link.removeAttribute("data-testid");
		link.setAttribute("data-xitter-settings","");
		var title=link.querySelector("span");
		if(title)title.textContent=spec.text;
		accountBox.parentElement.insertBefore(box,accountBox.nextSibling);
	}
	function staffNav(){
		var spec=T.staff&&T.staff.nav;
		if(!spec)return;
		var nav=document.querySelector('header[role="banner"] nav');
		var home=nav&&nav.querySelector('a[href="/home"]');
		var sample=nav&&(nav.querySelector('a[href="/explore"]')||nav.querySelector('a[href="/notifications"]')||home);
		if(!sample||nav.querySelector('a[href="/admin"]'))return;
		var item=sample.parentElement&&sample.parentElement!==nav?sample.parentElement:sample;
		var box=item.cloneNode(true);
		var link=box.querySelector("a")||box;
		leave(link,spec.href);
		link.removeAttribute("data-testid");
		link.removeAttribute("aria-current");
		var active=location.pathname==="/admin"||location.pathname.indexOf("/admin/")===0;
		var weight=active?"700":"400";
		link.style.fontWeight=weight;
		link.setAttribute("aria-label",spec.text);
		var named=false;
		[].forEach.call(link.querySelectorAll("span"),function(n){
			n.style.fontWeight=weight;
			if(named||n.childElementCount||!n.textContent.trim())return;
			n.textContent=spec.text;
			named=true;
		});
		var svg=link.querySelector("svg");
		var path=svg&&svg.querySelector("path");
		if(path){svg.setAttribute("viewBox","0 0 24 24");path.setAttribute("d","M12 1.5 3.5 5v6c0 5.2 3.6 10 8.5 11.5 4.9-1.5 8.5-6.3 8.5-11.5V5L12 1.5zm0 2.2 6.5 2.7V11c0 4.2-2.8 8.2-6.5 9.4-3.7-1.2-6.5-5.2-6.5-9.4V6.4L12 3.7z")}
		var more=nav.querySelector('[data-testid="AppTabBar_More_Menu"]');
		var before=more&&more.parentElement&&more.parentElement!==nav?more.parentElement:more;
		var homeItem=home&&home.parentElement&&home.parentElement!==nav?home.parentElement:home;
		var parent=homeItem&&homeItem.parentElement;
		if(before&&parent&&before.parentElement===parent)parent.insertBefore(box,before);
		else if(parent)parent.appendChild(box);
		else item.parentElement.appendChild(box);
	}
	function twoFactorRow(){
		var a=document.querySelector('a[href="/settings/account/login_verification"]');
		if(!a)return;
		leave(a,"/account/2fa");
		var about=a.nextElementSibling&&a.nextElementSibling.querySelector("span");
		if(about&&about.textContent.indexOf("You can choose a text message")>=0)about.textContent="Help protect your account from unauthorized access by asking for a code from an authentication app when you log in, as well as your password.";
	}
	// the client opens links outside x.com in a new tab; our own pages outside
	// the app (messages from staff) open in this one
	var open=window.open;
	window.open=function(u){
		try{var a=new URL(u,location.href);if(a.origin===location.origin&&a.pathname.indexOf("/account/")===0){location.assign(a.href);return null}}catch(e){}
		return open.apply(window,arguments);
	};
	// the code boxes cut a paste to their length before dropping what isn't a
	// digit, so "1234-5678" would lose its last digit: paste only the digits
	document.addEventListener("paste",function(e){
		var t=e.target;
		if(!t||!t.classList||!t.classList.contains("jf-code-input-field"))return;
		var text=(e.clipboardData||window.clipboardData).getData("text");
		e.preventDefault();
		document.execCommand("insertText",false,text.replace(/\\D/g,""));
	},true);
	var A=T.announcement,closed=false;
	try{closed=!!A&&localStorage.getItem("xitter-announcement")===A.id}catch(e){}
	function announce(){
		if(!A||closed)return;
		var col=document.querySelector('[data-testid="primaryColumn"]');
		if(!col||col.querySelector("#xitter-announcement"))return;
		var bar=document.createElement("div");
		bar.id="xitter-announcement";
		bar.setAttribute("role","status");
		var body=document.createElement("div");
		body.className="xa-body";
		var text=document.createElement("div");
		text.className="xa-text";
		text.textContent=A.text;
		body.appendChild(text);
		if(A.buttons&&A.buttons.length){
			var row=document.createElement("div");
			row.className="xa-buttons";
			A.buttons.forEach(function(b){var a=document.createElement("a");a.href=b.url;a.target="_blank";a.rel="noopener";a.textContent=b.label;row.appendChild(a)});
			body.appendChild(row);
		}
		var x=document.createElement("button");
		x.type="button";x.setAttribute("aria-label","Close");x.textContent="\\u00d7";
		x.onclick=function(){closed=true;try{localStorage.setItem("xitter-announcement",A.id)}catch(e){}bar.remove();};
		bar.appendChild(body);bar.appendChild(x);
		col.insertBefore(bar,col.firstChild);
	}
	// the side bar shows its labels (and our word mark) only when it is wide
	function navWidth(){
		var nav=document.querySelector('header[role="banner"] nav');
		if(nav)document.documentElement.toggleAttribute("data-wide-nav",nav.getBoundingClientRect().width>=180);
	}
	window.addEventListener("resize",navWidth);
	function tidy(){
		if(location.pathname.indexOf("/i/birdwatch")===0||location.pathname.indexOf("/i/communitynotes")===0)document.querySelectorAll("span").forEach(function(n){
			if(n.childElementCount)return;
			var text=n.textContent;
			if(text==="Note statuses aren’t defined by majority rule")n.textContent=T.instance+" uses a local rating rule";
			else if(text&&text.indexOf("To identify notes that are helpful to a wide range of people, note statuses require agreement")===0)n.textContent="Notes appear on posts after at least three ratings, when two thirds rate them Helpful. Authors cannot rate their own notes.";
		});
		ownScreens();
		footer();
		menuLinks();
		xitterRow();
		staffNav();
		twoFactorRow();
		navWidth();
		announce();
		if(!T.imageGen)document.querySelectorAll('[role="dialog"] button').forEach(function(b){
			if(b.innerText.trim()!=="Edit Photo")return;
			var box=b;
			while(box.parentElement&&box.parentElement.innerText.indexOf("Imagine")>=0&&!box.parentElement.querySelector("input"))box=box.parentElement;
			box.style.display="none";
		});
		document.querySelectorAll('[role="menu"] [role="menuitem"]').forEach(function(m){
			if(T.menuItems.indexOf(m.innerText.trim())>=0)m.style.display="none";
		});
		// signed out on a phone, X's page leads with "Get the app", which opens X's
		// own app or its store page and looks like being sent to x.com; here
		// signing in is the way in, so its link takes the button's place
		document.querySelectorAll("button").forEach(function(b){
			if(b.innerText.trim()!=="Get the app"||b.style.display==="none")return;
			b.style.display="none";
			var box=b.parentElement;
			while(box&&!box.querySelector('a[href="/i/flow/login"]'))box=box.parentElement;
			if(!box)return;
			box.querySelectorAll("span").forEach(function(n){if(n.innerText.trim()==="Already have an account?")n.style.display="none"});
			var a=box.querySelector('a[href="/i/flow/login"]');
			a.style.backgroundColor="#eff3f4";a.style.borderColor="#eff3f4";
			a.querySelectorAll("span,div").forEach(function(n){n.style.color="#0f1419"});
		});
		// the verified-badge popup's "Upgrade to get verified": nothing to upgrade to here
		document.querySelectorAll('a,button,[role="button"]').forEach(function(b){
			if(b.innerText&&b.innerText.trim()==="Upgrade to get verified")b.style.display="none";
		});
		// upsell banners: the box around a Premium link, up to whatever else shares its column
		if(!T.premium)document.querySelectorAll('[data-testid="primaryColumn"] a[href="/i/premium_sign_up"]').forEach(function(a){
			var box=a;
			while(box.parentElement&&!box.parentElement.querySelector('[role="tablist"],[data-testid="UserName"],[data-testid="tweet"]'))box=box.parentElement;
			box.style.display="none";
		});
	}
	tidy();
	new MutationObserver(tidy).observe(document.documentElement,{childList:true,subtree:true});
})();`;
