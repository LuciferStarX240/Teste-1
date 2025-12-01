import React, { useState } from 'react';
import { useAuth } from '../App';
import { Navigate } from 'react-router-dom';
import { Button, Input } from '../components/UIComponents';

const Login = () => {
  const { login, user, settings } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (user) return <Navigate to="/" />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential') {
        setError('Email ou senha incorretos.');
      } else if (err.code === 'auth/invalid-api-key') {
        setError('Erro de Configuração: API Key do Firebase inválida.');
      } else {
        setError('Erro ao conectar com servidor.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-10 left-10 w-64 h-64 bg-primary rounded-full blur-[100px]"></div>
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-600 rounded-full blur-[120px]"></div>
        </div>

      <div className="bg-slate-800/80 backdrop-blur-md p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-700 relative z-10">
        <div className="text-center mb-8">
            <div className="w-20 h-20 bg-slate-900 rounded-full mx-auto flex items-center justify-center border-2 border-primary mb-4 shadow-lg shadow-orange-500/20">
                <i className="fas fa-wrench text-3xl text-primary"></i>
            </div>
          <h1 className="text-2xl font-bold text-white">{settings?.loginTitle || "ERP Oficina"}</h1>
          <p className="text-slate-400 mt-2">Gestão Inteligente para FiveM</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            label="Email"
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            placeholder="seu@email.com"
            required
          />
          <Input 
            label="Senha"
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            placeholder="••••••••"
            required
          />
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded text-sm flex items-center gap-2">
                <i className="fas fa-exclamation-circle"></i>
                {error}
            </div>
          )}

          <Button type="submit" className="w-full py-3 text-lg shadow-lg shadow-orange-500/20" isLoading={loading}>
            Acessar Sistema
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-700 text-center">
             <p className="text-xs text-slate-500 mb-2">
                Não tem conta? Solicite ao dono da oficina.
             </p>
             <div className="bg-slate-900 p-2 rounded text-xs text-yellow-500 border border-yellow-500/30">
                 <i className="fas fa-info-circle mr-1"></i>
                 Configure o <strong>firebaseConfig.ts</strong> antes de usar.
             </div>
        </div>
      </div>
    </div>
  );
};

export default Login;