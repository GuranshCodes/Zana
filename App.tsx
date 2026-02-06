
import React, { useState, useEffect, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation, Link, useNavigate } from 'react-router-dom';
import { UserRole, UserSession, PlanType, AnalysisResult } from './types';
import { analyzeWithGemini, fixContentWithGemini } from './services/geminiService';
import { calculateStatisticalSignal, calculateStructuralSignal, combineSignals } from './utils/detectionLogic';

// --- SHARED UI COMPONENTS ---

const ScoreGauge: React.FC<{ score: number; confidence: number }> = ({ score, confidence }) => {
  const getColor = (s: number) => {
    if (s < 20) return 'text-emerald-500';
    if (s < 50) return 'text-amber-500';
    return 'text-rose-500';
  };
  const getBgColor = (s: number) => {
    if (s < 20) return 'bg-emerald-50';
    if (s < 50) return 'bg-amber-50';
    return 'bg-rose-50';
  };
  const getLabel = (s: number) => {
    if (s < 20) return 'Likely Human';
    if (s < 50) return 'Mixed Signals';
    if (s < 80) return 'Suspected AI';
    return 'Verified AI';
  };

  const radius = 65;
  const center = 80;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (circumference * score) / 100;

  return (
    <div className="flex flex-col items-center p-6 md:p-8 bg-white rounded-3xl md:rounded-[40px] border border-slate-100 shadow-xl w-full">
      <div className={`relative flex items-center justify-center w-36 h-36 md:w-52 md:h-52 rounded-full ${getBgColor(score)} transition-colors duration-500`}>
        <div className="text-center z-10 px-2">
          <span className={`text-3xl md:text-6xl font-black tracking-tighter ${getColor(score)}`}>{score}%</span>
          <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">AI SCORE</p>
        </div>
        <svg viewBox="0 0 160 160" className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none p-2">
          <circle cx={center} cy={center} r={radius} fill="transparent" stroke="currentColor" strokeWidth="12" className="text-slate-100" />
          <circle cx={center} cy={center} r={radius} fill="transparent" stroke="currentColor" strokeWidth="12" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className={`${getColor(score)} transition-all duration-1000 ease-out`} />
        </svg>
      </div>
      <div className="mt-6 md:mt-8 text-center">
        <h3 className={`text-lg md:text-2xl font-black italic tracking-tight uppercase ${getColor(score)}`}>{getLabel(score)}</h3>
        <div className="flex items-center justify-center space-x-2 mt-2">
          <span className="text-[9px] font-black text-slate-300 uppercase">Certainty</span>
          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">±{confidence}%</span>
        </div>
      </div>
    </div>
  );
};

const Navbar: React.FC<{ session: UserSession | null; onLogout: () => void }> = ({ session, onLogout }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isGuest = session?.role === UserRole.GUEST;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 md:h-20 items-center">
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-600 rounded-lg md:rounded-xl flex items-center justify-center text-white font-black italic text-lg md:text-xl shadow-lg">H</div>
            <span className="text-xl md:text-2xl font-black tracking-tighter text-slate-900 uppercase italic">HYDROPHOBIC</span>
          </Link>

          {/* Desktop */}
          <div className="hidden lg:flex space-x-10 items-center text-sm font-bold text-slate-600">
            <Link to="/analyze" className="hover:text-indigo-600 transition-colors uppercase tracking-widest text-[11px]">Laboratories</Link>
            <Link to="/about" className="hover:text-indigo-600 transition-colors uppercase tracking-widest text-[11px]">Methodology</Link>
            <Link to="/pricing" className="hover:text-indigo-600 transition-colors uppercase tracking-widest text-[11px]">Pricing</Link>
            {session ? (
              <div className="flex items-center space-x-6 border-l border-slate-200 pl-10 relative" ref={dropdownRef}>
                <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center bg-slate-50 border border-slate-200 rounded-full py-1 pl-1.5 pr-4 space-x-3 shadow-sm hover:border-indigo-200 transition-all">
                  <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-indigo-600 font-black text-xs uppercase">
                    {session.avatarUrl ? <img src={session.avatarUrl} alt="P" className="w-full h-full object-cover" /> : isGuest ? 'G' : session.email[0]}
                  </div>
                  <div className="flex flex-col text-left">
                    <p className="text-[10px] text-slate-700 font-black truncate max-w-[120px]">{session.displayName || session.email.split('@')[0]}</p>
                    <span className={`text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded ${isGuest ? 'bg-slate-900 text-white' : 'bg-indigo-600 text-white'}`}>{isGuest ? 'GUEST' : session.plan}</span>
                  </div>
                  <svg className={`w-3 h-3 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </button>
                {isDropdownOpen && (
                  <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-slate-200 rounded-3xl shadow-2xl py-2 overflow-hidden animate-in fade-in slide-in-from-top-2">
                    {!isGuest && (
                      <>
                        <Link to="/settings" onClick={() => setIsDropdownOpen(false)} className="block px-5 py-3 text-[11px] font-black uppercase text-slate-600 hover:bg-slate-50">Settings</Link>
                        <Link to="/dashboard" onClick={() => setIsDropdownOpen(false)} className="block px-5 py-3 text-[11px] font-black uppercase text-slate-600 hover:bg-slate-50">Scan History</Link>
                      </>
                    )}
                    <button onClick={() => { onLogout(); setIsDropdownOpen(false); }} className="w-full text-left px-5 py-3 text-[11px] font-black uppercase text-rose-500 border-t border-slate-50">Sign Out</button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/auth" className="bg-slate-900 text-white px-8 py-3 rounded-xl font-black uppercase text-[11px]">Login</Link>
            )}
          </div>

          {/* Mobile Toggle */}
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="lg:hidden p-2 text-slate-600"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16m-7 6h7"} /></svg></button>
        </div>
      </div>
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-slate-100 px-4 py-6 space-y-4 shadow-xl animate-in slide-in-from-top">
          <Link to="/analyze" onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-3 bg-slate-50 rounded-xl text-xs font-black uppercase text-slate-700">Laboratories</Link>
          <Link to="/about" onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-3 bg-slate-50 rounded-xl text-xs font-black uppercase text-slate-700">Methodology</Link>
          <Link to="/pricing" onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-3 bg-slate-50 rounded-xl text-xs font-black uppercase text-slate-700">Pricing</Link>
          {session ? (
            <button onClick={() => { onLogout(); setIsMobileMenuOpen(false); }} className="w-full text-left px-4 py-3 text-xs font-black uppercase text-rose-500 bg-rose-50 rounded-xl">Sign Out</button>
          ) : (
            <Link to="/auth" onClick={() => setIsMobileMenuOpen(false)} className="block w-full text-center bg-indigo-600 text-white py-4 rounded-xl font-black uppercase text-xs">Login</Link>
          )}
        </div>
      )}
    </nav>
  );
};

const Footer: React.FC = () => (
  <footer className="bg-slate-900 text-slate-400 py-12 px-4 border-t border-slate-800">
    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
      <div className="space-y-4">
        <h3 className="text-white font-black text-2xl italic uppercase">HYDROPHOBIC</h3>
        <p className="text-sm">Ethical authorship analysis. Built for high-precision detection.</p>
      </div>
      <div>
        <h4 className="text-white font-bold mb-4 text-[10px] uppercase tracking-widest">Lab</h4>
        <ul className="space-y-2 text-sm">
          <li><Link to="/analyze">Writing Lab</Link></li>
          <li><Link to="/about">Methodology</Link></li>
        </ul>
      </div>
      <div>
        <h4 className="text-white font-bold mb-4 text-[10px] uppercase tracking-widest">Legal</h4>
        <ul className="space-y-2 text-sm">
          <li><Link to="/privacy">Privacy</Link></li>
          <li><Link to="/terms">Terms</Link></li>
        </ul>
      </div>
      <div>
        <h4 className="text-white font-bold mb-4 text-[10px] uppercase tracking-widest">Contact</h4>
        <p className="text-sm text-indigo-400 font-bold">@guranshcodes</p>
      </div>
    </div>
    <div className="mt-12 text-center text-[10px] font-black uppercase tracking-widest text-slate-600 border-t border-slate-800 pt-8">
      &copy; {new Date().getFullYear()} HYDROPHOBIC INTELLIGENCE.
    </div>
  </footer>
);

// --- PAGE COMPONENTS (Defined within App.tsx to avoid multiple files) ---

const HomeView: React.FC = () => (
  <div className="space-y-12 md:space-y-24 py-10 md:py-20">
    <section className="max-w-7xl mx-auto px-4 text-center">
      <div className="inline-block px-4 py-1 mb-6 text-[10px] font-black tracking-widest text-rose-600 uppercase bg-rose-50 rounded-full border border-rose-100">Next-Gen AI Detection</div>
      <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-900 mb-6 tracking-tight leading-[1.1]">Unmask AI.<br/><span className="text-indigo-600">Reveal Truth.</span></h1>
      <p className="text-base md:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">Hydrophobic is a high-precision forensic detector identifying machine-generated text and code signatures.</p>
      <div className="flex flex-col sm:flex-row justify-center gap-4 px-4">
        <Link to="/analyze" className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:scale-105 transition-transform">Start Detecting</Link>
        <Link to="/about" className="bg-white text-slate-900 px-8 py-4 rounded-xl font-bold text-lg border border-slate-200 hover:bg-slate-50 transition">The Methodology</Link>
      </div>
    </section>
  </div>
);

const AnalyzeView: React.FC<{ session: UserSession | null }> = ({ session }) => {
  const [content, setContent] = useState('');
  const [labMode, setLabMode] = useState<'IDLE' | 'WRITING' | 'CODE'>('IDLE');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [viewMode, setViewMode] = useState<'input' | 'heatmap'>('input');
  const [activeTab, setActiveTab] = useState<'detect' | 'quality' | 'grade'>('detect');
  const [analysisCount, setAnalysisCount] = useState(0);

  const isCode = labMode === 'CODE';
  const isPro = session?.plan === PlanType.PRO;
  const isGuest = session?.role === UserRole.GUEST;
  const FREE_LIMIT = isGuest ? 1 : 3;
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  const handleAnalyze = async () => {
    if (!content.trim() || isAnalyzing) return;
    if (!isPro && analysisCount >= FREE_LIMIT) { alert("Limit reached! Upgrade for more scans."); return; }

    setIsAnalyzing(true);
    setResult(null);
    try {
      const [stat, struct, gemini] = await Promise.all([
        calculateStatisticalSignal(content),
        calculateStructuralSignal(content, isCode),
        analyzeWithGemini(content, isCode)
      ]);
      const { finalScore, confidence } = combineSignals(stat.score, struct.score, gemini.score);
      setResult({ id: 'res_'+Date.now(), timestamp: new Date().toISOString(), overallScore: finalScore, confidenceRange: confidence, statisticalScore: stat.score, structuralScore: struct.score, geminiScore: gemini.score, explanation: gemini.explanation, highlights: gemini.segments, aiWords: gemini.aiWords, isCode, qualityIssues: gemini.qualityIssues, grade: gemini.grade });
      setAnalysisCount(prev => prev + 1);
      setViewMode('heatmap');
    } catch (e) { console.error(e); } finally { setIsAnalyzing(false); }
  };

  const handleFix = async () => {
    if (!content || isFixing) return;
    setIsFixing(true);
    try {
      const fixed = await fixContentWithGemini(content, isCode);
      setContent(fixed);
      setViewMode('input');
      setResult(null);
    } catch (e) { console.error(e); } finally { setIsFixing(false); }
  };

  if (labMode === 'IDLE') return (
    <div className="max-w-5xl mx-auto px-4 py-12 md:py-24 text-center">
      <h1 className="text-4xl md:text-6xl font-black text-slate-900 mb-8 uppercase italic tracking-tighter">SELECT YOUR <span className="text-indigo-600">LAB</span></h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
        <button onClick={() => setLabMode('WRITING')} className="p-8 md:p-12 bg-white border-2 border-slate-200 rounded-[32px] hover:border-indigo-400 transition-all text-left">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-6"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5" /></svg></div>
          <h3 className="text-2xl font-black uppercase italic">Writing Lab</h3>
          <p className="text-slate-500 font-medium">Scan prose for machine structural uniformity.</p>
        </button>
        <button onClick={() => setLabMode('CODE')} className="p-8 md:p-12 bg-slate-900 border-2 border-slate-800 rounded-[32px] hover:border-indigo-500 transition-all text-left">
          <div className="w-12 h-12 bg-white/10 text-white rounded-xl flex items-center justify-center mb-6"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4" /></svg></div>
          <h3 className="text-2xl font-black text-white uppercase italic">Code Lab</h3>
          <p className="text-slate-400 font-medium">Decompile logical patterns for neural signatures.</p>
        </button>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen pb-24 ${isCode ? 'bg-[#0b1121]' : 'bg-slate-50'}`}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
          <button onClick={() => { setLabMode('IDLE'); setResult(null); setContent(''); }} className={`p-3 rounded-xl border ${isCode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-400'}`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></button>
          <div className="flex bg-white/5 backdrop-blur-md p-1 rounded-xl border border-white/10">
            <button onClick={() => setViewMode('input')} className={`px-6 py-2 rounded-lg text-xs font-bold ${viewMode === 'input' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Editor</button>
            {result && <button onClick={() => setViewMode('heatmap')} className={`px-6 py-2 rounded-lg text-xs font-bold ${viewMode === 'heatmap' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Forensic Map</button>}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-4">
            <div className={`rounded-[32px] overflow-hidden shadow-2xl h-[450px] md:h-[650px] flex flex-col border ${isCode ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-slate-100'}`}>
              <div className="p-6 border-b border-slate-800/20 flex justify-between items-center text-[10px] font-black uppercase text-slate-400 tracking-widest">
                <span>Author Buffer</span>
                <span>{wordCount} Words</span>
              </div>
              <div className="flex-grow overflow-y-auto">
                {viewMode === 'input' ? (
                  <textarea className={`w-full h-full p-8 md:p-12 focus:outline-none resize-none bg-transparent ${isCode ? 'font-mono text-indigo-100' : 'font-serif text-slate-700 text-lg'}`} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Paste content for forensic analysis..." />
                ) : (
                  <div className="p-8 md:p-12 leading-relaxed font-serif text-lg md:text-xl">
                    {result?.highlights.map((seg, i) => <span key={i} className={`inline px-0.5 ${seg.score > 0.6 ? 'bg-rose-500/10' : ''}`}>{seg.text} </span>)}
                  </div>
                )}
              </div>
            </div>
            <button onClick={handleAnalyze} disabled={isAnalyzing || !content.trim()} className="w-full py-6 md:py-8 bg-slate-900 text-white rounded-[24px] font-black text-xl hover:bg-indigo-600 transition-all shadow-xl">{isAnalyzing ? 'PROBING...' : 'RUN FORENSIC SCAN'}</button>
          </div>
          <div className="lg:col-span-4 space-y-6">
            {result ? (
              <div className="animate-in fade-in slide-in-from-right-4">
                <div className={`p-1 rounded-xl border mb-6 flex ${isCode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                  {(['detect', 'quality', 'grade'] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-3 rounded-lg text-[9px] font-black uppercase ${activeTab === tab ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>{tab}</button>
                  ))}
                </div>
                {activeTab === 'detect' && <ScoreGauge score={result.overallScore} confidence={result.confidenceRange} />}
                {activeTab === 'quality' && (
                  <div className={`p-6 rounded-3xl border shadow-xl ${isCode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                      {result.qualityIssues.map((issue, i) => (
                        <div key={i} className="p-4 rounded-xl border border-slate-100 bg-slate-50">
                          <p className="text-[10px] font-black uppercase text-indigo-600 mb-1">{issue.type}</p>
                          <p className="text-xs font-bold text-slate-800 mb-1">{issue.suggestion}</p>
                          <p className="text-[10px] text-slate-400">{issue.reason}</p>
                        </div>
                      ))}
                    </div>
                    {result.qualityIssues.length > 0 && <button onClick={handleFix} disabled={isFixing} className="w-full mt-6 py-4 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg">{isFixing ? 'Fixing...' : 'Auto-Fix Content'}</button>}
                  </div>
                )}
                {activeTab === 'grade' && (
                  <div className={`p-8 rounded-3xl border shadow-xl text-center space-y-6 ${isCode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                    <div className="text-8xl font-black italic tracking-tighter text-indigo-600">{result.grade.primaryGrade}</div>
                    <div className="space-y-3 text-left pt-6 border-t">
                      {result.grade.breakdown.map((item, i) => (
                        <div key={i} className="flex justify-between text-[10px] font-black uppercase text-slate-400"><span>{item.label}</span><span className="text-indigo-600">{item.score}/10</span></div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : <div className="p-12 text-center border-2 border-dashed rounded-[32px] text-slate-400 text-[10px] font-black uppercase tracking-widest">Lab Standby</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

const AuthView: React.FC<{ onLogin: (s: UserSession) => void }> = ({ onLogin }) => {
  const navigate = useNavigate();
  const handleGuest = () => {
    onLogin({ id: 'guest_'+Math.random().toString(36).substr(2,4), email: 'guest@hydrophobic.ai', role: UserRole.GUEST, plan: PlanType.FREE, authSource: 'email', displayName: 'Anonymous Guest' });
    navigate('/analyze');
  };
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#f8fafc]">
      <div className="max-w-md w-full bg-white border-2 border-slate-200 p-8 md:p-12 rounded-[48px] shadow-2xl text-center space-y-8">
        <h1 className="text-4xl font-black uppercase italic tracking-tighter">THE <span className="text-indigo-600">VAULT</span></h1>
        <div className="space-y-4">
          <button className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest">Login with Email</button>
          <div className="relative"><span className="bg-white px-4 text-[10px] font-black text-slate-300 uppercase relative z-10">OR</span><div className="absolute top-1/2 w-full h-px bg-slate-100 left-0"></div></div>
          <button onClick={handleGuest} className="w-full border-2 border-slate-100 text-slate-400 py-4 rounded-2xl font-black uppercase text-[10px] hover:bg-slate-50 hover:text-indigo-600 transition-all">Continue as Guest</button>
        </div>
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---

const App: React.FC = () => {
  const [session, setSession] = useState<UserSession | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('zana_session');
    if (saved) setSession(JSON.parse(saved));
  }, []);

  const handleLogin = (s: UserSession) => {
    setSession(s);
    localStorage.setItem('zana_session', JSON.stringify(s));
  };

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem('zana_session');
  };

  return (
    <Router>
      <div className="min-h-screen flex flex-col selection:bg-indigo-100">
        <Navbar session={session} onLogout={handleLogout} />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<HomeView />} />
            <Route path="/auth" element={<AuthView onLogin={handleLogin} />} />
            <Route path="/analyze" element={session ? <AnalyzeView session={session} /> : <Navigate to="/auth" />} />
            <Route path="/about" element={<div className="p-12 max-w-4xl mx-auto"><h1 className="text-4xl font-black mb-8">Methodology</h1><p className="text-lg text-slate-600 leading-relaxed">Hydrophobic uses statistical variance and neural anchors to detect machine patterns.</p></div>} />
            <Route path="/pricing" element={<div className="p-12 text-center"><h1 className="text-4xl font-black mb-8 uppercase italic">Pricing</h1><p className="text-slate-600 font-bold">Pro starts at $9.99/mo</p></div>} />
            <Route path="/settings" element={<div className="p-12 text-center"><h1 className="text-4xl font-black mb-4 uppercase italic">Settings</h1><p className="text-slate-500">Feature locked for guest users.</p></div>} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
};

export default App;
