import React, { useState, useEffect } from 'react';
import { Card, Button, Input } from '../components/UIComponents';
import { useAuth } from '../App';
import { DataAPI } from '../services/dataService';
import { Navigate } from 'react-router-dom';

const Settings = () => {
  const { user, settings } = useAuth();
  const [formData, setFormData] = useState({
      companyName: '',
      loginTitle: '',
      logoUrl: '',
      webhookUrl: ''
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
      if(settings) setFormData(settings);
  }, [settings]);

  if (user?.role !== 'dono') return <Navigate to="/" />;

  const handleSave = async () => {
      if(!user) return;
      setLoading(true);
      setMsg('');
      try {
        await DataAPI.updateSettings(formData, user);
        setMsg('Configurações salvas no Firestore com sucesso!');
      } catch (e) {
          setMsg('Erro ao salvar.');
          console.error(e);
      } finally {
          setLoading(false);
      }
  }

  const handleBackup = async () => {
    // Backup Data from Firestore to JSON
    setLoading(true);
    const sales = await DataAPI.getSales(user!);
    const services = await DataAPI.getServices();
    const backup = { date: new Date(), sales, services, settings: formData };
    
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `backup-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-white">Configurações do Sistema</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="White-label & Aparência">
            <div className="space-y-4">
                <Input 
                    label="Nome da Oficina" 
                    value={formData.companyName} 
                    onChange={e => setFormData({...formData, companyName: e.target.value})} 
                />
                <Input 
                    label="Título da Tela de Login" 
                    value={formData.loginTitle} 
                    onChange={e => setFormData({...formData, loginTitle: e.target.value})} 
                />
                <Input 
                    label="URL do Logo" 
                    value={formData.logoUrl} 
                    onChange={e => setFormData({...formData, logoUrl: e.target.value})} 
                />
                
                {formData.logoUrl && (
                    <div className="mt-2">
                        <p className="text-xs text-slate-500 mb-1">Preview:</p>
                        <img src={formData.logoUrl} className="h-16 rounded border border-slate-600" alt="Preview" />
                    </div>
                )}
            </div>
        </Card>

        <Card title="Integrações & Sistema">
             <div className="space-y-4">
                <Input 
                    label="Discord Webhook URL" 
                    placeholder="https://discord.com/api/webhooks/..."
                    value={formData.webhookUrl} 
                    onChange={e => setFormData({...formData, webhookUrl: e.target.value})} 
                />
                <p className="text-xs text-slate-500">
                    O sistema enviará notificações de vendas e logs críticos para este canal.
                </p>

                <div className="border-t border-slate-700 pt-4 mt-4 space-y-3">
                    <h4 className="text-white font-bold mb-2">Dados e Backup</h4>
                    
                    <div className="flex flex-col gap-2">
                         <p className="text-sm text-slate-400">Salvar backup local das coleções do Firestore.</p>
                         <Button variant="secondary" onClick={handleBackup} isLoading={loading}>
                            <i className="fas fa-download"></i> Baixar Backup JSON
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
      </div>

      <div className="flex items-center gap-4">
        <Button onClick={handleSave} isLoading={loading} className="w-40">Salvar Alterações</Button>
        {msg && <span className="text-green-400 text-sm animate-pulse">{msg}</span>}
      </div>
    </div>
  );
};

export default Settings;