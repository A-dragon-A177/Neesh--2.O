package com.neeshai.backend.security;

import com.neeshai.backend.user.UserService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.filter.OncePerRequestFilter;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.io.IOException;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);
    private static final long SYNC_CACHE_TTL_MS = 60_000L; // 60 seconds TTL

    private final String jwtSecret;
    private final UserService userService;
    private final ConcurrentHashMap<UUID, Long> syncedUserCache = new ConcurrentHashMap<>();

    public JwtAuthenticationFilter(UserService userService, String jwtSecret) {
        this.userService = userService;
        this.jwtSecret = jwtSecret;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        var authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication != null && authentication.getPrincipal() instanceof Jwt) {
            Jwt jwt = (Jwt) authentication.getPrincipal();

            try {
                String userIdStr = jwt.getSubject();
                UUID userId = UUID.fromString(userIdStr);
                long now = System.currentTimeMillis();

                Long lastSynced = syncedUserCache.get(userId);
                if (lastSynced == null || (now - lastSynced) > SYNC_CACHE_TTL_MS) {
                    String email = jwt.getClaimAsString("email");
                    String name = jwt.getClaimAsString("name");
                    if (name == null && jwt.hasClaim("user_metadata")) {
                        var metadata = jwt.getClaimAsMap("user_metadata");
                        if (metadata != null) {
                            name = (String) metadata.getOrDefault("name", metadata.get("full_name"));
                        }
                    }

                    userService.syncUser(userId, email, name);
                    syncedUserCache.put(userId, now);
                    log.debug("Successfully synced user from JWT: {} ({})", userId, email);
                }

            } catch (Exception e) {
                log.error("Failed to sync user from JWT: {}", e.getMessage(), e);
            }
        }

        filterChain.doFilter(request, response);
    }
}
