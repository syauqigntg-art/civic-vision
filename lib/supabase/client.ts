import { createBrowserClient } from "@supabase/ssr";
import { SupabaseConfigurationError } from "./config-error.ts";
import { readPublicSupabaseConfig } from "./public-config.ts";

type BrowserClient = ReturnType<typeof createBrowserClient>;
let client: BrowserClient | undefined;

export function getBrowserClient(): BrowserClient {
  if (client) return client;
  const { url, anonKey } = readPublicSupabaseConfig({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  client = createBrowserClient(url, anonKey);
  return client;
}

// This fallback never claims authentication or backend success. It exists so a
// build without public config can render, while operations return a safe error.
export function createUnavailableSupabaseClient(): BrowserClient {
  const error = new SupabaseConfigurationError();
  const result = { data: null, error: { name: error.name, message: error.message } };
  const query = new Proxy(function () {}, {
    get(_target, property) {
      if (property === "then") {
        return (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
          Promise.resolve(result).then(resolve, reject);
      }
      return query;
    },
    apply() { return query; },
  });
  const auth = new Proxy({}, {
    get(_target, property) {
      if (property === "getUser") return async () => ({ data: { user: null }, error: result.error });
      if (property === "getSession") return async () => ({ data: { session: null }, error: result.error });
      if (property === "onAuthStateChange") return () => ({ data: { subscription: { unsubscribe() {} } } });
      return async () => result;
    },
  });
  return new Proxy({} as BrowserClient, {
    get(_target, property) {
      if (property === "auth") return auth;
      if (property === "from" || property === "rpc") return () => query;
      if (property === "storage") return new Proxy({}, { get: () => () => query });
      return () => query;
    },
  });
}

let unavailableClient: BrowserClient | undefined;
// Preserve existing call sites while initializing the real client only on use.
export const sb: BrowserClient = new Proxy({} as BrowserClient, {
  get(_target, property) {
    try {
      const realClient = getBrowserClient();
      const value = Reflect.get(realClient, property, realClient);
      return typeof value === "function" ? value.bind(realClient) : value;
    } catch (error) {
      if (!(error instanceof SupabaseConfigurationError)) throw error;
      unavailableClient ??= createUnavailableSupabaseClient();
      const value = Reflect.get(unavailableClient, property, unavailableClient);
      return typeof value === "function" ? value.bind(unavailableClient) : value;
    }
  },
});
