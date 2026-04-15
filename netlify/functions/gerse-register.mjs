// netlify/functions/gerse-register.mjs
// Gestion des inscriptions à la formation RSE – GERSE juin 2025

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// ─── Configuration des créneaux ────────────────────────────────────────────
const SESSIONS = {
  s1: {
    label: 'Mardi 16 juin – 10h00-12h00',
    dtstart: '20250616T080000Z',
    dtend:   '20250616T100000Z',
    dateKey: '20250616',
  },
  s2: {
    label: 'Mardi 23 juin – 14h00-16h00',
    dtstart: '20250623T120000Z',
    dtend:   '20250623T140000Z',
    dateKey: '20250623',
  },
  s3: {
    label: 'Vendredi 26 juin – 10h00-12h00',
    dtstart: '20250626T080000Z',
    dtend:   '20250626T100000Z',
    dateKey: '20250626',
  },
  s4: {
    label: 'Jeudi 2 juillet – 10h00-12h00',
    dtstart: '20250702T080000Z',
    dtend:   '20250702T100000Z',
    dateKey: '20250702',
  },
};

const ALLOWED_DOMAINS = ['guyotenvironnement.com', 'guyotenergies.com', 'ycompris.com'];
const MAX_PLACES      = 8;
const ORGANIZER_EMAIL = 'yves.cavarec@ycompris.com';
const FROM_EMAIL      = 'Formation RSE <formation@ycompris.com>';
const TABLE           = 'formation_gerse_2606';

// ─── Helpers ───────────────────────────────────────────────────────────────
function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function generateICS(session, email) {
  const uid   = `gerse-${session.dateKey}-${Date.now()}@ycompris.com`;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ycompris//Formation RSE//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${session.dtstart}`,
    `DTEND:${session.dtend}`,
    'SUMMARY:Formation RSE – Ycompris × Guyo',
    'DESCRIPTION:Programme :\\n1. Qu\'est-ce que la RSE dans notre contexte\\n2. La RSE est déjà dans l\'entreprise\\n3. Mesurer\\, améliorer\\, communiquer\\n4. Communiquer avec crédibilité\\n5. Et maintenant ? La feuille de route',
    'LOCATION:À confirmer',
    `ORGANIZER;CN=Yves Cavarec:MAILTO:${ORGANIZER_EMAIL}`,
    `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;RSVP=FALSE:MAILTO:${email}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

// ─── Handler principal ─────────────────────────────────────────────────────
export default async (req) => {

  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
  );

  // ── GET : disponibilités par créneau ──────────────────────────────────────
  if (req.method === 'GET') {
    const result = {};
    for (const [id, session] of Object.entries(SESSIONS)) {
      const { count } = await supabase
        .from(TABLE)
        .select('*', { count: 'exact', head: true })
        .eq('session_id', id);
      const taken = count ?? 0;
      result[id] = {
        label:     session.label,
        available: Math.max(0, MAX_PLACES - taken),
        total:     MAX_PLACES,
        full:      taken >= MAX_PLACES,
      };
    }
    return jsonResponse(result);
  }

  // ── POST : inscription ────────────────────────────────────────────────────
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method Not Allowed' }, 405);
  }

  let body;
  try   { body = await req.json(); }
  catch { return jsonResponse({ error: 'Données invalides.' }, 400); }

  const { email, session_id, confirm_change = false } = body;

  // Validation email
  const emailClean = (email ?? '').toLowerCase().trim();
  const domain     = emailClean.split('@')[1];
  if (!emailClean || !domain || !ALLOWED_DOMAINS.includes(domain)) {
    return jsonResponse({
      error: 'Seules les adresses @guyotenvironnement.com, @guyotenergies.com et @ycompris.com sont acceptées.',
    }, 400);
  }

  // Validation créneau
  const session = SESSIONS[session_id];
  if (!session) {
    return jsonResponse({ error: 'Créneau invalide.' }, 400);
  }

  // Vérification inscription existante
  const { data: existing } = await supabase
    .from(TABLE)
    .select('session_id')
    .eq('email', emailClean)
    .maybeSingle();

  if (existing) {
    if (existing.session_id === session_id) {
      return jsonResponse({
        status:  'already_same',
        message: 'Vous êtes déjà inscrit sur ce créneau. À bientôt !',
      });
    }
    if (!confirm_change) {
      return jsonResponse({
        status:                'conflict',
        current_session_label: SESSIONS[existing.session_id]?.label ?? existing.session_id,
        new_session_label:     session.label,
      });
    }
    // Modification confirmée : on supprime l'ancienne inscription
    await supabase.from(TABLE).delete().eq('email', emailClean);
  }

  // Vérification des places disponibles
  const { count } = await supabase
    .from(TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('session_id', session_id);

  if ((count ?? 0) >= MAX_PLACES) {
    return jsonResponse({
      status:  'full',
      message: `Ce créneau est complet (${MAX_PLACES} places). Veuillez choisir un autre créneau.`,
    });
  }

  // Enregistrement
  const { error: insertError } = await supabase
    .from(TABLE)
    .insert({ email: emailClean, session_id });

  if (insertError) {
    console.error('Supabase insert error:', insertError);
    return jsonResponse({ error: 'Erreur technique. Réessayez dans quelques instants.' }, 500);
  }

  // ── Envoi des emails ──────────────────────────────────────────────────────
  const resend      = new Resend(process.env.RESEND_API_KEY);
  const icsContent  = generateICS(session, emailClean);
  const icsBase64   = Buffer.from(icsContent).toString('base64');
  const wasModified = !!(existing && confirm_change);
  const prevLabel   = wasModified ? SESSIONS[existing.session_id]?.label : null;

  // Email de confirmation à l'inscrit
  await resend.emails.send({
    from:    FROM_EMAIL,
    to:      emailClean,
    subject: `${wasModified ? '[Modification] ' : ''}Inscription confirmée – Formation RSE ${session.label}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1A1A1A;">
        <h2 style="color:#007A7A;border-bottom:2px solid #007A7A;padding-bottom:0.5rem;">
          Formation RSE – Ycompris × Guyo
        </h2>
        <p>Bonjour,</p>
        <p>Votre inscription${wasModified ? ' <strong>modifiée</strong>' : ''} est confirmée pour :</p>
        <p style="font-size:1.15em;font-weight:bold;color:#007A7A;background:#e6f4f4;padding:0.8rem 1rem;border-radius:6px;">
          ${session.label}
        </p>
        ${wasModified ? `<p style="color:#64748B;font-size:0.9em;">Créneau précédent annulé : ${prevLabel}</p>` : ''}
        <p>
          L'invitation calendrier est jointe à cet email (<code>${`formation-rse-${session.dateKey}.ics`}</code>).<br/>
          Double-cliquez sur le fichier pour l'ajouter à Outlook ou votre agenda.
        </p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:1.5rem 0;"/>
        <p style="font-size:0.9em;color:#64748B;">
          Pour annuler ou modifier votre inscription, contactez
          <a href="mailto:${ORGANIZER_EMAIL}" style="color:#007A7A;">${ORGANIZER_EMAIL}</a>.
        </p>
        <p>À bientôt,<br/><strong>Yves Cavarec</strong><br/>Ycompris</p>
      </div>
    `,
    attachments: [{
      filename: `formation-rse-${session.dateKey}.ics`,
      content:  icsBase64,
    }],
  });

  // Email de notification à Yves
  await resend.emails.send({
    from:    FROM_EMAIL,
    to:      ORGANIZER_EMAIL,
    subject: `[GERSE] ${wasModified ? '✏️ Modif.' : '🆕 Inscription'} – ${session.label}`,
    html: `
      <div style="font-family:sans-serif;">
        <h3 style="color:#007A7A;">${wasModified ? 'Modification d\'inscription' : 'Nouvelle inscription'}</h3>
        <table style="border-collapse:collapse;width:100%;max-width:400px;">
          <tr><td style="padding:6px 12px;font-weight:bold;">Email</td><td style="padding:6px 12px;">${emailClean}</td></tr>
          <tr style="background:#f8fafc;"><td style="padding:6px 12px;font-weight:bold;">Créneau</td><td style="padding:6px 12px;">${session.label}</td></tr>
          ${wasModified ? `<tr><td style="padding:6px 12px;font-weight:bold;">Précédent</td><td style="padding:6px 12px;color:#64748B;">${prevLabel}</td></tr>` : ''}
          <tr style="background:#f8fafc;"><td style="padding:6px 12px;font-weight:bold;">Horodatage</td><td style="padding:6px 12px;">${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}</td></tr>
        </table>
      </div>
    `,
  });

  return jsonResponse({
    status:  'success',
    message: 'Inscription confirmée ! Vérifiez votre messagerie pour l\'invitation calendrier.',
  });
};

export const config = {
  path: '/api/gerse-register',
};
