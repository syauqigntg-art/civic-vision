export class SupabaseConfigurationError extends Error {
  constructor() {
    super("Backend configuration is unavailable.");
    this.name = "SupabaseConfigurationError";
  }
}
