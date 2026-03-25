package com.operator.nl2sql.service;

import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.regex.Pattern;

@Service
public class PromptSanitizer {

    private static final int MAX_QUERY_LENGTH = 500;

    // Patterns that indicate prompt injection attempts
    private static final Pattern[] INJECTION_PATTERNS = {
        // Instruction override attempts
        Pattern.compile("(?i)ignore\\s+(previous|all|prior)\\s+(instructions?|orders?|commands?)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("(?i)disregard\\s+(previous|all|prior)\\s+(instructions?|orders?|commands?)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("(?i)override\\s+(your\\s+)?(previous|system|original)\\s+(instructions?|rules?|constraints?)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("(?i)new\\s+instructions?", Pattern.CASE_INSENSITIVE),

        // Role/play attack
        Pattern.compile("(?i)you\\s+are\\s+now\\s+(a\\s+)?", Pattern.CASE_INSENSITIVE),
        Pattern.compile("(?i)pretend\\s+you\\s+are\\s+(a\\s+)?", Pattern.CASE_INSENSITIVE),
        Pattern.compile("(?i)act\\s+as\\s+(a\\s+)?", Pattern.CASE_INSENSITIVE),
        Pattern.compile("(?i)while\\s+acting\\s+as", Pattern.CASE_INSENSITIVE),

        // System prompt extraction attempts
        Pattern.compile("(?i)(repeat\\s+)?system\\s+prompt", Pattern.CASE_INSENSITIVE),
        Pattern.compile("(?i)show\\s+(me\\s+)?(your\\s+)?(system\\s+)?instructions?", Pattern.CASE_INSENSITIVE),

        // SQL injection patterns (for defense in depth)
        Pattern.compile("(?i)'\\s*;?\\s*drop\\s+table", Pattern.CASE_INSENSITIVE),
        Pattern.compile("(?i)'\\s*or\\s+'1'\\s*=\\s*'1", Pattern.CASE_INSENSITIVE),
        Pattern.compile("(?i);\\s*shutdown", Pattern.CASE_INSENSITIVE),

        // Delimiter injection
        Pattern.compile("(?i)<\\s*/?\\s*(system|user\\s+)?\\s*instructions?\\s*>", Pattern.CASE_INSENSITIVE),
        Pattern.compile("(?i)\\[\\s*/?\\s*(system|user\\s+)?\\s*\\]", Pattern.CASE_INSENSITIVE),

        // Potential comment injection
        Pattern.compile("--\\s*$", Pattern.CASE_INSENSITIVE),
        Pattern.compile(";\\s*--\\s*$", Pattern.CASE_INSENSITIVE)
    };

    // Allowed indicator names (whitelist)
    private static final Set<String> ALLOWED_INDICATORS = Set.of(
        "dl_rate", "ul_rate", "prb_usage", "split_ratio", "main_ratio",
        "lte_avg_dl_rate", "lte_avg_ul_rate", "lte_avg_prb",
        "nr_avg_dl_rate", "nr_avg_ul_rate", "nr_avg_prb",
        "lte700M", "lte800M", "lte900M", "lte1400M", "lte1800M", "lte2100M", "lte2600M",
        "nr700M", "nr800M", "nr900M", "nr1400M", "nr1800M", "nr2100M", "nr2600M",
        "nr3500M", "nr4900M", "nr2300M",
        "dwell_ratio", "terminal_penetration", "duration_dwell_ratio", "fallback_ratio",
        "lte_total_site", "lte_total_cell", "nr_total_site", "nr_total_cell",
        "data_month", "operator_name", "site_code", "cell_id", "site_name", "band"
    );

    /**
     * Sanitize natural language query to prevent prompt injection.
     *
     * @param input the raw user input
     * @return sanitized input safe for embedding in prompt
     * @throws IllegalArgumentException if input is invalid or detected as injection
     */
    public String sanitize(String input) {
        if (input == null || input.isBlank()) {
            throw new IllegalArgumentException("Query cannot be empty");
        }

        String trimmed = input.trim();

        // Length check
        if (trimmed.length() > MAX_QUERY_LENGTH) {
            throw new IllegalArgumentException("Query exceeds maximum length of " + MAX_QUERY_LENGTH);
        }

        // Check for injection patterns
        for (Pattern pattern : INJECTION_PATTERNS) {
            if (pattern.matcher(trimmed).find()) {
                // Log the potential injection attempt
                throw new IllegalArgumentException("Query contains potentially unsafe content");
            }
        }

        // Remove any control characters
        String cleaned = trimmed.replaceAll("[\\x00-\\x1F\\x7F]", "");

        return cleaned;
    }

    /**
     * Sanitize indicator names array using whitelist.
     *
     * @param indicators array of indicator names
     * @return sanitized array with only allowed indicators
     */
    public String[] sanitizeIndicators(String[] indicators) {
        if (indicators == null || indicators.length == 0) {
            return new String[0];
        }

        String[] sanitized = new String[indicators.length];
        int count = 0;

        for (String indicator : indicators) {
            if (indicator != null && !indicator.isBlank()) {
                String lower = indicator.trim().toLowerCase();
                if (ALLOWED_INDICATORS.contains(lower)) {
                    sanitized[count++] = indicator.trim();
                }
            }
        }

        // Return only the valid portion
        String[] result = new String[count];
        System.arraycopy(sanitized, 0, result, 0, count);
        return result;
    }

    /**
     * Check if a string contains potential injection patterns (for logging/monitoring).
     *
     * @param input the string to check
     * @return true if potential injection detected
     */
    public boolean containsInjection(String input) {
        if (input == null || input.isBlank()) {
            return false;
        }

        for (Pattern pattern : INJECTION_PATTERNS) {
            if (pattern.matcher(input).find()) {
                return true;
            }
        }
        return false;
    }
}
