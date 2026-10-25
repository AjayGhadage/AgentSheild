import { useRef, useEffect, useState } from 'react';

export default function CyberCanvasCard({
  title,
  subtitle,
  category,
  badge,
  icon: Icon,
  variant = 'cyan', // 'cyan', 'amber', 'emerald', 'violet'
  onClick,
}) {
  const canvasRef = useRef(null);
  const cardRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });

  // Color schemes for each variant
  const colors = {
    cyan: {
      primary: '#06b6d4',
      glow: 'rgba(6, 182, 212, 0.4)',
      accent: '#22d3ee',
      bgGlow: 'from-cyan-500/10 via-transparent to-transparent',
      borderHover: 'hover:border-cyan-500/60',
      tag: 'text-cyan-400 bg-cyan-950/60 border-cyan-800/80',
    },
    amber: {
      primary: '#f59e0b',
      glow: 'rgba(245, 158, 11, 0.4)',
      accent: '#fbbf24',
      bgGlow: 'from-amber-500/10 via-transparent to-transparent',
      borderHover: 'hover:border-amber-500/60',
      tag: 'text-amber-400 bg-amber-950/60 border-amber-800/80',
    },
    emerald: {
      primary: '#10b981',
      glow: 'rgba(16, 185, 129, 0.4)',
      accent: '#34d399',
      bgGlow: 'from-emerald-500/10 via-transparent to-transparent',
      borderHover: 'hover:border-emerald-500/60',
      tag: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/80',
    },
    violet: {
      primary: '#8b5cf6',
      glow: 'rgba(139, 92, 246, 0.4)',
      accent: '#a78bfa',
      bgGlow: 'from-violet-500/10 via-transparent to-transparent',
      borderHover: 'hover:border-violet-500/60',
      tag: 'text-violet-400 bg-violet-950/60 border-violet-800/80',
    },
  }[variant] || colors.cyan;

  // Handle 3D Tilt on mouse move
  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -8;
    const rotateY = ((x - centerX) / centerX) * 8;
    setTilt({ rotateX, rotateY });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ rotateX: 0, rotateY: 0 });
  };

  // Canvas interactive cyber video / animation engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    // Nodes and connections
    const nodeCount = 14;
    const nodes = Array.from({ length: nodeCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: Math.random() * 2 + 1.5,
    }));

    let scanY = 0;
    let scanDirection = 1;
    let wavePhase = 0;
    let pulseRadius = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Draw subtle digital coordinate grid
      ctx.strokeStyle = isHovered ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      const gridSize = 24;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 2. Draw active nodes and interconnecting telemetry lines
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        const n1 = nodes[i];

        // Move nodes (faster if hovered)
        const speedMultiplier = isHovered ? 2.5 : 0.6;
        n1.x += n1.vx * speedMultiplier;
        n1.y += n1.vy * speedMultiplier;

        // Bounce on boundaries
        if (n1.x <= 0 || n1.x >= width) n1.vx *= -1;
        if (n1.y <= 0 || n1.y >= height) n1.vy *= -1;

        // Connect nearby nodes
        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dist = Math.hypot(n1.x - n2.x, n1.y - n2.y);
          if (dist < 75) {
            const alpha = (1 - dist / 75) * (isHovered ? 0.6 : 0.2);
            ctx.strokeStyle = isHovered ? colors.glow : `rgba(255, 255, 255, ${alpha * 0.4})`;
            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.stroke();
          }
        }

        // Draw node circle
        ctx.fillStyle = isHovered ? colors.accent : 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(n1.x, n1.y, n1.radius * (isHovered ? 1.4 : 1), 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. IF HOVERED: Activate "VIDEO PLAYING" Cyber Hologram Effect!
      if (isHovered) {
        // Holographic Scanning Laser
        scanY += 2.8 * scanDirection;
        if (scanY > height) {
          scanY = height;
          scanDirection = -1;
        } else if (scanY < 0) {
          scanY = 0;
          scanDirection = 1;
        }

        // Gradient laser beam
        const laserGrad = ctx.createLinearGradient(0, scanY - 20, 0, scanY + 20);
        laserGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        laserGrad.addColorStop(0.5, colors.glow);
        laserGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = laserGrad;
        ctx.fillRect(0, scanY - 20, width, 40);

        // Core bright laser line
        ctx.strokeStyle = colors.accent;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, scanY);
        ctx.lineTo(width, scanY);
        ctx.stroke();

        // Oscilloscope Waveform at the bottom
        wavePhase += 0.08;
        ctx.strokeStyle = colors.primary;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x < width; x += 4) {
          const y = height - 16 + Math.sin(x * 0.06 + wavePhase) * 7;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Radar Radar Sweep Ring in Center
        pulseRadius = (pulseRadius + 1.2) % 60;
        ctx.strokeStyle = `rgba(255, 255, 255, ${1 - pulseRadius / 60})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, pulseRadius, 0, Math.PI * 2);
        ctx.stroke();

        // "LIVE STREAM" Indicator
        ctx.fillStyle = colors.accent;
        ctx.font = '9px monospace';
        ctx.fillText('REC // SCAN ACTIVE', 10, 16);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [isHovered, colors]);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{
        transform: `perspective(1000px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) ${
          isHovered ? 'scale3d(1.02, 1.02, 1.02)' : 'scale3d(1, 1, 1)'
        }`,
        transition: isHovered
          ? 'transform 0.1s ease-out, box-shadow 0.2s ease-out'
          : 'transform 0.5s ease-out, box-shadow 0.5s ease-out',
      }}
      className={`group relative rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-slate-800/90 overflow-hidden cursor-pointer shadow-xl transition-all duration-300 ${colors.borderHover} ${
        isHovered ? 'shadow-2xl shadow-cyan-950/40 ring-1 ring-cyan-500/30' : ''
      }`}
    >
      {/* Top Interactive Canvas Display (Simulates futuristic cyber video loop) */}
      <div className="relative h-44 w-full bg-slate-950/80 overflow-hidden border-b border-slate-800/60">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

        {/* Ambient Top Glow */}
        <div
          className={`absolute inset-0 bg-gradient-to-t ${colors.bgGlow} pointer-events-none transition-opacity duration-300 ${
            isHovered ? 'opacity-100' : 'opacity-40'
          }`}
        />

        {/* Badge & Icon Overlay */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border backdrop-blur-md ${colors.tag}`}
          >
            {category || 'AGENT DEFENSE'}
          </span>
          {badge && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900/80 text-slate-300 border border-slate-700/80 backdrop-blur-md">
              {badge}
            </span>
          )}
        </div>

        {/* Center Hologram Icon */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className={`w-12 h-12 rounded-2xl bg-slate-900/80 border border-slate-700/80 flex items-center justify-center backdrop-blur-md shadow-lg transition-transform duration-300 ${
              isHovered ? 'scale-110 border-cyan-400/80 shadow-cyan-500/30' : ''
            }`}
          >
            {Icon && <Icon size={22} className={isHovered ? 'text-cyan-400' : 'text-slate-300'} />}
          </div>
        </div>

        {/* Live Hover Tag */}
        <div
          className={`absolute bottom-2.5 right-3 px-2 py-0.5 rounded-md text-[9px] font-mono font-semibold transition-opacity duration-200 ${
            isHovered ? 'opacity-100 bg-black/70 text-cyan-300 border border-cyan-500/40' : 'opacity-0'
          }`}
        >
          ▶ VIDEO SIMULATION ON HOVER
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 relative z-10 space-y-2">
        <h3 className="font-extrabold text-base text-white tracking-tight group-hover:text-cyan-300 transition-colors">
          {title}
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
          {subtitle}
        </p>

        <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs font-semibold text-slate-400 group-hover:text-slate-200">
          <span>Launch Verification</span>
          <span className="text-cyan-400 group-hover:translate-x-1 transition-transform">→</span>
        </div>
      </div>
    </div>
  );
}
