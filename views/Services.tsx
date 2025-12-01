import React, { useEffect, useState } from 'react';
import { Card, Button, Table, Modal, Input } from '../components/UIComponents';
import { useAuth } from '../App';
import { DataAPI } from '../services/dataService';
import { Service } from '../types';
import { Navigate } from 'react-router-dom';

const Services = () => {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State
  const [formId, setFormId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState(0);

  // Permission Guard
  if (user?.role === 'mecanico') return <Navigate to="/" />;

  const loadServices = async () => {
    setLoading(true);
    const data = await DataAPI.getServices();
    setServices(data);
    setLoading(false);
  };

  useEffect(() => {
    loadServices();
  }, []);

  const openModal = (service?: Service) => {
      if(service) {
          setFormId(service.id);
          setName(service.name);
          setPrice(service.price);
      } else {
          setFormId(null);
          setName('');
          setPrice(0);
      }
      setIsModalOpen(true);
  }

  const handleSave = async () => {
      if(!user) return;
      setLoading(true);
      if (formId) {
          await DataAPI.updateService(formId, { name, price }, user);
      } else {
          await DataAPI.addService({ name, price }, user);
      }
      setIsModalOpen(false);
      await loadServices();
      setLoading(false);
  }

  const handleDelete = async (id: string) => {
      if(!window.confirm("Tem certeza que deseja remover este serviço?")) return;
      if(!user) return;
      setLoading(true);
      await DataAPI.deleteService(id, user);
      await loadServices();
      setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-white">Catálogo de Serviços</h2>
        <Button onClick={() => openModal()}>
            <i className="fas fa-plus"></i> Novo Serviço
        </Button>
      </div>

      <Card>
        <Table headers={['Nome do Serviço', 'Preço (R$)', 'Ações']}>
            {services.map(s => (
                <tr key={s.id} className="hover:bg-slate-700/50">
                    <td className="px-4 py-3 font-medium text-white">{s.name}</td>
                    <td className="px-4 py-3 text-green-400">R$ {s.price.toLocaleString()}</td>
                    <td className="px-4 py-3 flex gap-2">
                        <Button variant="secondary" className="px-2 py-1 text-xs" onClick={() => openModal(s)}>
                            <i className="fas fa-edit"></i>
                        </Button>
                        <Button variant="danger" className="px-2 py-1 text-xs" onClick={() => handleDelete(s.id)}>
                            <i className="fas fa-trash"></i>
                        </Button>
                    </td>
                </tr>
            ))}
        </Table>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={formId ? "Editar Serviço" : "Novo Serviço"}>
        <div className="space-y-4">
            <Input label="Nome do Serviço" value={name} onChange={e => setName(e.target.value)} />
            <Input label="Preço (R$)" type="number" value={price} onChange={e => setPrice(Number(e.target.value))} />
            <div className="flex justify-end gap-3 mt-6">
                <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave} isLoading={loading}>Salvar</Button>
            </div>
        </div>
      </Modal>
    </div>
  );
};

export default Services;
