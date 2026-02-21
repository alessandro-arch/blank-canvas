import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const kek = Deno.env.get("CRYPTO_KEK");

    if (!kek) {
      return new Response(
        JSON.stringify({ valid: false, error: "CRYPTO_KEK not set" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const errors: string[] = [];

    // Must be exactly 32 characters
    if (kek.length !== 32) {
      errors.push(`Length is ${kek.length}, expected 32`);
    }

    // Must contain uppercase letters
    if (!/[A-Z]/.test(kek)) {
      errors.push("Missing uppercase letters");
    }

    // Must contain lowercase letters
    if (!/[a-z]/.test(kek)) {
      errors.push("Missing lowercase letters");
    }

    // Must contain numbers
    if (!/[0-9]/.test(kek)) {
      errors.push("Missing numbers");
    }

    // Only allow alphanumeric + common special chars
    if (!/^[A-Za-z0-9!@#$%^&*()_+\-=\[\]{};':"|,.<>\/?`~]+$/.test(kek)) {
      errors.push("Contains invalid characters");
    }

    // Reject weak keys: no repeated patterns, no sequential chars
    const uniqueChars = new Set(kek).size;
    if (uniqueChars < 10) {
      errors.push(`Only ${uniqueChars} unique characters (minimum 10)`);
    }

    // Check for repeated substrings (e.g., "abcabc")
    const half = kek.substring(0, 16);
    if (kek.substring(16) === half) {
      errors.push("Key is a repeated pattern");
    }

    // Check for common weak patterns
    const lower = kek.toLowerCase();
    const weakPatterns = ["password", "12345678", "abcdefgh", "qwerty", "00000000"];
    for (const pattern of weakPatterns) {
      if (lower.includes(pattern)) {
        errors.push(`Contains weak pattern: "${pattern}"`);
      }
    }

    if (errors.length > 0) {
      return new Response(
        JSON.stringify({ valid: false, errors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ valid: true, message: "OK — CRYPTO_KEK format is valid" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ valid: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
