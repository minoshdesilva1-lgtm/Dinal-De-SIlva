import React, { useEffect, useRef } from 'react';
import { FaLeaf } from 'react-icons/fa';

const CursorFlow: React.FC = () => {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;

    let mouseX = -100;
    let mouseY = -100;
    
    // We track these to create the smooth "flow" on the leaf itself
    let leafX = -100;
    let leafY = -100;
    
    let isPressed = false;

    // Speed factor: 0.2 provides a nice balance of responsiveness and "flow"
    const speed = 0.2;

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const onMouseDown = () => { isPressed = true; };
    const onMouseUp = () => { isPressed = false; };

    let animationFrameId: number;

    const animateLoop = () => {
      // Lerp (Linear Interpolation) for smooth movement of the leaf itself
      leafX += (mouseX - leafX) * speed;
      leafY += (mouseY - leafY) * speed;

      const scale = isPressed ? 0.8 : 1;
      
      // Natural tilt
      const rotation = -25; 

      if (cursor) {
        cursor.style.transform = `translate3d(${leafX}px, ${leafY}px, 0) scale(${scale}) rotate(${rotation}deg)`;
      }

      animationFrameId = requestAnimationFrame(animateLoop);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    
    animationFrameId = requestAnimationFrame(animateLoop);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <>
      {/* Main Cursor: Green Leaf (Smaller, No Ring) */}
      <div 
        ref={cursorRef}
        className="fixed top-0 left-0 pointer-events-none z-[9999] -ml-2 -mt-2 text-emerald-600 drop-shadow-sm"
      >
        <FaLeaf size={18} />
      </div>
    </>
  );
};

export default CursorFlow;