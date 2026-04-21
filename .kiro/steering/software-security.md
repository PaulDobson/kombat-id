# Software Security — Secure Code Standards

This steering document defines mandatory security standards for every line of code generated or modified in this project. Security is not optional and is not a final review step — it must be applied during implementation. Kiro must evaluate each rule before writing any file.

---

## 1. Secrets and Environment Variables

### Rules

- **Never hardcode secrets, API keys, tokens, passwords, connection strings, or credentials** in source code, configuration files, or comments.
- All secrets must be read exclusively from environment variables at runtime.
- Environment variables that must never be exposed to the browser must **never** use the `NEXT_PUBLIC_` prefix.
- Never log environment variable values, even partially (e.g., first N characters).
- Never commit `.env` files to version control. `.env.local`, `.env.production`, and `.env.development` must be listed in `.gitignore`.
- Use `import "server-only"` in every module that reads secrets or environment variables to enforce a build-time error if the module is accidentally imported into a Client Component.

### Forbidden Patterns

```typescript
// ❌ NEVER — hardcoded secret in source code
const stripe = new Stripe("sk_live_abc123secretkey");

// ❌ NEVER — secret in a NEXT_PUBLIC_ variable (exposed to the browser)
const apiKey = process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY;

// ❌ NEVER — logging a secret
console.log("Connecting with key:", process.env.DATABASE_URL);

// ✅ CORRECT — read from environment variable, server-only
import "server-only";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
```

### Required Checks

- Before reading any environment variable in application code, verify it exists and throw a descriptive error if it does not:

```typescript
// lib/config.ts
import "server-only";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const config = {
  databaseUrl: requireEnv("DATABASE_URL"),
  stripeSecretKey: requireEnv("STRIPE_SECRET_KEY"),
  sessionSecret: requireEnv("SESSION_SECRET"),
};
```

---

## 2. Authentication and Authorization

### Rules

- **Every Server Action and every API Route Handler must verify the session** before executing any logic. Never rely on client-side state, headers sent by the client, or cookies that have not been cryptographically verified server-side.
- **Authorization must be re-checked server-side for every resource access.** Never authorize based on data sent from the client (user ID in the request body, role in a cookie that is not signed, etc.).
- Session tokens must be verified using a cryptographic library — never decode them manually or trust them without verification.
- After verifying the session, verify that the authenticated user has permission to access the specific resource being requested (ownership check or role check).
- Unauthenticated requests must be rejected immediately with a redirect or a `401`/`403` response — no partial execution before the check.
- Never expose session internals (raw tokens, session IDs, internal user IDs) in API responses or client-visible logs.

### Authorization Pattern — Mandatory Sequence

```typescript
// Every Server Action must follow this sequence — no exceptions
"use server";

export async function updateResourceAction(input: unknown): Promise<ActionResult> {
  // 1. Authentication — who is calling?
  const session = await requireSession(); // redirects to /login if invalid

  // 2. Input validation — is the input well-formed?
  const parsed = UpdateResourceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Invalid input", code: "VALIDATION_ERROR" };
  }

  // 3. Authorization — does this user own or have permission for this resource?
  const resource = await resourceRepo.findById(parsed.data.resourceId);
  if (!resource) {
    return { success: false, error: "Not found", code: "NOT_FOUND" };
  }
  if (resource.ownerId !== session.userId) {
    return { success: false, error: "Access denied", code: "FORBIDDEN" };
  }

  // 4. Execute the operation
  await resourceRepo.update(parsed.data);
  revalidatePath("/resources");
  return { success: true, data: undefined };
}
```

---

## 3. Input Validation and Injection Prevention

### Rules

- **All external input must be validated with Zod before use.** This includes Server Action arguments, API route request bodies, URL path parameters, query string parameters, form fields, and cookie values.
- **Never concatenate user-supplied values into SQL strings.** Always use parameterized queries or the ORM query builder (Drizzle).
- **Never use `eval()`, `new Function()`, or `setTimeout(string)`** with user-supplied content.
- **Never pass unsanitized user input to shell commands** (`exec`, `spawn`, `execSync`).
- **Never use `dangerouslySetInnerHTML`** unless the content has been explicitly sanitized with a trusted library (e.g., DOMPurify). Even then, document why it is necessary.
- Validate the shape, type, length, format, and range of every input field — do not rely on the database to enforce constraints as the first line of defense.

### Examples

```typescript
// ❌ NEVER — raw string concatenation in a query
const result = await db.execute(
  `SELECT * FROM users WHERE email = '${userInput}'` // SQL injection risk
);

// ✅ CORRECT — parameterized query via Drizzle ORM
const result = await db.query.usersTable.findFirst({
  where: eq(usersTable.email, userInput), // parameterized, safe
});
```

```typescript
// ❌ NEVER — trusting client input without validation
export async function createPostAction(title: string, body: string) {
  await postRepo.insert({ title, body }); // no validation
}

// ✅ CORRECT — validate shape, type, and constraints with Zod
const CreatePostSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  body: z.string().min(1).max(10_000).trim(),
});

export async function createPostAction(rawInput: unknown): Promise<ActionResult> {
  const session = await requireSession();
  const parsed = CreatePostSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: "Invalid input", code: "VALIDATION_ERROR" };
  }
  await postService.create({ ...parsed.data, authorId: session.userId });
  revalidatePath("/posts");
  return { success: true, data: undefined };
}
```

---

## 4. Data Exposure and API Responses

### Rules

- **Never return full database rows to the client.** Project only the fields the client needs. Sensitive fields (password hashes, tokens, internal IDs, audit fields) must be explicitly excluded.
- **Never expose internal error details** (stack traces, SQL error messages, internal module paths) in HTTP responses or Server Action results. Log them server-side; return only a generic message to the client.
- **Never expose user data belonging to one user to another user.** Always filter queries by the authenticated user's ID or tenant ID.
- API responses must not include fields like `passwordHash`, `sessionToken`, `internalId`, `stripeCustomerId`, or any credential.
- Use TypeScript `Pick` or `Omit` types, or define explicit response DTOs, to enforce that sensitive fields are structurally excluded from what is returned.

```typescript
// ❌ NEVER — returning the full database row
export async function getUserAction(userId: string) {
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, userId),
  });
  return user; // includes passwordHash, sessionToken, etc.
}

// ✅ CORRECT — project only the safe fields
type PublicUser = Pick<User, "id" | "name" | "email" | "avatarUrl">;

export async function getUserAction(userId: string): Promise<ActionResult<PublicUser>> {
  const session = await requireSession();
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, userId),
    columns: { id: true, name: true, email: true, avatarUrl: true }, // explicit projection
  });
  if (!user) return { success: false, error: "Not found", code: "NOT_FOUND" };
  return { success: true, data: user };
}
```

```typescript
// ❌ NEVER — exposing internal error details to the client
} catch (err) {
  return { success: false, error: err.message }; // may leak SQL errors, stack traces
}

// ✅ CORRECT — log internally, return a safe message
} catch (err) {
  console.error("[deleteInvoiceAction] Unexpected error:", err); // server-side only
  return { success: false, error: "An unexpected error occurred", code: "INTERNAL_ERROR" };
}
```

---

## 5. Sensitive Data in Logs

### Rules

- **Never log passwords, tokens, API keys, or full credit card numbers.**
- **Never log full request bodies** if they may contain sensitive fields (registration forms, payment forms, profile update forms).
- Redact sensitive fields before logging. Log only identifiers and non-sensitive metadata.
- Use structured logging (e.g., pino) and log at the appropriate level — do not use `console.log` in production server code.

```typescript
// ❌ NEVER — logging the full input which may contain a password
logger.info({ input }, "Processing registration");

// ✅ CORRECT — log only safe metadata
logger.info({ email: input.email, action: "registration" }, "Processing registration");
```

---

## 6. HTTP Headers and CORS

### Rules

- Configure `Content-Security-Policy` (CSP) headers in `next.config.ts` to restrict which sources can execute scripts, load styles, and make connections.
- Set `X-Content-Type-Options: nosniff` to prevent MIME-type sniffing.
- Set `X-Frame-Options: DENY` or `SAMEORIGIN` to prevent clickjacking.
- Set `Referrer-Policy: strict-origin-when-cross-origin`.
- Configure CORS in API Route Handlers explicitly — do not use wildcard (`*`) origins in production.
- Never allow arbitrary origins in CORS configuration based on the `Origin` header sent by the client without validating it against an allowlist.

```typescript
// next.config.ts
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'", // tighten once inline scripts are eliminated
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self'",
    ].join("; "),
  },
];

export default {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};
```

---

## 7. Dependency Security

### Rules

- **Never install packages from untrusted or unknown sources.** Verify the package name matches the official package before installing (typosquatting attacks).
- Keep dependencies up to date. Regularly audit with `pnpm audit` and address high-severity vulnerabilities.
- Do not install packages that are deprecated, unmaintained, or have known critical vulnerabilities.
- Prefer packages with a large adoption, active maintenance, and a published security policy.
- Do not install server-side packages that include client-side bundles unnecessarily — they increase attack surface.

---

## 8. File and Path Security

### Rules

- **Never use user-supplied input to construct file paths** without strict validation and sanitization. Path traversal attacks (`../../etc/passwd`) are a common vector.
- Always resolve file paths using `path.resolve()` and verify the result is within the expected base directory.
- Never serve files from the filesystem based on user input without an explicit allowlist.

```typescript
// ❌ NEVER — user input directly in a file path
const file = fs.readFileSync(`./uploads/${req.params.filename}`);

// ✅ CORRECT — validate and constrain the path
import path from "path";

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
const requested = path.resolve(UPLOAD_DIR, filename);

if (!requested.startsWith(UPLOAD_DIR)) {
  throw new ForbiddenError("Invalid file path");
}

const file = fs.readFileSync(requested);
```

---

## 9. Client Component Security

### Rules

- **Never store secrets, tokens, or sensitive data in Client Component state, `localStorage`, or `sessionStorage`** — they are accessible to any JavaScript on the page.
- **Never expose internal API keys or service credentials** in Client Component code — they are shipped to the browser and visible in the page source.
- Use `HttpOnly` and `Secure` cookie flags for session tokens so they cannot be accessed by JavaScript.
- Do not use `dangerouslySetInnerHTML` with any content that originates from user input or external APIs without sanitization.

---

## 10. Security Checklist

Kiro must verify these items before considering any implementation complete:

- [ ] No secrets, passwords, tokens, or credentials appear in source code or config files.
- [ ] No secrets use the `NEXT_PUBLIC_` prefix.
- [ ] Every environment variable is validated at startup with a clear error if missing.
- [ ] Every Server Action and API Route Handler verifies authentication before executing.
- [ ] Every resource access includes an ownership or role-based authorization check.
- [ ] Every external input is validated with Zod before use.
- [ ] No raw SQL string concatenation — all queries use the ORM or parameterized statements.
- [ ] API responses and Server Action results exclude sensitive fields (passwords, tokens, internal IDs).
- [ ] Internal error details (stack traces, SQL errors) are never returned to the client.
- [ ] Sensitive values are not logged.
- [ ] Security HTTP headers are configured in `next.config.ts`.
- [ ] No `dangerouslySetInnerHTML` with unsanitized user input.
- [ ] File paths constructed from user input are validated and constrained to the expected directory.
- [ ] Session tokens use `HttpOnly` and `Secure` cookie flags.
