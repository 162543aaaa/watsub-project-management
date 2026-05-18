// @ts-nocheck
'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, useAnimation, useMotionValue, useSpring } from 'framer-motion';
import './NeonCursor.css';

const NeonCursor = () => {
  const [isClicking, setIsClicking] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  // Configure high-fidelity spring settings for buttery smooth trails
  const trailX = useSpring(mouseX, { damping: 25, stiffness: 250, mass: 0.5 });
  const trailY = useSpring(mouseY, { damping: 25, stiffness: 250, mass: 0.5 });

  const glowX = useSpring(mouseX, { damping: 35, stiffness: 150, mass: 0.8 });
  const glowY = useSpring(mouseY, { damping: 35, stiffness: 150, mass: 0.8 });

  const trailControls = useAnimation();
  const glowControls = useAnimation();

  const handleMouseMove = useCallback((e: MouseEvent) => {
    mouseX.set(e.clientX);
    mouseY.set(e.clientY);
  }, [mouseX, mouseY]);

  const handleMouseDown = () => setIsClicking(true);
  const handleMouseUp = () => setIsClicking(false);

  const handleMouseOver = useCallback(
    (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && target.matches('a, button, input, select, textarea, [role="button"], [data-hover="true"]')) {
        setIsHovering(true);
        void trailControls.start({
          scale: 1.5,
          borderColor: 'rgb(255, 150, 50)',
          borderWidth: '3px',
        });
        void glowControls.start({
          scale: 2,
          opacity: 0.8,
        });
      }
    },
    [trailControls, glowControls]
  );

  const handleMouseOut = useCallback(() => {
    setIsHovering(false);
    void trailControls.start({
      scale: 1,
      borderColor: 'rgb(236, 101, 23)',
      borderWidth: '2px',
    });
    void glowControls.start({
      scale: 1,
      opacity: 0.4,
    });
  }, [trailControls, glowControls]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mouseover', handleMouseOver);
    window.addEventListener('mouseout', handleMouseOut);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mouseover', handleMouseOver);
      window.removeEventListener('mouseout', handleMouseOut);
    };
  }, [handleMouseMove, handleMouseOver, handleMouseOut]);

  // Only render custom cursor on device viewports that support fine pointer (mouse)
  const [isMobile, setIsMobile] = useState(true);
  useEffect(() => {
    const mediaQuery = window.matchMedia('(pointer: fine)');
    setIsMobile(!mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(!e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  if (isMobile) return null;

  return (
    <div className='neon-cursor-container'>
      {/* Outer glow (smooth lag trail) */}
      <motion.div
        className='cursor-glow'
        style={{
          x: glowX,
          y: glowY,
          translateX: '-50%',
          translateY: '-50%',
        }}
        animate={glowControls}
        initial={false}
      />

      {/* Trailing circle (smooth medium trail) */}
      <motion.div
        className='cursor-trail'
        style={{
          x: trailX,
          y: trailY,
          translateX: '-50%',
          translateY: '-50%',
        }}
        animate={trailControls}
        initial={false}
      />

      {/* Main cursor dot (perfectly matching mouse position instantly) */}
      <motion.div
        className='cursor-main'
        style={{
          x: mouseX,
          y: mouseY,
          translateX: '-50%',
          translateY: '-50%',
        }}
        animate={{
          scale: isClicking ? 0.8 : isHovering ? 1.25 : 1,
        }}
        transition={{
          type: 'spring',
          damping: 15,
          stiffness: 400,
        }}
      />
    </div>
  );
};

export default NeonCursor;
