/**
 * Codemod jscodeshift pour transformer les chaînes de caractères en dur
 * en appels t() de react-i18next
 * 
 * Usage: jscodeshift -t codemods/i18n-transform.js src/pages src/components
 */

module.exports = function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);
  const fileName = file.path;

  // Pattern pour détecter les chaînes à traduire
  // On ignore les très courtes (< 2 caractères) et celles qui ressemblent à des identifiants
  const MIN_STRING_LENGTH = 3;
  const SKIP_PATTERNS = [
    /^[a-z][a-zA-Z0-9_]*$/, // Identifiants de variables
    /^(true|false|null|undefined)$/i,
    /^\d+$/, // Nombres
    /^[{}[\],:]+$/, // JSON syntax
    /^(px|em|rem|%|vh|vw)$/i, // Unités CSS
    /^(GET|POST|PUT|DELETE|PATCH)$/i, // Méthodes HTTP
    /^#[0-9a-fA-F]{3,8}$/, // Couleurs hex
    /^(src|href|id|className|key|type|name|value|role|aria-)$/i, // Attributs HTML courants
  ];

  let hasChanges = false;
  let useTranslationAdded = false;

  // Vérifier si useTranslation est déjà importé
  const hasUseTranslation = root
    .find(j.ImportDeclaration)
    .filter(path => 
      path.node.source.value === 'react-i18next' &&
      path.node.specifiers.some(spec => 
        spec.type === 'ImportSpecifier' && spec.imported.name === 'useTranslation'
      )
    ).length > 0;

  // Fonction pour déterminer si une chaîne doit être traduite
  function shouldTranslateString(str) {
    if (!str || typeof str !== 'string') return false;
    if (str.length < MIN_STRING_LENGTH) return false;
    
    // Ignorer les chaînes qui sont des identifiants
    for (const pattern of SKIP_PATTERNS) {
      if (pattern.test(str)) return false;
    }
    
    // Ignorer les chemins de fichiers
    if (str.includes('/') || str.includes('\\')) return false;
    
    // Ignorer les URLs
    if (str.startsWith('http://') || str.startsWith('https://')) return false;
    
    // Ignorer les emails
    if (str.includes('@') && str.includes('.')) return false;
    
    // Traduire si la chaîne contient des lettres (pas uniquement des caractères spéciaux)
    return /[a-zA-ZÀ-ÿ]/.test(str);
  }

  // Fonction pour générer une clé de traduction à partir d'une chaîne
  function generateTranslationKey(str) {
    // Nettoyer et normaliser la chaîne
    let key = str
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Enlever caractères spéciaux
      .trim()
      .replace(/\s+/g, '_') // Remplacer espaces par underscores
      .substring(0, 50); // Limiter la longueur
    
    // Ajouter un préfixe pour éviter les collisions
    return `common.${key}`;
  }

  // Ajouter l'import useTranslation si nécessaire
  function addUseTranslationImport() {
    if (useTranslationAdded || hasUseTranslation) return;
    
    // Trouver le premier import React
    const reactImports = root.find(j.ImportDeclaration).filter(
      path => path.node.source.value === 'react'
    );
    
    const importStatement = j.importDeclaration(
      [j.importSpecifier(j.identifier('useTranslation'))],
      j.literal('react-i18next')
    );
    
    if (reactImports.length > 0) {
      reactImports.at(0).insertAfter(importStatement);
    } else {
      // Insérer au début du fichier
      const body = root.get().value.program.body;
      body.unshift(importStatement);
    }
    
    useTranslationAdded = true;
    hasChanges = true;
  }

  // Transformer les chaînes dans les props JSX
  root.find(j.JSXExpressionContainer).forEach(path => {
    const { expression } = path.value;
    
    if (expression.type === 'Literal' && typeof expression.value === 'string') {
      const str = expression.value;
      if (shouldTranslateString(str)) {
        addUseTranslationImport();
        const key = generateTranslationKey(str);
        // Ajouter le defaultValue (texte original) comme 2e argument pour sécurité i18n
        path.value.expression = j.callExpression(
          j.identifier('t'),
          [j.literal(key), j.literal(str)]
        );
        hasChanges = true;
      }
    }
  });

  // Transformer les textes JSX en préservant la balise et ses props
  // Cas supportés (mode "safe") :
  // - <h1>Texte</h1>              -> <h1>{t("...")}</h1>
  // - <SelectItem>Texte</SelectItem> -> <SelectItem>{t("...")}</SelectItem>
  // - <span>Texte :</span>        -> <span>{t("...")}</span>
  //
  // Règles de sécurité :
  // - Ne transformer que si l'élément a un unique enfant textuel (hors espaces)
  // - Ne jamais remplacer l'élément complet par une expression
  // - Si la structure est plus complexe (ternaires, concaténations, fragments, etc.), on ignore
  root.find(j.JSXElement).forEach(path => {
    const element = path.node;
    const children = element.children || [];

    // Enfants non vides (on ignore les espaces/blancs)
    const meaningfulChildren = children.filter(child => {
      if (child.type === 'JSXText') {
        return child.value.trim().length > 0;
      }
      return true;
    });

    // Mode "safe" : uniquement un enfant significatif, et c'est du texte
    if (meaningfulChildren.length !== 1) return;

    const onlyChild = meaningfulChildren[0];
    if (onlyChild.type !== 'JSXText') return;

    const text = onlyChild.value.trim();
    if (!shouldTranslateString(text)) return;

      addUseTranslationImport();
      const key = generateTranslationKey(text);

    // Remplacer uniquement l'enfant texte par {t("clé", "texte original")}, en préservant la balise et toutes ses props
    // Le defaultValue (texte original) garantit qu'on n'affichera jamais __STRING_NOT_TRANSLATED__ même si la traduction manque
    element.children = children.map(child => {
      if (child === onlyChild) {
        return j.jsxExpressionContainer(
          j.callExpression(j.identifier('t'), [j.literal(key), j.literal(text)])
        );
      }
      return child;
    });

    hasChanges = true;
  });

  // Transformer les chaînes dans les déclarations de variables (avec prudence)
  root.find(j.VariableDeclarator).forEach(path => {
    const { init } = path.value;
    if (init && init.type === 'Literal' && typeof init.value === 'string') {
      const str = init.value;
      // Seulement transformer si c'est clairement du texte à afficher
      // (éviter les identifiants, clés, etc.)
      const id = path.value.id;
      if (id.type === 'Identifier' && 
          (id.name.includes('label') || 
           id.name.includes('title') || 
           id.name.includes('text') ||
           id.name.includes('message') ||
           id.name.includes('description') ||
           id.name.includes('placeholder'))) {
        if (shouldTranslateString(str)) {
          addUseTranslationImport();
          const key = generateTranslationKey(str);
          // Ajouter le defaultValue (texte original) comme 2e argument pour sécurité i18n
          path.value.init = j.callExpression(j.identifier('t'), [j.literal(key), j.literal(str)]);
          hasChanges = true;
        }
      }
    }
  });

  // Ajouter useTranslation() dans les composants React si nécessaire
  if (hasChanges) {
    root.find(j.FunctionDeclaration).forEach(path => {
      const body = path.value.body.body;
      // Chercher si c'est un composant React (commence par majuscule)
      const name = path.value.id?.name || '';
      if (name && name[0] === name[0].toUpperCase()) {
        // Vérifier si useTranslation() est déjà appelé
        const hasHook = body.some(stmt => 
          stmt.type === 'VariableDeclaration' &&
          stmt.declarations.some(decl =>
            decl.init &&
            decl.init.type === 'CallExpression' &&
            decl.init.callee.name === 'useTranslation'
          )
        );
        
        if (!hasHook) {
          // Ajouter const { t } = useTranslation("common"); après les autres hooks
          const hookIndex = body.findIndex(stmt => {
            if (stmt.type === 'VariableDeclaration') {
              const decl = stmt.declarations[0];
              return decl?.init?.type === 'CallExpression' && 
                     decl.init.callee.type === 'Identifier' &&
                     decl.init.callee.name.startsWith('use');
            }
            return false;
          });
          
          const useTranslationCall = j.variableDeclaration('const', [
            j.variableDeclarator(
              j.objectPattern([
                j.objectProperty(j.identifier('t'), j.identifier('t'), false, true)
              ]),
              j.callExpression(
                j.identifier('useTranslation'),
                [j.literal('common')]
              )
            )
          ]);
          
          if (hookIndex >= 0) {
            body.splice(hookIndex + 1, 0, useTranslationCall);
          } else {
            body.unshift(useTranslationCall);
          }
        }
      }
    });
    
    // Même chose pour les arrow functions de composants
    root.find(j.VariableDeclarator).forEach(path => {
      if (path.value.init && path.value.init.type === 'ArrowFunctionExpression') {
        const arrowFunc = path.value.init;
        // Gérer les arrow functions avec BlockStatement (avec accolades) ou Expression (sans accolades)
        const body = arrowFunc.body.type === 'BlockStatement' ? arrowFunc.body.body : null;
        const id = path.value.id;
        
        if (id.type === 'Identifier' && id.name[0] === id.name[0].toUpperCase()) {
          // C'est un composant React
          // Si c'est une expression body (sans accolades), on ne peut pas ajouter useTranslation
          // car il faudrait convertir en BlockStatement, ce qui est complexe
          if (!body) {
            // Arrow function avec expression body - skip pour l'instant
            return;
          }
          
          const hasHook = body && body.some(stmt => 
            stmt.type === 'VariableDeclaration' &&
            stmt.declarations.some(decl =>
              decl.init &&
              decl.init.type === 'CallExpression' &&
              decl.init.callee.name === 'useTranslation'
            )
          );
          
          if (!hasHook && body && Array.isArray(body)) {
            const useTranslationCall = j.variableDeclaration('const', [
              j.variableDeclarator(
                j.objectPattern([
                  j.objectProperty(j.identifier('t'), j.identifier('t'), false, true)
                ]),
                j.callExpression(
                  j.identifier('useTranslation'),
                  [j.literal('common')]
                )
              )
            ]);
            body.unshift(useTranslationCall);
          }
        }
      }
    });
  }

  return hasChanges ? root.toSource({
    quote: 'single',
    trailingComma: true,
    tabWidth: 2,
  }) : null;
};

