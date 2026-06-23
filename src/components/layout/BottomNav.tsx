import { LayoutDashboard, ArrowLeftRight, Users, Plus, Menu } from 'lucide-react'
import type { View } from '@/lib/types'

interface BottomNavProps {
  currentView: View;
  onNavigate: (view: View) => void;
}

export function BottomNav({ currentView, onNavigate }: BottomNavProps) {
  const navItem = (id: View, icon: React.ReactNode, label: string) => {
    const isActive = currentView === id;
    return (
      <button 
        onClick={() => onNavigate(id)} 
        className={`flex flex-col items-center gap-1.5 transition w-12 ${isActive ? 'text-white' : 'text-zinc-400 hover:text-white'}`}
      >
        {icon}
        <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
      </button>
    );
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 w-full z-50">
      <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex justify-center">
        <button className="w-14 h-14 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-[0_8px_20px_rgba(250,250,250,0.25)] active:scale-95 transition-transform">
          <Plus className="w-6 h-6" />
        </button>
      </div>
      
      <nav className="glass-card border-t border-border flex justify-between px-6 py-3 pb-safe">
        {navItem('dashboard', <LayoutDashboard className={`w-5 h-5 ${currentView === 'dashboard' ? 'text-primary' : ''}`} />, 'Início')}
        
        <div className="mr-8">
          {navItem('transactions', <ArrowLeftRight className="w-5 h-5" />, 'Trans.')}
        </div>
        
        <div className="ml-8">
          {navItem('receivables', <Users className="w-5 h-5" />, 'Rateio')}
        </div>
        
        {/* Usamos 'settings' ou um modal de menu geral para o botão da direita no mobile */}
        {navItem('settings', <Menu className="w-5 h-5" />, 'Menu')}
      </nav>
    </div>
  )
}
