import { Hono } from "hono";
import { cors } from "hono/cors";
import { SPEC_VERSION, MEDIA_TYPE } from "@farcaster/snap";
import { parseRequest } from "@farcaster/snap/server";
import { store, type VoteRecord } from "./store.js";
import { calculateForce, formatForce } from "./force.js";
import { getFollowerCount } from "./neynar.js";

type Side = "light" | "dark";

const app = new Hono();

app.use("*", cors({ origin: "*" }));

app.get("/", async (c) => {
  const accept = c.req.header("Accept") ?? "";
  if (!accept.includes(MEDIA_TYPE)) {
    const snapUrl = snapBaseUrl(c.req.raw) + "/";
    return c.html("<p>Open this snap in Warpcast!</p>", 200, {
      Link: `<${snapUrl}>; rel="alternate"; type="${MEDIA_TYPE}"`,
    });
  }
  const lightForce = ((await store.get("force:light")) as number) ?? 0;
  const darkForce = ((await store.get("force:dark")) as number) ?? 0;
  const lightVotes = ((await store.get("votes:light")) as number) ?? 0;
  const darkVotes = ((await store.get("votes:dark")) as number) ?? 0;
  const base = snapBaseUrl(c.req.raw);
  return snapResponse(c, landingScreen(base, lightForce, darkForce, lightVotes + darkVotes));
});

app.post("/", async (c) => {
  const skipVerification = process.env.SKIP_JFS_VERIFICATION === "true";
  const parsed = await parseRequest(c.req.raw, { skipJFSVerification: skipVerification });

  if (!parsed.success || parsed.action.type !== "post") {
    return c.json({ error: "invalid request" }, 400);
  }

  const fid = parsed.action.user?.fid;
  const url = new URL(c.req.url);
  const side = url.searchParams.get("side") as Side | null;
  const base = snapBaseUrl(c.req.raw);

  const lightForce = ((await store.get("force:light")) as number) ?? 0;
  const darkForce = ((await store.get("force:dark")) as number) ?? 0;
  const lightVotes = ((await store.get("votes:light")) as number) ?? 0;
  const darkVotes = ((await store.get("votes:dark")) as number) ?? 0;

  if (!fid || !side) {
    return snapResponse(c, landingScreen(base, lightForce, darkForce, lightVotes + darkVotes));
  }

  const existing = (await store.get(`fid:${fid}`)) as VoteRecord | null;

  if (existing) {
    const totalForce = lightForce + darkForce;
    const lightPct = totalForce > 0 ? Math.round((lightForce / totalForce) * 100) : 50;
    return snapResponse(c, alreadyVotedScreen(base, existing, lightForce, darkForce, lightPct));
  }

  const followers = await getFollowerCount(fid);
  const forceScore = calculateForce(fid, followers);

  await store.set(`fid:${fid}`, { side, force: forceScore } satisfies VoteRecord);
  await store.set(`force:${side}`, (side === "light" ? lightForce : darkForce) + forceScore);
  await store.set(`votes:${side}`, (side === "light" ? lightVotes : darkVotes) + 1);

  const newLightForce = side === "light" ? lightForce + forceScore : lightForce;
  const newDarkForce = side === "dark" ? darkForce + forceScore : darkForce;
  const newTotal = newLightForce + newDarkForce;
  const newLightPct = newTotal > 0 ? Math.round((newLightForce / newTotal) * 100) : 50;

  return snapResponse(c, votedScreen(base, side, forceScore, newLightForce, newDarkForce, newLightPct));
});

export default app;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function snapResponse(c: any, data: object) {
  return c.json(data, 200, { "Content-Type": MEDIA_TYPE });
}

function landingScreen(base: string, lightForce: number, darkForce: number, totalVotes: number) {
  const footer =
    totalVotes === 0
      ? "Be the first to choose · May 4, 2026"
      : `${totalVotes.toLocaleString()} Farcasters have chosen · May 4, 2026`;

  return {
    version: SPEC_VERSION,
    theme: { accent: "amber" },
    ui: {
      root: "page",
      elements: {
        page: { type: "stack", props: {}, children: ["title", "subtitle", "chart", "btnLight", "btnDark", "footer"] },
        title: { type: "text", props: { content: "May the 4th Be With You ⚡", weight: "bold", align: "center" } },
        subtitle: { type: "text", props: { content: "Lower FID + more followers = more Force. Which side calls to you?", size: "sm", align: "center" } },
        chart: { type: "bar_chart", props: { bars: [
          { label: "☀️ Light Side", value: Math.max(lightForce, 1), color: "amber" },
          { label: "🌑 Dark Side", value: Math.max(darkForce, 1), color: "purple" },
        ] } },
        btnLight: { type: "button", props: { label: "Join the Light Side ☀️", variant: "primary" }, on: { press: { action: "submit", params: { target: `${base}/?side=light` } } } },
        btnDark: { type: "button", props: { label: "Join the Dark Side 🌑", variant: "secondary" }, on: { press: { action: "submit", params: { target: `${base}/?side=dark` } } } },
        footer: { type: "text", props: { content: footer, size: "sm", align: "center" } },
      },
    },
  };
}

function votedScreen(base: string, side: Side, forceScore: number, lightForce: number, darkForce: number, lightPct: number) {
  const isLight = side === "light";
  const darkPct = 100 - lightPct;
  const leadingPct = isLight ? lightPct : darkPct;
  const sideLabel = isLight ? "Light Side ☀️" : "Dark Side 🌑";
  const shareText = isLight
    ? `I joined the Light Side on May the 4th ☀️\nMy Force Power: ${formatForce(forceScore)} ⚡\nFarcaster is ${lightPct}% Light right now — which side calls to you?`
    : `I joined the Dark Side on May the 4th 🌑\nMy Force Power: ${formatForce(forceScore)} ⚡\nFarcaster is ${darkPct}% Dark right now — dare to cross over?`;

  return {
    version: SPEC_VERSION,
    theme: { accent: isLight ? "amber" : "purple" },
    ...(isLight ? { effects: ["confetti"] } : {}),
    ui: {
      root: "page",
      elements: {
        page: { type: "stack", props: {}, children: ["title", "forceLabel", "chart", "pctCaption", "shareBtn"] },
        title: { type: "text", props: { content: `You joined the ${sideLabel}`, weight: "bold", align: "center" } },
        forceLabel: { type: "text", props: { content: `Your Force Power: ${formatForce(forceScore)} ⚡ — you shifted the balance!`, size: "sm", align: "center" } },
        chart: { type: "bar_chart", props: { bars: [
          { label: "☀️ Light Side", value: Math.max(lightForce, 1), color: "amber" },
          { label: "🌑 Dark Side", value: Math.max(darkForce, 1), color: "purple" },
        ] } },
        pctCaption: { type: "text", props: { content: `${isLight ? "Light" : "Dark"} Side holds ${leadingPct}% of the Force`, weight: "bold", align: "center" } },
        shareBtn: { type: "button", props: { label: "Share Your Allegiance", variant: "primary", icon: "share" }, on: { press: { action: "compose_cast", params: { text: shareText, embeds: [`${base}/`] } } } },
      },
    },
  };
}

function alreadyVotedScreen(base: string, vote: VoteRecord, lightForce: number, darkForce: number, lightPct: number) {
  const isLight = vote.side === "light";
  const darkPct = 100 - lightPct;
  const leadingPct = isLight ? lightPct : darkPct;
  const sideLabel = isLight ? "Light Side ☀️" : "Dark Side 🌑";
  const shareText = isLight
    ? `I'm with the Light Side on May the 4th ☀️\nMy Force Power: ${formatForce(vote.force)} ⚡\nFarcaster is ${lightPct}% Light — which side calls to you?`
    : `I'm with the Dark Side on May the 4th 🌑\nMy Force Power: ${formatForce(vote.force)} ⚡\nFarcaster is ${darkPct}% Dark — dare to cross over?`;

  return {
    version: SPEC_VERSION,
    theme: { accent: isLight ? "amber" : "purple" },
    ui: {
      root: "page",
      elements: {
        page: { type: "stack", props: {}, children: ["title", "forceLabel", "chart", "pctCaption", "shareBtn"] },
        title: { type: "text", props: { content: `You already chose the ${sideLabel}`, weight: "bold", align: "center" } },
        forceLabel: { type: "text", props: { content: `Your Force Power: ${formatForce(vote.force)} ⚡`, size: "sm", align: "center" } },
        chart: { type: "bar_chart", props: { bars: [
          { label: "☀️ Light Side", value: Math.max(lightForce, 1), color: "amber" },
          { label: "🌑 Dark Side", value: Math.max(darkForce, 1), color: "purple" },
        ] } },
        pctCaption: { type: "text", props: { content: `${isLight ? "Light" : "Dark"} Side holds ${leadingPct}% of the Force`, size: "sm", align: "center" } },
        shareBtn: { type: "button", props: { label: "Share Your Allegiance", variant: "primary", icon: "share" }, on: { press: { action: "compose_cast", params: { text: shareText, embeds: [`${base}/`] } } } },
      },
    },
  };
}

function snapBaseUrl(request: Request): string {
  const fromEnv = process.env.SNAP_PUBLIC_BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const hostHeader = request.headers.get("host");
  const host = (forwardedHost ?? hostHeader)?.split(",")[0].trim();
  const isLoopback = host !== undefined && /^(localhost|127\.0\.0\.1|\[::1\]|::1)(:\d+)?$/.test(host);
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const proto = forwardedProto ? forwardedProto.split(",")[0].trim().toLowerCase() : isLoopback ? "http" : "https";
  if (host) return `${proto}://${host}`.replace(/\/$/, "");
  return `http://localhost:${process.env.PORT ?? "3003"}`.replace(/\/$/, "");
}
