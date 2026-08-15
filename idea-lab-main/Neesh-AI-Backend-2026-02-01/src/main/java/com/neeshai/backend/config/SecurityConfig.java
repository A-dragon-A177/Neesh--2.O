package com.neeshai.backend.config;

import com.neeshai.backend.security.JwtAuthenticationFilter;
import com.neeshai.backend.security.MockAuthFilter;
import com.neeshai.backend.user.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private static final Logger log = LoggerFactory.getLogger(SecurityConfig.class);

    private final UserService userService;
    private final String jwtSecret;
    private final Environment environment;

    @Value("${cors.allowed-origins:http://localhost:3000,http://localhost:8080}")
    private String allowedOrigins;

    @Value("${app.mock-auth.enabled:false}")
    private boolean mockAuthEnabled;

    @Value("${app.mock-auth.user-id:d564fa72-c288-466d-88f2-2bbdf19a6b18}")
    private String mockUserId;

    public SecurityConfig(UserService userService, @Value("${supabase.jwt.secret}") String jwtSecret, Environment environment) {
        this.userService = userService;
        this.jwtSecret = jwtSecret;
        this.environment = environment;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // CSRF is safely disabled because all state-changing endpoints authenticate
                // via stateless Bearer tokens in Authorization headers, not ambient browser cookies.
                // If cookie-based authentication is ever introduced, CSRF protection must be re-enabled.
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/error").permitAll()
                        .requestMatchers("/api/public/**").permitAll()
                        .requestMatchers("/api/payments/public/**").permitAll()
                        .requestMatchers("/api/admin/login").permitAll()
                        .requestMatchers("/api/admin/coupons/validate").permitAll()
                        .requestMatchers("/api/**").authenticated()
                        .anyRequest().authenticated())
                .oauth2ResourceServer(
                        oauth2 -> oauth2.jwt(org.springframework.security.config.Customizer.withDefaults()));

        // Add the sync filter AFTER the Bearer Token authentication filter
        JwtAuthenticationFilter jwtAuthenticationFilter = new JwtAuthenticationFilter(userService, jwtSecret);
        http.addFilterAfter(jwtAuthenticationFilter, BearerTokenAuthenticationFilter.class);

        // SECURITY: Only register MockAuthFilter when the "dev" profile is active
        boolean isDevProfile = Arrays.asList(environment.getActiveProfiles()).contains("dev");
        if (isDevProfile && mockAuthEnabled) {
            log.warn("⚠️  MockAuthFilter is ACTIVE — this must NEVER happen in production!");
            http.addFilterBefore(new MockAuthFilter(true, mockUserId), BearerTokenAuthenticationFilter.class);
        }

        return http.build();
    }

    @Bean
    public CorsFilter corsFilter() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowCredentials(true);

        // Parse allowed origins from configuration
        List<String> origins = Arrays.asList(allowedOrigins.split(","));
        config.setAllowedOrigins(origins);

        config.setAllowedHeaders(Arrays.asList("Origin", "Content-Type", "Accept", "Authorization"));
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }
}
