import { useRef, useEffect } from 'react';

export default function RotatingParticleSphere({
  size = 460,
  particleCount = 650,
  color = 'amber',
  showRings = true,
  interactive = true,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = canvas.offsetWidth * (window.devicePixelRatio || 1) || size);
    let height = (canvas.height = canvas.offsetHeight * (window.devicePixelRatio || 1) || size);

    const radius = Math.min(width, height) * 0.36;

    // Generate uniformly distributed points on a sphere using Fibonacci algorithm
    const points = [];
    const phi = Math.PI * (3 - Math.sqrt(5)); // Golden ratio angle

    for (let i = 0; i < particleCount; i++) {
      const y = 1 - (i / (particleCount - 1)) * 2;
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = phi * i;

      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;

      // Natural spherical jitter
      const noise = 0.94 + Math.random() * 0.12;

      points.push({
        x: x * radius * noise,
        y: y * radius * noise,
        z: z * radius * noise,
        baseSize: Math.random() * 1.8 + 1.2,
      });
    }

    // Generate 2 tilted orbital rings
    const ringParticles = [];
    const ringCount = 120;
    const ringRadius1 = radius * 1.35;
    const ringRadius2 = radius * 1.55;

    for (let i = 0; i < ringCount; i++) {
      const theta = (i / ringCount) * Math.PI * 2;
      ringParticles.push({
        x: Math.cos(theta) * ringRadius1,
        y: Math.sin(theta) * ringRadius1 * 0.28,
        z: Math.sin(theta) * ringRadius1 * 0.96,
        size: Math.random() * 1.4 + 1,
        ringId: 1,
      });
    }

    for (let i = 0; i < ringCount; i++) {
      const theta = (i / ringCount) * Math.PI * 2;
      ringParticles.push({
        x: Math.cos(theta) * ringRadius2 * 0.95,
        y: -Math.sin(theta) * ringRadius2 * 0.35,
        z: Math.sin(theta) * ringRadius2 * 0.9,
        size: Math.random() * 1.3 + 0.9,
        ringId: 2,
      });
    }

    let angleY = 0;
    let angleX = 0.28;
    let mouseX = 0;
    let mouseY = 0;
    const baseSpeedY = 0.007;

    const handleMouseMove = (e) => {
      if (!interactive) return;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      mouseX = x * 0.35;
      mouseY = y * 0.35;
    };

    const handleTouchMove = (e) => {
      if (!interactive || e.touches.length === 0) return;
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      mouseX = ((touch.clientX - rect.left) / rect.width - 0.5) * 0.35;
      mouseY = ((touch.clientY - rect.top) / rect.height - 0.5) * 0.35;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Smooth rotation
      angleY += baseSpeedY + mouseX * 0.02;
      angleX = 0.28 + mouseY * 0.35;

      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);
      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);

      const centerX = width / 2;
      const centerY = height / 2;

      // Top warm golden radiant light flare
      const topFlare = ctx.createRadialGradient(
        centerX,
        centerY - radius * 0.85,
        15,
        centerX,
        centerY - radius * 0.85,
        radius * 1.6
      );
      topFlare.addColorStop(0, 'rgba(251, 191, 36, 0.24)');
      topFlare.addColorStop(0.4, 'rgba(245, 158, 11, 0.09)');
      topFlare.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = topFlare;
      ctx.fillRect(0, 0, width, height);

      // Central core energy glow
      const coreFlare = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, radius * 0.7);
      coreFlare.addColorStop(0, 'rgba(251, 191, 36, 0.12)');
      coreFlare.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = coreFlare;
      ctx.fillRect(0, 0, width, height);

      const fov = radius * 3.2;
      const projected = [];

      // Project Sphere Points
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const x1 = p.x * cosY - p.z * sinY;
        const z1 = p.z * cosY + p.x * sinY;
        const y2 = p.y * cosX - z1 * sinX;
        const z2 = z1 * cosX + p.y * sinX;

        const scale = fov / (fov + z2);
        projected.push({
          x: centerX + x1 * scale,
          y: centerY + y2 * scale,
          z: z2,
          scale,
          size: p.baseSize,
          isRing: false,
        });
      }

      // Project Orbital Rings
      if (showRings) {
        for (let i = 0; i < ringParticles.length; i++) {
          const rp = ringParticles[i];
          const x1 = rp.x * cosY - rp.z * sinY;
          const z1 = rp.z * cosY + rp.x * sinY;
          const y2 = rp.y * cosX - z1 * sinX;
          const z2 = z1 * cosX + rp.y * sinX;

          const scale = fov / (fov + z2);
          projected.push({
            x: centerX + x1 * scale,
            y: centerY + y2 * scale,
            z: z2,
            scale,
            size: rp.size,
            isRing: true,
            ringId: rp.ringId,
          });
        }
      }

      // Sort all particles back-to-front
      projected.sort((a, b) => b.z - a.z);

      // Render sorted points
      for (let i = 0; i < projected.length; i++) {
        const pt = projected[i];
        const depth = (pt.z + radius * 1.5) / (radius * 3); // 0 (front) to 1 (back)
        const alpha = Math.max(0.1, Math.min(1, 1 - depth * 0.78));
        const renderedSize = Math.max(0.8, pt.size * pt.scale * (1.35 - depth * 0.55));

        if (pt.isRing) {
          // Ring particles: cyan/amber dual orbital threads
          ctx.fillStyle =
            pt.ringId === 1
              ? `rgba(251, 191, 36, ${alpha * 0.8})`
              : `rgba(253, 230, 138, ${alpha * 0.65})`;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, renderedSize * 0.85, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Sphere particles: warm golden/white gradient based on depth
          if (depth < 0.3) {
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          } else if (depth < 0.6) {
            ctx.fillStyle = `rgba(251, 191, 36, ${alpha})`;
          } else {
            ctx.fillStyle = `rgba(245, 158, 11, ${alpha * 0.75})`;
          }

          ctx.beginPath();
          ctx.arc(pt.x, pt.y, renderedSize, 0, Math.PI * 2);
          ctx.fill();

          // Subtle corona glow for foreground points
          if (depth < 0.22) {
            ctx.fillStyle = `rgba(251, 191, 36, ${alpha * 0.3})`;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, renderedSize * 2.4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      width = canvas.width = canvas.offsetWidth * (window.devicePixelRatio || 1) || size;
      height = canvas.height = canvas.offsetHeight * (window.devicePixelRatio || 1) || size;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('resize', handleResize);
    };
  }, [particleCount, size, color, showRings, interactive]);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden select-none pointer-events-none">
      <canvas
        ref={canvasRef}
        className="w-full h-full block max-w-full max-h-full"
        style={{ touchAction: 'none' }}
      />
    </div>
  );
}
