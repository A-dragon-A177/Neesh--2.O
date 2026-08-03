import { useState, useCallback, useEffect, useRef } from "react";
import { X, Rocket, ArrowRight, Loader2, Send, Zap, ChevronRight, Activity, TrendingUp, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type CreateProjectInput, type Project, type UpdateProjectInput } from "@/hooks/useProjects";
import { type UpdateBlogInput, type CustomField } from "@/hooks/useBlogs";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import chatbotAvatar from "@/assets/chatbot-avatar.png";

// ─── Constants ────────────────────────────────────────────────
const INDUSTRIES = [
  "SaaS", "Fintech", "HealthTech", "EdTech", "E-Commerce",
  "AI / ML", "CleanTech", "FoodTech", "Logistics",
  "Social Media", "Gaming", "Real Estate", "Travel",
  "Media & Entertainment", "Other",
];

const STARTUP_STAGES = [
  { value: "IDEA", label: "Idea" },
  { value: "PRE_MVP", label: "Pre-MVP" },
  { value: "MVP_PROTOTYPE", label: "MVP / Prototype" },
  { value: "BETA_WITH_USERS", label: "Beta with Users" },
  { value: "LAUNCHED", label: "Launched" },
];

// ─── Chat Question Types ─────────────────────────────────────
type ChatInputType = "textarea" | "mcq" | "numeric" | "cvp_card" | "market_desperation_card" | "market_population_card" | "acq_trust_card" | "def_moat_card" | "build_execution_card";

interface ChatQuestion {
  id: string;
  module: number;
  moduleName: string;
  agentMessage: string | ((answers: Record<string, any>) => string);
  inputType: ChatInputType;
  placeholder?: string;
  sectionTitle?: string;
  blogField?: boolean;
  options?: { value: string; label: string }[];
  validationKey?: string;
}

// ─── The Consolidated 13-Step Reality Check Sequence ─────
const CHAT_QUESTIONS: ChatQuestion[] = [
  {
    id: "problem_story",
    module: 1,
    moduleName: "Core Value Proposition",
    agentMessage: "Let's start with the problem you're solving. Describe a real situation where someone experienced this problem — what went wrong?",
    inputType: "textarea",
    placeholder: "Describe the problem in brief — paint a real scenario with specific details about who faced it and how it impacted them...",
    sectionTitle: "The Problem",
    blogField: true,
  },
  {
    id: "our_solution",
    module: 1,
    moduleName: "Core Value Proposition",
    agentMessage: "Great insight! Now, what are you building and how does it solve this problem differently?",
    inputType: "textarea",
    placeholder: "Explain your solution and what makes it different — describe the key features and why existing alternatives fall short...",
    sectionTitle: "What We're Building",
    blogField: true,
  },
  {
    id: "cvp_card",
    module: 1,
    moduleName: "Core Value Proposition",
    agentMessage: "Let's calculate your true value multiplier. If your product vanished, what exactly would your customer use, and how much does it cost?",
    inputType: "cvp_card",
  },
  {
    id: "cvp_input_e",
    module: 1,
    moduleName: "Core Value Proposition",
    agentMessage: "Are these cost numbers validated by talking to actual customers, or are they an internal hypothesis?",
    inputType: "mcq",
    validationKey: "cvp_input_e",
    options: [
      { value: "Validated", label: "Validated by customers" },
      { value: "Internal Hypothesis", label: "Just a hypothesis" },
    ],
  },
  {
    id: "target_customer",
    module: 2,
    moduleName: "Market Size",
    agentMessage: "Who is your primary target customer? Describe your ideal customer profile.",
    inputType: "textarea",
    placeholder: "Describe your ideal customer — their age, role, industry, pain points, and why they would pay for your solution...",
    sectionTitle: "Who It's For",
    blogField: true,
  },
  {
    id: "market_desperation_card",
    module: 2,
    moduleName: "Market Size",
    agentMessage: "A market is a group of desperate people with the same problem. Let's test their desperation.",
    inputType: "market_desperation_card",
  },
  {
    id: "market_population_card",
    module: 2,
    moduleName: "Market Size",
    agentMessage: "To build a viable business, you must reach 10 crores in revenue. Let's verify if your population supports this math.",
    inputType: "market_population_card",
  },
  {
    id: "the_hook",
    module: 3,
    moduleName: "Customer Acquisition",
    agentMessage: "What's the one surprising fact or insight that would immediately grab your customer's attention?",
    inputType: "textarea",
    placeholder: "Write a compelling hook — a surprising stat, bold claim, or relatable insight that grabs attention instantly...",
    sectionTitle: "The Hook",
    blogField: true,
  },
  {
    id: "acq_trust_card",
    module: 3,
    moduleName: "Customer Acquisition",
    agentMessage: "Early startups succeed by building credibility. How easily can you earn customer trust?",
    inputType: "acq_trust_card",
  },
  {
    id: "acq_input_c",
    module: 3,
    moduleName: "Customer Acquisition",
    agentMessage: "Do you already possess a massive public reputation in this specific industry?",
    inputType: "mcq",
    validationKey: "acq_input_c",
    options: [
      { value: "Established leaders", label: "Yes, established leaders" },
      { value: "Unknown", label: "No, relatively unknown" },
    ],
  },
  {
    id: "def_moat_card",
    module: 4,
    moduleName: "Defensibility",
    agentMessage: "If a giant competitor cloned you tomorrow, how do you survive? Let's check your true operational lead time.",
    inputType: "def_moat_card",
  },
  {
    id: "founder_story",
    module: 4,
    moduleName: "Defensibility",
    agentMessage: "What personal experience, observation, or event motivated you to build this startup?",
    inputType: "textarea",
    placeholder: "Share your founder story — the personal experience, frustration, or 'aha moment' that led you to start building this...",
    sectionTitle: "The Founder's Story",
    blogField: true,
  },
  {
    id: "build_execution_card",
    module: 5,
    moduleName: "Buildability",
    agentMessage: "Investors fund execution, not just ideas. Let's evaluate your team's execution capacity.",
    inputType: "build_execution_card",
  },
  {
    id: "vision",
    module: 5,
    moduleName: "Buildability",
    agentMessage: "If your startup succeeds, what meaningful change will it create over the next few years?",
    inputType: "textarea",
    placeholder: "Describe your long-term vision — the meaningful change your startup will create in the industry and for your customers...",
    sectionTitle: "Our Vision",
    blogField: true,
  },
  {
    id: "call_to_action",
    module: 5,
    moduleName: "Buildability",
    agentMessage: "One more thing — what kind of feedback or action do you want from readers? (Waitlist, feedback, etc.)",
    inputType: "textarea",
    placeholder: "Write a clear call to action — tell readers exactly how they can support, join your waitlist, or give feedback...",
    sectionTitle: "Get Involved",
    blogField: true,
  },
];

type WizardStep = "basic_info" | "chat";

interface ChatMessage {
  id: string;
  sender: "agent" | "user";
  text: string;
  timestamp: number;
}

interface CreateProjectWizardProps {
  project?: Project | null;
  onClose: () => void;
  createProject: (input: CreateProjectInput) => Promise<Project | null>;
  updateProject: (id: string, input: UpdateProjectInput) => Promise<Project | null>;
  upsertBlog: (projectId: string, input: UpdateBlogInput) => Promise<any>;
  onProjectCreated: (project: Project) => void;
  canCreateProject: boolean;
}

// ─── Custom Interactive Cards (Declared Outside to Fix Focus Bug) ───

const CVPCard = ({ onAnswer }: { onAnswer: (p: any, t?: string) => void }) => {
  const [alt, setAlt] = useState("");
  const [metric, setMetric] = useState("");
  const [altCost, setAltCost] = useState("");
  const [mvpCost, setMvpCost] = useState("");

  return (
    <div className="bg-white/50 backdrop-blur-3xl border border-white/60 rounded-3xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.04)] space-y-4 w-full text-left">
      <div className="flex items-center gap-2 text-cyan-600"><Zap className="w-4 h-4"/> <h3 className="font-bold text-gray-900 text-sm">Value Multiplier Math</h3></div>
      <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-700">If your product vanished, what would they use?</label>
        <Select onValueChange={setAlt} value={alt}>
          <SelectTrigger className="bg-white/60 h-11 rounded-xl border-white/40"><SelectValue placeholder="Select Alternative"/></SelectTrigger>
          <SelectContent className="z-[110]">
            <SelectItem value="Direct Competitor">Direct Competitor</SelectItem>
            <SelectItem value="A Workaround">A Workaround</SelectItem>
            <SelectItem value="Doing Nothing">Doing Nothing</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-700">Does your product primarily give them more money or time?</label>
        <Select onValueChange={setMetric} value={metric}>
          <SelectTrigger className="bg-white/60 h-11 rounded-xl border-white/40"><SelectValue placeholder="Select Metric"/></SelectTrigger>
          <SelectContent className="z-[110]">
            <SelectItem value="More Money">More Money (Affordability)</SelectItem>
            <SelectItem value="More Time">More Time (Convenience)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-3">
        <div className="flex-1 space-y-1"><label className="text-xs font-semibold text-gray-700">Their Cost</label><Input type="number" placeholder="e.g. 500" value={altCost} onChange={e=>setAltCost(e.target.value)} className="bg-white/60 h-10 rounded-xl"/></div>
        <div className="flex-1 space-y-1"><label className="text-xs font-semibold text-gray-700">Your Cost</label><Input type="number" placeholder="e.g. 100" value={mvpCost} onChange={e=>setMvpCost(e.target.value)} className="bg-white/60 h-10 rounded-xl"/></div>
      </div>
      <Button onClick={()=>{ if(!alt||!metric||!altCost||!mvpCost){toast.error("Fill all fields");return;} onAnswer({cvp_input_a: alt, cvp_input_b: metric, cvp_input_c: altCost, cvp_input_d: mvpCost}, `${alt} • ${metric} — Cost: ${altCost} vs ${mvpCost}`);}} className="w-full h-11 rounded-xl bg-gradient-to-r from-[hsl(190,85%,38%)] to-[hsl(186,93%,48%)] text-white font-semibold shadow-md hover:opacity-95 transition-opacity">Compute Multiplier</Button>
    </div>
  );
};

const MarketDesperationCard = ({ onAnswer }: { onAnswer: (p: any, t?: string) => void }) => {
  const [habit, setHabit] = useState("");
  const [desperation, setDesperation] = useState("");
  return (
    <div className="bg-white/50 backdrop-blur-3xl border border-white/60 rounded-3xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.04)] space-y-4 w-full text-left">
      <div className="flex items-center gap-2 text-cyan-600"><Activity className="w-4 h-4"/> <h3 className="font-bold text-gray-900 text-sm">Behavioral Audit</h3></div>
      <div className="space-y-2"><label className="text-xs font-semibold text-gray-700">Does your solution require a new habit?</label>
        <Select onValueChange={setHabit} value={habit}>
          <SelectTrigger className="bg-white/60 h-11 rounded-xl border-white/40"><SelectValue placeholder="Select habit requirement"/></SelectTrigger>
          <SelectContent className="z-[110]">
            <SelectItem value="Requires new habit">Requires completely new habit</SelectItem>
            <SelectItem value="Replaces existing habit">Replaces existing habit</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2"><label className="text-xs font-semibold text-gray-700">Are they currently spending money to solve this?</label>
        <Select onValueChange={setDesperation} value={desperation}>
          <SelectTrigger className="bg-white/60 h-11 rounded-xl border-white/40"><SelectValue placeholder="Select spending behavior"/></SelectTrigger>
          <SelectContent className="z-[110]">
            <SelectItem value="Yes spend money">Yes, they spend money</SelectItem>
            <SelectItem value="No">No, they don't</SelectItem>
            <SelectItem value="Unsure">I am unsure</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button onClick={()=>{ if(!habit||!desperation){toast.error("Fill all fields");return;} onAnswer({market_input_a: habit, market_input_b: desperation}, `${habit} • ${desperation}`);}} className="w-full h-11 rounded-xl bg-gradient-to-r from-[hsl(190,85%,38%)] to-[hsl(186,93%,48%)] text-white font-semibold shadow-md hover:opacity-95 transition-opacity">Verify Behavior</Button>
    </div>
  );
};

const MarketPopulationCard = ({ onAnswer }: { onAnswer: (p: any, t?: string) => void }) => {
  const [spend, setSpend] = useState("");
  const [popValid, setPopValid] = useState("");
  const [geo, setGeo] = useState("");
  const [calcPop, setCalcPop] = useState<number | null>(null);

  return (
    <div className="bg-white/50 backdrop-blur-3xl border border-white/60 rounded-3xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.04)] space-y-4 w-full text-left">
      <div className="flex items-center gap-2 text-cyan-600"><TrendingUp className="w-4 h-4"/> <h3 className="font-bold text-gray-900 text-sm">The 10 Crore Check</h3></div>
      <div className="space-y-2"><label className="text-xs font-semibold text-gray-700">Avg Unit Spend (Per Customer / Year)</label>
        <Input type="number" placeholder="e.g. 5000" value={spend} onChange={e=>{setSpend(e.target.value); setCalcPop(Math.ceil(5000000000 / (Number(e.target.value)||1)));}} className="bg-white/60 h-10 rounded-xl"/>
      </div>
      {calcPop !== null && calcPop > 0 && (
        <motion.div initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}} className="p-3 bg-cyan-50/80 rounded-xl border border-cyan-100"><p className="text-xs text-cyan-900 leading-relaxed">To reach 10 Cr revenue at 2% market share, you need exactly <strong className="text-sm mx-0.5">{new Intl.NumberFormat('en-IN').format(calcPop)}</strong> desperate people.</p></motion.div>
      )}
      <div className="space-y-2"><label className="text-xs font-semibold text-gray-700">Does this population exist in your target location?</label>
        <Select onValueChange={setPopValid} value={popValid}>
          <SelectTrigger className="bg-white/60 h-11 rounded-xl border-white/40"><SelectValue placeholder="Select Population Reality"/></SelectTrigger>
          <SelectContent className="z-[110]">
            <SelectItem value="Yes exist in concentrated">Yes, they exist here</SelectItem>
            <SelectItem value="No too small">No, too small</SelectItem>
            <SelectItem value="Guessing">I am guessing</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2"><label className="text-xs font-semibold text-gray-700">Is your primary market highly concentrated or dispersed?</label>
        <Select onValueChange={setGeo} value={geo}>
          <SelectTrigger className="bg-white/60 h-11 rounded-xl border-white/40"><SelectValue placeholder="Select Geography"/></SelectTrigger>
          <SelectContent className="z-[110]">
            <SelectItem value="Concentrated Metro">Concentrated Metro</SelectItem>
            <SelectItem value="Dispersed Tier 2-3">Dispersed Tier 2-3</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button onClick={()=>{ if(!spend||!popValid||!geo){toast.error("Fill all fields");return;} onAnswer({market_input_c1: spend, market_input_c2: popValid, market_input_d: geo}, `${spend}/yr • ${popValid} • ${geo}`);}} className="w-full h-11 rounded-xl bg-gradient-to-r from-[hsl(190,85%,38%)] to-[hsl(186,93%,48%)] text-white font-semibold shadow-md hover:opacity-95 transition-opacity">Run Math</Button>
    </div>
  );
};

const AcqTrustCard = ({ onAnswer }: { onAnswer: (p: any, t?: string) => void }) => {
  const [grassroots, setGrassroots] = useState("");
  const [channel, setChannel] = useState("");
  return (
    <div className="bg-white/50 backdrop-blur-3xl border border-white/60 rounded-3xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.04)] space-y-4 w-full text-left">
      <div className="flex items-center gap-2 text-cyan-600"><Users className="w-4 h-4"/> <h3 className="font-bold text-gray-900 text-sm">Trust & Credibility</h3></div>
      <div className="space-y-2"><label className="text-xs font-semibold text-gray-700">Can you instantly close 10 people without ads?</label>
        <Select onValueChange={setGrassroots} value={grassroots}>
          <SelectTrigger className="bg-white/60 h-11 rounded-xl border-white/40"><SelectValue placeholder="Select Grassroots Reality"/></SelectTrigger>
          <SelectContent className="z-[110]">
            <SelectItem value="Yes have 10">Yes, I have these 10</SelectItem>
            <SelectItem value="No need strangers">No, I need strangers/ads</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2"><label className="text-xs font-semibold text-gray-700">If a stranger tries your product, what converts them?</label>
        <Select onValueChange={setChannel} value={channel}>
          <SelectTrigger className="bg-white/60 h-11 rounded-xl border-white/40"><SelectValue placeholder="Select Primary Channel"/></SelectTrigger>
          <SelectContent className="z-[110]">
            <SelectItem value="Discounts or paid">Discounts / paid ads</SelectItem>
            <SelectItem value="Organic recommend">Trusted customers recommend it</SelectItem>
            <SelectItem value="Established rep">My established reputation</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button onClick={()=>{ if(!grassroots||!channel){toast.error("Fill all fields");return;} onAnswer({acq_input_a: grassroots, acq_input_b: channel}, `${grassroots} • ${channel}`);}} className="w-full h-11 rounded-xl bg-gradient-to-r from-[hsl(190,85%,38%)] to-[hsl(186,93%,48%)] text-white font-semibold shadow-md hover:opacity-95 transition-opacity">Evaluate Trust</Button>
    </div>
  );
};

const DefMoatCard = ({ onAnswer }: { onAnswer: (p: any, t?: string) => void }) => {
  const [trap, setTrap] = useState("");
  const [lead, setLead] = useState("");
  const [roadmap, setRoadmap] = useState("");
  return (
    <div className="bg-white/50 backdrop-blur-3xl border border-white/60 rounded-3xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.04)] space-y-4 w-full text-left">
      <div className="flex items-center gap-2 text-cyan-600"><ShieldCheck className="w-4 h-4"/> <h3 className="font-bold text-gray-900 text-sm">Defensibility Engine</h3></div>
      <div className="space-y-2"><label className="text-xs font-semibold text-gray-700">If a competitor finds you today, what is your primary defense?</label>
        <Select onValueChange={setTrap} value={trap}>
          <SelectTrigger className="bg-white/60 h-11 rounded-xl border-white/40"><SelectValue placeholder="Select Primary Defense"/></SelectTrigger>
          <SelectContent className="z-[110]">
            <SelectItem value="Patents">Patents / legal</SelectItem>
            <SelectItem value="Secret">Idea is a secret</SelectItem>
            <SelectItem value="Speed of execution">Speed of execution</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2"><label className="text-xs font-semibold text-gray-700">What operational barrier physically slows a giant clone?</label>
        <Select onValueChange={setLead} value={lead}>
          <SelectTrigger className="bg-white/60 h-11 rounded-xl border-white/40"><SelectValue placeholder="Select Operational Barrier"/></SelectTrigger>
          <SelectContent className="z-[110]">
            <SelectItem value="Easily copyable">Nothing, easily copyable</SelectItem>
            <SelectItem value="On-ground operations">Physical on-ground ops</SelectItem>
            <SelectItem value="Deep R&D">Deep scientific R&D</SelectItem>
            <SelectItem value="Uncopyable 20 yrs">Uncopyable for 20 years</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2"><label className="text-xs font-semibold text-gray-700">Once cloned, what is your roadmap to survive?</label>
        <Select onValueChange={setRoadmap} value={roadmap}>
          <SelectTrigger className="bg-white/60 h-11 rounded-xl border-white/40"><SelectValue placeholder="Select Roadmap Strategy"/></SelectTrigger>
          <SelectContent className="z-[110]">
            <SelectItem value="Defend single idea">Defend this specific product</SelectItem>
            <SelectItem value="Release next upgrade">Immediately release next upgrade</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button onClick={()=>{ if(!trap||!lead||!roadmap){toast.error("Fill all fields");return;} onAnswer({def_input_a: trap, def_input_b: lead, def_input_c: roadmap}, `${trap} • ${lead} • ${roadmap}`);}} className="w-full h-11 rounded-xl bg-gradient-to-r from-[hsl(190,85%,38%)] to-[hsl(186,93%,48%)] text-white font-semibold shadow-md hover:opacity-95 transition-opacity">Calculate Lead Time</Button>
    </div>
  );
};

const BuildExecutionCard = ({ onAnswer }: { onAnswer: (p: any, t?: string) => void }) => {
  const [team, setTeam] = useState("");
  const [mvp, setMvp] = useState("");
  return (
    <div className="bg-white/50 backdrop-blur-3xl border border-white/60 rounded-3xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.04)] space-y-4 w-full text-left">
      <div className="flex items-center gap-2 text-cyan-600"><Rocket className="w-4 h-4"/> <h3 className="font-bold text-gray-900 text-sm">Execution Capacity</h3></div>
      <div className="space-y-2"><label className="text-xs font-semibold text-gray-700">How distributed is the workload among founders?</label>
        <Select onValueChange={setTeam} value={team}>
          <SelectTrigger className="bg-white/60 h-11 rounded-xl border-white/40"><SelectValue placeholder="Select Team Workload"/></SelectTrigger>
          <SelectContent className="z-[110]">
            <SelectItem value="Missing Links">Missing key roles (Tech/Sales)</SelectItem>
            <SelectItem value="Heavy Overlap">1-2 founders juggling 4-6 roles</SelectItem>
            <SelectItem value="Balanced Overlap">Balanced (e.g. 3 founders, 2 roles each)</SelectItem>
            <SelectItem value="Maximum Stability">Distinct experts for single roles</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2"><label className="text-xs font-semibold text-gray-700">What is your MVP status and funding criticality?</label>
        <Select onValueChange={setMvp} value={mvp}>
          <SelectTrigger className="bg-white/60 h-11 rounded-xl border-white/40"><SelectValue placeholder="Select MVP Status"/></SelectTrigger>
          <SelectContent className="z-[110]">
            <SelectItem value="Idea Stage">Idea Stage — Need money to build</SelectItem>
            <SelectItem value="Stuck Stage">In progress — Need funding to finish</SelectItem>
            <SelectItem value="Traction Stage">Fully built — Need money to scale</SelectItem>
            <SelectItem value="Self-Sufficient">Generating revenue — Don't need investment</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button onClick={()=>{ if(!team||!mvp){toast.error("Fill all fields");return;} onAnswer({build_input_a: team, build_input_b: mvp}, `${team} • ${mvp}`);}} className="w-full h-11 rounded-xl bg-gradient-to-r from-[hsl(190,85%,38%)] to-[hsl(186,93%,48%)] text-white font-semibold shadow-md hover:opacity-95 transition-opacity">Finalize Buildability</Button>
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────
const CreateProjectWizard = ({
  project = null,
  onClose,
  createProject,
  updateProject,
  upsertBlog,
  onProjectCreated,
}: CreateProjectWizardProps) => {
  const [step, setStep] = useState<WizardStep>("basic_info");
  const [questionIndex, setQuestionIndex] = useState(0);

  const [projectName, setProjectName] = useState("");
  const [oneLineDesc, setOneLineDesc] = useState("");
  const [industry, setIndustry] = useState("");
  const [startupStage, setStartupStage] = useState("");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [chatInput, setChatInput] = useState("");
  const [isAgentTyping, setIsAgentTyping] = useState(false);

  const [createdProject, setCreatedProject] = useState<Project | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAgentTyping]);

  useEffect(() => {
    if (step === "chat" && !isAgentTyping && (currentQuestion?.inputType === "textarea" || currentQuestion?.inputType === "numeric")) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [step, isAgentTyping, questionIndex]);

  useEffect(() => {
    if (project) {
      setCreatedProject(project);
      setProjectName(project.title);
      setOneLineDesc(project.one_line_summary || "");
      setIndustry(project.industry || "");
      setStartupStage(project.startup_stage || "");

      if (!project.validation_report || project.validation_report === "{}") {
        if (project.validation_answers) {
          try {
            const parsed = JSON.parse(project.validation_answers);
            const initialAnswers = { ...parsed };
            setAnswers(initialAnswers);

            let firstUnanswered = 0;
            for (let i = 0; i < CHAT_QUESTIONS.length; i++) {
              const q = CHAT_QUESTIONS[i];
              if (q.inputType.endsWith("_card")) {
                let isAnswered = true;
                if (q.id === "cvp_card" && (!parsed["cvp_input_a"] || !parsed["cvp_input_c"] || !parsed["cvp_input_d"])) isAnswered = false;
                if (q.id === "market_desperation_card" && (!parsed["market_input_a"] || !parsed["market_input_b"])) isAnswered = false;
                if (q.id === "market_population_card" && (!parsed["market_input_c1"] || !parsed["market_input_c2"] || !parsed["market_input_d"])) isAnswered = false;
                if (q.id === "acq_trust_card" && (!parsed["acq_input_a"] || !parsed["acq_input_b"])) isAnswered = false;
                if (q.id === "def_moat_card" && (!parsed["def_input_a"] || !parsed["def_input_b"] || !parsed["def_input_c"])) isAnswered = false;
                if (q.id === "build_execution_card" && (!parsed["build_input_a"] || !parsed["build_input_b"])) isAnswered = false;
                if (!isAnswered) { firstUnanswered = i; break; }
              } else {
                const key = q.validationKey || q.id;
                const val = parsed[key];
                if (val === undefined || val === null || String(val).trim() === "") { firstUnanswered = i; break; }
              }
              if (i === CHAT_QUESTIONS.length - 1) firstUnanswered = CHAT_QUESTIONS.length;
            }

            setQuestionIndex(firstUnanswered);
            const priorMessages: ChatMessage[] = [];
            for (let i = 0; i < firstUnanswered && i < CHAT_QUESTIONS.length; i++) {
              const q = CHAT_QUESTIONS[i];
              const agentText = typeof q.agentMessage === "function" ? q.agentMessage(initialAnswers) : q.agentMessage;
              priorMessages.push({ id: `agent-${i}`, sender: "agent", text: agentText, timestamp: Date.now() - (firstUnanswered - i) * 1000 });
              
              if (q.inputType.endsWith("_card")) {
                 let dt = "Data provided via interactive card.";
                 if (q.id === "cvp_card") dt = `${parsed.cvp_input_a||""} • ${parsed.cvp_input_b||""} — Cost: ${parsed.cvp_input_c||""} vs ${parsed.cvp_input_d||""}`;
                 else if (q.id === "market_desperation_card") dt = `${parsed.market_input_a||""} • ${parsed.market_input_b||""}`;
                 else if (q.id === "market_population_card") dt = `${parsed.market_input_c1||""}/yr • ${parsed.market_input_c2||""} • ${parsed.market_input_d||""}`;
                 else if (q.id === "acq_trust_card") dt = `${parsed.acq_input_a||""} • ${parsed.acq_input_b||""}`;
                 else if (q.id === "def_moat_card") dt = `${parsed.def_input_a||""} • ${parsed.def_input_b||""} • ${parsed.def_input_c||""}`;
                 else if (q.id === "build_execution_card") dt = `${parsed.build_input_a||""} • ${parsed.build_input_b||""}`;
                 
                 priorMessages.push({ id: `user-${i}`, sender: "user", text: dt, timestamp: Date.now() - (firstUnanswered - i) * 1000 + 500 });
              } else {
                const key = q.validationKey || q.id;
                const val = parsed[key];
                const displayVal = q.inputType === "mcq" ? q.options?.find(o => o.value === val)?.label || String(val) : String(val);
                priorMessages.push({ id: `user-${i}`, sender: "user", text: displayVal, timestamp: Date.now() - (firstUnanswered - i) * 1000 + 500 });
              }
            }

            // Append the active unanswered question's agent message to the history
            if (firstUnanswered < CHAT_QUESTIONS.length) {
              const activeQ = CHAT_QUESTIONS[firstUnanswered];
              const activeText = typeof activeQ.agentMessage === "function" ? activeQ.agentMessage(initialAnswers) : activeQ.agentMessage;
              priorMessages.push({ id: `agent-${firstUnanswered}`, sender: "agent", text: activeText, timestamp: Date.now() });
            }

            setMessages(priorMessages);
            setStep("chat");
          } catch (e) { 
            setStep("chat"); 
          }
        } else { 
          setStep("chat");
          const activeQ = CHAT_QUESTIONS[0];
          const activeText = typeof activeQ.agentMessage === "function" ? activeQ.agentMessage({}) : activeQ.agentMessage;
          setMessages([{ id: `agent-0`, sender: "agent", text: activeText, timestamp: Date.now() }]);
        }
      }
    }
  }, [project]);

  const currentQuestion = CHAT_QUESTIONS[questionIndex] || null;
  const isLastQuestion = questionIndex === CHAT_QUESTIONS.length - 1;
  const currentModule = currentQuestion?.module || 0;
  const totalModules = 5;

  const buildValidationAnswersJson = (currentAnswers: Record<string, any>): string => JSON.stringify(currentAnswers);
  const generateCustomFields = (currentAnswers: Record<string, any>): CustomField[] => {
    const fields: CustomField[] = [];
    let order = 1;
    CHAT_QUESTIONS.forEach((q) => {
      if (!q.blogField || !q.sectionTitle) return;
      const value = currentAnswers[q.id];
      if (!value || (typeof value === "string" && !value.trim())) return;
      fields.push({ id: crypto.randomUUID(), type: "spotlight_section", sectionTitle: q.sectionTitle, value: String(value), order: order++ });
    });
    return fields;
  };

  const saveBlog = useCallback(
    async (proj: Project, currentAnswers: Record<string, any>) => {
      const customFields = generateCustomFields(currentAnswers);
      await upsertBlog(proj.id, { heading: proj.title, introduction: oneLineDesc, content: "", custom_fields: customFields });
    },
    [upsertBlog, oneLineDesc]
  );

  const addAgentMessage = useCallback((text: string) => {
    setIsAgentTyping(true);
    setTimeout(() => {
      setMessages((prev) => [...prev, { id: `agent-${Date.now()}`, sender: "agent", text, timestamp: Date.now() }]);
      setIsAgentTyping(false);
    }, 600 + Math.random() * 400);
  }, []);

  const addUserMessage = useCallback((text: string) => {
    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, sender: "user", text, timestamp: Date.now() }]);
  }, []);

  const showNextQuestion = useCallback((nextQ: ChatQuestion, currentAnswers: Record<string, any>) => {
    const agentText = typeof nextQ.agentMessage === "function" ? nextQ.agentMessage(currentAnswers) : nextQ.agentMessage;
    addAgentMessage(agentText);
  }, [addAgentMessage]);

  const handleBasicInfoSubmit = async () => {
    if (!projectName.trim()) { toast.error("Please enter a project name"); return; }
    if (!oneLineDesc.trim()) { toast.error("Please enter a summary"); return; }
    if (!industry) { toast.error("Please select an industry"); return; }
    if (!startupStage) { toast.error("Please select a startup stage"); return; }

    setIsCreating(true);
    try {
      let proj;
      if (project) {
        proj = await updateProject(project.id, {
          title: projectName,
          one_line_summary: oneLineDesc,
          introduction: oneLineDesc,
          industry,
          startup_stage: startupStage
        });
      } else {
        proj = await createProject({
          title: projectName,
          one_line_summary: oneLineDesc,
          introduction: oneLineDesc,
          description: "",
          industry,
          startup_stage: startupStage
        });
      }

      if (!proj) { setIsCreating(false); return; }
      setCreatedProject(proj);
      
      const currentAnswers = proj.validation_answers ? JSON.parse(proj.validation_answers) : {};
      setAnswers(currentAnswers);
      setStep("chat");
      
      if (messages.length === 0) {
        const activeQ = CHAT_QUESTIONS[questionIndex] || CHAT_QUESTIONS[0];
        const activeText = typeof activeQ.agentMessage === "function" ? activeQ.agentMessage(currentAnswers) : activeQ.agentMessage;
        setMessages([{ id: `agent-${questionIndex}`, sender: "agent", text: activeText, timestamp: Date.now() }]);
      }
    } catch (e) {
      toast.error(project ? "Failed to update project" : "Failed to create project");
    } finally {
      setIsCreating(false);
    }
  };

  const handleAnswer = async (payload: any, displayText?: string) => {
    if (!createdProject || !currentQuestion) return;
    const q = currentQuestion;

    addUserMessage(displayText || "Data provided.");
    setIsSaving(true);
    try {
      let updatedAnswers = { ...answers };
      if (typeof payload === "object" && !Array.isArray(payload)) {
        updatedAnswers = { ...updatedAnswers, ...payload };
      } else {
        updatedAnswers[q.validationKey || q.id] = payload;
      }
      setAnswers(updatedAnswers);
      const validationJson = buildValidationAnswersJson(updatedAnswers);
      await saveBlog(createdProject, updatedAnswers);

      if (isLastQuestion) {
        const updated = await updateProject(createdProject.id, { validation_answers: validationJson, onboarding_completed: true });
        if (updated) {
          setCreatedProject(updated);
        }
        setTimeout(() => {
          addAgentMessage("🎉 Amazing! Your Spotlight is ready. I've generated your blog and computed your validation score.");
          setTimeout(() => { onProjectCreated(updated || createdProject); }, 1500);
        }, 500);
      } else {
        const updated = await updateProject(createdProject.id, { validation_answers: validationJson, onboarding_completed: false });
        if (updated) {
          setCreatedProject(updated);
        }
        const nextQ = CHAT_QUESTIONS[questionIndex + 1];
        if (nextQ && nextQ.module !== q.module) {
          setTimeout(() => {
            addAgentMessage(`✅ Module ${q.module} complete! Moving on to ${nextQ.moduleName}...`);
            setTimeout(() => { setQuestionIndex(prev => prev + 1); showNextQuestion(nextQ, updatedAnswers); }, 800);
          }, 500);
        } else if (nextQ) {
          setQuestionIndex(prev => prev + 1);
          setTimeout(() => { showNextQuestion(nextQ, updatedAnswers); }, 400);
        }
      }
    } catch { toast.error("Failed to save."); } finally { setIsSaving(false); }
  };

  const handleTextSubmit = () => { if (!chatInput.trim()) return; handleAnswer(chatInput.trim()); setChatInput(""); };
  const handleNumericSubmit = () => { const val = parseFloat(chatInput); if (isNaN(val) || val <= 0) { toast.error("Valid number required"); return; } handleAnswer(val, String(val)); setChatInput(""); };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (currentQuestion?.inputType === "numeric") handleNumericSubmit(); else handleTextSubmit(); }
  };

  // ─── Inline Local Render Helpers ───
  const renderBasicInfoView = () => (
    <div className="flex flex-col h-full bg-gradient-to-br from-white via-cyan-50/10 to-violet-50/10 px-8 py-10 scroll-smooth">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-cyan-400/20 rounded-full blur-[80px]" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-violet-400/20 rounded-full blur-[80px]" />
      </div>

      <div className="relative z-10 flex flex-col h-full max-w-lg mx-auto w-full space-y-8">
        <div className="space-y-3 text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-[2rem] bg-gradient-to-tr from-cyan-50/50 to-blue-50/50 shadow-xl shadow-cyan-500/20 mb-3 border border-white p-1 shrink-0 overflow-hidden">
            <img src={chatbotAvatar} alt="Neesh AI Bot" className="w-full h-full object-contain scale-x-[-1]" />
          </div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 tracking-tight">Create Workspace</h1>
          <p className="text-gray-500 text-sm font-medium">Initialize your startup validation core and begin the reality check.</p>
        </div>

        <div className="space-y-5 bg-white/60 backdrop-blur-xl border border-white/80 p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 ml-1 uppercase tracking-wider">Startup Name</label>
            <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="e.g., Neesh AI" className="h-12 text-sm rounded-2xl border-gray-200/60 bg-white/60 focus:bg-white transition-all focus:ring-2 focus:ring-cyan-500/20 shadow-inner" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 ml-1 uppercase tracking-wider">Summary</label>
            <Input value={oneLineDesc} onChange={(e) => setOneLineDesc(e.target.value)} placeholder="Describe what you do in one line..." className="h-12 text-sm rounded-2xl border-gray-200/60 bg-white/60 focus:bg-white transition-all focus:ring-2 focus:ring-cyan-500/20 shadow-inner" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 ml-1 uppercase tracking-wider">Industry</label>
              <Select onValueChange={setIndustry} value={industry}>
                <SelectTrigger className="h-12 rounded-2xl border-gray-200/60 bg-white/60 focus:bg-white shadow-inner"><SelectValue placeholder="Select industry"/></SelectTrigger>
                <SelectContent position="popper" className="z-[110] max-h-64">
                  {INDUSTRIES.map(ind => (
                    <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 ml-1 uppercase tracking-wider">Stage</label>
              <Select onValueChange={setStartupStage} value={startupStage}>
                <SelectTrigger className="h-12 rounded-2xl border-gray-200/60 bg-white/60 focus:bg-white shadow-inner"><SelectValue placeholder="Select stage"/></SelectTrigger>
                <SelectContent position="popper" className="z-[110] max-h-64">
                  {STARTUP_STAGES.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleBasicInfoSubmit} disabled={isCreating} className="w-full h-14 text-base font-bold rounded-2xl gap-2 mt-2 bg-gradient-to-r from-[hsl(190,85%,38%)] to-[hsl(186,93%,48%)] hover:opacity-95 text-white shadow-lg shadow-cyan-500/20 hover:-translate-y-0.5 transition-all">
            {isCreating ? <><Loader2 className="w-5 h-5 animate-spin" /> Initializing...</> : <>Start Copilot <ChevronRight className="w-5 h-5" /></>}
          </Button>
        </div>
      </div>
    </div>
  );

  const renderChatView = () => (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 bg-white/40 backdrop-blur-md border-b border-white/40 z-20 shrink-0 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-50/50 to-blue-50/50 flex items-center justify-center shadow-lg shadow-cyan-500/10 border border-white p-1 shrink-0">
            <img src={chatbotAvatar} alt="Neesh AI Bot" className="w-full h-full object-contain scale-x-[-1]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 tracking-tight leading-tight">Neesh AI Navigator</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-gray-600 font-medium uppercase tracking-wider">Module {currentModule}/{totalModules}</span>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/50 transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
      </div>

      {/* Progress */}
      <div className="w-full h-0.5 bg-gray-200/50 shrink-0"><motion.div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]" initial={{ width: 0 }} animate={{ width: `${currentQuestion ? ((questionIndex + 1) / CHAT_QUESTIONS.length) * 100 : 100}%` }} transition={{ duration: 0.5 }} /></div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-6 space-y-5 scroll-smooth z-10">
        <style dangerouslySetInnerHTML={{__html: `
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 9999px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
        `}} />
        <AnimatePresence mode="popLayout">
          {messages.map((msg) => (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 15, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3, type: "spring", bounce: 0.2 }} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
              {msg.sender === "agent" && <div className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center mr-3 bg-gradient-to-tr from-cyan-50/50 to-blue-50/50 border border-white shadow-sm overflow-hidden p-0.5"><img src={chatbotAvatar} alt="Bot" className="w-full h-full object-contain scale-x-[-1]" /></div>}
              <div className={`max-w-[85%] px-5 py-3.5 text-[15px] leading-relaxed tracking-tight mt-1 ${msg.sender === "user" ? "text-white rounded-[20px] rounded-br-sm bg-gradient-to-tr from-[hsl(190,85%,38%)] to-[hsl(186,93%,48%)] shadow-md shadow-cyan-500/10" : "text-gray-800 rounded-[20px] rounded-bl-sm bg-white/70 backdrop-blur-xl border border-white/50 shadow-sm"}`}>
                {msg.text.split(/(\*\*.*?\*\*)/).map((part, i) => part.startsWith('**') && part.endsWith('**') ? <strong key={i} className="font-bold text-gray-900 bg-cyan-100/50 px-1 rounded">{part.slice(2, -2)}</strong> : part )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isAgentTyping && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
            <div className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center mr-3 bg-gradient-to-tr from-cyan-50/50 to-blue-50/50 border border-white shadow-sm overflow-hidden p-0.5"><img src={chatbotAvatar} alt="Bot" className="w-full h-full object-contain scale-x-[-1]" /></div>
            <div className="px-5 py-3 rounded-[20px] rounded-bl-sm bg-white/70 backdrop-blur-xl border border-white/50 shadow-sm mt-1">
              <div className="flex gap-1.5"><div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "0ms" }} /><div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "150ms" }} /><div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "300ms" }} /></div>
            </div>
          </motion.div>
        )}
        <div ref={chatEndRef} className="h-2" />
      </div>

      {/* Input Area */}
      {currentQuestion && !isAgentTyping && (
        <div className="px-6 pb-6 pt-2 z-20 shrink-0 bg-white/10 backdrop-blur-md border-t border-white/20">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full">
            
            {currentQuestion.id === "cvp_card" && <CVPCard onAnswer={handleAnswer} />}
            {currentQuestion.id === "market_desperation_card" && <MarketDesperationCard onAnswer={handleAnswer} />}
            {currentQuestion.id === "market_population_card" && <MarketPopulationCard onAnswer={handleAnswer} />}
            {currentQuestion.id === "acq_trust_card" && <AcqTrustCard onAnswer={handleAnswer} />}
            {currentQuestion.id === "def_moat_card" && <DefMoatCard onAnswer={handleAnswer} />}
            {currentQuestion.id === "build_execution_card" && <BuildExecutionCard onAnswer={handleAnswer} />}

            {currentQuestion.inputType === "mcq" && (
              <div className="flex items-center gap-3 max-w-xl mx-auto w-full bg-white/70 backdrop-blur-2xl p-1.5 rounded-[1.5rem] border border-white/60 shadow-md">
                <div className="flex-1 min-w-0">
                  <Select onValueChange={(val) => {
                    const label = currentQuestion.options?.find(o => o.value === val)?.label || val;
                    handleAnswer(val, label);
                  }}>
                    <SelectTrigger className="bg-transparent border-0 h-11 focus:ring-0 focus:ring-offset-0 text-[14px] shadow-none">
                      <SelectValue placeholder="Choose an option..." />
                    </SelectTrigger>
                    <SelectContent className="z-[110]">
                      {currentQuestion.options?.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {(currentQuestion.inputType === "textarea" || currentQuestion.inputType === "numeric") && (() => {
              const wordCount = chatInput.trim() ? chatInput.trim().split(/\s+/).length : 0;
              const wordColor = wordCount >= 100 ? "text-emerald-500" : wordCount >= 51 ? "text-amber-500" : "text-red-400";
              return (
              <div className="flex flex-col gap-0 bg-white/70 backdrop-blur-2xl p-1.5 rounded-[1.5rem] border border-white/60 shadow-md focus-within:shadow-[0_4px_20px_rgba(6,182,212,0.15)] focus-within:border-cyan-300 transition-all duration-300">
                <div className="flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={currentQuestion.placeholder || "Type your answer..."}
                    rows={currentQuestion.inputType === "numeric" ? 1 : 5}
                    className="flex-1 px-4 py-2.5 text-[14px] text-gray-800 bg-transparent resize-none focus:outline-none placeholder:text-gray-400/70 placeholder:text-[13px] placeholder:leading-relaxed"
                  />
                  <button onClick={currentQuestion.inputType === "numeric" ? handleNumericSubmit : handleTextSubmit} disabled={isSaving || !chatInput.trim()} className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-tr from-gray-900 to-gray-800 hover:from-cyan-500 hover:to-blue-500 text-white shadow-md transition-all duration-300 disabled:opacity-40 mb-0.5 mr-0.5">
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
                  </button>
                </div>
                {currentQuestion.inputType === "textarea" && (
                  <div className="flex justify-end px-4 pb-1.5 pt-0.5">
                    <span className={`text-xs font-semibold tabular-nums transition-colors duration-200 ${wordColor}`}>
                      {wordCount}/100 words
                    </span>
                  </div>
                )}
              </div>
              );
            })()}
          </motion.div>
        </div>
      )}
    </>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-6">
      {/* The Dark Overlay over the main dashboard */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/25 backdrop-blur-[2px]"
        onClick={onClose}
      />
      
      {/* The Floating Center Panel */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", damping: 25, stiffness: 220 }}
        className="relative w-full md:w-[760px] h-full md:h-[88vh] md:max-h-[820px] bg-white/95 backdrop-blur-3xl border border-white/80 shadow-[0_20px_50px_rgba(0,0,0,0.12)] rounded-none md:rounded-[2.5rem] flex flex-col overflow-hidden z-10"
      >
        {step === "basic_info" ? renderBasicInfoView() : renderChatView()}
      </motion.div>
    </div>
  );
};

export default CreateProjectWizard;
