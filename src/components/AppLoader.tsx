import { useEffect, useState } from 'react';
import { Logo } from './atoms';

/**
 * Full-screen splash shown on first app entry until assets finish loading.
 *
 * The bar creeps toward ~90% while resources download, then completes and
 * fades out when the window `load` event fires (all images/fonts/media
 * requested so far are ready). A hard timeout guarantees it never sticks —
 * e.g. if the heavy showreel keeps buffering, we reveal the app anyway and
 * let the muted video finish loading in the background.
 */
const MAX_WAIT_MS = 6000;

const AppLoader = () => {
  const [progress, setProgress] = useState(8);
  const [fadingOut, setFadingOut] = useState(false);
  const [unmounted, setUnmounted] = useState(false);

  useEffect(() => {
    let raf = 0;
    const creep = () => {
      setProgress((p) => (p < 90 ? p + (90 - p) * 0.03 : p));
      raf = requestAnimationFrame(creep);
    };
    raf = requestAnimationFrame(creep);

    let fadeTimer = 0;
    let removeTimer = 0;
    const finish = () => {
      cancelAnimationFrame(raf);
      setProgress(100);
      fadeTimer = window.setTimeout(() => setFadingOut(true), 300);
      removeTimer = window.setTimeout(() => setUnmounted(true), 850);
    };

    let maxTimer = 0;
    if (document.readyState === 'complete') {
      fadeTimer = window.setTimeout(finish, 450);
    } else {
      window.addEventListener('load', finish, { once: true });
      maxTimer = window.setTimeout(finish, MAX_WAIT_MS);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('load', finish);
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
      clearTimeout(maxTimer);
    };
  }, []);

  if (unmounted) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6 bg-[#FBFAF8] dark:bg-[#100E0C] transition-opacity duration-500 ${
        fadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      role="status"
      aria-live="polite"
      aria-label="Đang tải ứng dụng"
    >
      <div className="animate-pulse">
        <Logo size={64} />
      </div>
      <div className="w-48 h-1.5 rounded-full overflow-hidden bg-[#EAE7E1] dark:bg-[#2A2723]">
        <div
          className="h-full rounded-full transition-[width] duration-200 ease-out"
          style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #f59e0b 0%, #22d3ee 100%)',
          }}
        />
      </div>
      <p className="text-[11px] font-medium uppercase tracking-[2px] text-[#8A8680] dark:text-[#9A958D]">
        Đang tải…
      </p>
    </div>
  );
};

export default AppLoader;
