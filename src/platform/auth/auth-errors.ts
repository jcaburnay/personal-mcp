export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: "missing_token" | "invalid_token" | "insufficient_scope"
  ) {
    super(message);
    this.name = "AuthError";
  }
}
