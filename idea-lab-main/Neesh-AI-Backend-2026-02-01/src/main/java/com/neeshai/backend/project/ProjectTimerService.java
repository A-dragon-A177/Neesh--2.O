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
     * Checks non-locked projects whose 20-hour timer has expired.
     * Evaluates audience qualification:
     * - Gold >= 5
     * - Silver >= 10
     * - Bronze >= 15
     * If requirements are not met within the 20 hours, the project is locked.
     */
    @Scheduled(fixedDelay = 300000, initialDelay = 15000)
    public void evaluateExpiredProjectTimers() {
        try {
            ZonedDateTime now = ZonedDateTime.now();
            List<Project> expiredProjects = projectRepository.findExpiredActiveProjects(now);

            if (expiredProjects.isEmpty()) {
                return;
            }

            // Process in bounded batches (max 50 per run) to prevent connection pool exhaustion
            List<Project> batch = expiredProjects.stream().limit(50).toList();
            log.info("ProjectTimerService: Evaluating batch of {} expired project(s) (total pending: {})...",
                    batch.size(), expiredProjects.size());

            for (Project project : batch) {
                try {
                    processExpiredProject(project, now);
                } catch (Exception ex) {
                    log.error("Failed to evaluate project timer for {}: {}", project.getId(), ex.getMessage(), ex);
                }
            }
        } catch (Exception e) {
            log.error("Error in ProjectTimerService evaluation: {}", e.getMessage(), e);
        }
    }

    @Transactional
    public void processExpiredProject(Project project, ZonedDateTime now) {
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
            log.warn("Project {} ('{}') failed 20-hour sprint goals (Gold: {}/5, Silver: {}/10, Bronze: {}/15). Locking project.",
                    project.getId(), project.getTitle(), gold, silver, bronze);
            project.setStatus("LOCKED");
            projectRepository.save(project);
        } else {
            log.info("Project {} ('{}') successfully met all sprint requirements (Gold: {}, Silver: {}, Bronze: {})! Auto-promoting to Stage 3 Pilot MVP.",
                    project.getId(), project.getTitle(), gold, silver, bronze);
            project.setStatus("STAGE3_ACTIVE");
            if (project.getStage3Deadline() == null) {
                project.setStage3Deadline(now.plusHours(200));
            }
            projectRepository.save(project);
        }
    }

    /**
     * Scheduled background job running every 5 minutes.
     * Checks STAGE3_ACTIVE projects whose 200-hour Pilot MVP timer has expired.
     * When expired, permanently closes the project (terminal state, can never be reopened).
     */
    @Scheduled(fixedDelay = 300000, initialDelay = 30000)
    public void evaluateStage3Timers() {
        try {
            ZonedDateTime now = ZonedDateTime.now();
            List<Project> expiredStage3Projects = projectRepository.findExpiredStage3Projects(now);

            if (expiredStage3Projects.isEmpty()) {
                return;
            }

            // Process in bounded batches (max 50 per run)
            List<Project> batch = expiredStage3Projects.stream().limit(50).toList();
            log.info("ProjectTimerService: Evaluating batch of {} expired Stage 3 project(s) for permanent closure...",
                    batch.size());

            for (Project project : batch) {
                try {
                    closeStage3Project(project);
                } catch (Exception ex) {
                    log.error("Failed to close Stage 3 project {}: {}", project.getId(), ex.getMessage(), ex);
                }
            }
        } catch (Exception e) {
            log.error("Error in ProjectTimerService Stage 3 evaluation: {}", e.getMessage(), e);
        }
    }

    @Transactional
    public void closeStage3Project(Project project) {
        log.warn("Project {} ('{}') Stage 3 200-hour Pilot MVP timer expired. Permanently CLOSING project.",
                project.getId(), project.getTitle());
        project.setStatus("CLOSED");
        projectRepository.save(project);
    }
}
