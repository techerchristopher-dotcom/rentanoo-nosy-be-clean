/**
 * Configuration i18next-scanner pour l'extraction automatique des clés de traduction
 * 
 * Usage: npm run i18n:extract
 */
module.exports = {
  input: [
    'src/**/*.{js,jsx,ts,tsx}',
    // Exclure les fichiers de configuration et node_modules
    '!src/**/*.test.{js,jsx,ts,tsx}',
    '!src/**/*.spec.{js,jsx,ts,tsx}',
    '!src/i18n/**',
    '!src/vite-env.d.ts',
  ],
  output: './',
  
  options: {
    debug: true,
    sort: true,
    func: {
      list: ['t', 'i18next.t', 'i18n.t'],
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
    },
    trans: {
      component: 'Trans',
      i18nKey: 'i18nKey',
      defaultsKey: 'defaults',
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
      fallbackKey: (ns, value) => {
        // Génère une clé basée sur la valeur pour faciliter la traduction
        return value;
      },
    },
    lngs: ['fr', 'en', 'it', 'de'],
    defaultLng: 'fr',
    defaultValue: '__STRING_NOT_TRANSLATED__',
    resource: {
      loadPath: 'src/i18n/locales/{{lng}}/{{ns}}.json',
      savePath: 'src/i18n/locales/{{lng}}/{{ns}}.json',
      jsonIndent: 2,
      lineEnding: '\n',
    },
    nsSeparator: ':',
    keySeparator: '.',
    interpolation: {
      prefix: '{{',
      suffix: '}}',
    },
    // Nomspaces par défaut
    defaultNs: 'common',
    // Ignorer certaines valeurs (attributs HTML, etc.)
    ignoreDefaultValues: false,
    // Ne pas écraser les traductions existantes
    removeUnusedKeys: false,
    // Garder les clés non utilisées
    keepRemoved: true,
  },
};

