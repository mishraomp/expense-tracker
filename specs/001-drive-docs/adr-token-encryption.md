# ADR: Token Encryption Strategy

## Status
**Accepted** - Implemented in Phase 6

## Context
Refresh tokens for Google Drive OAuth 2.0 must not be stored in plaintext in the database. These tokens provide long-term access to user files and, if compromised, would allow an attacker to access all Drive files indefinitely.

**Security Requirements**:
- Tokens must be encrypted at rest (database, backups)
- Encryption must be reversible (need original token for API calls)
- Key management must be secure and rotatable
- Minimal performance overhead (<2ms)

## Decision
Adopt **AES-256-GCM encryption** with environment-provided key for encrypting OAuth refresh tokens before persisting to database.

### Implementation Details
- **Algorithm**: AES-256-GCM (authenticated encryption)
- **Key Derivation**: Scrypt from `ENCRYPTION_KEY` environment variable
- **IV**: Random 16 bytes per encryption (stored with ciphertext)
- **Authentication Tag**: 16 bytes (prevents tampering)
- **Storage Format**: Base64-encoded `<IV + Ciphertext + Auth Tag>`
- **Utility**: `backend/src/common/security/encryption.util.ts`
- **Integration**: OAuth service encrypts before write, decrypts on read

### Key Management
- **Development**: Default key with warning (auto-generated)
- **Production**: Required `ENCRYPTION_KEY` env var (generate with `openssl rand -hex 32`)
- **Rotation**: Manual re-encryption process (documented in security procedures)

## Consequences

### Positive
- Protects user credentials at rest (defense-in-depth)
- Prevents token theft via database dumps or backups
- Authenticated encryption prevents tampering
- Standard algorithm widely trusted (NIST-approved)
- Compliance-friendly

### Negative
- Slight performance overhead (~1-2ms per operation)
- Key rotation requires manual intervention
- Lost key = unrecoverable tokens (users must re-authorize)
- Must manage `ENCRYPTION_KEY` securely (never commit to Git)

## Alternatives Considered
- **AWS KMS / Azure Key Vault**: Rejected - unnecessary complexity for MVP, can migrate later
- **AES-256-CBC**: Rejected - no authentication, requires separate HMAC
- **RSA Asymmetric**: Rejected - slower, overkill for symmetric use case
- **Hashing**: Not reversible; cannot refresh tokens
- **Plaintext**: Security risk; unacceptable

## Implementation Status
- ✅ Encryption utility implemented (`encryption.util.ts`)
- ⏳ OAuth service integration (T107 - pending OAuth service creation)
- ✅ Environment variable support (`ENCRYPTION_KEY`)
- ✅ Development fallback with warning

## References
- [NIST SP 800-38D: GCM Recommendation](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38d.pdf)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
