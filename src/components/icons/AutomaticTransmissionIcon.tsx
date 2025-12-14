import React from 'react';

export const AutomaticTransmissionIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => {
  return (
    <svg 
      viewBox="0 0 24 24" 
      className={className}
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2"
    >
      {/* Contour principal du sélecteur automatique - plus épais */}
      <rect x="5" y="3" width="14" height="18" rx="2" strokeWidth="3" fill="none"/>
      
      {/* Positions des vitesses sur la droite - plus grandes */}
      {/* P (Park) */}
      <text x="19" y="7" textAnchor="middle" fontSize="4" fill="currentColor" fontWeight="bold">P</text>
      
      {/* R (Reverse) */}
      <text x="19" y="10.5" textAnchor="middle" fontSize="4" fill="currentColor" fontWeight="bold">R</text>
      
      {/* N (Neutral) */}
      <text x="19" y="14" textAnchor="middle" fontSize="4" fill="currentColor" fontWeight="bold">N</text>
      
      {/* D (Drive) */}
      <text x="19" y="17.5" textAnchor="middle" fontSize="4" fill="currentColor" fontWeight="bold">D</text>
      
      {/* L (Low) */}
      <text x="19" y="21" textAnchor="middle" fontSize="4" fill="currentColor" fontWeight="bold">L</text>
      
      {/* Chemin de sélection (pattern en escalier) - plus épais */}
      {/* Ligne verticale gauche */}
      <line x1="7" y1="5" x2="7" y2="19" strokeWidth="2.5"/>
      
      {/* Lignes horizontales pour chaque position */}
      <line x1="7" y1="5" x2="17" y2="5" strokeWidth="2.5"/>
      <line x1="7" y1="8.5" x2="17" y2="8.5" strokeWidth="2.5"/>
      <line x1="7" y1="12" x2="17" y2="12" strokeWidth="2.5"/>
      <line x1="7" y1="15.5" x2="17" y2="15.5" strokeWidth="2.5"/>
      <line x1="7" y1="19" x2="17" y2="19" strokeWidth="2.5"/>
      
      {/* Indicateur de position actuelle (P) - plus visible */}
      <rect x="5" y="3.5" width="4" height="3" fill="currentColor" rx="0.5"/>
      
      {/* Ligne de connexion vers P */}
      <line x1="9" y1="5" x2="17" y2="5" strokeWidth="2.5"/>
    </svg>
  );
};
