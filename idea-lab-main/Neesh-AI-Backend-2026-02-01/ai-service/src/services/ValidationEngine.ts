export interface ModuleResult {
    score: number;
    confidencePercent: number;
    insight: string;
    strengthInsight: string;
    weaknessInsight: string;
}

export class ValidationEngine {
    public static generateReport(validationAnswersJson: string): string {
        if (!validationAnswersJson || validationAnswersJson.trim() === '' || validationAnswersJson === '{}') {
            return '{}';
        }

        try {
            const answers = typeof validationAnswersJson === 'string' ? JSON.parse(validationAnswersJson) : validationAnswersJson;

            // 1. Process Modules
            const cvp = this.evaluateCVP(answers);
            const market = this.evaluateMarket(answers);
            const acquisition = this.evaluateAcquisition(answers);
            const defensibility = this.evaluateDefensibility(answers);
            const buildability = this.evaluateBuildability(answers);

            // 2. Final Output Engine (Average of percentages & Fatal Flaw detection)
            const hasFatalFlaw = (
                cvp.score === 0 || market.score === 0 || acquisition.score === 0 || defensibility.score === 0 || buildability.score === 0 ||
                cvp.confidencePercent < 50 || market.confidencePercent < 50 || acquisition.confidencePercent < 50 || defensibility.confidencePercent < 50 || buildability.confidencePercent < 50
            );

            const sumConfidence = cvp.confidencePercent + market.confidencePercent + acquisition.confidencePercent + defensibility.confidencePercent + buildability.confidencePercent;
            const overallConfidence = Math.round(sumConfidence / 5.0);

            const status = this.determineStatus(overallConfidence, hasFatalFlaw);

            const modules = [
                this.moduleToJson("Core Value Proposition", cvp),
                this.moduleToJson("Market Size", market),
                this.moduleToJson("Customer Acquisition", acquisition),
                this.moduleToJson("Defensibility", defensibility),
                this.moduleToJson("Buildability", buildability),
            ];

            // AI Action Plan
            const strengths: string[] = [];
            const weaknesses: string[] = [];

            const allModules = [cvp, market, acquisition, defensibility, buildability];
            for (const m of allModules) {
                if (m.score >= 2 && m.strengthInsight) strengths.push(m.strengthInsight);
                if (m.score <= 1 && m.weaknessInsight) weaknesses.push(m.weaknessInsight);
            }

            let nextStep = "";
            if (hasFatalFlaw) {
                nextStep = "CRITICAL STOP: You have at least one fatal flaw (Score 0). Stop all execution and fix the fundamental gaps identified before building further.";
            } else if (overallConfidence >= 80) {
                nextStep = "Proceed to the 20-Hour Validation Framework. Launch your Spotlight blog to collect real-world waitlist signups.";
            } else {
                nextStep = "Focus on strengthening your weak areas. Do not spend money on scaling until you have stronger evidence.";
            }

            const report = {
                overallScore: overallConfidence,
                hasFatalZero: hasFatalFlaw,
                status,
                overallStatus: status,
                modules,
                actionPlan: {
                    strengths,
                    weaknesses,
                    nextStep
                }
            };

            return JSON.stringify(report);
        } catch (e) {
            console.error('[ValidationEngine] Error generating validation report:', e);
            return '{}';
        }
    }

    private static determineStatus(score: number, hasFatalFlaw: boolean): string {
        if (hasFatalFlaw || score < 50) return "Slight Adjustments Needed";
        if (score < 65) return "Slight Adjustments Needed";
        if (score < 80) return "Refinement Needed";
        if (score < 90) return "Strong Opportunity";
        return "100% Market Ready Startup";
    }

    private static moduleToJson(name: string, result: ModuleResult): any {
        return {
            name,
            internalScore: result.score,
            confidencePercent: result.confidencePercent,
            insight: result.insight,
            warnings: result.weaknessInsight ? [result.weaknessInsight] : []
        };
    }

    // ─── Module 1: Core Value Proposition ──────────────────────────────────────
    private static evaluateCVP(answers: any): ModuleResult {
        const inputA = this.getString(answers, "cvp_input_a"); // Alternative
        const inputC = this.getDouble(answers, "cvp_input_c"); // Alt Cost
        const inputD = this.getDouble(answers, "cvp_input_d"); // MVP Cost
        const inputE = this.getString(answers, "cvp_input_e"); // Reality Check

        if (inputA.toLowerCase() === "doing nothing") {
            return {
                score: 0,
                confidencePercent: 42,
                insight: "Fatal Flaw: If the customer is doing nothing, they have accepted the problem. Problems untouched are usually not profitable.",
                strengthInsight: "",
                weaknessInsight: "Customers have accepted the problem; low motivation to change."
            };
        }

        let multiplier = 0;
        if (inputD > 0) multiplier = inputC / inputD;

        let score: number;
        let conf: number;
        let insight: string;
        let weakness = "";
        let strength = "";

        if (multiplier < 2) {
            score = 1;
            conf = 55;
            insight = "Refinement Needed: Your product is only slightly better than existing alternatives (<2x). It will be hard to overcome customer inertia unless you increase the value multiplier.";
            weakness = "Product is not significantly better than existing alternatives.";
        } else if (multiplier < 5) {
            score = 1;
            conf = 60;
            insight = `You have a ${multiplier.toFixed(1)}x improvement. Requires proper scaling to reach the 10x threshold.`;
            weakness = "Improvement multiplier is decent but needs to approach 10x for organic growth.";
        } else if (multiplier < 8) {
            score = 2;
            conf = 80;
            insight = `Strong value. At ${multiplier.toFixed(1)}x better, you easily overcome customer switching costs.`;
            strength = "Meaningful product improvement (5x+) over alternatives.";
        } else {
            score = 3;
            conf = 95;
            insight = `Massive value creation. A ${multiplier.toFixed(1)}x multiplier acts like ChatGPT at launch.`;
            strength = "10x+ Value Proposition creates extreme customer pull.";
        }

        // Validation Penalty
        if (inputE.toLowerCase() === "internal hypothesis") {
            conf -= 10;
            insight += " WARNING: These numbers are unvalidated assumptions. You must go out and test this in the market.";
            weakness = "CVP numbers are based on internal hypothesis, not real data.";
        }

        return { score, confidencePercent: Math.max(0, conf), insight, strengthInsight: strength, weaknessInsight: weakness };
    }

    // ─── Module 2: Market Size ──────────────────────────────────────────────
    private static evaluateMarket(answers: any): ModuleResult {
        const inputA = this.getString(answers, "market_input_a"); // Habit
        const inputB = this.getString(answers, "market_input_b"); // Desperation
        const inputC1 = this.getDouble(answers, "market_input_c1"); // Unit Spend
        const inputC2 = this.getString(answers, "market_input_c2"); // Population
        const inputD = this.getString(answers, "market_input_d"); // Geography

        if (inputA.toLowerCase() === "requires new habit") {
            return {
                score: 0,
                confidencePercent: 40,
                insight: "Fatal Flaw: Creating a new habit requires crores in funding. Your market lacks existing spending behavior.",
                strengthInsight: "",
                weaknessInsight: "Requires forcing entirely new consumer habits (expensive)."
            };
        }

        if (inputC2.toLowerCase() === "no too small") {
            return {
                score: 0,
                confidencePercent: 45,
                insight: "Fatal Flaw: Your target population is mathematically too small to yield a 10Cr business at a 2% market share.",
                strengthInsight: "",
                weaknessInsight: "Target population is too small for a viable TAM."
            };
        }

        let score: number;
        let conf: number;
        let insight: string;
        let weakness = "";
        let strength = "";

        if (inputB.toLowerCase() === "unsure" || inputC2.toLowerCase() === "guessing") {
            score = 1;
            conf = 55;
            insight = "You have identified a problem but are unsure of the monetizability. You must research actual current spending.";
            weakness = "Market demand and willingness to pay are currently unverified.";
        } else if (inputD.toLowerCase() === "concentrated metro") {
            score = 2;
            conf = 85;
            insight = "Math proves the required population exists in a concentrated area, making distribution highly viable.";
            strength = "Large, concentrated, and monetizable market.";
        } else {
            score = 1;
            conf = 65;
            insight = "The population exists, but because they are geographically dispersed, capturing 2% will be extremely difficult. Focus on concentrated pockets.";
            weakness = "Market is too geographically dispersed for efficient early-stage distribution.";
        }

        if (score === 2 && inputC1 > 50000) {
            score = 3;
            conf = 96;
            insight = "Massive & Established. High unit economics in a concentrated market creates excellent viability.";
        }

        return { score, confidencePercent: conf, insight, strengthInsight: strength, weaknessInsight: weakness };
    }

    // ─── Module 3: Customer Acquisition ─────────────────────────────────────
    private static evaluateAcquisition(answers: any): ModuleResult {
        const inputA = this.getString(answers, "acq_input_a"); // Zepto Grassroots
        const inputB = this.getString(answers, "acq_input_b"); // Cost of Trust
        const inputC = this.getString(answers, "acq_input_c"); // Founder Authority

        if (inputA.toLowerCase() === "no need strangers") {
            return {
                score: 0,
                confidencePercent: 42,
                insight: "Fatal Flaw: If you cannot convince 10 people in your network to trust you without ads, you cannot sell this product.",
                strengthInsight: "",
                weaknessInsight: "No grassroots distribution; entirely dependent on cold strangers."
            };
        }

        let score: number;
        let conf: number;
        let insight: string;
        let weakness = "";
        let strength = "";

        if (inputC.toLowerCase() === "established leaders") {
            score = 3;
            conf = 95;
            insight = "Built-in Authority: Your name acts as the marketing itself. Customers will flock with near zero friction.";
            strength = "Zero-cost acquisition via established founder authority.";
        } else if (inputB.toLowerCase() === "organic recommend") {
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

        return { score, confidencePercent: conf, insight, strengthInsight: strength, weaknessInsight: weakness };
    }

    // ─── Module 4: Defensibility ────────────────────────────────────────────
    private static evaluateDefensibility(answers: any): ModuleResult {
        const inputA = this.getString(answers, "def_input_a"); // Patents/Secret
        const inputB = this.getString(answers, "def_input_b"); // Barrier type
        const inputC = this.getString(answers, "def_input_c"); // Roadmap

        let score: number;
        let conf: number;
        let insight: string;
        let weakness = "";
        let strength = "";

        if (inputA.toLowerCase() === "patents" || inputA.toLowerCase() === "secret") {
            if (inputB.toLowerCase() === "deep r&d" || inputB.toLowerCase() === "on-ground operations") {
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
        } else if (inputC.toLowerCase() === "defend single idea") {
            score = 1;
            conf = 55;
            insight = "Warning: Relying on a single product idea makes you highly vulnerable to clones. Outline a continuous roadmap/upgrade path to stay ahead.";
            weakness = "No continuous innovation roadmap; highly vulnerable to clones.";
        } else {
            if (inputB.toLowerCase() === "uncopyable 20 yrs") {
                score = 3;
                conf = 90;
                insight = "You claim a 20-year uncopyable moat. Be careful—this mindset is dangerous. Continuous execution is your real defense.";
                strength = "Massive stated barrier to entry.";
            } else if (inputB.toLowerCase() === "deep r&d") {
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

        return { score, confidencePercent: conf, insight, strengthInsight: strength, weaknessInsight: weakness };
    }

    // ─── Module 5: Buildability ─────────────────────────────────────────────
    private static evaluateBuildability(answers: any): ModuleResult {
        const inputA = this.getString(answers, "build_input_a"); // Team Stability
        const inputB = this.getString(answers, "build_input_b"); // MVP Criticality

        let score: number;
        let conf: number;
        let insight: string;
        let weakness = "";
        let strength = "";

        if (inputA.toLowerCase() === "missing links") {
            score = 1;
            conf = 55;
            insight = "Execution Gap: Missing key roles (e.g., Tech/Sales) creates a severe execution risk. Focus on finding a co-founder or technical partner before seeking external funding.";
            weakness = "Team is missing critical execution roles.";
        } else if (inputB.toLowerCase() === "idea stage") {
            const defB = this.getString(answers, "def_input_b").toLowerCase();
            if (defB === "deep r&d" || defB === "on-ground operations") {
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
            if (inputA.toLowerCase() === "heavy overlap" && inputB.toLowerCase() === "stuck stage") {
                score = 1;
                conf = 60;
                insight = "Support-Dependent Phase: Your execution capacity is dangerously stretched thin. You are highly dependent on external funding to survive.";
                weakness = "Team is stretched too thin; high burnout risk.";
            } else if (inputA.toLowerCase() === "maximum stability" || inputB.toLowerCase() === "self-sufficient") {
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

        return { score, confidencePercent: conf, insight, strengthInsight: strength, weaknessInsight: weakness };
    }

    private static getString(node: any, key: string): string {
        if (!node || typeof node !== 'object') return '';
        const val = node[key];
        return val !== undefined && val !== null ? String(val).trim() : '';
    }

    private static getDouble(node: any, key: string): number {
        if (!node || typeof node !== 'object') return 0;
        const val = node[key];
        if (val !== undefined && val !== null) {
            const num = parseFloat(String(val));
            return isNaN(num) ? 0 : num;
        }
        return 0;
    }
}
