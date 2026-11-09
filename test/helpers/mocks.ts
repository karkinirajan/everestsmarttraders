import { FakeSupabase } from "./fake-supabase";

/** One fake per test, shared by the mocked Supabase modules. Use with vi.mock factories that read `holder.fake`. */
export const holder = { fake: null as unknown as FakeSupabase, headers: new Headers() };

export function freshFake(): FakeSupabase {
  holder.fake = new FakeSupabase();
  holder.headers = new Headers();
  return holder.fake;
}
