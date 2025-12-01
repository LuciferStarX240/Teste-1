import React, { useEffect, useState } from 'react';
import { Card, Button, Table, Modal, Select, Input } from '../components/UIComponents';
import { useAuth } from '../App';
import { DataAPI } from '../services/dataService';
import { Sale, Service } from '../types';

const Sales = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State
  const [selectedService, setSelectedService] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [discount, setDiscount] = useState(0);

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

  const handleCreateSale = async () => {
    if (!selectedService || !user) return;
    setLoading(true);
    try {
        await DataAPI.addSale({
            serviceId: selectedService,
            quantity: Number(quantity),
            discount: Number(discount),
            userId: user.id
        }, user);
        setIsModalOpen(false);
        // Reset form
        setSelectedService('');
        setQuantity(1);
        setDiscount(0);
        await loadData();
    } catch (e) {
        alert("Erro ao criar venda");
    } finally {
        setLoading(false);
    }
  };

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
                <Input 
                    label="Desconto (%)" 
                    type="number" 
                    min="0" max="100"
                    value={discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value))}
                />
            </div>

            {selectedService && (
                <div className="bg-slate-800 p-4 rounded border border-slate-700 mt-4">
                    <div className="flex justify-between items-center">
                        <span className="text-slate-400">Valor Unitário:</span>
                        <span className="text-white">R$ {services.find(s => s.id === selectedService)?.price}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-700">
                        <span className="text-lg font-bold text-white">Total Estimado:</span>
                        <span className="text-xl font-bold text-primary">
                            R$ {((services.find(s => s.id === selectedService)?.price || 0) * quantity * (1 - discount/100)).toLocaleString()}
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
