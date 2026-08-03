package com.neeshai.backend.project;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class ValidationEngine {
    private static final Logger logger = LoggerFactory.getLogger(ValidationEngine.class);
    private final ObjectMapper objectMapper = new ObjectMapper();

    public String generateReport(String validationAnswersJson) {
        if (validationAnswersJson == null || validationAnswersJson.trim().isEmpty()) {
            return "{}";
        }

        try {
            JsonNode answers = objectMapper.readTree(validationAnswersJson);

            // 1. Process Modules
            ModuleResult cvp = evaluateCVP(answers);
            ModuleResult market = evaluateMarket(answers);
            ModuleResult acquisition = evaluateAcquisition(answers);
            ModuleResult defensibility = evaluateDefensibility(answers);
            ModuleResult buildability = evaluateBuildability(answers);

            // 2. Final Output Engine (Average of percentages & Fatal Flaw detection)
            boolean hasFatalFlaw = (cvp.score == 0 || market.score == 0 || acquisition.score == 0 || defensibility.score == 0 || buildability.score == 0 
                || cvp.confidencePercent < 50 || market.confidencePercent < 50 || acquisition.confidencePercent < 50 || defensibility.confidencePercent < 50 || buildability.confidencePercent < 50);
            
            int sumConfidence = cvp.confidencePercent + market.confidencePercent + acquisition.confidencePercent + defensibility.confidencePercent + buildability.confidencePercent;
            int overallConfidence = Math.round((float) sumConfidence / 5.0f);

            // 3. Build Final Report JSON
            ObjectNode report = objectMapper.createObjectNode();
            report.put("overallScore", overallConfidence);
            report.put("hasFatalZero", hasFatalFlaw);
            
            String status = determineStatus(overallConfidence, hasFatalFlaw);
            report.put("status", status);
            report.put("overallStatus", status);

            ArrayNode modules = report.putArray("modules");
            modules.add(moduleToJson("Core Value Proposition", cvp));
            modules.add(moduleToJson("Market Size", market));
            modules.add(moduleToJson("Customer Acquisition", acquisition));
            modules.add(moduleToJson("Defensibility", defensibility));
            modules.add(moduleToJson("Buildability", buildability));

            // AI Action Plan
            ObjectNode actionPlan = report.putObject("actionPlan");
            ArrayNode strengths = actionPlan.putArray("strengths");
            ArrayNode weaknesses = actionPlan.putArray("weaknesses");

            List<ModuleResult> allModules = List.of(cvp, market, acquisition, defensibility, buildability);
            for (ModuleResult m : allModules) {
                if (m.score >= 2 && !m.strengthInsight.isEmpty()) strengths.add(m.strengthInsight);
                if (m.score <= 1 && !m.weaknessInsight.isEmpty()) weaknesses.add(m.weaknessInsight);
            }
            
            if (hasFatalFlaw) {
                actionPlan.put("nextStep", "CRITICAL STOP: You have at least one fatal flaw (Score 0). Stop all execution and fix the fundamental gaps identified before building further.");
            } else if (overallConfidence >= 80) {
                actionPlan.put("nextStep", "Proceed to the 20-Hour Validation Framework. Launch your Spotlight blog to collect real-world waitlist signups.");
            } else {
                actionPlan.put("nextStep", "Focus on strengthening your weak areas. Do not spend money on scaling until you have stronger evidence.");
            }

            return objectMapper.writeValueAsString(report);

        } catch (Exception e) {
            logger.error("Error generating validation report", e);
            return "{}";
        }
    }

    private String determineStatus(int score, boolean hasFatalFlaw) {
        if (hasFatalFlaw || score < 50) return "Slight Adjustments Needed";
        if (score < 65) return "Slight Adjustments Needed";
        if (score < 80) return "Refinement Needed";
        if (score < 90) return "Strong Opportunity";
        return "100% Market Ready Startup";
    }

    private ObjectNode moduleToJson(String name, ModuleResult result) {
        ObjectNode node = objectMapper.createObjectNode();
        node.put("name", name);
        node.put("internalScore", result.score);
        node.put("confidencePercent", result.confidencePercent);
        node.put("insight", result.insight);
        return node;
    }

    // ─── Module 1: Core Value Proposition ──────────────────────────────────────
    private ModuleResult evaluateCVP(JsonNode answers) {
        String inputA = getString(answers, "cvp_input_a"); // Alternative
        double inputC = getDouble(answers, "cvp_input_c"); // Alt Cost
        double inputD = getDouble(answers, "cvp_input_d"); // MVP Cost
        String inputE = getString(answers, "cvp_input_e"); // Reality Check

        if ("Doing Nothing".equalsIgnoreCase(inputA)) {
            return new ModuleResult(0, 42, 
                "Fatal Flaw: If the customer is doing nothing, they have accepted the problem. Problems untouched are usually not profitable.",
                "", "Customers have accepted the problem; low motivation to change.");
        }

        double multiplier = 0;
        if (inputD > 0) multiplier = inputC / inputD;

        int score;
        int conf;
        String insight;
        String weakness = "";
        String strength = "";

        if (multiplier < 2) {
            score = 1;
            conf = 55;
            insight = "Refinement Needed: Your product is only slightly better than existing alternatives (<2x). It will be hard to overcome customer inertia unless you increase the value multiplier.";
            weakness = "Product is not significantly better than existing alternatives.";
        } else if (multiplier < 5) {
            score = 1;
            conf = 60;
            insight = String.format("You have a %.1fx improvement. Requires proper scaling to reach the 10x threshold.", multiplier);
            weakness = "Improvement multiplier is decent but needs to approach 10x for organic growth.";
        } else if (multiplier < 8) {
            score = 2;
            conf = 80;
            insight = String.format("Strong value. At %.1fx better, you easily overcome customer switching costs.", multiplier);
            strength = "Meaningful product improvement (5x+) over alternatives.";
        } else {
            score = 3;
            conf = 95;
            insight = String.format("Massive value creation. A %.1fx multiplier acts like ChatGPT at launch.", multiplier);
            strength = "10x+ Value Proposition creates extreme customer pull.";
        }

        // Validation Penalty
        if ("Internal Hypothesis".equalsIgnoreCase(inputE)) {
            conf -= 10;
            insight += " WARNING: These numbers are unvalidated assumptions. You must go out and test this in the market.";
            weakness = "CVP numbers are based on internal hypothesis, not real data.";
        }

        return new ModuleResult(score, Math.max(0, conf), insight, strength, weakness);
    }

    // ─── Module 2: Market Size ──────────────────────────────────────────────
    private ModuleResult evaluateMarket(JsonNode answers) {
        String inputA = getString(answers, "market_input_a"); // Habit
        String inputB = getString(answers, "market_input_b"); // Desperation
        double inputC1 = getDouble(answers, "market_input_c1"); // Unit Spend
        String inputC2 = getString(answers, "market_input_c2"); // Population
        String inputD = getString(answers, "market_input_d"); // Geography

        if ("Requires new habit".equalsIgnoreCase(inputA)) {
            return new ModuleResult(0, 40,
                "Fatal Flaw: Creating a new habit requires crores in funding. Your market lacks existing spending behavior.",
                "", "Requires forcing entirely new consumer habits (expensive).");
        }

        if ("No too small".equalsIgnoreCase(inputC2)) {
            return new ModuleResult(0, 45,
                "Fatal Flaw: Your target population is mathematically too small to yield a 10Cr business at a 2% market share.",
                "", "Target population is too small for a viable TAM.");
        }

        int score;
        int conf;
        String insight;
        String weakness = "";
        String strength = "";

        if ("Unsure".equalsIgnoreCase(inputB) || "Guessing".equalsIgnoreCase(inputC2)) {
            score = 1;
            conf = 55;
            insight = "You have identified a problem but are unsure of the monetizability. You must research actual current spending.";
            weakness = "Market demand and willingness to pay are currently unverified.";
        } else if ("Concentrated Metro".equalsIgnoreCase(inputD)) {
            score = 2;
            conf = 85;
            insight = "Math proves the required population exists in a concentrated area, making distribution highly viable.";
            strength = "Large, concentrated, and monetizable market.";
        } else {
            // Dispersed penalty but mathematically passes
            score = 1;
            conf = 65;
            insight = "The population exists, but because they are geographically dispersed, capturing 2% will be extremely difficult. Focus on concentrated pockets.";
            weakness = "Market is too geographically dispersed for efficient early-stage distribution.";
        }

        if (score == 2 && inputC1 > 50000) {
            score = 3;
            conf = 96;
            insight = "Massive & Established. High unit economics in a concentrated market creates excellent viability.";
        }

        return new ModuleResult(score, conf, insight, strength, weakness);
    }

    // ─── Module 3: Customer Acquisition ─────────────────────────────────────
    private ModuleResult evaluateAcquisition(JsonNode answers) {
        String inputA = getString(answers, "acq_input_a"); // Zepto Grassroots
        String inputB = getString(answers, "acq_input_b"); // Cost of Trust
        String inputC = getString(answers, "acq_input_c"); // Founder Authority

        if ("No need strangers".equalsIgnoreCase(inputA)) {
            return new ModuleResult(0, 42,
                "Fatal Flaw: If you cannot convince 10 people in your network to trust you without ads, you cannot sell this product.",
                "", "No grassroots distribution; entirely dependent on cold strangers.");
        }

        int score;
        int conf;
        String insight;
        String weakness = "";
        String strength = "";

        if ("Established leaders".equalsIgnoreCase(inputC)) {
            score = 3;
            conf = 95;
            insight = "Built-in Authority: Your name acts as the marketing itself. Customers will flock with near zero friction.";
            strength = "Zero-cost acquisition via established founder authority.";
        } else if ("Organic recommend".equalsIgnoreCase(inputB)) {
            score = 2;
            conf = 82;
            insight = "Organic Growth: Your product must be good enough for word-of-mouth. This is the best viable path without a budget.";
            strength = "Acquisition is powered by trust and organic recommendations.";
        } else {
            score = 1;
            conf = 60;
            insight = "Buying Trust: Because you lack built-in credibility, you will burn heavy cash on ads/discounts just to manufacture trust.";
            weakness = "High initial customer acquisition cost (buying trust).";
        }

        return new ModuleResult(score, conf, insight, strength, weakness);
    }

    // ─── Module 4: Defensibility ────────────────────────────────────────────
    private ModuleResult evaluateDefensibility(JsonNode answers) {
        String inputA = getString(answers, "def_input_a"); // Patents/Secret
        String inputB = getString(answers, "def_input_b"); // Barrier type
        String inputC = getString(answers, "def_input_c"); // Roadmap

        int score;
        int conf;
        String insight;
        String weakness = "";
        String strength = "";

        if ("Patents".equalsIgnoreCase(inputA) || "Secret".equalsIgnoreCase(inputA)) {
            if ("Deep R&D".equalsIgnoreCase(inputB) || "On-ground operations".equalsIgnoreCase(inputB)) {
                score = 2;
                conf = 80;
                insight = "Deep-Tech Moat: Your reliance on patents/IP is supported by deep technological complexity or physical ops. Ensure you focus on speed-to-market alongside legal protections.";
                strength = "Defensible IP supported by hard technical/operational barriers.";
            } else {
                score = 1;
                conf = 55;
                insight = "Warning: Software patents and secrecy are rarely effective moats for easily copyable software. Speed of execution and distribution are much stronger defenses.";
                weakness = "High reliance on weak legal/IP protection for easily copyable software.";
            }
        } else if ("Defend single idea".equalsIgnoreCase(inputC)) {
            score = 1;
            conf = 55;
            insight = "Warning: Relying on a single product idea makes you highly vulnerable to clones. Outline a continuous roadmap/upgrade path to stay ahead.";
            weakness = "No continuous innovation roadmap; highly vulnerable to clones.";
        } else {
            if ("Uncopyable 20 yrs".equalsIgnoreCase(inputB)) {
                score = 3;
                conf = 90;
                insight = "You claim a 20-year uncopyable moat. Be careful—this mindset is dangerous. Continuous execution is your real defense.";
                strength = "Massive stated barrier to entry.";
            } else if ("Deep R&D".equalsIgnoreCase(inputB)) {
                score = 2;
                conf = 85;
                insight = "The 3-4 Year Moat: Deep scientific/hardware complexity gives you a solid head start while you build the next upgrade.";
                strength = "Strong operational/R&D barriers create a multi-year lead time.";
            } else {
                score = 1;
                conf = 65;
                insight = "The 6-Month Window: Your product is easily copyable. You must use this short head start to rapidly move the goalpost.";
                weakness = "Easily copyable product with a short (~6 month) lead time.";
            }
        }

        return new ModuleResult(score, conf, insight, strength, weakness);
    }

    // ─── Module 5: Buildability ─────────────────────────────────────────────
    private ModuleResult evaluateBuildability(JsonNode answers) {
        String inputA = getString(answers, "build_input_a"); // Team Stability
        String inputB = getString(answers, "build_input_b"); // MVP Criticality

        int score;
        int conf;
        String insight;
        String weakness = "";
        String strength = "";

        if ("Missing Links".equalsIgnoreCase(inputA)) {
            score = 1;
            conf = 55;
            insight = "Execution Gap: Missing key roles (e.g., Tech/Sales) creates a severe execution risk. Focus on finding a co-founder or technical partner before seeking external funding.";
            weakness = "Team is missing critical execution roles.";
        } else if ("Idea Stage".equalsIgnoreCase(inputB)) {
            if ("Deep R&D".equalsIgnoreCase(getString(answers, "def_input_b")) || 
                "On-ground operations".equalsIgnoreCase(getString(answers, "def_input_b"))) {
                score = 2;
                conf = 70;
                insight = "Capital-Intensive Path: Deep tech/physical operations projects typically require upfront capital to build an MVP. Ensure you have clear proof-of-concept mockups or research to show early investors.";
                strength = "Valid capital-intensive roadmap for deep-tech/physical MVP.";
            } else {
                score = 1;
                conf = 55;
                insight = "Bootstrap Challenge: For standard software/SaaS, relying on external funding just to build a prototype is a high-risk path. Try to build a no-code MVP or partner with a technical co-founder to show early traction.";
                weakness = "Dependent on external funding to build a standard software MVP.";
            }
        } else {
            if ("Heavy Overlap".equalsIgnoreCase(inputA) && "Stuck Stage".equalsIgnoreCase(inputB)) {
                score = 1;
                conf = 60;
                insight = "Support-Dependent Phase: Your execution capacity is dangerously stretched thin. You are highly dependent on external funding to survive.";
                weakness = "Team is stretched too thin; high burnout risk.";
            } else if ("Maximum Stability".equalsIgnoreCase(inputA) || "Self-Sufficient".equalsIgnoreCase(inputB)) {
                score = 3;
                conf = 95;
                insight = "Maximum Self-Sufficiency: Your founding team covers all bases. You can deliver value internally without investors.";
                strength = "Exceptional execution capacity; highly self-sufficient team.";
            } else {
                score = 2;
                conf = 82;
                insight = "Investable MVP Stage: Capable co-founders have balanced the load. You only need money to scale, not to build.";
                strength = "Balanced team with demonstrated execution capacity.";
            }
        }

        return new ModuleResult(score, conf, insight, strength, weakness);
    }

    // ─── Utility Methods ────────────────────────────────────────────────────
    private String getString(JsonNode node, String key) {
        JsonNode val = node.get(key);
        return val != null && !val.isNull() ? val.asText() : "";
    }

    private double getDouble(JsonNode node, String key) {
        JsonNode val = node.get(key);
        if (val != null && !val.isNull()) {
            try {
                return Double.parseDouble(val.asText());
            } catch (NumberFormatException e) {
                return 0.0;
            }
        }
        return 0.0;
    }

    // Record for passing module results internally
    private record ModuleResult(
            int score,
            int confidencePercent,
            String insight,
            String strengthInsight,
            String weaknessInsight
    ) {}
}
