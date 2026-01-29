/**
 * Diagnostic pour capturer les erreurs removeChild invalides
 * À utiliser uniquement en développement pour identifier les composants problématiques
 */
export function setupRemoveChildDiagnostic() {
  if (typeof window === 'undefined' || !import.meta.env.DEV) {
    return;
  }

  const originalRemoveChild = Node.prototype.removeChild;
  
  Node.prototype.removeChild = function(child: Node) {
    // Vérifier si le child est bien un enfant du parent
    const isChild = Array.from(this.childNodes).includes(child);
    
    if (!isChild) {
      console.group('🔴 [DEV] removeChild invalide détecté');
      console.log('Parent:', this);
      console.log('Parent tagName:', (this as Element).tagName);
      console.log('Parent id:', (this as Element).id);
      console.log('Parent className:', (this as Element).className);
      console.log('Child:', child);
      console.log('Child tagName:', (child as Element).tagName);
      console.log('Child id:', (child as Element).id);
      console.log('Child className:', (child as Element).className);
      console.trace('Stack trace:');
      console.groupEnd();
    }
    
    try {
      return originalRemoveChild.call(this, child);
    } catch (error) {
      console.error('❌ Erreur removeChild:', error);
      console.trace('Stack trace de l\'erreur:');
      throw error;
    }
  };
}

