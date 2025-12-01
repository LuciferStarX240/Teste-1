import React, { useEffect, useState } from 'react';
import { Card, Button } from '../components/UIComponents';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '../App';
import { DataAPI } from '../services/dataService';
import { Sale, Log, Service } from '../types';

const COLORS = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#ef4444'];

const Dashboard = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [status, setStatus] = useState<'working' | 'offline'>('offline');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if(!user) return;
      const [s, l, sv, st] = await Promise.all([
        DataAPI.getSales(user),
        DataAPI.getLogs(),
        DataAPI.getServices(),
        DataAPI.getStatus(user.id)
      ]);
      setSales(s);
      setLogs(l);
      setServices(sv);
      setStatus(st);
    };
    fetchData();
  }, [user]);

  const toggleClock = async () => {
    setLoading(true);
    if(status === 'offline') {
        await DataAPI.clockIn(user!);
        setStatus('working');
    } else {
        await DataAPI.clockOut(user!);
        setStatus('offline');
    }
    setLoading(false);
  }

  // Calculate Stats
  const totalRevenue = sales.reduce((acc, curr) => acc + curr.total, 0);
  const totalSalesCount = sales.length;
  
  // Chart Data Preparation
  const serviceStats = services.map(srv => ({
      name: srv.name,
      value: sales.filter(s => s.serviceId === srv.id).length
  })).filter(i => i.value > 0);

  const salesData = sales.slice(-10).map((s, i) => ({
      name: `Sale ${i}`,
      amount: s.total
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-3xl font-bold text-white">Dashboard</h2>
            <p className="text-slate-400">Bem vindo de volta, {user?.username}</p>
        </div>
        
        <Button 
            onClick={toggleClock} 
            isLoading={loading}
            variant={status === 'working' ? 'danger' : 'primary'}
            className="shadow-lg"
        >
            <i className={`fas fa-${status === 'working' ? 'sign-out-alt' : 'clock'}`}></i>
            {status === 'working' ? 'Sair do Ponto' : 'Bater Ponto'}
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-primary">
            <div className="text-slate-400 text-sm uppercase font-bold">Total Vendas</div>
            <div className="text-3xl font-bold text-white mt-2">R$ {totalRevenue.toLocaleString()}</div>
            <div className="text-xs text-green-400 mt-1"><i className="fas fa-arrow-up"></i> +12% esse mês</div>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
            <div className="text-slate-400 text-sm uppercase font-bold">Serviços Realizados</div>
            <div className="text-3xl font-bold text-white mt-2">{totalSalesCount}</div>
            <div className="text-xs text-slate-500 mt-1">Últimos 30 dias</div>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
            <div className="text-slate-400 text-sm uppercase font-bold">Status Atual</div>
            <div className="text-3xl font-bold text-white mt-2 capitalize">{status}</div>
            <div className={`text-xs mt-1 ${status === 'working' ? 'text-green-400' : 'text-slate-500'}`}>
                {status === 'working' ? 'Online e Registrando' : 'Ponto Fechado'}
            </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Charts */}
        <Card title="Distribuição de Serviços">
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={serviceStats} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value">
                            {serviceStats.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
                {serviceStats.map((s, i) => (
                    <div key={i} className="flex items-center gap-1 text-xs text-slate-300">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length]}}></div>
                        {s.name}
                    </div>
                ))}
            </div>
        </Card>

        <Card title="Últimas Vendas">
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesData}>
                        <XAxis hide />
                        <YAxis stroke="#475569" />
                        <Tooltip cursor={{fill: '#334155'}} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }} />
                        <Bar dataKey="amount" fill="#f97316" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
      </div>

      {/* Logs Table (Only Manager/Owner) */}
      {(user?.role === 'gerente' || user?.role === 'dono') && (
        <Card title="Logs Recentes do Sistema">
            <div className="overflow-auto max-h-60">
                <table className="w-full text-sm text-left text-slate-300">
                    <thead className="text-xs uppercase bg-slate-700/50 sticky top-0">
                        <tr>
                            <th className="px-4 py-2">Hora</th>
                            <th className="px-4 py-2">Usuário</th>
                            <th className="px-4 py-2">Ação</th>
                            <th className="px-4 py-2">Detalhes</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map(log => (
                            <tr key={log.id} className="border-b border-slate-700/50 hover:bg-slate-800">
                                <td className="px-4 py-2 font-mono text-xs text-slate-500">
                                    {new Date(log.createdAt).toLocaleTimeString()}
                                </td>
                                <td className="px-4 py-2 font-bold text-slate-200">{log.performedBy}</td>
                                <td className="px-4 py-2">
                                    <span className="px-2 py-1 rounded-full bg-slate-700 text-xs text-slate-300 border border-slate-600">
                                        {log.action}
                                    </span>
                                </td>
                                <td className="px-4 py-2 text-slate-400">{log.details}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
