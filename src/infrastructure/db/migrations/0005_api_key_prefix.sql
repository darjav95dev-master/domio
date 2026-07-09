-- Add key_prefix column for O(1) API key lookup
-- Stores the first 8 characters of the plaintext key.
-- Newly created keys will have the prefix stored at creation time.
-- Existing keys will be matched by fallback (bcrypt scan) until they are rotated.
ALTER TABLE "api_keys" ADD COLUMN "key_prefix" varchar(8);
