import { Shield, ExternalLink, CheckCircle, Lock, Cpu, Database } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/5 bg-[#050507] text-slate-400 text-xs">
      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-6 pt-16 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20">
                <Shield size={16} strokeWidth={2.8} />
              </div>
              <span className="font-extrabold text-base tracking-wider text-white">AGENTSHIELD AI</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              An enterprise security layer that interposes between autonomous AI agents and external tools, stopping malicious prompts, unauthorized database mutations, and rogue actions before execution.
            </p>
            <div className="flex items-center gap-4 text-[11px] font-mono text-slate-500">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                All Systems Operational
              </span>
              <span>•</span>
              <span>NVIDIA Nemotron 70B</span>
              <span>•</span>
              <span>Oracle XE Vault</span>
            </div>
          </div>

          {/* Column 1: Platform */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs font-mono uppercase tracking-wider text-white">
              Platform
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/scan" className="hover:text-amber-400 transition-colors">
                  Threat Scanner
                </Link>
              </li>
              <li>
                <Link to="/sandbox" className="hover:text-amber-400 transition-colors">
                  Agent Sandbox
                </Link>
              </li>
              <li>
                <Link to="/actions" className="hover:text-amber-400 transition-colors">
                  Action Interceptor
                </Link>
              </li>
              <li>
                <Link to="/approvals" className="hover:text-amber-400 transition-colors">
                  Human Approvals
                </Link>
              </li>
              <li>
                <Link to="/history" className="hover:text-amber-400 transition-colors">
                  Audit History
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Developers */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs font-mono uppercase tracking-wider text-white">
              Developers
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/integration" className="hover:text-amber-400 transition-colors">
                  Python SDK (LangChain)
                </Link>
              </li>
              <li>
                <Link to="/integration" className="hover:text-amber-400 transition-colors">
                  TypeScript Client
                </Link>
              </li>
              <li>
                <Link to="/integration" className="hover:text-amber-400 transition-colors">
                  API Key Gateway
                </Link>
              </li>
              <li>
                <Link to="/paper" className="hover:text-amber-400 transition-colors">
                  Research Showcase
                </Link>
              </li>
              <li>
                <Link to="/evaluation" className="hover:text-amber-400 transition-colors">
                  Benchmark Suite
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Compliance & Security */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs font-mono uppercase tracking-wider text-white">
              Security
            </h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-1.5 text-slate-300">
                <CheckCircle size={13} className="text-emerald-400 shrink-0" />
                <span>NIST AI 600-1 Aligned</span>
              </li>
              <li className="flex items-center gap-1.5 text-slate-300">
                <CheckCircle size={13} className="text-emerald-400 shrink-0" />
                <span>DPDP Act 2023 Compliant</span>
              </li>
              <li className="flex items-center gap-1.5 text-slate-300">
                <CheckCircle size={13} className="text-emerald-400 shrink-0" />
                <span>SHA-256 Hash Chaining</span>
              </li>
              <li className="flex items-center gap-1.5 text-slate-300">
                <CheckCircle size={13} className="text-emerald-400 shrink-0" />
                <span>Oracle XE Vault Storage</span>
              </li>
              <li className="flex items-center gap-1.5 text-slate-300">
                <CheckCircle size={13} className="text-emerald-400 shrink-0" />
                <span>Zero Retention Gateway</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Sub-footer Bar */}
      <div className="border-t border-white/5 py-6 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div>
            © {new Date().getFullYear()} AgentShield AI. All rights reserved. Enterprise AI Protection Gateway.
          </div>
          <div className="flex items-center gap-6">
            <span className="hover:text-slate-300 transition-colors cursor-pointer">
              Privacy Policy
            </span>
            <span className="hover:text-slate-300 transition-colors cursor-pointer">
              Terms of Service
            </span>
            <span className="hover:text-slate-300 transition-colors cursor-pointer">
              Security Advisories
            </span>
            <span className="text-amber-400/80 font-mono">v1.0.0-PROD</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
