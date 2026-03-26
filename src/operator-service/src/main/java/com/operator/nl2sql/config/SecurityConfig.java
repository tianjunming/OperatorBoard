package com.operator.nl2sql.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Value("${nl2sql.security.enabled:false}")
    private boolean securityEnabled;

    @Value("${nl2sql.security.api-keys:}")
    private String apiKeysConfig;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> {
                if (securityEnabled) {
                    auth.requestMatchers("/api/**").authenticated();
                } else {
                    auth.requestMatchers("/api/**").permitAll();
                }
                auth.requestMatchers("/health", "/actuator/**").permitAll()
                    .anyRequest().permitAll();
            })
            .addFilterBefore(apiKeyAuthFilter(), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public ApiKeyAuthFilter apiKeyAuthFilter() {
        return new ApiKeyAuthFilter(securityEnabled, apiKeysConfig);
    }

    public static class ApiKeyAuthFilter extends OncePerRequestFilter {

        private final boolean securityEnabled;
        private final Set<String> allowedApiKeys;

        public ApiKeyAuthFilter(boolean securityEnabled, String apiKeysConfig) {
            this.securityEnabled = securityEnabled;
            this.allowedApiKeys = parseApiKeys(apiKeysConfig);
        }

        private static Set<String> parseApiKeys(String apiKeysConfig) {
            if (apiKeysConfig == null || apiKeysConfig.isBlank()) {
                return Set.of();
            }
            return Set.of(apiKeysConfig.split(","));
        }

        @Override
        protected void doFilterInternal(HttpServletRequest request,
                                        HttpServletResponse response,
                                        FilterChain filterChain) throws ServletException, IOException {

            // If security is disabled, allow all requests
            if (!securityEnabled) {
                filterChain.doFilter(request, response);
                return;
            }

            String requestPath = request.getRequestURI();

            // Allow health endpoints without authentication
            if (requestPath.startsWith("/health") || requestPath.startsWith("/actuator")) {
                filterChain.doFilter(request, response);
                return;
            }

            // Check API key for /api/** endpoints
            if (requestPath.startsWith("/api/")) {
                String apiKey = request.getHeader("X-API-Key");

                if (apiKey == null || apiKey.isBlank()) {
                    response.setStatus(HttpStatus.UNAUTHORIZED.value());
                    response.setContentType("application/json");
                    response.getWriter().write("{\"error\":\"API key missing. Provide X-API-Key header.\"}");
                    return;
                }

                if (!allowedApiKeys.contains(apiKey.trim())) {
                    response.setStatus(HttpStatus.FORBIDDEN.value());
                    response.setContentType("application/json");
                    response.getWriter().write("{\"error\":\"Invalid API key.\"}");
                    return;
                }
            }

            filterChain.doFilter(request, response);
        }
    }
}
