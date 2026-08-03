package com.neeshai.backend.kb;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.security.Principal;
import java.util.List;
import java.util.UUID;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    private static final Logger log = LoggerFactory.getLogger(DocumentController.class);
    private final DocumentService documentService;

    public DocumentController(DocumentService documentService) {
        this.documentService = documentService;
    }

    private UUID getUserIdFromJwt(Jwt jwt) {
        try {
            return UUID.fromString(jwt.getSubject());
        } catch (IllegalArgumentException e) {
            log.error("Failed to parse UUID from JWT subject: {}", jwt.getSubject());
            throw e;
        }
    }

    // Upload New
    @PostMapping("/project/{projectId}")
    public ResponseEntity<KnowledgeDocumentDTO> uploadNew(
            @PathVariable UUID projectId,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = getUserIdFromJwt(jwt);
        Document doc = documentService.uploadNewDocument(projectId, userId, file);
        return ResponseEntity.ok(KnowledgeDocumentDTO.fromEntity(doc));
    }

    // Replace Existing
    @PutMapping("/{documentId}/replace")
    public ResponseEntity<KnowledgeDocumentDTO> replaceExisting(
            @PathVariable UUID documentId,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = getUserIdFromJwt(jwt);
        Document doc = documentService.replaceDocument(documentId, userId, file);
        return ResponseEntity.ok(KnowledgeDocumentDTO.fromEntity(doc));
    }

    // List
    @GetMapping("/project/{projectId}")
    public ResponseEntity<?> listDocuments(
            @PathVariable UUID projectId,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false, defaultValue = "20") int size,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = getUserIdFromJwt(jwt);
        if (page != null) {
            org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(
                    Math.max(0, page), Math.min(Math.max(1, size), 100),
                    org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "uploadedAt")
            );
            return ResponseEntity.ok(documentService.getActiveDocuments(projectId, userId, pageable));
        }
        return ResponseEntity.ok(documentService.getActiveDocuments(projectId, userId));
    }

    @DeleteMapping("/{documentId}")
    public ResponseEntity<Void> deleteDocument(
            @PathVariable UUID documentId,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = getUserIdFromJwt(jwt);
        documentService.deleteDocument(documentId, userId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/project/{projectId}/refresh")
    public ResponseEntity<Void> refreshDocuments(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = getUserIdFromJwt(jwt);
        documentService.refreshDocuments(projectId, userId);
        return ResponseEntity.ok().build();
    }
}
