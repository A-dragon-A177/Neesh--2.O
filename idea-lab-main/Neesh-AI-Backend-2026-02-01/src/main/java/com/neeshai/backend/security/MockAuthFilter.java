package com.neeshai.backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

public class MockAuthFilter extends OncePerRequestFilter {

    private final boolean enabled;
    private final String mockUserId;

    public MockAuthFilter(boolean enabled, String mockUserId) {
        this.enabled = enabled;
        this.mockUserId = mockUserId;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        if (enabled) {
            String authHeader = request.getHeader("Authorization");
            if (authHeader != null && authHeader.equals("Bearer mock-token")) {
                Map<String, Object> headers = new HashMap<>();
                headers.put("alg", "none");

                Map<String, Object> claims = new HashMap<>();
                claims.put("sub", mockUserId != null ? mockUserId : "d564fa72-c288-466d-88f2-2bbdf19a6b18");
                claims.put("email", "test@example.com");
                claims.put("name", "Test User");

                Jwt mockJwt = new Jwt("mock-token",
                        Instant.now(),
                        Instant.now().plusSeconds(3600),
                        headers,
                        claims);

                JwtAuthenticationToken mockAuth = new JwtAuthenticationToken(mockJwt);
                SecurityContextHolder.getContext().setAuthentication(mockAuth);
            }
        }
        filterChain.doFilter(request, response);
    }
}

