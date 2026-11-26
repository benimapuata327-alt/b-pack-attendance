import { useState } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { Boxes, LogIn, AlertCircle } from 'lucide-react';
import { API_MODE } from '@/api/config';

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setLoading(true);
    try { await login(email, password); }
    catch (err) { setError(err instanceof Error ? err.message : 'Erreur de connexion'); }
    finally { setLoading(false); }
  };

  const fillDemo = (em: string) => { setEmail(em); setPassword('password'); };

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-graphite-600 relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="absolute bottom-0 -left-20 w-80 h-80 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-brand-500 flex items-center justify-center shadow-brand">
              <Boxes className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-display font-bold text-white text-lg">B-PACK ATTENDANCE</p>
              <p className="text-xs text-graphite-300 tracking-wider uppercase">Système de gestion de présence</p>
            </div>
          </div>
        </div>
        <div className="relative">
          <h1 className="font-display font-bold text-white text-4xl leading-tight">
            Gérez la présence<br />de vos équipes<br /><span className="text-brand-500">en toute simplicité.</span>
          </h1>
          <p className="text-graphite-300 mt-4 max-w-md">
            Pointage collectif, rotations 3x8, calcul automatique des retards,
            rapports et notifications — une plateforme industrielle complète.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4 max-w-md">
            <div className="bg-graphite-700/40 rounded-xl p-4">
              <p className="text-brand-500 font-display font-bold text-2xl">3x8</p>
              <p className="text-xs text-graphite-300 mt-1">Rotations Matin / Soir / Nuit</p>
            </div>
            <div className="bg-graphite-700/40 rounded-xl p-4">
              <p className="text-brand-500 font-display font-bold text-2xl">4 rôles</p>
              <p className="text-xs text-graphite-300 mt-1">Accès basé sur les permissions</p>
            </div>
          </div>
        </div>
        <div className="relative text-xs text-graphite-400">
          <p className="font-semibold text-graphite-300">PEAKING PLANT</p>
          <p>en partenariat avec CONTIAG MANPOWER</p>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-graphite-50">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center">
              <Boxes className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-display font-bold text-graphite-600">B-PACK ATTENDANCE</p>
              <p className="text-xs text-graphite-400 uppercase tracking-wide">PEAKING PLANT</p>
            </div>
          </div>

          <h2 className="font-display font-bold text-2xl text-graphite-600">Connexion</h2>
          <p className="text-sm text-graphite-400 mt-1">Accédez à votre espace de gestion.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Field label="Email">
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@bpack.ci" />
            </Field>
            <Field label="Mot de passe">
              <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </Field>

            {error && (
              <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full" icon={<LogIn className="w-4 h-4" />}>
              Se connecter
            </Button>
          </form>

          {API_MODE === 'local' && (
            <div className="mt-6 rounded-xl border border-graphite-200 bg-white p-4">
              <p className="text-xs font-semibold text-graphite-500 uppercase tracking-wide mb-2">Comptes de démonstration</p>
              <div className="space-y-1.5">
                {[
                  { e: 'admin@bpack.ci', r: 'Administrateur' },
                  { e: 'surv.a@bpack.ci', r: 'Surveillant' },
                  { e: 'resp@bpack.ci', r: 'Responsable' },
                  { e: 'direction@bpack.ci', r: 'Direction' },
                ].map((d) => (
                  <button key={d.e} onClick={() => fillDemo(d.e)} className="w-full flex items-center justify-between text-left text-sm px-3 py-2 rounded-lg hover:bg-graphite-50 transition">
                    <span className="text-graphite-600">{d.e}</span>
                    <span className="text-xs text-brand-600 font-medium">{d.r}</span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-graphite-400 mt-2">Mot de passe pour tous : <code className="text-graphite-600">password</code></p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
