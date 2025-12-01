import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Table } from '../components/UIComponents';
import { useAuth } from '../App';
import { DataAPI } from '../services/dataService';
import { Navigate } from 'react-router-dom';
import { Coupon } from '../types';

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
  
  // Coupons State
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponPercent, setNewCouponPercent] = useState(10);

  useEffect(() => {
      if(settings) setFormData(settings);
      loadCoupons();
  }, [settings]);

  const loadCoupons = async () => {
      const data = await DataAPI.getCoupons();
      setCoupons(data);
  }

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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        setLoading(true);
        try {
            const url = await DataAPI.uploadLogo(e.target.files[0]);
            setFormData(prev => ({ ...prev, logoUrl: url }));
        } catch (error) {
            console.error("Upload failed", error);
            alert("Erro ao fazer upload da imagem.");
        } finally {
            setLoading(false);
        }
    }
  }

  const handleAddCoupon = async () => {
      if(!newCouponCode || !user) return;
      setLoading(true);
      await DataAPI.addCoupon({
          code: newCouponCode.toUpperCase(),
          discountPercent: newCouponPercent,
          active: true
      }, user);
      setNewCouponCode('');
      setLoading(false);
      loadCoupons();
  }

  const handleToggleCoupon = async (c: Coupon) => {
      if(!user) return;
      await DataAPI.toggleCoupon(c.id, !c.active, user);
      loadCoupons();
  }

  const handleDeleteCoupon = async (id: string) => {
      if(!user || !window.confirm("Excluir este cupom?")) return;
      await DataAPI.deleteCoupon(id, user);
      loadCoupons();
  }

  const handleBackup = async () => {
    setLoading(true);
    const sales = await DataAPI.getSales(user!);
    const services = await DataAPI.getServices();
    const backup = { date: new Date(), sales, services, settings: formData, coupons };
    
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
                
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Logo da Empresa</label>
                    <div className="flex items-center gap-4">
                        {formData.logoUrl && (
                            <img src={formData.logoUrl} className="w-16 h-16 rounded object-cover border border-slate-600" alt="Logo" />
                        )}
                        <input 
                            type="file" 
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-orange-600"
                        />
                    </div>
                </div>
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

      {/* Coupons Management */}
      <Card title="Gerenciar Cupons de Desconto">
          <div className="mb-4 bg-slate-800 p-4 rounded border border-slate-700 flex flex-col md:flex-row gap-4 items-end">
             <div className="flex-1 w-full">
                <Input label="Código do Cupom" placeholder="EX: VERAO10" value={newCouponCode} onChange={e => setNewCouponCode(e.target.value)} className="mb-0" />
             </div>
             <div className="w-32">
                <Input label="Desconto (%)" type="number" min="1" max="100" value={newCouponPercent} onChange={e => setNewCouponPercent(Number(e.target.value))} className="mb-0" />
             </div>
             <Button onClick={handleAddCoupon} isLoading={loading}>Criar Cupom</Button>
          </div>

          <Table headers={['Código', 'Desconto', 'Status', 'Ações']}>
              {coupons.map(c => (
                  <tr key={c.id} className="hover:bg-slate-700/50">
                      <td className="px-4 py-3 font-bold text-white">{c.code}</td>
                      <td className="px-4 py-3 text-green-400">{c.discountPercent}%</td>
                      <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs ${c.active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                              {c.active ? 'ATIVO' : 'INATIVO'}
                          </span>
                      </td>
                      <td className="px-4 py-3 flex gap-2">
                          <Button variant="ghost" onClick={() => handleToggleCoupon(c)} className="text-slate-400 hover:text-white px-2 py-1">
                              <i className={`fas fa-${c.active ? 'toggle-on' : 'toggle-off'}`}></i>
                          </Button>
                          <Button variant="danger" onClick={() => handleDeleteCoupon(c.id)} className="px-2 py-1 text-xs">
                              <i className="fas fa-trash"></i>
                          </Button>
                      </td>
                  </tr>
              ))}
              {coupons.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-slate-500">Nenhum cupom cadastrado.</td></tr>}
          </Table>
      </Card>
    </div>
  );
};

export default Settings;