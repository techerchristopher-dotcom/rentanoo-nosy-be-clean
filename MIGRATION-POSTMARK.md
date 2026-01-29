## Migration Email — Postmark

### Variables Railway à ajouter

- `POSTMARK_API_KEY` : Server API Token Postmark (dashboard Postmark → Servers → API Tokens)
- `EMAIL_TO` : Adresse de réception des messages de contact (ex: `contact@rentanoo.com`)
- `EMAIL_FROM` : Expéditeur utilisé par Postmark (ex: `noreply@rentanoo.com`)  
  - Doit appartenir à un **domaine vérifié** dans Postmark (domain or sender signature).

### Variables Railway à supprimer (ex-SMTP)

Ces variables ne sont plus utilisées par le backend :

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`

### Tests à faire après configuration

1. **Health check provider**

   ```bash
   curl -i https://<votre-domaine>/api/health/email
   ```

   - Succès attendu :
     ```json
     { "ok": true, "provider": "postmark" }
     ```
   - Si configuration incomplète :
     ```json
     {
       "ok": false,
       "error": "POSTMARK_NOT_CONFIGURED",
       "config": {
         "hasApiKey": false,
         "hasEmailTo": false,
         "hasEmailFrom": false
       }
     }
     ```

2. **Formulaire de contact – sans pièce jointe**

   - Depuis l’UI (`/contact`), envoyer un message simple.
   - Vérifier :
     - Réponse HTTP 200 avec :
       ```json
       { "ok": true, "success": true, "message": "Message envoyé avec succès" }
       ```
     - Email reçu sur `EMAIL_TO`
     - Sujet : `[Rentanoo Contact] <objet>`
     - Reply-To : email du client.

3. **Formulaire de contact – avec pièce jointe**

   - Envoyer un message avec un fichier (PDF ou image) ≤ 10MB.
   - Vérifier :
     - Réponse HTTP 200 identique au cas sans pièce jointe.
     - Pièce jointe présente et ouverte correctement dans l’email.

4. **Cas d’erreur**

   - Supprimer temporairement `POSTMARK_API_KEY` dans Railway et appeler `/api/health/email` :
     - Doit répondre `500` + `error: "POSTMARK_NOT_CONFIGURED"`.
   - Tester une pièce jointe > 10MB :
     - Doit répondre `400` avec `error: "ATTACHMENT_TOO_LARGE"`.


