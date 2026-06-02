import React from 'react';
import { motion } from 'framer-motion';

const Logo = ({
  variant = 'default', // 'icon-only', 'default', 'tagline', 'splash'
  className = '',
  iconClassName = 'w-8 h-8',
  textClassName = 'text-xl',
  theme = 'light' // 'light', 'dark'
}) => {
  const isSplash = variant === 'splash';

  // Dynamic theme colors
  const isDark = theme === 'dark';
  const colors = {
    navyGradStart: isDark ? '#1E3A8A' : '#0B1F3B',
    navyGradEnd: isDark ? '#2563EB' : '#1B2E4A',
    blueGradStart: isDark ? '#3B82F6' : '#1E63FF',
    blueGradEnd: isDark ? '#60A5FA' : '#00A3FF',
    leftInner: isDark ? '#1E40AF' : '#081528',
    rightInner: isDark ? '#2563EB' : '#0070F0',
    centerShadow: isDark ? '#172554' : '#040b17',
    briefcase: isDark ? '#F8FAFC' : '#0B1F3B',
    textWork: isDark ? '#F8FAFC' : '#0B1F3B',
    textConnect: isDark ? '#3B82F6' : '#1E63FF'
  };

  // Animation Sequence Variants (Only active when variant === 'splash')
  const leftFigureVars = {
    hidden: { opacity: 0, x: -30, y: -20 },
    visible: { opacity: 1, x: 0, y: 0, transition: { duration: 0.6, ease: 'easeOut', delay: 0.2 } }
  };

  const rightFigureVars = {
    hidden: { opacity: 0, x: 30, y: -20 },
    visible: { opacity: 1, x: 0, y: 0, transition: { duration: 0.6, ease: 'easeOut', delay: 0.8 } }
  };

  const handshakeVars = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.4, ease: 'easeOut', delay: 1.4 } }
  };

  const briefcaseVars = {
    hidden: { opacity: 0, scale: 0.5, y: -10 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.6, ease: 'backOut', delay: 1.8 } }
  };

  const pulseVars = {
    hidden: { scale: 1 },
    visible: {
      scale: [1, 1.03, 1],
      transition: { duration: 0.4, ease: 'easeInOut', delay: 2.5 }
    }
  };

  const textVars = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut', delay: 3.0 } }
  };

  const taglineVars = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.8, ease: 'easeOut', delay: 3.4 } }
  };

  const G = isSplash ? motion.g : 'g';
  const Path = isSplash ? motion.path : 'path';
  const Circle = isSplash ? motion.circle : 'circle';

  const renderEmblem = () => (
    <motion.svg
      viewBox="0 0 200 200"
      className={`${iconClassName} select-none overflow-visible`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      variants={isSplash ? pulseVars : {}}
      initial={isSplash ? "hidden" : false}
      animate={isSplash ? "visible" : false}
    >
      <defs>
        <linearGradient id="navy-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colors.navyGradStart} />
          <stop offset="100%" stopColor={colors.navyGradEnd} />
        </linearGradient>
        <linearGradient id="blue-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors.blueGradStart} />
          <stop offset="100%" stopColor={colors.blueGradEnd} />
        </linearGradient>
      </defs>

      {/* Step 2: Left Professional Figure */}
      <G variants={isSplash ? leftFigureVars : {}}>
        <Path d="M 25 50 L 65 50 L 100 150 L 60 170 Z" fill="url(#navy-grad)" className="transition-colors duration-300" />
        <Path d="M 60 170 L 100 150 L 85 90 L 45 110 Z" fill={colors.leftInner} className="transition-colors duration-300" />
      </G>

      {/* Step 3: Right Professional Figure */}
      <G variants={isSplash ? rightFigureVars : {}}>
        <Path d="M 175 50 L 135 50 L 100 150 L 140 170 Z" fill="url(#blue-grad)" className="transition-colors duration-300" />
        <Path d="M 140 170 L 100 150 L 115 90 L 155 110 Z" fill={colors.rightInner} className="transition-colors duration-300" />
      </G>

      {/* Step 4: Handshake (Center overlap connection) */}
      <G variants={isSplash ? handshakeVars : {}}>
        <Path d="M 95 145 L 105 145 L 100 158 Z" fill={colors.centerShadow} className="transition-colors duration-300" />
      </G>

      {/* Step 5: Briefcase (Embedded in Center - forms tie and head) */}
      <G variants={isSplash ? briefcaseVars : {}}>
        <Circle cx="100" cy="65" r="14" fill={colors.briefcase} className="transition-colors duration-300" />
        <Path d="M 92 90 L 108 90 L 105 102 L 95 102 Z" fill={colors.briefcase} className="transition-colors duration-300" />
        <Path d="M 95 102 L 105 102 L 108 135 L 100 145 L 92 135 Z" fill={colors.briefcase} className="transition-colors duration-300" />
      </G>
    </motion.svg>
  );

  if (variant === 'icon-only') {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        {renderEmblem()}
      </div>
    );
  }

  const TextWrapper = isSplash ? motion.div : 'div';

  return (
    <div className={`inline-flex flex-col items-center md:items-start ${className}`}>
      <div className={`flex items-center gap-2.5 ${isSplash ? 'flex-col gap-6' : ''}`}>
        {renderEmblem()}
        <TextWrapper
          variants={isSplash ? textVars : {}}
          initial={isSplash ? "hidden" : false}
          animate={isSplash ? "visible" : false}
          className={`font-extrabold tracking-tight select-none leading-none ${textClassName}`}
        >
          <span style={{ color: colors.textWork }} className="transition-colors duration-300">Work</span>
          <span style={{ color: colors.textConnect }} className="transition-colors duration-300">Connect</span>
        </TextWrapper>
      </div>

      {(variant === 'tagline' || variant === 'splash') && (
        <TextWrapper
          variants={isSplash ? taglineVars : {}}
          initial={isSplash ? "hidden" : false}
          animate={isSplash ? "visible" : false}
          className={`flex items-center gap-1.5 font-extrabold tracking-wider uppercase select-none ${isSplash ? 'mt-4 text-xs text-slate-400' : 'mt-1 text-[9px] text-slate-400'}`}
        >
          <span>FIND JOBS.</span>
          <span>•</span>
          <span>BUILD CAREERS.</span>
          <span>•</span>
          <span>CONNECT FUTURES.</span>
        </TextWrapper>
      )}
    </div>
  );
};

export default Logo;
