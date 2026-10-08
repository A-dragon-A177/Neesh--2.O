import os
import base64
import subprocess
from pathlib import Path

# Workspace & Brain directories
WORKSPACE_DIR = Path(r"c:\Users\Abhishek\OneDrive\Desktop\Neesh Documentation\Neesh AI Dev")
BRAIN_DIR = Path(r"C:\Users\Abhishek\.gemini\antigravity-ide\brain\4201baee-9330-4375-84ec-94306beb7ff7")
RAW_SCREENSHOTS_DIR = WORKSPACE_DIR / "extracted_raw_screenshots"

OUTPUT_HTML = BRAIN_DIR / "scratch" / "updated_onboarding_guide.html"
OUTPUT_PDF_BRAIN = BRAIN_DIR / "Neesh_AI_Founder_Onboarding_Guide.pdf"
OUTPUT_PDF_WORKSPACE = WORKSPACE_DIR / "Neesh_AI_Founder_Onboarding_Guide.pdf"

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

def load_image_base64(candidate_paths):
    for p in candidate_paths:
        if p and p.exists():
            with open(p, "rb") as f:
                encoded = base64.b64encode(f.read()).decode("utf-8")
                return f"data:image/png;base64,{encoded}"
    print(f"Warning: Image not found in candidates: {candidate_paths}")
    return ""

images = {
    "signup": load_image_base64([BRAIN_DIR / "pw_03_signup.png", RAW_SCREENSHOTS_DIR / "page_2_img_1_X33.png"]),
    "login": load_image_base64([BRAIN_DIR / "pw_02_login.png", RAW_SCREENSHOTS_DIR / "page_3_img_1_X42.png"]),
    "dashboard": load_image_base64([BRAIN_DIR / "live_01_dashboard.png", RAW_SCREENSHOTS_DIR / "page_4_img_1_X48.png"]),
    "wizard_step1": load_image_base64([BRAIN_DIR / "live_02_wizard_step1.png", RAW_SCREENSHOTS_DIR / "page_5_img_1_X55.png"]),
    "wizard_filled": load_image_base64([BRAIN_DIR / "live_03_wizard_filled.png", RAW_SCREENSHOTS_DIR / "page_6_img_1_X61.png"]),
    "copilot_chat": load_image_base64([BRAIN_DIR / "live_04_wizard_chat_started.png", RAW_SCREENSHOTS_DIR / "page_7_img_1_X67.png"]),
    "validation_hub": load_image_base64([BRAIN_DIR / "live_06_project_workspace_hub.png", RAW_SCREENSHOTS_DIR / "page_8_img_1_X73.png"]),
    "spotlight_editor": load_image_base64([BRAIN_DIR / "live_10_spotlight_editor.png", RAW_SCREENSHOTS_DIR / "page_9_img_1_X79.png"]),
    "public_spotlight": load_image_base64([BRAIN_DIR / "live_18_real_public_spotlight.png", RAW_SCREENSHOTS_DIR / "page_10_img_1_X85.png"]),
    "pitches_feed": load_image_base64([BRAIN_DIR / "pitches_mobile_view_1789314580319.png", RAW_SCREENSHOTS_DIR / "page_11_img_1_X91.png"]),
    "audience_feedback": load_image_base64([BRAIN_DIR / "audience_feedback_targets.png", RAW_SCREENSHOTS_DIR / "page_12_img_1_X98.png"]),
}

html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Neesh AI 2.0 - Founder Onboarding & Platform Manual</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600;700&display=swap');

    @page {{
      size: A4 portrait;
      margin: 14mm 16mm 14mm 16mm;
      @bottom-right {{
        content: counter(page);
      }}
    }}

    * {{
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }}

    body {{
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #0f172a;
      background-color: #ffffff;
      line-height: 1.45;
      font-size: 12px;
      margin: 0;
      padding: 0;
    }}

    /* Page container to strictly enforce 1 page per step */
    .page {{
      page-break-after: always;
      break-after: page;
      height: 268mm;
      max-height: 268mm;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      position: relative;
    }}

    .page:last-child {{
      page-break-after: auto;
      break-after: auto;
    }}

    /* Cover / Hero Header on Page 1 */
    .doc-cover {{
      background: linear-gradient(135deg, #09203f 0%, #0891b2 50%, #0284c7 100%);
      color: #ffffff;
      padding: 30px 34px;
      border-radius: 16px;
      margin-bottom: 24px;
      box-shadow: 0 10px 25px -5px rgba(8, 145, 178, 0.3);
    }}

    .cover-badge {{
      display: inline-block;
      background: rgba(255, 255, 255, 0.18);
      border: 1px solid rgba(255, 255, 255, 0.35);
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 12px;
      backdrop-filter: blur(10px);
    }}

    .doc-cover h1 {{
      font-size: 26px;
      font-weight: 800;
      margin: 0 0 10px 0;
      letter-spacing: -0.02em;
      color: #ffffff;
    }}

    .doc-cover p {{
      font-size: 13.5px;
      margin: 0;
      color: rgba(255, 255, 255, 0.92);
      max-width: 620px;
      line-height: 1.5;
    }}

    /* Table of Contents */
    .toc-card {{
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 20px 24px;
      margin-bottom: 24px;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
    }}

    .toc-card h3 {{
      margin: 0 0 14px 0;
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #0891b2;
    }}

    .toc-grid {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px 20px;
      font-size: 12px;
    }}

    .toc-item {{
      color: #334155;
      text-decoration: none;
      display: flex;
      align-items: center;
      gap: 8px;
    }}

    .toc-num {{
      font-weight: 800;
      color: #0891b2;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      background: #e0f2fe;
      padding: 2px 6px;
      border-radius: 4px;
    }}

    .welcome-card {{
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 12px;
      padding: 16px 20px;
      font-size: 12px;
      color: #166534;
      line-height: 1.55;
    }}

    .welcome-card strong {{
      color: #14532d;
    }}

    /* Section Headers */
    .step-header {{
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 6px;
      border-bottom: 2px solid #f1f5f9;
      padding-bottom: 6px;
    }}

    .step-badge {{
      background: #0891b2;
      color: #ffffff;
      font-size: 10.5px;
      font-weight: 800;
      padding: 3px 9px;
      border-radius: 6px;
      font-family: 'JetBrains Mono', monospace;
      letter-spacing: 0.03em;
    }}

    .step-title {{
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
      letter-spacing: -0.01em;
    }}

    .step-desc {{
      color: #475569;
      font-size: 11.5px;
      margin: 0 0 8px 0;
      line-height: 1.45;
    }}

    /* Screenshot Container */
    .screenshot-card {{
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 6px;
      box-shadow: 0 3px 10px rgba(15, 23, 42, 0.05);
      margin: 6px 0 8px 0;
      text-align: center;
    }}

    .screenshot-card img {{
      max-width: 100%;
      height: auto;
      max-height: 295px;
      border-radius: 6px;
      display: block;
      margin: 0 auto;
      object-fit: contain;
    }}

    .screenshot-caption {{
      font-size: 10px;
      color: #64748b;
      margin-top: 5px;
      font-style: italic;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }}

    /* Feature List / Instructions Box */
    .action-box {{
      background: #f0fdfa;
      border-left: 3px solid #0d9488;
      border-radius: 0 8px 8px 0;
      padding: 8px 12px;
      margin-top: 6px;
      font-size: 11.5px;
    }}

    .action-box h4 {{
      margin: 0 0 4px 0;
      color: #0f766e;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }}

    .action-box ul {{
      margin: 0;
      padding-left: 16px;
      color: #334155;
    }}

    .action-box li {{
      margin-bottom: 3px;
      line-height: 1.4;
    }}

    .action-box li:last-child {{
      margin-bottom: 0;
    }}

    /* Special Callout Boxes (Tips / Tricks / Warnings) */
    .callout-box {{
      border-radius: 8px;
      padding: 7px 11px;
      margin-top: 6px;
      font-size: 11px;
      line-height: 1.45;
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }}

    .callout-tip {{
      background: #f0fdf4;
      border: 1px solid #86efac;
      color: #166534;
    }}

    .callout-trick {{
      background: #fefce8;
      border: 1px solid #fde047;
      color: #854d0e;
    }}

    .callout-warn {{
      background: #fff1f2;
      border: 1px solid #fecdd3;
      color: #9f1239;
    }}

    .callout-info {{
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      color: #0369a1;
    }}

    .callout-icon {{
      font-size: 13px;
      flex-shrink: 0;
      margin-top: 1px;
    }}

    code {{
      font-family: 'JetBrains Mono', monospace;
      font-size: 10.5px;
      background: #e2e8f0;
      color: #0f172a;
      padding: 1px 4px;
      border-radius: 4px;
    }}

    .footer-note {{
      margin-top: auto;
      padding-top: 6px;
      border-top: 1px solid #f1f5f9;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #94a3b8;
      font-size: 9.5px;
    }}
  </style>
</head>
<body>

  <!-- ==================== PAGE 1: COVER & TABLE OF CONTENTS ==================== -->
  <div class="page">
    <div class="doc-cover">
      <div class="cover-badge">Neesh AI 2.0 · Platform Manual</div>
      <h1>Founder Onboarding & Step-by-Step Guide</h1>
      <p>Transform raw startup hypotheses into mathematically scored, audience-validated products with AI guidance, interactive spotlight pages, and video pitch reels.</p>
    </div>

    <div class="toc-card">
      <h3>Workflow Contents</h3>
      <div class="toc-grid">
        <div class="toc-item"><span class="toc-num">01.</span> Account Registration & Sign Up</div>
        <div class="toc-item"><span class="toc-num">02.</span> Signing In to Your Workspace</div>
        <div class="toc-item"><span class="toc-num">03.</span> Founder Command Dashboard</div>
        <div class="toc-item"><span class="toc-num">04.</span> Creating a Project Workspace</div>
        <div class="toc-item"><span class="toc-num">05.</span> Entering Startup Idea Details</div>
        <div class="toc-item"><span class="toc-num">06.</span> Copilot Validation Questions</div>
        <div class="toc-item"><span class="toc-num">07.</span> Phase 1 Reality Check & Score</div>
        <div class="toc-item"><span class="toc-num">08.</span> Spotlight Page Editor</div>
        <div class="toc-item"><span class="toc-num">09.</span> Public Spotlight & Live Signals</div>
        <div class="toc-item"><span class="toc-num">10.</span> Elevator Pitch Video & Reels</div>
        <div class="toc-item"><span class="toc-num">11.</span> Audience Sprint Tiers (Gold/Silver/Bronze)</div>
      </div>
    </div>

    <div class="welcome-card">
      <strong>Welcome to Neesh AI 2.0!</strong> This operational handbook walks founders through every milestone of validating a startup. From account initialization and AI Copilot discovery to crafting an irresistible hook slogan, publishing high-converting spotlights, broadcasting elevator pitch reels to the community, and collecting buyer intent.
    </div>

    <div class="footer-note">
      <span>Neesh AI 2.0 · Founder Manual</span>
      <span>Page 1 of 12</span>
    </div>
  </div>

  <!-- ==================== PAGE 2: STEP 01 - SIGN UP ==================== -->
  <div class="page">
    <div class="step-header">
      <span class="step-badge">STEP 01</span>
      <h2 class="step-title">Creating an Account (Sign Up)</h2>
    </div>
    <p class="step-desc">New founders start by registering on the platform at <code>/signup</code>. This creates your dedicated founder workspace and initializes your secure Supabase authentication profile.</p>

    <div class="screenshot-card">
      <img src="{images['signup']}" alt="Sign Up Page">
      <div class="screenshot-caption">Figure 1.1: Neesh AI Account Registration Screen</div>
    </div>

    <div class="action-box">
      <h4>Founder Instructions</h4>
      <ul>
        <li><strong>Email Registration:</strong> Enter your First Name, Last Name, and Work/Personal Email Address.</li>
        <li><strong>Single Sign-On (SSO):</strong> Click <strong>Google</strong> or <strong>GitHub</strong> for instant, passwordless sign-up.</li>
        <li><strong>Email Verification:</strong> Click your verification email link to activate your workspace and begin building.</li>
      </ul>
    </div>

    <div class="callout-box callout-trick">
      <span class="callout-icon">💡</span>
      <div>
        <strong>Founder Pro-Tip / Fast-Track Access Trick:</strong> In case standard email authentication or verification links encounter inbox spam filters or delivery delays, <strong>use Google Sign-In</strong> to gain instant, one-click access to the platform! Google SSO bypasses link delays and directly establishes your authenticated session.
      </div>
    </div>

    <div class="footer-note">
      <span>Neesh AI 2.0 · Founder Manual</span>
      <span>Page 2 of 12</span>
    </div>
  </div>

  <!-- ==================== PAGE 3: STEP 02 - SIGN IN ==================== -->
  <div class="page">
    <div class="step-header">
      <span class="step-badge">STEP 02</span>
      <h2 class="step-title">Signing In to Your Account</h2>
    </div>
    <p class="step-desc">Existing founders log in directly via <code>/login</code>. Authentication tokens and user sessions are securely managed through Supabase session storage.</p>

    <div class="screenshot-card">
      <img src="{images['login']}" alt="Sign In Page">
      <div class="screenshot-caption">Figure 2.1: Secure Founder Login Interface</div>
    </div>

    <div class="action-box">
      <h4>Founder Instructions</h4>
      <ul>
        <li>Enter your registered email and password, or authenticate with <strong>Google</strong> / <strong>GitHub</strong> SSO.</li>
        <li>The system keeps you securely logged in across browser sessions so you can seamlessly update spotlights, manage pitch reels, and monitor incoming audience signals.</li>
        <li>If you forget your password, click <strong>Forgot password?</strong> to receive a secure password reset link.</li>
      </ul>
    </div>

    <div class="callout-box callout-info">
      <span class="callout-icon">ℹ️</span>
      <div>
        <strong>Seamless Session Sync:</strong> Signing in with the same Google or email account automatically restores your projects, custom spotlight landing pages, audience leads, and live countdown sprint timers.
      </div>
    </div>

    <div class="footer-note">
      <span>Neesh AI 2.0 · Founder Manual</span>
      <span>Page 3 of 12</span>
    </div>
  </div>

  <!-- ==================== PAGE 4: STEP 03 - DASHBOARD ==================== -->
  <div class="page">
    <div class="step-header">
      <span class="step-badge">STEP 03</span>
      <h2 class="step-title">The Founder Command Dashboard</h2>
    </div>
    <p class="step-desc">The dashboard (<code>/dashboard</code>) is your startup control tower. It displays active validation sprints, countdown timers, project status badges, and real-time audience views.</p>

    <div class="screenshot-card">
      <img src="{images['dashboard']}" alt="Founder Dashboard">
      <div class="screenshot-caption">Figure 3.1: Founder Projects & Sprint Countdown Dashboard</div>
    </div>

    <div class="action-box">
      <h4>Dashboard Elements & Actions</h4>
      <ul>
        <li><strong>Create New Project:</strong> Click the top-right <strong>+ New Project</strong> CTA to launch a new validation workspace and explain your business, startup, or idea to the AI engine.</li>
        <li><strong>Project Cards:</strong> View active sprint timers (e.g. 48-Hour Validation Sprint or 5-Day Stage 3 Sprint), project titles, and status tags (<code>Active</code>, <code>Draft</code>, <code>Locked</code>).</li>
        <li><strong>Audience Views Counter:</strong> Real-time counter of unique audience members who have opened your spotlight or pitch.</li>
        <li><strong>Cross-Promotion Engine:</strong> Live network to cross-promote your spotlight in other founders' "More Like This" sections.</li>
      </ul>
    </div>

    <div class="callout-box callout-tip">
      <span class="callout-icon">🚀</span>
      <div>
        <strong>Getting Started:</strong> Click <strong>+ New Project</strong> to begin. You will explain what your startup does, who it serves, and let Neesh AI guide you through validating your venture assumptions.
      </div>
    </div>

    <div class="footer-note">
      <span>Neesh AI 2.0 · Founder Manual</span>
      <span>Page 4 of 12</span>
    </div>
  </div>

  <!-- ==================== PAGE 5: STEP 04 - CREATE WORKSPACE ==================== -->
  <div class="page">
    <div class="step-header">
      <span class="step-badge">STEP 04</span>
      <h2 class="step-title">Creating a New Project Workspace</h2>
    </div>
    <p class="step-desc">Clicking <strong>+ New Project</strong> launches the interactive <strong>Create Workspace Wizard</strong>, initiating the calibrated AI validation workflow for your venture.</p>

    <div class="screenshot-card">
      <img src="{images['wizard_step1']}" alt="Create Workspace Wizard">
      <div class="screenshot-caption">Figure 4.1: Initializing the Project Workspace</div>
    </div>

    <div class="action-box">
      <h4>Workspace Initialization Guide</h4>
      <ul>
        <li><strong>Initialize Venture:</strong> The wizard creates a dedicated database workspace for your startup where all validation questions, audience signals, spotlight assets, and reels are stored.</li>
        <li><strong>Structured Progression:</strong> You will move step-by-step from core parameters (Name, One-Liner, Sector, Stage) into the AI Copilot dialogue.</li>
        <li><strong>Sprint Timer Activation:</strong> Once initialized and scored, your project enters its audience validation sprint with real-time countdown tracking.</li>
      </ul>
    </div>

    <div class="callout-box callout-info">
      <span class="callout-icon">💡</span>
      <div>
        <strong>Multi-Project Support:</strong> Founders can create and manage multiple ventures simultaneously. Each project maintains its own isolated spotlight page, pitch reel, feedback inbox, and validation score.
      </div>
    </div>

    <div class="footer-note">
      <span>Neesh AI 2.0 · Founder Manual</span>
      <span>Page 5 of 12</span>
    </div>
  </div>

  <!-- ==================== PAGE 6: STEP 05 - STARTUP IDEA DETAILS ==================== -->
  <div class="page">
    <div class="step-header">
      <span class="step-badge">STEP 05</span>
      <h2 class="step-title">Entering Startup Idea Details</h2>
    </div>
    <p class="step-desc">Define the core parameters of your venture so Neesh AI can calibrate its reality check and format your public presentation.</p>

    <div class="screenshot-card">
      <img src="{images['wizard_filled']}" alt="Entering Startup Details">
      <div class="screenshot-caption">Figure 5.1: Startup Name, One-Line Summary, Industry & Stage Inputs</div>
    </div>

    <div class="action-box">
      <h4>Input Checklist & Strategic Guidelines</h4>
      <ul>
        <li><strong>Startup Name:</strong> The working brand or product title (e.g., <code>EcoRoute AI</code>).</li>
        <li><strong>One-Line Hook Slogan:</strong> Craft a concise, high-impact one-liner about your startup.</li>
        <li><strong>Sector / Industry:</strong> Vertical classification (SaaS, CleanTech, E-Commerce, FinTech, AI, HealthTech).</li>
        <li><strong>Venture Stage:</strong> Development status (Idea, Prototype, Pre-Revenue, Early Traction).</li>
        <li>Click <strong>Start Copilot &gt;</strong> to enter the AI interactive validation dialogue.</li>
      </ul>
    </div>

    <div class="callout-box callout-tip">
      <span class="callout-icon">⭐</span>
      <div>
        <strong>Critical Positioning Strategy (Hook Slogan):</strong> <em>This one-liner appears directly beside your Elevator Pitch video reel in the community feed!</em> Design your one-liner in a way that hooks audience curiosity immediately—like a captivating slogan that compels anyone discovering your reel to watch your pitch and read your spotlight.
      </div>
    </div>

    <div class="footer-note">
      <span>Neesh AI 2.0 · Founder Manual</span>
      <span>Page 6 of 12</span>
    </div>
  </div>

  <!-- ==================== PAGE 7: STEP 06 - COPILOT QUESTIONS ==================== -->
  <div class="page">
    <div class="step-header">
      <span class="step-badge">STEP 06</span>
      <h2 class="step-title">Answering Validation Questions with Neesh Copilot</h2>
    </div>
    <p class="step-desc">Neesh AI Navigator runs you through 5 modules of rigorous reality checks to eliminate bias, stress-test defensibility, and calculate value multipliers.</p>

    <div class="screenshot-card">
      <img src="{images['copilot_chat']}" alt="Copilot Chat Module">
      <div class="screenshot-caption">Figure 6.1: Neesh AI Navigator Interactive Question Dialogue</div>
    </div>

    <div class="action-box">
      <h4>The 5 Core Modules</h4>
      <ul>
        <li><strong>Module 1 (Problem Reality):</strong> Paint a real-world scenario where someone suffered from this problem and what went wrong.</li>
        <li><strong>Module 2 (Customer Persona & Budget):</strong> Specific job title, willingness to pay, and cost of their current workaround.</li>
        <li><strong>Module 3 (Value Multiplier):</strong> Measurable metrics why your approach is 10x better than existing alternatives.</li>
        <li><strong>Module 4 (Defensibility):</strong> What stops a well-funded competitor from cloning your product overnight?</li>
        <li><strong>Module 5 (Scale Math):</strong> Realistic transaction volumes, price points, and customer acquisition channels.</li>
      </ul>
    </div>

    <div class="callout-box callout-trick">
      <span class="callout-icon">💡</span>
      <div>
        <strong>Founder Pro-Tip:</strong> Use <strong>ChatGPT, Claude, or your preferred LLM</strong> loaded with your complete startup pitch or business plan to help answer questions and complete all 5 modules with deep, rigorous data.
      </div>
    </div>

    <div class="callout-box callout-warn">
      <span class="callout-icon">⚠️</span>
      <div>
        <strong>Mandatory Pre-Submission Review:</strong> <em>Read and verify every answer once before submitting!</em> Your responses are synthesized into public sections that appear directly on your live Spotlight page for visitors and investors to see.
      </div>
    </div>

    <div class="footer-note">
      <span>Neesh AI 2.0 · Founder Manual</span>
      <span>Page 7 of 12</span>
    </div>
  </div>

  <!-- ==================== PAGE 8: STEP 07 - VALIDATION SCORE & REPORT ==================== -->
  <div class="page">
    <div class="step-header">
      <span class="step-badge">STEP 07</span>
      <h2 class="step-title">Phase 1 Validation Reality Check & Score</h2>
    </div>
    <p class="step-desc">Your answers are synthesized into a holistic market-readiness score with an actionable dimensional diagnostic report.</p>

    <div class="screenshot-card">
      <img src="{images['validation_hub']}" alt="Validation Report">
      <div class="screenshot-caption">Figure 7.1: Phase 1 Validation Score and Command Center</div>
    </div>

    <div class="action-box">
      <h4>Workspace Hub Features & Report Insights</h4>
      <ul>
        <li><strong>Aggregate Score:</strong> Market-readiness gauge (e.g. <code>82% Validation Score</code>) measuring overall venture viability.</li>
        <li><strong>Key Dimension Gauges:</strong> Core Value Proposition, Market Size & Demand, Defensibility, and Go-to-Market Readiness.</li>
        <li><strong>Sidebar Navigation:</strong> Instant access to Spotlight Editor, Elevator Pitch, Audience Inbox, and Audience Insights.</li>
      </ul>
    </div>

    <div class="callout-box callout-warn">
      <span class="callout-icon">🎯</span>
      <div>
        <strong>Action Plan for Idea-Stage Ventures:</strong> Based on your answers, you will receive a detailed analytical report. <em>If your venture is at the Idea stage, pay close attention to the Critical Segments!</em> Work on and strengthen any low-scoring dimensions (e.g., customer budget, defensibility, unit economics) before scaling outreach.
      </div>
    </div>

    <div class="footer-note">
      <span>Neesh AI 2.0 · Founder Manual</span>
      <span>Page 8 of 12</span>
    </div>
  </div>

  <!-- ==================== PAGE 9: STEP 08 - SPOTLIGHT EDITOR ==================== -->
  <div class="page">
    <div class="step-header">
      <span class="step-badge">STEP 08</span>
      <h2 class="step-title">Customizing Your Spotlight Page</h2>
    </div>
    <p class="step-desc">The Spotlight Editor (<code>tab=spotlight</code>) lets you design a high-converting public landing page to capture customer intent and build your waitlist.</p>

    <div class="screenshot-card">
      <img src="{images['spotlight_editor']}" alt="Spotlight Page Editor">
      <div class="screenshot-caption">Figure 8.1: Spotlight Editor Interface</div>
    </div>

    <div class="action-box">
      <h4>Customization Controls & Best Practices</h4>
      <ul>
        <li><strong>Catchy Hero Cover Image:</strong> Create a catchy cover image using ChatGPT / DALL-E based on your startup. <em>Replace the existing default cover image first</em> to make your spotlight visually stand out!</li>
        <li><strong>Flexible Content Sections:</strong> Freely add, edit, or remove content sections based on your preferences.</li>
        <li><strong>Rich Media (Images & Videos):</strong> Add product screenshots, diagrams, or demo videos to help your audience understand your startup clearly.</li>
        <li><strong>Feedback Options:</strong> Add custom survey questions if you need to gather specific details, requirements, or contact info from prospective users.</li>
        <li><strong>Interest Tags:</strong> Add clear 1-to-2 word requirement tags (e.g., <code>Co-founder</code>, <code>Customers</code>, <code>Investors</code>). Save your tags and save the whole spotlight!</li>
      </ul>
    </div>

    <div class="footer-note">
      <span>Neesh AI 2.0 · Founder Manual</span>
      <span>Page 9 of 12</span>
    </div>
  </div>

  <!-- ==================== PAGE 10: STEP 09 - PUBLIC SPOTLIGHT ==================== -->
  <div class="page">
    <div class="step-header">
      <span class="step-badge">STEP 09</span>
      <h2 class="step-title">Public Spotlight: Live Audience Intent Capture</h2>
    </div>
    <p class="step-desc">When visitors open your spotlight link (<code>/p/:slug</code>), they experience your verified value proposition, submit interest, and engage directly.</p>

    <div class="screenshot-card">
      <img src="{images['public_spotlight']}" alt="Public Spotlight Page">
      <div class="screenshot-caption">Figure 9.1: Live Visitor Perspective on Public Spotlight</div>
    </div>

    <div class="action-box">
      <h4>Audience Interaction Points</h4>
      <ul>
        <li><strong>Deep-Dive Problem & Solution:</strong> Visitors read your verified value proposition, metrics, and roadmap.</li>
        <li><strong>Glowing Intent Button ("Neesh It"):</strong> One tap allows visitors to express direct buyer interest and join your early adopter list.</li>
        <li><strong>Interactive Feedback Form:</strong> Prospective customers can submit in-depth ratings, feature requests, and contact details.</li>
      </ul>
    </div>

    <div class="callout-box callout-warn">
      <span class="callout-icon">⚠️</span>
      <div>
        <strong>Platform Notice on Chatbot:</strong> <em>The AI Chatbot is currently undergoing algorithmic retraining and may not work as expected.</em> Founders and visitors should rely on the Glowing Intent Button, the Feedback Survey Form, and direct contact details on the Spotlight page for audience interactions.
      </div>
    </div>

    <div class="footer-note">
      <span>Neesh AI 2.0 · Founder Manual</span>
      <span>Page 10 of 12</span>
    </div>
  </div>

  <!-- ==================== PAGE 11: STEP 10 - ELEVATOR PITCH REELS ==================== -->
  <div class="page">
    <div class="step-header">
      <span class="step-badge">STEP 10</span>
      <h2 class="step-title">Uploading & Pushing Your Elevator Pitch Video</h2>
    </div>
    <p class="step-desc">Short-form video reels generate 5x higher engagement. Upload your 30s to 1-minute pitch in the <strong>Elevator Pitch</strong> tab and broadcast it to the global community.</p>

    <div class="screenshot-card">
      <img src="{images['pitches_feed']}" alt="Elevator Pitch Reels Feed" style="max-height: 280px;">
      <div class="screenshot-caption">Figure 10.1: Elevator Pitch Reel Featured in the Community Feed</div>
    </div>

    <div class="action-box">
      <h4>Video Creation & Promotion Steps</h4>
      <ul>
        <li><strong>Pitch Creation (30s to 1 min):</strong> Go to the Elevator Pitch tab. Create a punchy 30-second to 1-minute video pitch based on your business, startup, or idea.</li>
        <li><strong>Upload & Save:</strong> Upload your video file (<code>.mp4</code>, <code>.webm</code>, <code>.mov</code>) and click <strong>Save Pitch</strong>.</li>
        <li><strong>Push to Cross-Promotional Engine ⚡:</strong> Click <strong>Push to Engine</strong> to publish your pitch to the global discovery space, where everyone can browse your pitch and spotlight just like Instagram Reels or TikTok!</li>
      </ul>
    </div>

    <div class="callout-box callout-tip">
      <span class="callout-icon">🎬</span>
      <div>
        <strong>Video Creation Pro-Tips:</strong>
        <ul style="margin:2px 0 0 0; padding-left:14px;">
          <li>Record a natural founder selfie video pitching the problem and solution directly.</li>
          <li>Use <strong>Google Gemini</strong> to generate sharp pitch scripts and storyboards.</li>
          <li><strong>NotebookLM (Best Suited):</strong> Upload your startup notes/deck to Google NotebookLM to generate short-form audio/video discussion summaries—ideal for high-quality, professional pitches!</li>
        </ul>
      </div>
    </div>

    <div class="footer-note">
      <span>Neesh AI 2.0 · Founder Manual</span>
      <span>Page 11 of 12</span>
    </div>
  </div>

  <!-- ==================== PAGE 12: STEP 11 - SHARING & SPRINT MILESTONES ==================== -->
  <div class="page">
    <div class="step-header">
      <span class="step-badge">STEP 11</span>
      <h2 class="step-title">Multi-Channel Sharing & Audience Sprint Milestones</h2>
    </div>
    <p class="step-desc">Share your unique project link across external channels, track incoming leads in real-time, and qualify buyers into Gold, Silver, and Bronze tiers.</p>

    <div class="screenshot-card">
      <img src="{images['audience_feedback']}" alt="Audience Feedback & Sprint Targets" style="max-height: 250px;">
      <div class="screenshot-caption">Figure 11.1: Stage 2 Audience Sprint Targets & Qualification Progress</div>
    </div>

    <div class="action-box">
      <h4>Viral Multi-Channel Sharing & Inbound Leads</h4>
      <ul>
        <li><strong>Share Button on Overview Page:</strong> Go to the <strong>Overview</strong> page and click the <strong>Share</strong> button to copy your unique project link.</li>
        <li><strong>Promote Everywhere:</strong> Share your link across WhatsApp groups, Instagram bio/stories, Reddit (r/startups), X (Twitter), LinkedIn, and founder communities.</li>
        <li><strong>Inbound Approaches:</strong> Visitors who open the link can view your pitch reel and spotlight. If interested, they will submit interest and approach you directly!</li>
        <li><strong>Audience Insights Dashboard:</strong> Monitor all incoming visitor counts, intent submissions, and feedback responses in real-time on the <strong>Audience Insights</strong> page.</li>
      </ul>
    </div>

    <div class="action-box" style="margin-top: 5px; background: #faf5ff; border-left-color: #9333ea;">
      <h4 style="color: #7e22ce;">Validation Sprint Tiers</h4>
      <ul>
        <li><strong>Bronze (Early Adopters):</strong> Visitors who clicked the interest button and signed up.</li>
        <li><strong>Silver (Qualified Feedback):</strong> Visitors who provided detailed answers or survey input.</li>
        <li><strong>Gold (High-Intent Buyers):</strong> Prospects confirming pilot budgets, orders, or partner calls.</li>
        <li><strong>Sprint Auto-Advance:</strong> Achieve <strong>5 Gold + 10 Silver + 15 Bronze</strong> targets to auto-qualify for Stage 3 Pilot MVP status!</li>
      </ul>
    </div>

    <div class="footer-note">
      <span>© Neesh AI Ecosystem · Where Founders Build, Validate, and Launch</span>
      <span>Page 12 of 12</span>
    </div>
  </div>

</body>
</html>
"""

# Write HTML file
with open(OUTPUT_HTML, "w", encoding="utf-8") as f:
    f.write(html_content)

print(f"Generated updated HTML at: {OUTPUT_HTML}")

# Generate PDF with headless Chrome
cmd = [
    CHROME_PATH,
    "--headless",
    "--disable-gpu",
    "--run-all-compositor-stages-before-draw",
    "--no-pdf-header-footer",
    f"--print-to-pdf={OUTPUT_PDF_BRAIN}",
    str(OUTPUT_HTML)
]

print("Rendering updated PDF via headless Chrome...")
result = subprocess.run(cmd, capture_output=True, text=True)
print("Chrome exit code:", result.returncode)

if OUTPUT_PDF_BRAIN.exists():
    print(f"PDF successfully created at: {OUTPUT_PDF_BRAIN} ({OUTPUT_PDF_BRAIN.stat().st_size} bytes)")
    import shutil
    shutil.copy2(OUTPUT_PDF_BRAIN, OUTPUT_PDF_WORKSPACE)
    print(f"PDF successfully copied to workspace: {OUTPUT_PDF_WORKSPACE}")
else:
    print("Error: PDF output file was not created!")
