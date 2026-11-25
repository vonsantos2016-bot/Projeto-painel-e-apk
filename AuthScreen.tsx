import React, { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Lock, Mail, Tv, User } from 'lucide-react';
import type { AuthUser } from '../types';
import { apiFetch, setAuthToken } from '../lib/api';

export function AuthScreen({
  initialHasUsers,
  onAuthenticated,
}: {
  initialHasUsers: boolean;
  onAuthenticated: (user: AuthUser) => void;
}) {
  const [mode, setMode] = useState<'login' | 'register'>(
    initialHasUsers ? 'login' : 'register'
  );
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const endpoint =
        mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const payload =
        mode === 'register' ? { name, email, password } : { email, password };
      const res = await apiFetch<{ user: AuthUser; token: string }>(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setAuthToken(res.token);
      onAuthenticated(res.user);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Não foi possível autenticar.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F7FB] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 shadow-sm">
        {/* Left Brand Panel (Dark Purple Accent) */}
        <div className="md:col-span-5 bg-[#181029] text-white p-8 flex flex-col justify-between gap-8">
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl bg-purple-700 flex items-center justify-center shrink-0">
              <Tv className="h-5 w-5 text-white" aria-hidden="true" />
            </span>
            <div>
              <p className="font-bold text-lg tracking-tight">Tá On Mídia</p>
              <p className="text-xs text-purple-200/80">
                TV Indoor &amp; CRM Comercial
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-white [text-wrap:balance]">
              Gerencie telas, anunciantes e grades em um só lugar.
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Controle completo do funil comercial no Kanban, biblioteca de
              mídias, conteúdos dinâmicos ao vivo e reprodução sincronizada nas
              TVs.
            </p>
          </div>

          <div className="border-t border-white/10 pt-4 text-xs text-slate-300 flex flex-col gap-1.5">
            <span>• CRM Kanban com movimentação entre etapas</span>
            <span>• Player 16:9 com cache local offline-first</span>
            <span>• Notícias G1/CNN, Open-Meteo, Esportes e Quiz</span>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="md:col-span-7 p-8 sm:p-10 flex flex-col justify-center">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                mode === 'register'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Criar Conta
            </button>
          </div>

          <h2 className="text-xl font-semibold text-slate-900">
            {mode === 'login'
              ? 'Acesse seu painel comercial'
              : 'Crie sua conta de acesso'}
          </h2>
          <p className="text-sm text-slate-500 mt-1 mb-6">
            {mode === 'login'
              ? 'Entre com seu e-mail e senha cadastrados.'
              : 'Configure seu acesso inicial para gerenciar o CRM e as telas.'}
          </p>

          {error && (
            <div
              role="alert"
              className="mb-4 px-3.5 py-2.5 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-700"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === 'register' && (
              <div>
                <label
                  htmlFor="auth-name"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Nome completo
                </label>
                <div className="relative">
                  <User
                    className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                    aria-hidden="true"
                  />
                  <input
                    id="auth-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full h-10 pl-9 pr-3 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-purple-700"
                  />
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="auth-email"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                E-mail corporativo
              </label>
              <div className="relative">
                <Mail
                  className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@empresa.com.br"
                  className="w-full h-10 pl-9 pr-3 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-purple-700"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="auth-password"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Senha
              </label>
              <div className="relative">
                <Lock
                  className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full h-10 pl-9 pr-10 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-purple-700"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 inline-flex items-center justify-center rounded text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 h-10 px-4 inline-flex items-center justify-center gap-2 rounded-lg bg-purple-800 hover:bg-purple-900 disabled:opacity-60 text-sm font-medium text-white transition-colors"
            >
              <span>
                {submitting
                  ? 'Processando...'
                  : mode === 'login'
                  ? 'Entrar no Painel'
                  : 'Cadastrar e Acessar'}
              </span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
