interface NeynarUser {
  follower_count?: number;
}

interface NeynarBulkResponse {
  users?: NeynarUser[];
}

export async function getFollowerCount(fid: number): Promise<number> {
  try {
    const apiKey = process.env.NEYNAR_API_KEY;
    if (!apiKey) return 0;
    const res = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
      { headers: { "x-api-key": apiKey } }
    );
    if (!res.ok) return 0;
    const json = (await res.json()) as NeynarBulkResponse;
    return json.users?.[0]?.follower_count ?? 0;
  } catch {
    return 0;
  }
}
