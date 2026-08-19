package com.neeshai.backend.project;

import com.neeshai.backend.audience.AudienceDTOs;
import com.neeshai.backend.audience.AudienceMember;
import com.neeshai.backend.audience.AudienceMemberRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.List;

@Service
public class ProjectTimerService {

    private static final Logger log = LoggerFactory.getLogger(ProjectTimerService.class);

    private final ProjectRepository projectRepository;
    private final AudienceMemberRepository audienceMemberRepository;

    public ProjectTimerService(ProjectRepository projectRepository, AudienceMemberRepository audienceMemberRepository) {
        this.projectRepository = projectRepository;
        this.audienceMemberRepository = audienceMemberRepository;
    }

    /**
     * Scheduled background job running every 5 minutes.
     * Checks all non-locked projects whose 5-day timer has expired.
     * Evaluates audience qualification:
     * - Gold >= 5
     * - Silver >= 10
     * - Bronze >= 15
     * If requirements are not met within the 5 days, the project is locked.
     */
    @Scheduled(fixedDelay = 300000, initialDelay = 15000)
    @Transactional
    public void evaluateExpiredProjectTimers() {
        try {
            ZonedDateTime now = ZonedDateTime.now();
            List<Project> expiredProjects = projectRepository.findExpiredActiveProjects(now);

            if (expiredProjects.isEmpty()) {
                return;
            }

            log.info("ProjectTimerService: Evaluating {} expired project(s) for validation requirements...", expiredProjects.size());

            for (Project project : expiredProjects) {
                List<AudienceMember> members = audienceMemberRepository.findRealAudienceByProjectId(project.getId());
                int gold = 0;
                int silver = 0;
                int bronze = 0;

                for (AudienceMember m : members) {
                    String tier = AudienceDTOs.computeValidationTier(m);
                    if ("GOLD".equalsIgnoreCase(tier)) gold++;
                    else if ("SILVER".equalsIgnoreCase(tier)) silver++;
                    else if ("BRONZE".equalsIgnoreCase(tier)) bronze++;
                }

                boolean meetsRequirements = (gold >= 5 && silver >= 10 && bronze >= 15);

                if (!meetsRequirements) {
                    log.warn("Project {} ('{}') failed 5-day sprint goals (Gold: {}/5, Silver: {}/10, Bronze: {}/15). Locking project.",
                            project.getId(), project.getTitle(), gold, silver, bronze);
                    project.setStatus("LOCKED");
                    projectRepository.save(project);
                } else {
                    log.info("Project {} ('{}') successfully met all sprint requirements (Gold: {}, Silver: {}, Bronze: {})!",
                            project.getId(), project.getTitle(), gold, silver, bronze);
                }
            }
        } catch (Exception e) {
            log.error("Error in ProjectTimerService evaluation: {}", e.getMessage(), e);
        }
    }
}
