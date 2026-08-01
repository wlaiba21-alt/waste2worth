import React, { useState } from 'react';

// Create initials from name
function getInitials(name) {
  if (!name) return 'U';
  return name
    .split(' ')
    .map(word => word[0])
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function UserAvatar({ src, name, className = 'w-10 h-10 rounded-full object-cover', alt }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    // Inline SVG fallback with initials
    return (
      <div 
        className={`${className} bg-eco-green flex items-center justify-center text-white font-bold`}
      >
        {getInitials(name)}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || name || 'Avatar'}
      className={className}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
