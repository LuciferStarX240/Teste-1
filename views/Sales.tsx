import React, { useEffect, useState } from 'react';
import { Card, Button, Table, Modal, Select, Input } from '../components/UIComponents';
import { useAuth } from '../App';
import { DataAPI } from '../services/dataService';
import { Sale, Service, Coupon } from '../types';

const Sales = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State
  const [selectedService, setSelectedService] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [couponCode, setCouponCode] = useState('');
  const [activeCoupon, setActiveCoupon] = useState<Coupon | null>(null);
  const [couponMsg, setCouponMsg] = useState('');

  const loadData = async () => {
    if(!user) return;
    setLoading(true);
    const [s, sv] = await Promise.all([DataAPI.getSales(user), DataAPI.getServices()]);
    setSales(s.sort((a,b) => b.createdAt - a.createdAt));
    setServices(sv);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const validateCoupon = async () => {
    if(!couponCode) return;
    setLoading(true);
    try {
        const coupon = await DataAPI.getCouponByCode(couponCode);
        if (coupon) {
            setActiveCoupon(coupon);
            setCouponMsg(`Cupom aplicado: ${coupon.discountPercent}% OFF`);
        } else {
            setActiveCoupon(null);
            setCouponMsg('Cupom inválido ou expirado.');
        }
    } catch (e) {
        console.error(e);
        setCouponMsg('Erro ao validar cupom.');
    } finally {
        setLoading(false);
    }
  }

  const handleCreateSale = async () => {
    if (!selectedService || !user) return;
    setLoading(true);
    try {
        await DataAPI.addSale({
            serviceId: selectedService,
            quantity: Number(quantity),
            discount: activeCoupon ? activeCoupon.discountPercent : 0,
            userId: user.id
        }, user);
        setIsModalOpen(false);
        // Reset form
        setSelectedService('');
        setQuantity(1);
        setCouponCode('');
        setActiveCoupon(null);
        setCouponMsg('');
        await loadData();
    } catch (e) {
        alert("Erro ao criar venda");
    } finally {
        setLoading(false);
    }
  };

  const getEstimatedTotal = () => {
    const srv = services.find(s => s.id === selectedService);
    if (!srv) return 0;
    const baseTotal = srv.price * quantity;
    const discount = activeCoupon ? activeCoupon.discountPercent : 0;
    return baseTotal * (1 - discount/100);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-white">Gestão de Vendas</h2>
        <Button onClick={() => setIsModalOpen(true)}>
            <i className="fas fa-plus"></i> Nova Venda
        </Button>
      </div>

      <Card>
        <Table headers={['Data', 'Mecânico', 'Serviço', 'Qtd', 'Total']}>
            {loading ? (
                <tr><td colSpan={5} className="p-4 text-center"><i className="fas fa-spinner fa-spin"></i> Carregando...</td></tr>
            ) : sales.map(sale => (
                <tr key={sale.id} className="hover:bg-slate-700/50 transition-colors">
                    <td className="px-4 py-3">{new Date(sale.createdAt).toLocaleDateString()} {new Date(sale.createdAt).toLocaleTimeString()}</td>
                    <td className="px-4 py-3 text-slate-300">{sale.userName}</td>
                    <td className="px-4 py-3 text-primary font-medium">{sale.serviceName}</td>
                    <td className="px-4 py-3">{sale.quantity}</td>
                    <td className="px-4 py-3 font-bold text-green-400">R$ {sale.total.toLocaleString()}</td>
                </tr>
            ))}
            {!loading && sales.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Nenhuma venda registrada.</td></tr>
            )}
        </Table>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Registrar Nova Venda">
        <div className="space-y-4">
            <Select 
                label="Serviço"
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                options={[
                    { value: '', label: 'Selecione um serviço...' },
                    ...services.map(s => ({ value: s.id, label: `${s.name} (R$ ${s.price})` }))
                ]}
            />
            
            <div className="grid grid-cols-2 gap-4">
                <Input 
                    label="Quantidade" 
                    type="number" 
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value))}
                />
                 <div className="flex flex-col">
                    <label className="block text-sm font-medium text-slate-400 mb-1">Cupom de Desconto</label>
                    <div className="flex gap-2">
                        <input 
                            className="w-full bg-dark border border-slate-600 rounded p-2 text-white focus:outline-none uppercase"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value)}
                            placeholder="CÓDIGO"
                        />
                        <Button variant="secondary" onClick={validateCoupon} type="button">Validar</Button>
                    </div>
                    {couponMsg && (
                        <span className={`text-xs mt-1 ${activeCoupon ? 'text-green-400' : 'text-red-400'}`}>
                            {couponMsg}
                        </span>
                    )}
                 </div>
            </div>

            {selectedService && (
                <div className="bg-slate-800 p-4 rounded border border-slate-700 mt-4">
                    <div className="flex justify-between items-center">
                        <span className="text-slate-400">Valor Unitário:</span>
                        <span className="text-white">R$ {services.find(s => s.id === selectedService)?.price}</span>
                    </div>
                    {activeCoupon && (
                         <div className="flex justify-between items-center text-sm text-green-400">
                            <span>Desconto ({activeCoupon.discountPercent}%):</span>
                            <span>- R$ {(services.find(s => s.id === selectedService)!.price * quantity * (activeCoupon.discountPercent/100)).toFixed(2)}</span>
                         </div>
                    )}
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-700">
                        <span className="text-lg font-bold text-white">Total Final:</span>
                        <span className="text-xl font-bold text-primary">
                            R$ {getEstimatedTotal().toLocaleString()}
                        </span>
                    </div>
                </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
                <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreateSale} isLoading={loading} disabled={!selectedService}>Confirmar Venda</Button>
            </div>
        </div>
      </Modal>
    </div>
  );
};

export default Sales;