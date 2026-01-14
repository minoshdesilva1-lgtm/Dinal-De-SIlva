import React from 'react';

export const Header: React.FC = () => {
  return (
    <div className="fixed top-0 left-0 w-full bg-legacy-primary z-50 shadow-xl border-b border-legacy-dark/20 transition-all duration-300
                    flex flex-col justify-center items-center h-auto py-3 gap-1 md:gap-0
                    md:flex-row md:justify-between md:h-40 md:px-12 md:py-6">
      
      {/* Left Side - Aesthetic Text - Visible on mobile now, smaller size */}
      <div className="flex gap-6 md:gap-10 items-center w-auto md:w-1/3 justify-center md:justify-start order-1 md:order-1 mb-1 md:mb-0">
        <span className="font-serif text-[9px] md:text-sm font-bold text-legacy-light/90 tracking-widest select-none cursor-default uppercase">
          Our Story
        </span>
        <span className="font-serif text-[9px] md:text-sm font-bold text-legacy-light/90 tracking-widest select-none cursor-default uppercase">
          The Tree
        </span>
      </div>

      {/* Center Logo */}
      <div className="relative order-2 md:order-2 md:absolute md:left-1/2 md:top-1/2 md:transform md:-translate-x-1/2 md:-translate-y-1/2 flex flex-col items-center justify-center">
        <div className="w-12 h-12 md:w-20 md:h-20 border border-legacy-light rounded-full flex items-center justify-center mb-1 md:mb-5 bg-transparent transition-all duration-300">
          {/* Custom Outline Leaf Icon matching the reference */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-legacy-light w-5 h-5 md:w-[36px] md:h-[36px] transition-all duration-300">
            {/* Leaf Shape */}
            <path d="M12 4.5C12 4.5 6.5 9.5 6.5 14.5C6.5 17.5 9 20 12 20C15 20 17.5 17.5 17.5 14.5C17.5 9.5 12 4.5 12 4.5Z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
            {/* Center Vein */}
            <path d="M12 20V9" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
            {/* Left Branches */}
            <path d="M12 17L9 14" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 13.5L9 10.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
            {/* Right Branches */}
            <path d="M12 17L15 14" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 13.5L15 10.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h1 className="font-slab text-base md:text-xl tracking-[0.25em] text-legacy-light font-bold text-shadow-sm uppercase text-center whitespace-nowrap">
          Legacy Tree
        </h1>
      </div>

      {/* Right Side - Credits */}
      <div className="flex flex-col items-center md:items-end w-full md:w-1/3 order-3 md:order-3 mt-1 md:mt-0">
        <span className="font-serif tracking-widest text-[9px] md:text-xs font-bold text-legacy-light/80 uppercase">
          Created by Minosh De Silva
        </span>
        <span className="font-serif tracking-widest text-[8px] md:text-[10px] font-bold text-legacy-light/60 uppercase mt-0.5 md:mt-1">
          Version 1.0
        </span>
      </div>
    </div>
  );
};

export const NavigationInstructions: React.FC = () => {
  return (
    <div className="fixed bottom-4 left-4 md:bottom-12 md:left-12 z-50 pointer-events-none opacity-80">
      <h3 className="font-serif font-bold text-legacy-dark tracking-widest text-xs md:text-sm mb-2 md:mb-4">
        NAVIGATION
      </h3>
      <ul className="space-y-1 md:space-y-2 font-serif text-[10px] md:text-xs text-legacy-primary tracking-wider font-bold">
        <li>ZOOM WITH SCROLL</li>
        <li>PAN WITH DRAG</li>
        <li>HOVER PORTRAITS TO EXPAND OPTIONS</li>
      </ul>
    </div>
  );
};