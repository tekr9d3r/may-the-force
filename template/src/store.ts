import {
  createInMemoryDataStore,
  createTursoDataStore,
} from "@farcaster/snap-turso";

export const store =
  process.env.VERCEL === "1"
    ? createTursoDataStore()
    : createInMemoryDataStore();

export interface VoteRecord {
  side: "light" | "dark";
  force: number;
}
