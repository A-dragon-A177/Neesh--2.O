/**
 * Spotlight Title Matrix — 7 Questions × 14 Industries
 *
 * Maps each validation question's `sectionTitle` (saved in blog custom_fields)
 * to an industry-specific heading for the Spotlight blog view.
 *
 * Lookup: getSpotlightTitle(sectionTitle, industry)
 */

// ── Industry normalisation ──────────────────────────────────────
// The constants in CreateProjectWizard use mixed casing / spacing
// (e.g. "E-Commerce", "AI / ML"), while the matrix keys are
// simplified. This map normalises any variant to the canonical key.
const INDUSTRY_ALIASES: Record<string, string> = {
  // Exact matches from the INDUSTRIES constant
  "saas":                  "SaaS",
  "fintech":               "Fintech",
  "healthtech":            "Healthtech",
  "edtech":                "Edtech",
  "e-commerce":            "Ecommerce",
  "ecommerce":             "Ecommerce",
  "ai / ml":               "AI/ML",
  "ai/ml":                 "AI/ML",
  "ai":                    "AI/ML",
  "ml":                    "AI/ML",
  "cleantech":             "Cleantech",
  "foodtech":              "Foodtech",
  "logistics":             "Logistics",
  "social media":          "Social Media",
  "gaming":                "Gaming",
  "real estate":           "Real Estate",
  "travel":                "Travel",
  "media & entertainment": "Media & Entertainment",
  "media":                 "Media & Entertainment",
  "entertainment":         "Media & Entertainment",
};

function normaliseIndustry(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  return INDUSTRY_ALIASES[key] ?? null;
}

// ── Section-title keys (as saved by CreateProjectWizard) ────────
type SectionKey =
  | "The Problem"
  | "What We're Building"
  | "Who It's For"
  | "The Hook"
  | "The Founder's Story"
  | "Our Vision"
  | "Get Involved";

// ── Canonical industry keys ─────────────────────────────────────
type IndustryKey =
  | "SaaS"
  | "Fintech"
  | "Healthtech"
  | "Edtech"
  | "Ecommerce"
  | "AI/ML"
  | "Cleantech"
  | "Foodtech"
  | "Logistics"
  | "Social Media"
  | "Gaming"
  | "Real Estate"
  | "Travel"
  | "Media & Entertainment";

// ── The 7 × 14 Title Matrix ────────────────────────────────────
const SPOTLIGHT_TITLES: Record<SectionKey, Record<IndustryKey, string>> = {

  // Q1 — The Problem
  "The Problem": {
    "SaaS":                  "The Workflow Problem Every Team Knows Too Well",
    "Fintech":               "The Money Problem Nobody Talks About",
    "Healthtech":            "A Gap in Care We Couldn't Ignore",
    "Edtech":                "The Learning Gap Holding Students Back",
    "Ecommerce":             "Where Shoppers Drop Off — and Why",
    "AI/ML":                 "The Blind Spot in How AI Is Used Today",
    "Cleantech":             "The Waste Hiding in Plain Sight",
    "Foodtech":              "The Problem Sitting in Every Kitchen",
    "Logistics":             "Where Deliveries Break Down",
    "Social Media":          "The Trust Problem Platforms Keep Avoiding",
    "Gaming":                "Why Players Walk Away",
    "Real Estate":           "Where Deals Get Stuck",
    "Travel":                "The Trip-Planning Problem Nobody's Fixed",
    "Media & Entertainment": "The Content Problem Creators Face Every Day",
  },

  // Q2 — The Solution
  "What We're Building": {
    "SaaS":                  "A Smarter Way to Get Work Done",
    "Fintech":               "Rethinking How Money Should Work",
    "Healthtech":            "Care, Reimagined",
    "Edtech":                "A Better Way to Learn",
    "Ecommerce":             "Turning Browsers Into Buyers",
    "AI/ML":                 "Building AI You Can Actually Trust",
    "Cleantech":             "A Cleaner Way Forward",
    "Foodtech":              "Rethinking the Food Supply Chain",
    "Logistics":             "Delivering It Differently",
    "Social Media":          "Built for Connection, Not Just Attention",
    "Gaming":                "Redesigning the Player Experience",
    "Real Estate":           "Making Deals Move Faster",
    "Travel":                "Planning Trips the Smarter Way",
    "Media & Entertainment": "Built for Creators, Not Just Consumption",
  },

  // Q3 — The Customer
  "Who It's For": {
    "SaaS":                  "Who We're Building This For",
    "Fintech":               "Who Needs This the Most",
    "Healthtech":            "The Patients and Providers We Serve",
    "Edtech":                "Who We're Here to Help Learn",
    "Ecommerce":             "Who Shops With Us",
    "AI/ML":                 "Who Benefits From This Technology",
    "Cleantech":             "Who's Driving the Shift to Clean",
    "Foodtech":              "Who We're Feeding This Future For",
    "Logistics":             "Who Relies on Us to Deliver",
    "Social Media":          "Who We're Building Community For",
    "Gaming":                "Who We're Building This Game For",
    "Real Estate":           "Who We're Helping Close Deals",
    "Travel":                "Who We're Helping Explore the World",
    "Media & Entertainment": "Who We're Creating This For",
  },

  // Q4 — The Insight
  "The Hook": {
    "SaaS":                  "A Productivity Fact That Might Surprise You",
    "Fintech":               "What Most People Don't Know About Their Money",
    "Healthtech":            "A Health Insight Worth Knowing",
    "Edtech":                "What the Data Says About How We Learn",
    "Ecommerce":             "What Really Drives a Purchase",
    "AI/ML":                 "What Most People Get Wrong About AI",
    "Cleantech":             "A Number That Might Shock You",
    "Foodtech":              "What's Really Happening to Your Food",
    "Logistics":             "What's Really Slowing Things Down",
    "Social Media":          "What the Algorithm Doesn't Want You to Know",
    "Gaming":                "What Keeps Players Coming Back",
    "Real Estate":           "What Really Closes a Deal",
    "Travel":                "What Most Travelers Don't Realize",
    "Media & Entertainment": "What Actually Makes Content Work",
  },

  // Q5 — The Origin Story
  "The Founder's Story": {
    "SaaS":                  "Why We Started Building This",
    "Fintech":               "The Moment That Changed How We Think About Money",
    "Healthtech":            "Why This Became Personal",
    "Edtech":                "The Moment That Shaped Our Mission",
    "Ecommerce":             "Why We Set Out to Fix This",
    "AI/ML":                 "Why We Set Out to Build This Differently",
    "Cleantech":             "Why This Mattered Enough to Build",
    "Foodtech":              "Why We Couldn't Look Away From This",
    "Logistics":             "Why We Decided to Fix This",
    "Social Media":          "Why We Wanted to Build Something Different",
    "Gaming":                "Why We Set Out to Build This Game",
    "Real Estate":           "Why We Decided to Change How Deals Work",
    "Travel":                "Why We Set Out to Fix Travel",
    "Media & Entertainment": "Why We Started Building for Creators",
  },

  // Q6 — The Vision
  "Our Vision": {
    "SaaS":                  "The Future of Work We're Building Toward",
    "Fintech":               "A Future Where Money Works Better",
    "Healthtech":            "The Future of Care We're Building",
    "Edtech":                "The Future of Learning We're Building",
    "Ecommerce":             "The Future of Shopping We're Building",
    "AI/ML":                 "The Future of AI We're Building Toward",
    "Cleantech":             "The Future We're Building for the Planet",
    "Foodtech":              "The Future of Food We're Building",
    "Logistics":             "The Future of Delivery We're Building",
    "Social Media":          "The Future of Connection We're Building",
    "Gaming":                "The Future of Play We're Building",
    "Real Estate":           "The Future of Real Estate We're Building",
    "Travel":                "The Future of Travel We're Building",
    "Media & Entertainment": "The Future of Content We're Building",
  },

  // Q7 — The Ask
  "Get Involved": {
    "SaaS":                  "Help Us Build This Right",
    "Fintech":               "Join Us in Building This",
    "Healthtech":            "Help Us Improve Care",
    "Edtech":                "Help Us Shape the Future of Learning",
    "Ecommerce":             "Shop the Future With Us",
    "AI/ML":                 "Help Us Build Responsible AI",
    "Cleantech":             "Join the Movement",
    "Foodtech":              "Join Us in Fixing Food",
    "Logistics":             "Help Us Deliver Better",
    "Social Media":          "Help Us Build a Better Feed",
    "Gaming":                "Join the Playtest",
    "Real Estate":           "Join Us in Changing Real Estate",
    "Travel":                "Join Us in Reimagining Travel",
    "Media & Entertainment": "Join Our Creator Community",
  },
};

// ── Public API ──────────────────────────────────────────────────

/**
 * Resolves the industry-specific heading for a Spotlight section.
 *
 * @param sectionTitle  The `sectionTitle` value saved in the blog's
 *                      custom_field (e.g. "The Problem", "Our Vision").
 * @param industry      The project's industry string (e.g. "E-Commerce",
 *                      "AI / ML", "SaaS"). Will be normalised internally.
 * @returns The industry-specific title, or the original `sectionTitle`
 *          if no match is found (safe fallback).
 */
export function getSpotlightTitle(
  sectionTitle: string | undefined | null,
  industry: string | undefined | null,
): string {
  if (!sectionTitle) return "Untitled Section";

  const normIndustry = normaliseIndustry(industry);
  if (!normIndustry) return sectionTitle; // "Other" or unknown → keep default

  const sectionMap = SPOTLIGHT_TITLES[sectionTitle as SectionKey];
  if (!sectionMap) return sectionTitle; // Not a known section → keep as-is

  return sectionMap[normIndustry as IndustryKey] ?? sectionTitle;
}
