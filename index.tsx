import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";

declare var html2pdf: any;

// --- Types ---
interface AuditInputs {
  restaurantName: string;
  location: string;
  cuisineType: string;
  ownerName: string;
}

interface AuditResult {
  html: string;
  generated: boolean;
}

// --- Constants ---
const LOADING_STEPS = [
  "Initializing Competitive Intelligence Module...",
  "Querying Global Knowledge Graph...",
  "Identifying Local Competitor Matrix...",
  "Simulating Mobile User Journey (iOS/Android)...",
  "Calculating Revenue Leakage Models...",
  "Analyzing Menu Pricing Psychology...",
  "Formulating Strategic Recovery Plan...",
  "Finalizing Dossier Generation..."
];

const CURRENCIES = [
  { code: 'GBP', symbol: '£', label: 'British Pound (GBP)' },
  { code: 'USD', symbol: '$', label: 'US Dollar (USD)' },
  { code: 'EUR', symbol: '€', label: 'Euro (EUR)' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar (AUD)' },
  { code: 'CAD', symbol: 'C$', label: 'Canadian Dollar (CAD)' },
  { code: 'JPY', symbol: '¥', label: 'Japanese Yen (JPY)' },
];

const AUDIT_PROMPT_TEMPLATE = `
You are an Elite Revenue Intelligence Consultant.
Generate a strictly scientific, data-driven "Revenue Gap Analysis" for a restaurant lacking digital infrastructure.

INPUTS:
Restaurant Name: {{RESTAURANT_NAME}}
Location: {{LOCATION}}
Cuisine Type: {{CUISINE_TYPE}}
Owner Name: {{OWNER_NAME}}

INSTRUCTIONS:
1. PHASE 1 (RESEARCH - CRITICAL): 
   - Use 'googleSearch' to find 3 REAL, EXISTING competitors in {{LOCATION}}. Do not invent names.
   - Use 'googleSearch' to find REAL menu prices for this cuisine in this area to determine 'Average Ticket Value'.
   - Verify if the target restaurant ({{RESTAURANT_NAME}}) has a website or just social media.

2. PHASE 2 (OUTPUT): Generate a 6-page HTML dossier.

3. FORMATTING:
   - Use strictly semantic HTML.
   - Use class="highlight-box" for key financial insights.
   - Tables must be detailed and data-dense.
   - TONE: Clinical, authoritative, high-end financial consulting. Avoid "marketing fluff". Use terms like "Digital Friction," "Conversion Latency," "Revenue Leakage," "Search Velocity."
   - IMPORTANT: Insert <div class="page-break"></div> between every page section.
   - CRITICAL: Do NOT insert a page break after the final section (Page 6).

4. DATA INTEGRITY RULES:
   - COMPETITORS: Must be real businesses currently operating in {{LOCATION}}.
   - FINANCIALS: Label revenue loss as "Projected Revenue Leakage" (Calculated via Industry Standard 1.5% Conversion Rate).
   - PRICING: Use verified average prices from the local area.

STRUCTURE:

Page 1: Executive Intelligence
- Title: "DIGITAL REVENUE AUDIT: {{RESTAURANT_NAME}}"
- Date & Location.
- "Executive Summary": A paragraph summarizing the critical gap (No website) and its immediate financial consequence.
- <div class="page-break"></div>

Page 2: The Visibility Matrix (Scorecard)
- A detailed <table> auditing 10 touchpoints (e.g., "Mobile UX," "Menu Indexing," "Booking Latency").
- Score each out of 100 based on your research.
- Compare against "Top 10% Local Competitors."
- <div class="page-break"></div>

Page 3: User Journey Simulation
- Step-by-step breakdown of a failed customer acquisition.
- Use timestamps (e.g., "00:00:15 - User identifies friction").
- <div class="page-break"></div>

Page 4: Competitive Benchmarking (REAL DATA ONLY)
- A dense comparative table vs 3 REAL competitors found via search.
- Columns: [Competitor Name] | [Website Status] | [Load Speed] | [Menu Access] | [Est. Monthly Traffic Capture].
- <div class="page-break"></div>

Page 5: Financial Impact Assessment
- "Revenue Leakage Calculation":
- Show the formula: (Missed Covers/Day) x (Avg Ticket) x (30 Days).
- Avg Ticket must be based on {{CUISINE_TYPE}} prices in {{LOCATION}}.
- Provide Conservative, Baseline, and Aggressive loss scenarios.
- **CRITICAL**: Boldly display the "ANNUALIZED REVENUE LOSS" (Baseline x 12). This must be the largest number on the page.
- {{CURRENCY_INSTRUCTION}}
- <div class="page-break"></div>

Page 6: Strategic Directive & ROI
- "Required Infrastructure": The website specs needed to fix this.
- "ROI Projection": Time to break-even on a £399 investment (e.g., "4 days of recovered revenue").
- "Terminology Appendix": Brief 1-sentence definitions of "Latency", "Friction", and "Indexing" so the client understands the science.

DO NOT output markdown. Return only the HTML body content. Do not include <!DOCTYPE html> or <html> tags.
`;

const App = () => {
  const [inputs, setInputs] = useState<AuditInputs>({
    restaurantName: '',
    location: '',
    cuisineType: '',
    ownerName: ''
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  
  // Settings & Theme State
  const [showSettings, setShowSettings] = useState(false);
  const [userApiKey, setUserApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [currency, setCurrency] = useState(() => localStorage.getItem('currency') || 'GBP');
  
  // Terminal animation state
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);

  // Theme Effect
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Currency Effect
  useEffect(() => {
    localStorage.setItem('currency', currency);
  }, [currency]);

  useEffect(() => {
    let interval: any;
    if (loading) {
      setTerminalLogs([]);
      setLoadingStepIndex(0);
      interval = setInterval(() => {
        setLoadingStepIndex(prev => {
          if (prev < LOADING_STEPS.length - 1) return prev + 1;
          return prev;
        });
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    if (loading) {
      setTerminalLogs(prev => [...prev, `> ${LOADING_STEPS[loadingStepIndex]}`]);
    }
  }, [loadingStepIndex, loading]);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUserApiKey(val);
    localStorage.setItem('gemini_api_key', val);
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const generateAudit = async () => {
    if (!inputs.restaurantName || !inputs.location) {
      setError("Target identity required: Name & Location.");
      return;
    }

    const apiKeyToUse = userApiKey || process.env.API_KEY;
    if (!apiKeyToUse) {
        setError("API Key is missing. Please add it in Settings.");
        setShowSettings(true);
        return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const ai = new GoogleGenAI({ apiKey: apiKeyToUse });

      const selectedCurrencyObj = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];
      const currencyInstruction = `
      - **CRITICAL FINANCIAL FORMATTING**: ALL monetary values MUST be displayed in ${selectedCurrencyObj.label} (${selectedCurrencyObj.symbol}). 
      - If the location's local currency differs from ${selectedCurrencyObj.code}, convert all local estimated values to ${selectedCurrencyObj.code} using current exchange rates.
      `;

      let prompt = AUDIT_PROMPT_TEMPLATE
        .replace('{{RESTAURANT_NAME}}', inputs.restaurantName)
        .replace('{{LOCATION}}', inputs.location)
        .replace('{{CUISINE_TYPE}}', inputs.cuisineType || '(Auto-Detect)')
        .replace('{{OWNER_NAME}}', inputs.ownerName || 'Proprietor')
        .replace('{{CURRENCY_INSTRUCTION}}', currencyInstruction);

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingBudget: 4096 }, // Deep thinking for scientific output
        }
      });

      const generatedText = response.text;
      if (!generatedText) throw new Error("Analysis generation failed. System timeout.");

      // Robust cleaning:
      // 1. Remove Markdown blocks
      // 2. Remove standard HTML boilerplate tags
      let cleanHtml = generatedText
        .replace(/```html/g, '')
        .replace(/```/g, '')
        .replace(/<!DOCTYPE html>/gi, '')
        .replace(/<html>/gi, '')
        .replace(/<\/html>/gi, '')
        .replace(/<body>/gi, '')
        .replace(/<\/body>/gi, '');
      
      cleanHtml = cleanHtml.trim();

      // 3. CRITICAL: Remove leading page breaks
      cleanHtml = cleanHtml.replace(/^(\s*<div class="page-break">.*?<\/div>\s*)+/i, '');

      // 4. CRITICAL: Remove trailing page breaks (Fixes the final blank page issue)
      cleanHtml = cleanHtml.replace(/(\s*<div class="page-break">.*?<\/div>\s*)+$/i, '');

      setResult({ html: cleanHtml, generated: true });

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Critical system failure.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setGeneratingPdf(true);

    // Wait for state to update (CSS class to apply)
    await new Promise(resolve => setTimeout(resolve, 100));

    const element = reportRef.current;
    
    // Config tuned for A4 without chopping text
    const opt = {
      margin:       [10, 10, 10, 10], // top, left, bottom, right in mm
      filename:     `Revenue_Audit_${inputs.restaurantName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { 
        scale: 2, 
        useCORS: true, 
        logging: false,
        letterRendering: true 
      },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak:    { mode: ['css', 'legacy'] } 
    };

    html2pdf().set(opt).from(element).save().then(() => {
      setGeneratingPdf(false);
    }).catch((err: any) => {
      console.error("PDF generation failed:", err);
      setGeneratingPdf(false);
      alert("PDF generation failed. Please try the 'Download HTML' option.");
    });
  };

  const handleDownloadHTML = () => {
    if (!result) return;
    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Audit Report: ${inputs.restaurantName}</title>
        <style>
          /* Inlined CSS from index.html for portability */
          body { font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #111; }
          h1 { font-size: 2.5rem; border-bottom: 4px solid #000; margin-bottom: 20px; }
          h2 { font-size: 1.5rem; border-left: 4px solid #000; padding-left: 10px; margin-top: 40px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; border: 1px solid #000; }
          th { background: #000; color: #fff; padding: 10px; text-align: left; }
          td { border: 1px solid #ccc; padding: 8px; }
          .highlight-box { border: 2px solid #000; padding: 20px; background: #f9f9f9; margin: 30px 0; }
          .page-break { border-top: 1px dashed #ccc; margin: 50px 0; text-align: center; color: #999; }
        </style>
      </head>
      <body>
        ${result.html}
      </body>
      </html>
    `;
    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Audit_${inputs.restaurantName.replace(/\s+/g, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Calculations for Circular Progress
  const progressPercentage = ((loadingStepIndex + 1) / LOADING_STEPS.length) * 100;
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 bg-[#f3f4f6] dark:bg-gray-900`}>
      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 max-w-md w-full border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-serif font-bold dark:text-white">System Configuration</h3>
              <button 
                onClick={() => setShowSettings(false)}
                className="text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">
                  Gemini API Key
                </label>
                <input 
                  type="password" 
                  value={userApiKey}
                  onChange={handleApiKeyChange}
                  placeholder="Paste your API key here..."
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 dark:text-white font-mono text-sm focus:ring-2 focus:ring-black dark:focus:ring-white outline-none"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Leave blank to use system default (if configured).
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">
                  Report Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 dark:text-white font-mono text-sm focus:ring-2 focus:ring-black dark:focus:ring-white outline-none"
                >
                  {CURRENCIES.map(c => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-400 mt-1">
                  Financial figures will be converted to this currency using real-time market estimates.
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-4">
                <span className="text-sm font-medium dark:text-white">Interface Theme</span>
                <button 
                  onClick={toggleTheme}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black dark:focus:ring-white ${theme === 'dark' ? 'bg-black' : 'bg-gray-200'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button 
                onClick={() => setShowSettings(false)}
                className="bg-black dark:bg-white text-white dark:text-black px-6 py-2 text-xs font-bold uppercase tracking-widest hover:opacity-90"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Bar - Elite Minimalist */}
      <header className="bg-black dark:bg-black text-white py-5 px-6 no-print border-b border-gray-800 transition-colors">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 border border-white flex items-center justify-center font-serif font-bold text-lg">
              R
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-[0.2em] uppercase font-serif">Revenue Intelligence</h1>
              <p className="text-[10px] text-gray-400 font-mono tracking-wider">SYSTEM v4.0.1 // PRO</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-mono text-gray-400">SESSION ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
            </div>
            <button 
              onClick={() => setShowSettings(true)} 
              className="text-gray-400 hover:text-white transition-colors"
              title="Settings"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.35a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-grow p-4 sm:p-10">
        <div className="max-w-5xl mx-auto">
          
          {/* Input Panel - Scientific/Medical Record Style */}
          <div className={`bg-white dark:bg-gray-800 border-t-4 border-black dark:border-gray-600 shadow-xl p-8 mb-12 transition-all duration-500 no-print ${result ? 'hidden' : 'block'}`}>
            <div className="mb-8 border-b border-gray-200 dark:border-gray-700 pb-4">
              <h2 className="text-3xl font-serif font-bold text-black dark:text-white mb-2">Target Analysis Initialization</h2>
              <p className="text-gray-500 dark:text-gray-400 font-light italic">Enter subject parameters to commence digital audit.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-900 dark:text-gray-300 uppercase tracking-widest font-mono">Restaurant Name</label>
                <input 
                  type="text"
                  value={inputs.restaurantName}
                  onChange={(e) => setInputs({...inputs, restaurantName: e.target.value})}
                  className="scientific-input w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 dark:border-gray-600"
                  placeholder="ENTER TRADING NAME"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-900 dark:text-gray-300 uppercase tracking-widest font-mono">Geo-Location</label>
                <input 
                  type="text"
                  value={inputs.location}
                  onChange={(e) => setInputs({...inputs, location: e.target.value})}
                  className="scientific-input w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 dark:border-gray-600"
                  placeholder="CITY, REGION"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-900 dark:text-gray-300 uppercase tracking-widest font-mono">Cuisine Taxonomy (Opt)</label>
                <input 
                  type="text"
                  value={inputs.cuisineType}
                  onChange={(e) => setInputs({...inputs, cuisineType: e.target.value})}
                  className="scientific-input w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 dark:border-gray-600"
                  placeholder="E.G. CONTEMPORARY ITALIAN"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-900 dark:text-gray-300 uppercase tracking-widest font-mono">Proprietor (Opt)</label>
                <input 
                  type="text"
                  value={inputs.ownerName}
                  onChange={(e) => setInputs({...inputs, ownerName: e.target.value})}
                  className="scientific-input w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 dark:border-gray-600"
                  placeholder="FOR PERSONALIZATION"
                />
              </div>
            </div>

            {error && (
              <div className="mt-8 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-600 text-red-900 dark:text-red-300 font-mono text-sm">
                ERROR: {error}
              </div>
            )}

            <div className="mt-10 flex justify-end items-center gap-6">
              {loading && (
                 <div className="flex items-center gap-3">
                   {/* Circular Progress Indicator */}
                   <div className="relative w-14 h-14">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="28"
                          cy="28"
                          r={radius}
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="transparent"
                          className="text-gray-200 dark:text-gray-700"
                        />
                        <circle
                          cx="28"
                          cy="28"
                          r={radius}
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="transparent"
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          className="text-black dark:text-white transition-all duration-300 ease-out"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[10px] font-bold font-mono text-black dark:text-white">
                            {Math.round(progressPercentage)}%
                        </span>
                      </div>
                   </div>
                   <span className="text-xs font-mono animate-pulse text-gray-500 dark:text-gray-400">ANALYZING...</span>
                 </div>
              )}
              
              <button 
                onClick={generateAudit}
                disabled={loading}
                className={`
                  px-10 py-4 font-mono font-bold text-sm tracking-widest uppercase transition-all
                  ${loading 
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-wait border border-gray-200 dark:border-gray-700 opacity-50' 
                    : 'bg-black dark:bg-white text-white dark:text-black hover:bg-gray-900 dark:hover:bg-gray-200 hover:shadow-lg border border-black dark:border-white'
                  }
                `}
              >
                {loading ? "PROCESSING..." : "EXECUTE ANALYSIS >"}
              </button>
            </div>
            
            {/* Terminal Output Loading State */}
            {loading && (
              <div className="mt-8 bg-black p-6 font-mono text-xs text-green-500 h-48 overflow-y-auto rounded-sm shadow-inner dark:border dark:border-gray-700">
                {terminalLogs.map((log, i) => (
                  <div key={i} className="mb-1 opacity-90">{log}</div>
                ))}
                <div className="animate-pulse">_</div>
              </div>
            )}
          </div>

          {/* Results Presentation - " The Dossier" */}
          {result && (
            <div className="animate-fade-in-up">
              <div className="mb-6 flex justify-between items-center no-print max-w-[8.5in] mx-auto flex-wrap gap-4">
                <button 
                  onClick={() => setResult(null)}
                  className="text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white font-mono text-xs uppercase tracking-widest flex items-center gap-2 transition-colors"
                >
                  ← New Audit
                </button>
                <div className="flex gap-3">
                   <button 
                    onClick={handleDownloadHTML}
                    className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 font-mono text-xs uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                  >
                    Download HTML
                  </button>
                   <button 
                    onClick={handleDownloadPDF}
                    disabled={generatingPdf}
                    className={`
                        bg-black dark:bg-white border border-black dark:border-white text-white dark:text-black px-6 py-2 font-mono text-xs uppercase tracking-widest hover:bg-gray-900 dark:hover:bg-gray-200 transition-colors shadow-sm
                        ${generatingPdf ? 'opacity-70 cursor-wait' : ''}
                    `}
                  >
                    {generatingPdf ? 'Compiling PDF...' : 'Download PDF'}
                  </button>
                </div>
              </div>

              {/* Physical Paper Look - Referenced by useRef for html2pdf */}
              {/* Added pdf-export-mode toggle to optimize styling during export */}
              {/* NOTE: We keep this white even in dark mode to simulate the paper output */}
              <div 
                ref={reportRef} 
                className={`
                  bg-white shadow-2xl border border-gray-200 min-h-[11in] max-w-[8.5in] mx-auto relative
                  ${generatingPdf ? 'pdf-export-mode' : 'p-12 sm:p-16'}
                `}
              >
                {/* Binder Clip Visual (Purely Aesthetic) - Hidden in export mode via CSS or logic */}
                {!generatingPdf && (
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 opacity-50 no-print" data-html2canvas-ignore="true"></div>
                )}

                <div 
                  className="audit-content text-black leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: result.html }}
                />
                
                <div className="bg-white p-8 border-t border-gray-900 text-center font-mono text-[10px] text-gray-400 uppercase tracking-[0.2em] no-print" data-html2canvas-ignore="true">
                   Confidential Document • Revenue Intelligence Systems • Do Not Distribute
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);

// Custom Animations
const style = document.createElement('style');
style.textContent = `
  @keyframes fade-in-up {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in-up {
    animation: fade-in-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
`;
document.head.appendChild(style);