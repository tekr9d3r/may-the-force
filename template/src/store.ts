import {
  createInMemoryDataStore,
  createTursoDataStore,
} from "@farcaster/snap-turso";

export const store =
  process.env.TURSO_DATABASE_URL
    ? createTursoDataStore()
    : createInMemoryDataStore();

export interface VoteRecord {
  side: "light" | "dark";
  force: number;
}
