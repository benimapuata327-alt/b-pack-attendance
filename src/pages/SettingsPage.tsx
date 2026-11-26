import { useEffect, useState } from 'react';
import { Settings as SettingsIcon, MessageCircle, Mail, Database, Shield, Clock, Plus, Trash2, Save } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { api } from '@/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Field';
import { toast } from '@/components/ui/Toast';
import { API_MODE, LARAVEL_BASE_URL } from '@/api/config';
import type { AppSettings, UserRole } from '@/types';
import { ROLE_LABELS } from '@/auth/permissions';

export function SettingsPage() {
  const { user, can } = useAuth();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.getSettings().then(setSettings); }, []);

  if (!settings) return <div className="p-6">Chargement…</div>;

  const update = (patch: Partial<AppSettings>) => setSettings({ ...settings, ...patch });

  const save = async () => {
    setSaving(true);
    try { await api.saveSettings(settings, user); toast('success', 'Paramètres enregistrés.'); }
    catch { toast('error', 'Erreur lors de l\'enregistrement.'); }
    finally { setSaving(false); }
  };

  const addRecipient = () => update({
    whatsapp: {
      ...settings.whatsapp,
      recipients: [...settings.whatsapp.recipients, { label: '', phone: '', role: 'RESPONSABLE' }],
    },
  });
  const updateRecipient = (i: number, patch: Partial<AppSettings['whatsapp']['recipients'][0]>) => {
    const rec = [...settings.whatsapp.recipients];
    rec[i] = { ...rec[i], ...patch };
    update({ whatsapp: { ...settings.whatsapp, recipients: rec } });
  };
  const removeRecipient = (i: number) => update({ whatsapp: { ...settings.whatsapp, recipients: settings.whatsapp.recipients.filter((_, idx) => idx !== i) } });

  return (
    <div>
      <PageHeader
        title="Paramètres"
        subtitle="Configuration de l'application et des intégrations"
        icon={<SettingsIcon className="w-5 h-5" />}
        actions={can('settings.edit') && <Button icon={<Save className="w-4 h-4" />} loading={saving} onClick={save}>Enregistrer</Button>}
      />

      {/* Backend connection status */}
      <Card title="Connexion au backend" subtitle="Architecture Laravel + MySQL" className="mb-6">
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${API_MODE === 'laravel' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
            <Database className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-graphite-600">
              {API_MODE === 'laravel' ? 'Connecté à Laravel' : 'Mode développement local'}
            </p>
            <p className="text-sm text-graphite-400">
              {API_MODE === 'laravel'
                ? `API : ${LARAVEL_BASE_URL}`
                : 'Les données sont stockées dans le navigateur (localStorage). Pour connecter Laravel, définissez VITE_LARAVEL_API_URL dans un fichier .env.'}
            </p>
          </div>
          <span className={`badge ${API_MODE === 'laravel' ? 'badge-active' : 'badge-late'}`}>
            {API_MODE === 'laravel' ? 'Laravel actif' : 'Local'}
          </span>
        </div>
      </Card>

      {/* General */}
      <Card title="Général" className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nom de l'entreprise"><Input value={settings.companyName} onChange={(e) => update({ companyName: e.target.value })} disabled={!can('settings.edit')} /></Field>
          <Field label="Partenaire"><Input value={settings.partnerName} onChange={(e) => update({ partnerName: e.target.value })} disabled={!can('settings.edit')} /></Field>
          <Field label="Période de tolérance (minutes)" hint="Au-delà de cette durée, l'agent est en retard">
            <Input type="number" min={0} max={60} value={settings.gracePeriodMinutes} onChange={(e) => update({ gracePeriodMinutes: Number(e.target.value) })} disabled={!can('settings.edit')} />
          </Field>
        </div>
      </Card>

      {/* WhatsApp */}
      <Card title="WhatsApp Business" subtitle="Intégration Meta Cloud API" className="mb-6"
        actions={<span className={`badge ${settings.whatsapp.configured ? 'badge-active' : 'badge-late'}`}>{settings.whatsapp.configured ? 'Configuré' : 'À configurer'}</span>}>
        {!settings.whatsapp.configured ? (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <MessageCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-semibold text-amber-700">INTÉGRATION À CONFIGURER</p>
              <p className="text-amber-600 mt-0.5">Les identifiants WhatsApp Business API doivent être configurés côté Laravel (variables d'environnement). Les tokens ne sont jamais exposés dans le frontend.</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <MessageCircle className="w-5 h-5 text-green-600" />
            <p className="text-sm text-green-700">WhatsApp Business est configuré. Les notifications seront envoyées via l'API Laravel.</p>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <Field label="WhatsApp Phone Number ID" hint="Variable Laravel : WHATSAPP_PHONE_NUMBER_ID">
            <Input placeholder="À configurer dans .env Laravel" value={settings.whatsapp.phoneNumberId ?? ''} onChange={(e) => update({ whatsapp: { ...settings.whatsapp, phoneNumberId: e.target.value, configured: !!e.target.value } })} disabled={!can('settings.edit')} />
          </Field>
          <Field label="WhatsApp Business Account ID" hint="Variable Laravel : WHATSAPP_WABA_ID">
            <Input placeholder="À configurer dans .env Laravel" value={settings.whatsapp.wabaId ?? ''} onChange={(e) => update({ whatsapp: { ...settings.whatsapp, wabaId: e.target.value, configured: !!e.target.value || !!settings.whatsapp.phoneNumberId } })} disabled={!can('settings.edit')} />
          </Field>
        </div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-graphite-600">Numéros destinataires</p>
          {can('settings.edit') && <Button variant="ghost" size="sm" icon={<Plus className="w-4 h-4" />} onClick={addRecipient}>Ajouter</Button>}
        </div>
        {settings.whatsapp.recipients.length === 0 ? (
          <p className="text-sm text-graphite-400 py-3">Aucun destinataire configuré.</p>
        ) : (
          <div className="space-y-2">
            {settings.whatsapp.recipients.map((r, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                <Input className="sm:col-span-4" placeholder="Nom (ex: Responsable production)" value={r.label} onChange={(e) => updateRecipient(i, { label: e.target.value })} disabled={!can('settings.edit')} />
                <Input className="sm:col-span-4" placeholder="+225 XX XX XX XX" value={r.phone} onChange={(e) => updateRecipient(i, { phone: e.target.value })} disabled={!can('settings.edit')} />
                <Select className="sm:col-span-3" value={r.role} onChange={(e) => updateRecipient(i, { role: e.target.value as UserRole })} disabled={!can('settings.edit')}>
                  {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
                <button onClick={() => removeRecipient(i)} className="sm:col-span-1 p-2 rounded-lg text-graphite-400 hover:bg-red-50 hover:text-red-600 transition justify-self-center" disabled={!can('settings.edit')}><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Email */}
      <Card title="Notifications email" subtitle="SMTP via Laravel" className="mb-6"
        actions={<span className={`badge ${settings.email.configured ? 'badge-active' : 'badge-late'}`}>{settings.email.configured ? 'Configuré' : 'À configurer'}</span>}>
        {!settings.email.configured && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <Mail className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-700">INTÉGRATION À CONFIGURER — configurez SMTP dans le fichier .env de Laravel.</p>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Hôte SMTP" hint="Variable Laravel : MAIL_HOST"><Input placeholder="smtp.exemple.com" value={settings.email.smtpHost ?? ''} onChange={(e) => update({ email: { ...settings.email, smtpHost: e.target.value, configured: !!e.target.value } })} disabled={!can('settings.edit')} /></Field>
          <Field label="Adresse expéditeur" hint="Variable Laravel : MAIL_FROM_ADDRESS"><Input placeholder="noreply@bpack.ci" value={settings.email.fromAddress ?? ''} onChange={(e) => update({ email: { ...settings.email, fromAddress: e.target.value, configured: !!e.target.value || !!settings.email.smtpHost } })} disabled={!can('settings.edit')} /></Field>
        </div>
      </Card>

      {/* Security note */}
      <Card title="Sécurité" subtitle="Bonnes pratiques appliquées">
        <div className="space-y-2 text-sm text-graphite-500">
          <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-green-500" /> Authentification avec mots de passe hachés (côté Laravel / bcrypt)</div>
          <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-green-500" /> Permissions basées sur les rôles (RBAC) vérifiées à chaque écran</div>
          <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-green-500" /> Tokens API jamais exposés dans le code frontend</div>
          <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-green-500" /> Identifiants WhatsApp/SMTP stockés côté serveur uniquement</div>
          <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-green-500" /> Journal d'audit complet des actions sensibles</div>
        </div>
      </Card>
    </div>
  );
}
