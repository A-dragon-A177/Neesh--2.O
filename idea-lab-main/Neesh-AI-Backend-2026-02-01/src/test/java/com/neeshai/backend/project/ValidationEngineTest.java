package com.neeshai.backend.project;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ValidationEngineTest {

    private final ValidationEngine validationEngine = new ValidationEngine();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void testDeepTechStartup_WithPatentsAndIdeaStage_ShouldNotHaveFatalFlaw() throws Exception {
        // Given a Deep-Tech startup that relies on Patents, is at the Idea Stage, but has Deep R&D
        String answers = "{" +
                "\"cvp_input_a\":\"Other Alternative\"," +
                "\"cvp_input_c\":10000," +
                "\"cvp_input_d\":1000," + // Multiplier = 10x
                "\"cvp_input_e\":\"Validated\"," +
                "\"market_input_a\":\"Existing habit\"," +
                "\"market_input_b\":\"Desperate\"," +
                "\"market_input_c1\":50000," +
                "\"market_input_c2\":\"Validated\"," +
                "\"market_input_d\":\"Concentrated Metro\"," +
                "\"acq_input_a\":\"Yes have 10\"," +
                "\"acq_input_b\":\"Organic recommend\"," +
                "\"acq_input_c\":\"Unknown\"," +
                "\"def_input_a\":\"Patents\"," + // Relies on patents
                "\"def_input_b\":\"Deep R&D\"," +   // But has Deep R&D barrier
                "\"def_input_c\":\"Release next upgrade\"," +
                "\"build_input_a\":\"Balanced Overlap\"," +
                "\"build_input_b\":\"Idea Stage\"" + // Needing funding to build MVP
                "}";

        // When
        String reportJson = validationEngine.generateReport(answers);
        JsonNode report = objectMapper.readTree(reportJson);

        // Then
        assertFalse(report.get("hasFatalZero").asBoolean(), "Should not have fatal flaw");
        assertNotEquals("CRITICAL STOP: You have at least one fatal flaw (Score 0). Stop all execution and fix the fundamental gaps identified before building further.",
                report.get("actionPlan").get("nextStep").asText());
        
        // Defensibility and Buildability should not score 0
        JsonNode modules = report.get("modules");
        JsonNode defensibility = findModule(modules, "Defensibility");
        JsonNode buildability = findModule(modules, "Buildability");
        
        assertNotNull(defensibility);
        assertNotNull(buildability);
        assertEquals(2, defensibility.get("internalScore").asInt(), "Defensibility score should be 2 for Deep R&D with patents");
        assertEquals(2, buildability.get("internalScore").asInt(), "Buildability score should be 2 for Deep R&D in Idea Stage");
    }

    @Test
    void testLowCvpMultiplier_ShouldNotHaveFatalFlaw() throws Exception {
        // Given CVP cost multiplier is < 2 (e.g. Alt cost 100, MVP cost 80 -> multiplier = 1.25)
        String answers = "{" +
                "\"cvp_input_a\":\"Other Alternative\"," +
                "\"cvp_input_c\":100," +
                "\"cvp_input_d\":80," + // Multiplier = 1.25 < 2
                "\"cvp_input_e\":\"Validated\"," +
                "\"market_input_a\":\"Existing habit\"," +
                "\"market_input_b\":\"Desperate\"," +
                "\"market_input_c1\":50000," +
                "\"market_input_c2\":\"Validated\"," +
                "\"market_input_d\":\"Concentrated Metro\"," +
                "\"acq_input_a\":\"Yes have 10\"," +
                "\"acq_input_b\":\"Organic recommend\"," +
                "\"acq_input_c\":\"Unknown\"," +
                "\"def_input_a\":\"Speed of execution\"," +
                "\"def_input_b\":\"Easily copyable\"," +
                "\"def_input_c\":\"Release next upgrade\"," +
                "\"build_input_a\":\"Balanced Overlap\"," +
                "\"build_input_b\":\"Traction Stage\"" +
                "}";

        // When
        String reportJson = validationEngine.generateReport(answers);
        JsonNode report = objectMapper.readTree(reportJson);

        // Then
        assertFalse(report.get("hasFatalZero").asBoolean(), "Low value proposition multiplier should not trigger fatal flaw");
        JsonNode cvpModule = findModule(report.get("modules"), "Core Value Proposition");
        assertNotNull(cvpModule);
        assertEquals(1, cvpModule.get("internalScore").asInt(), "CVP score should be 1, not 0");
    }

    @Test
    void testStandardFatalFlaw_ShouldStillTrigger() throws Exception {
        // Given customer is "Doing Nothing" (a legitimate fatal flaw)
        String answers = "{" +
                "\"cvp_input_a\":\"Doing Nothing\"," +
                "\"cvp_input_c\":100," +
                "\"cvp_input_d\":80," +
                "\"cvp_input_e\":\"Validated\"," +
                "\"market_input_a\":\"Existing habit\"," +
                "\"market_input_b\":\"Desperate\"," +
                "\"market_input_c1\":50000," +
                "\"market_input_c2\":\"Validated\"," +
                "\"market_input_d\":\"Concentrated Metro\"," +
                "\"acq_input_a\":\"Yes have 10\"," +
                "\"acq_input_b\":\"Organic recommend\"," +
                "\"acq_input_c\":\"Unknown\"," +
                "\"def_input_a\":\"Speed of execution\"," +
                "\"def_input_b\":\"Easily copyable\"," +
                "\"def_input_c\":\"Release next upgrade\"," +
                "\"build_input_a\":\"Balanced Overlap\"," +
                "\"build_input_b\":\"Traction Stage\"" +
                "}";

        // When
        String reportJson = validationEngine.generateReport(answers);
        JsonNode report = objectMapper.readTree(reportJson);

        // Then
        assertTrue(report.get("hasFatalZero").asBoolean(), "Doing Nothing alternative should trigger fatal flaw");
    }

    private JsonNode findModule(JsonNode modules, String name) {
        if (modules.isArray()) {
            for (JsonNode m : modules) {
                if (name.equals(m.get("name").asText())) {
                    return m;
                }
            }
        }
        return null;
    }
}
