import { vi } from "vitest";

/**
 * A recording stand-in for the parts of supabase-js the server code uses: from().insert/update/upsert/delete/select with
 * filters, .single()/.maybeSingle(), rpc(), storage, auth.getUser(). Every call is recorded; answers are queued per table or per
 * operation with `answer()`. (The SQL itself is tested against real Postgres in test/db; this is for what the code does with it.)
 */
export type Call = { table: string; op: string; payload?: unknown; filters: [string, unknown][]; options?: unknown; select?: unknown };
type Answer = { data: unknown; error: { code?: string; message?: string } | null };

export class FakeSupabase {
  calls: Call[] = [];
  rpcCalls: { fn: string; args: unknown }[] = [];
  storageCalls: { op: string; bucket: string; args: unknown[] }[] = [];
  private answers = new Map<string, Answer[]>();
  private fallback: Answer = { data: null, error: null };
  rpcAnswer: Answer = { data: 1, error: null };
  /** answers for the next rpc() calls, in order; then rpcAnswer */
  rpcQueue: Answer[] = [];
  storageError: { message: string } | null = null;
  user: { id: string } | null = null;
  profileRole: string | null = null;

  answer(key: string, ...answers: Answer[]): this {
    this.answers.set(key, [...(this.answers.get(key) ?? []), ...answers]);
    return this;
  }
  setDefault(answer: Answer): this {
    this.fallback = answer;
    return this;
  }
  private next(table: string, op: string): Answer {
    for (const key of [`${table}.${op}`, op, table]) {
      const queue = this.answers.get(key);
      if (queue?.length) return queue.length > 1 ? (queue.shift() as Answer) : (queue[0] as Answer);
    }
    return this.fallback;
  }

  from = (table: string) => {
    const call: Call = { table, op: "select", filters: [] };
    this.calls.push(call);
    const builder: Record<string, unknown> = {};
    const chain = (name: string) => (...args: unknown[]) => {
      if (["insert", "update", "upsert", "delete"].includes(name)) {
        call.op = name;
        call.payload = args[0];
        call.options = args[1];
      } else if (name === "select") call.select = args[0];
      else if (["eq", "neq", "in", "is", "ilike", "or", "gte", "lte"].includes(name)) call.filters.push([`${name}:${String(args[0])}`, args[1]]);
      return builder;
    };
    for (const name of ["select", "insert", "update", "upsert", "delete", "eq", "neq", "in", "is", "ilike", "or", "gte", "lte", "order", "limit"]) builder[name] = chain(name);
    const finish = () => Promise.resolve(this.next(table, call.op));
    builder.single = finish;
    builder.maybeSingle = finish;
    builder.then = (resolve: (v: Answer) => unknown, reject?: (e: unknown) => unknown) => finish().then(resolve, reject);
    return builder;
  };

  rpc = async (fn: string, args: unknown) => {
    this.rpcCalls.push({ fn, args });
    return this.rpcQueue.shift() ?? this.rpcAnswer;
  };

  storage = {
    from: (bucket: string) => ({
      upload: async (...args: unknown[]) => (this.storageCalls.push({ op: "upload", bucket, args }), { error: this.storageError }),
      remove: async (...args: unknown[]) => (this.storageCalls.push({ op: "remove", bucket, args }), { error: this.storageError }),
      getPublicUrl: (path: string) => ({ data: { publicUrl: `https://project.supabase.co/storage/v1/object/public/${bucket}/${path}` } }),
    }),
  };

  auth = { getUser: async () => ({ data: { user: this.user } }), admin: { updateUserById: vi.fn(async () => ({ error: null })) } };

  /** The cookie-bound client of lib/supabase/server.ts: auth.getUser() and the profiles lookup. */
  sessionClient() {
    return {
      auth: this.auth,
      from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: this.profileRole ? { role: this.profileRole } : null, error: null }) }) }) }),
    };
  }
}
