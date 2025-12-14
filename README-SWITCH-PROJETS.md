# 🔄 Switch entre Projets Supabase - Guide Rapide

## Projets Disponibles

1. **Rentanoo** (Principal) : `zykwfjxurwmputxwlkxs`
2. **rentanoo-nosy-be** (Alternatif) : `tbsgzykqcksmqxpimwry`

## Comment Switcher

### Méthode 1 : Demander à l'IA

Dites simplement :
- **"Travaille sur tbsgzykqcksmqxpimwry"** → Je switche vers ce projet
- **"Utilise le projet rentanoo-nosy-be"** → Je switche vers ce projet
- **"Retour au projet principal"** → Je reviens à `zykwfjxurwmputxwlkxs`

**Avantage** : Pas besoin de redémarrer Cursor, switch instantané via Rube/Composio ✅

### Méthode 2 : Script Automatique

```bash
# Switcher vers rentanoo-nosy-be
npm run switch:supabase tbsgzykqcksmqxpimwry

# Switcher vers Rentanoo (principal)
npm run switch:supabase zykwfjxurwmputxwlkxs

# Voir le projet actuel
npm run switch:supabase
```

### Méthode 3 : Modification Manuelle

Modifier `~/.cursor/mcp.json` :
```json
"supabase": {
  "url": "https://mcp.supabase.com/mcp?project_ref=tbsgzykqcksmqxpimwry",
  "headers": {}
}
```

Puis **redémarrer Cursor**.

## Vérification

```bash
npm run verify:supabase
```

## Documentation Complète

Voir `SWITCH-SUPABASE-PROJECT.md` pour plus de détails.

---

**✅ Je peux maintenant travailler sur les deux projets à votre demande !**

