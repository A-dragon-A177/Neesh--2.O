package com.neeshai.backend.project;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProjectRepository extends JpaRepository<Project, UUID> {

    // @SQLRestriction ensures these only return non-deleted
    List<Project> findByOwnerId(UUID ownerId);
    org.springframework.data.domain.Page<Project> findByOwnerId(UUID ownerId, org.springframework.data.domain.Pageable pageable);

    Optional<Project> findBySlug(String slug);

    boolean existsBySlug(String slug);

    // Native query to check existence including soft-deleted rows (to enforce
    // global uniqueness)
    @Query(value = "SELECT COUNT(*) > 0 FROM projects WHERE slug = :slug", nativeQuery = true)
    boolean existsBySlugInDb(@Param("slug") String slug);

    @org.springframework.data.jpa.repository.Modifying
    @Query("UPDATE Project p SET p.pitchViewCount = COALESCE(p.pitchViewCount, 0) + 1 WHERE p.id = :id")
    void incrementPitchViewCount(@Param("id") UUID id);

    @Query("SELECT p FROM Project p WHERE (p.deleted = false OR p.deleted IS NULL) AND p.status != 'LOCKED' AND p.timerDeadline IS NOT NULL AND p.timerDeadline < :now")
    List<Project> findExpiredActiveProjects(@Param("now") java.time.ZonedDateTime now);
}
