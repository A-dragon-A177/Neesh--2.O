package com.neeshai.backend.audience;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AudienceMemberRepository extends JpaRepository<AudienceMember, UUID> {

    List<AudienceMember> findByProjectIdOrderByLastInteractionAtDesc(UUID projectId);

    List<AudienceMember> findByProjectIdAndOccupation(UUID projectId, String occupation);

    Optional<AudienceMember> findByProjectIdAndEmail(UUID projectId, String email);

    /**
     * Fetch real audience members — excludes anonymous chatbot-only entries
     * (those tagged feedbackSource='Chatbot' whose email ends in '@chatbot')
     */
    @Query("SELECT m FROM AudienceMember m WHERE m.project.id = :projectId " +
           "ORDER BY m.lastInteractionAt DESC")
    List<AudienceMember> findRealAudienceByProjectId(@Param("projectId") UUID projectId);

    @Query("SELECT m FROM AudienceMember m WHERE m.project.id = :projectId " +
           "ORDER BY m.lastInteractionAt DESC")
    List<AudienceMember> findRealAudienceByProjectIdCursor(@Param("projectId") UUID projectId, org.springframework.data.domain.Pageable pageable);

    @Query("SELECT COUNT(m) FROM AudienceMember m WHERE m.project.id = :projectId " +
           "AND m.interestedAt IS NOT NULL")
    long countInterestedByProjectId(@Param("projectId") UUID projectId);
}
