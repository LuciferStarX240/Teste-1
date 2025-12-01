import React, { useEffect, useState } from 'react';
import { Card, Button, Table, Modal, Input, Select } from '../components/UIComponents';
import { useAuth } from '../App';
import { DataAPI } from '../services/dataService';
import { User, Role } from '../types';
import { Navigate } from 'react-router-dom';

const Team = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>(Role.MECHANIC);

  // Permission Guard
  if (user?.role === 'mecanico') return <Navigate to="/" />;

  const loadTeam = async () => {
      const data = await DataAPI.getUsers();
      setUsers(data);
  }

  useEffect(() => {
    loadTeam();
  }, []);

  const handleAddUser = async () => {
      if(!user) return;
      setLoading(true);
      await DataAPI.addUser({
          username,
          email,
          role,
          avatarUrl: `https://picsum.photos/seed/${username}/200/200`
      }, user);
      setIsModalOpen(false);
      setUsername('');
      setEmail('');
      setLoading(false);
      loadTeam();
  }

  const handleDelete = async (id: string) => {
      if(!window.confirm("Remover usuário?")) return;
      if(!user) return;
      await DataAPI.deleteUser(id, user);
      loadTeam();
  }

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h2 className="text-3xl font-bold text-white">Equipe</h2>
            <Button onClick={() => setIsModalOpen(true)}>
                <i className="fas fa-user-plus"></i> Novo Membro
            </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map(u => (
                <Card key={u.id} className="flex flex-col items-center p-6 hover:border-primary transition-colors">
                    <img src={u.avatarUrl} alt={u.username} className="w-24 h-24 rounded-full border-4 border-slate-700 mb-4 object-cover" />
                    <h3 className="text-xl font-bold text-white">{u.username}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs uppercase font-bold mt-2 ${
                        u.role === 'dono' ? 'bg-red-500/20 text-red-400' :
                        u.role === 'gerente' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-orange-500/20 text-orange-400'
                    }`}>
                        {u.role}
                    </span>
                    <p className="text-slate-500 text-sm mt-2">{u.email}</p>
                    
                    {u.id !== user?.id && (
                        <Button variant="ghost" className="mt-4 text-red-400 hover:text-red-300" onClick={() => handleDelete(u.id)}>
                            <i className="fas fa-trash"></i> Remover
                        </Button>
                    )}
                </Card>
            ))}
        </div>

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Cadastrar Funcionário">
            <div className="space-y-4">
                <Input label="Nome" value={username} onChange={e => setUsername(e.target.value)} />
                <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                <Select 
                    label="Cargo"
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                    options={[
                        { value: Role.MECHANIC, label: 'Mecânico' },
                        { value: Role.MANAGER, label: 'Gerente' },
                        { value: Role.OWNER, label: 'Dono' }
                    ]}
                />
                <Button onClick={handleAddUser} isLoading={loading} className="w-full mt-4">Cadastrar</Button>
            </div>
        </Modal>
    </div>
  );
};

export default Team;
