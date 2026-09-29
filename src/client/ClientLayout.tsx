import { Outlet } from 'react-router-dom';
import ClientHeader from './components/ClientHeader';
import ClientFooter from './components/ClientFooter';
import ChatbotWidget from './components/ChatbotWidget';

const ClientLayout = () => {
  return (
    <div className="client-theme min-h-screen flex flex-col bg-background text-foreground">
      <ClientHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <ClientFooter />
      <ChatbotWidget />
    </div>
  );
};

export default ClientLayout;
