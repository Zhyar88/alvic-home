import React, { useState } from 'react';
import logoUrl from '../assets/logo.png';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Globe, Lock } from 'lucide-react';
import { logAudit } from '../lib/auditLog';
export function Login() {
  const { signIn } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');
  setLoading(true);
  const { error: err } = await signIn(email, password);
  if (err) {
    setError(err);
  } else {
    await logAudit({
      userId: '',
      userNameEn: email,
      userNameKu: '',
      action: 'LOGIN',
      module: 'auth',
      newValues: { email },
    });
  }
  setLoading(false);
};

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-800 to-emerald-900 px-8 py-8 text-center">
            <div className="flex justify-center mb-3">
              <div className="bg-white rounded-2xl p-3 shadow-md inline-flex">
                <img
                  src={logoUrl}
                  alt="Alvic Home"
                  className="h-20 w-auto"
                />
              </div>
            </div>
            <p className="text-emerald-200 text-sm mt-1">{t('appSubtitle')}</p>
          </div>

          <div className="px-8 py-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label={t('email')}
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="admin@alvichome.com"
              />
              <Input
                label={t('password')}
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                icon={<Lock size={16} />}
              />

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  {error}
                </div>
              )}

              <Button type="submit" loading={loading} className="w-full" size="lg">
                {t('login')}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100 flex justify-center">
              <button
                onClick={() => setLanguage(language === 'en' ? 'ku' : 'en')}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                <Globe size={15} />
                {language === 'en' ? 'کوردی' : 'English'}
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Alvic Home &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
