import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from './Logo';

const SplashScreen = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const hasShown = sessionStorage.getItem('wc_splash_shown');
    if (hasShown) {
      setIsVisible(false);
      if (onComplete) onComplete();
      return;
    }

    // The splash sequence inside Logo.jsx takes about 4.2 seconds to complete.
    // Give it 4.5 seconds total before triggering the exit transition into the app.
    const timer = setTimeout(() => {
      setIsVisible(false);
      sessionStorage.setItem('wc_splash_shown', 'true');
      if (onComplete) {
        setTimeout(onComplete, 600);
      }
    }, 4500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.6, ease: 'easeInOut' } }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0A0F1C] text-white"
        >
          <div className="relative flex flex-col items-center">
            {/* Minimal ambient glow for enterprise feel */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.15, transition: { duration: 2 } }}
              className="absolute w-[500px] h-[500px] rounded-full bg-[#1E63FF] blur-[100px] pointer-events-none"
            />

            {/* The Animated Logo Component handling the strict step-by-step sequence */}
            <div className="relative z-10 flex flex-col items-center">
              <Logo
                variant="splash"
                theme="dark"
                iconClassName="w-32 h-32"
                textClassName="text-5xl font-black"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
