import { getSpotlightTitle } from "./spotlightTitles";

export interface CustomFieldItem {
  id: string;
  type: string;
  value?: string;
  order?: number;
  sectionTitle?: string;
  title?: string;
  description?: string;
  fields?: any[];
  imageUrl?: string;
  videoUrl?: string;
  [key: string]: any;
}

export interface SectionModel {
  id: string;
  title: string;
  content: string;
  type: string;
  sectionTitle?: string;
  imageUrl?: string;
  videoUrl?: string;
  feedbackTitle?: string;
  feedbackDescription?: string;
  feedbackFields?: any[];
}

/**
 * Maps raw validation answers (from projects.validation_answers) into structured
 * narrative and reality-check sections for Spotlight and Spotlight Editor.
 */
export function buildSectionsFromValidationAnswers(
  rawAnswers: Record<string, any> | string | null | undefined
): Array<{ title: string; sectionTitle: string; value: string }> {
  if (!rawAnswers) return [];

  let answers: Record<string, any> = {};
  if (typeof rawAnswers === "string") {
    try {
      answers = JSON.parse(rawAnswers);
    } catch (e) {
      console.warn("[spotlightSections] Failed to parse answers JSON:", e);
      return [];
    }
  } else if (typeof rawAnswers === "object") {
    answers = rawAnswers;
  }

  const results: Array<{ title: string; sectionTitle: string; value: string }> = [];

  // Helper to extract first non-empty string among keys
  const getStringVal = (...keys: string[]): string => {
    for (const k of keys) {
      const v = answers[k];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
  };

  // 1. The Problem (Typed Answer)
  const problemVal = getStringVal("problem_story", "problem", "the_problem", "problemDescription");
  if (problemVal) {
    results.push({ title: "The Problem", sectionTitle: "The Problem", value: problemVal });
  }

  // 2. What We're Building / Solution (Typed Answer)
  const solutionVal = getStringVal("our_solution", "solution", "what_building", "solutionDescription");
  if (solutionVal) {
    results.push({ title: "What We're Building", sectionTitle: "What We're Building", value: solutionVal });
  }

  // 3. Who It's For / Target Customer (Typed Answer)
  const targetVal = getStringVal("target_customer", "target_audience", "idealCustomer", "who_its_for");
  if (targetVal) {
    results.push({ title: "Who It's For", sectionTitle: "Who It's For", value: targetVal });
  }

  // 4. The Hook / Surprising Insight (Typed Answer)
  const hookVal = getStringVal("the_hook", "hook", "keyInsight", "surprisingInsight");
  if (hookVal) {
    results.push({ title: "The Hook", sectionTitle: "The Hook", value: hookVal });
  }

  // 5. The Founder's Story (Typed Answer)
  const founderVal = getStringVal("founder_story", "founderStory", "motivation", "the_founders_story");
  if (founderVal) {
    results.push({ title: "The Founder's Story", sectionTitle: "The Founder's Story", value: founderVal });
  }

  // 6. Our Vision (Typed Answer)
  const visionVal = getStringVal("vision", "longTermVision", "our_vision");
  if (visionVal) {
    results.push({ title: "Our Vision", sectionTitle: "Our Vision", value: visionVal });
  }

  // 7. Get Involved / Call to Action (Typed Answer)
  const ctaVal = getStringVal("call_to_action", "cta", "get_involved", "nextSteps");
  if (ctaVal) {
    results.push({ title: "Get Involved", sectionTitle: "Get Involved", value: ctaVal });
  }

  return results;
}

/**
 * Detects whether a section is one of the 5 reality check / math / data sections
 * that must be excluded from Spotlight and Spotlight Editor.
 */
export function isExcludedDataSection(titleOrVal?: string | null): boolean {
  if (!titleOrVal) return false;
  const t = titleOrVal.toLowerCase();
  return (
    t.includes("value advantage") ||
    t.includes("cvp") ||
    t.includes("cost comparison") ||
    t.includes("market opportunity") ||
    t.includes("market sizing") ||
    t.includes("market dynamics") ||
    t.includes("customer urgency") ||
    t.includes("target pricing") ||
    t.includes("customer acquisition") ||
    t.includes("acquisition data") ||
    t.includes("growth engine") ||
    t.includes("defensibility & moat") ||
    t.includes("defensibility") ||
    t.includes("moat data") ||
    t.includes("core advantage") ||
    t.includes("technical barrier") ||
    t.includes("defense strategy") ||
    t.includes("execution & build") ||
    t.includes("build readiness") ||
    t.includes("buildability") ||
    t.includes("team execution") ||
    t.includes("current milestone")
  );
}

/**
 * Generates custom_fields array suitable for DB persistence in blogs table
 */
export function generateBlogCustomFields(
  answers: Record<string, any>
): CustomFieldItem[] {
  const parsedSections = buildSectionsFromValidationAnswers(answers);
  return parsedSections.map((sec, idx) => ({
    id: crypto.randomUUID(),
    type: "spotlight_section",
    sectionTitle: sec.sectionTitle,
    value: sec.value,
    order: idx + 1,
  }));
}

/**
 * Intelligently merges existing blog sections and validation answers.
 * Preserves user's custom edits, feedback forms, images, and videos while
 * ensuring all answered questions from the questionnaire are reflected.
 */
export function mergeSectionsWithValidationAnswers(params: {
  existingCustomFields?: CustomFieldItem[] | null;
  validationAnswers?: Record<string, any> | string | null;
  introduction?: string | null;
  content?: string | null;
  industry?: string | null;
}): SectionModel[] {
  const { existingCustomFields, validationAnswers, introduction, content, industry } = params;

  const sections: SectionModel[] = [];

  // 1. Introduction section
  sections.push({
    id: "1",
    title: "Introduction",
    content: introduction || "",
    type: "text",
  });

  // 2. Content section (only if non-empty or if there are no other sections)
  if (content && content.trim().length > 0) {
    sections.push({
      id: "2",
      title: "Content",
      content: content.trim(),
      type: "text",
    });
  }

  // 3. Process existing custom fields
  const handledTitles = new Set<string>();

  if (existingCustomFields && Array.isArray(existingCustomFields)) {
    existingCustomFields.forEach((field: any, idx: number) => {
      if (field.type === "feedback") {
        sections.push({
          id: field.id || `feedback-${idx}`,
          title: field.title || "Feedback Form",
          content: field.description || "",
          type: "feedback",
          feedbackTitle: field.title,
          feedbackDescription: field.description,
          feedbackFields: field.fields || [],
        });
      } else if (field.type === "image") {
        sections.push({
          id: field.id || `image-${idx}`,
          title: `Image ${field.order !== undefined ? field.order + 1 : idx + 1}`,
          content: field.value || "",
          type: "image",
          imageUrl: field.value,
        });
      } else if (field.type === "video") {
        sections.push({
          id: field.id || `video-${idx}`,
          title: `Video ${field.order !== undefined ? field.order + 1 : idx + 1}`,
          content: field.value || "",
          type: "video",
          videoUrl: field.value,
        });
      } else {
        const rawSecTitle = field.sectionTitle || field.title || "";
        const val = (field.value || field.content || "").trim();

        // Filter out the 5 math and data sections (only typed narrative answers allowed)
        if (isExcludedDataSection(rawSecTitle) || isExcludedDataSection(field.title) || isExcludedDataSection(val)) {
          return;
        }

        // Filter out empty placeholder "Content" block
        if (rawSecTitle.toLowerCase() === "content" && !val) {
          return;
        }
        if (!rawSecTitle.trim() && !val) {
          return;
        }

        const resolvedTitle = rawSecTitle
          ? getSpotlightTitle(rawSecTitle, industry)
          : `Section ${field.order !== undefined ? field.order + 1 : idx + 1}`;

        if (rawSecTitle) {
          handledTitles.add(rawSecTitle.toLowerCase());
        }
        handledTitles.add(resolvedTitle.toLowerCase());

        sections.push({
          id: field.id || `section-${idx}`,
          title: resolvedTitle,
          content: field.value || "",
          type: field.type || "text",
          sectionTitle: rawSecTitle || undefined,
        });
      }
    });
  }

  // 4. Merge any answered questions from validation_answers that are missing or empty
  const answerSections = buildSectionsFromValidationAnswers(validationAnswers);

  const norm = (str: string) => (str || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  let nextIdx = sections.length + 1;
  for (const item of answerSections) {
    const rawKey = item.sectionTitle.toLowerCase();
    const rawNorm = norm(item.sectionTitle);
    const resolvedTitle = getSpotlightTitle(item.sectionTitle, industry);
    const resolvedKey = resolvedTitle.toLowerCase();
    const resolvedNorm = norm(resolvedTitle);

    // Check if an existing section matches by raw section title or resolved title
    const existing = sections.find(
      (s) =>
        (s.sectionTitle && norm(s.sectionTitle) === rawNorm) ||
        norm(s.title) === rawNorm ||
        norm(s.title) === resolvedNorm
    );

    if (existing) {
      // If existing section has empty content, populate with answered value
      if (!existing.content || !existing.content.trim()) {
        existing.content = item.value;
      }
      if (!existing.sectionTitle) {
        existing.sectionTitle = item.sectionTitle;
      }
    } else {
      // Missing section! Add it!
      sections.push({
        id: `auto-${nextIdx++}`,
        title: resolvedTitle,
        content: item.value,
        type: "text",
        sectionTitle: item.sectionTitle,
      });
      handledTitles.add(rawKey);
      handledTitles.add(resolvedKey);
    }
  }

  return sections;
}
