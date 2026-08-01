import React from 'react';
import logoPng from '../logo.png';

export function Logo({ className = 'w-10 h-10', useSvg = false }) {
  if (useSvg) {
    return (
      <svg 
        viewBox="0 0 100 100" 
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Dark green circular background */}
        <circle cx="50" cy="50" r="48" fill="#1f4d3d" />
        {/* White stylized recycling symbol */}
        <path
          d="M50 15C30.7 15 15 30.7 15 50s15.7 35 35 35 35-15.7 35-35S69.3 15 50 15zm17.5 39.4h-7v8l-11.2-11.2 11.2-11.2v8h7c0 6.1-4.9 11.2-11.2 11.2-3.8 0-7.1-2-8.9-4.8l-1.5-1.4 6.5 6.5c2.5 2.8 6.3 4.4 10.2 4.4 7.7 0 14-6.3 14-14z"
          fill="white"
        />
        <path
          d="M32.5 50c0-6.1 4.9-11.2 11.2-11.2 3.8 0 7.1 2 8.9 4.8l1.5 1.4-6.5-6.5c-2.5-2.8-6.3-4.4-10.2-4.4-7.7 0-14 6.3-14 14v1.8h9.2v-7.3z"
          fill="white"
        />
      </svg>
    );
  }
  
  return (
    <img 
      src={logoPng} 
      alt="Waste2Worth Logo" 
      className={`${className} object-contain max-w-full max-h-full`}
    />
  );
}
