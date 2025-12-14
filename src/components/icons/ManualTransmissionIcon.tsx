import React from 'react';

export const ManualTransmissionIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => {
  return (
    <svg 
      viewBox="0 0 24 24" 
      className={className}
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2"
    >
      {/* Cercle extérieur épais */}
      <circle cx="12" cy="12" r="9" strokeWidth="3" fill="none"/>
      
      {/* Pattern H de la transmission manuelle */}
      {/* Ligne verticale gauche */}
      <line x1="8" y1="6" x2="8" y2="18" strokeWidth="2.5"/>
      
      {/* Ligne verticale droite */}
      <line x1="16" y1="6" x2="16" y2="18" strokeWidth="2.5"/>
      
      {/* Ligne horizontale centrale */}
      <line x1="8" y1="12" x2="16" y2="12" strokeWidth="2.5"/>
      
      {/* Positions des vitesses avec des cercles plus visibles */}
      {/* 1ère vitesse */}
      <circle cx="8" cy="7" r="1.8" fill="currentColor"/>
      <text x="8" y="8.2" textAnchor="middle" fontSize="3.5" fill="white" fontWeight="bold">1</text>
      
      {/* 2ème vitesse */}
      <circle cx="8" cy="17" r="1.8" fill="currentColor"/>
      <text x="8" y="18.2" textAnchor="middle" fontSize="3.5" fill="white" fontWeight="bold">2</text>
      
      {/* 3ème vitesse */}
      <circle cx="16" cy="7" r="1.8" fill="currentColor"/>
      <text x="16" y="8.2" textAnchor="middle" fontSize="3.5" fill="white" fontWeight="bold">3</text>
      
      {/* 4ème vitesse */}
      <circle cx="16" cy="17" r="1.8" fill="currentColor"/>
      <text x="16" y="18.2" textAnchor="middle" fontSize="3.5" fill="white" fontWeight="bold">4</text>
      
      {/* 5ème vitesse */}
      <circle cx="12" cy="5" r="1.8" fill="currentColor"/>
      <text x="12" y="6.2" textAnchor="middle" fontSize="3.5" fill="white" fontWeight="bold">5</text>
      
      {/* Marche arrière */}
      <circle cx="18" cy="17" r="1.8" fill="currentColor"/>
      <text x="18" y="18.2" textAnchor="middle" fontSize="3" fill="white" fontWeight="bold">R</text>
      
      {/* Ligne vers la marche arrière */}
      <line x1="16" y1="17" x2="18" y2="17" strokeWidth="2"/>
    </svg>
  );
};
