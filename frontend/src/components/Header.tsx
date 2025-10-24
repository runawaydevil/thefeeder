import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

const API_BASE = import.meta.env.VITE_API_URL || '';

async function fetchConfig() {
  const response = await fetch(`${API_BASE}/api/config`);
  if (!response.ok) throw new Error('Failed to fetch config');
  return response.json();
}

export default function Header() {
  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: fetchConfig,
  });

  return (
    <header className="border-b border-border bg-bg">
      <div className="container mx-auto px-4 py-4 max-w-7xl">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img 
              src="/logo.png" 
              alt="Logo" 
              style={{ height: '72px', width: '72px' }}
            />
            <span className="text-xl font-bold text-fg">
              {config?.app_name || 'Pablo Feeds'}
            </span>
          </Link>
          
          <nav className="flex items-center gap-4">
            <Link
              to="/"
              className="text-muted hover:text-accent transition-colors"
            >
              Timeline
            </Link>
            <Link
              to="/explore"
              className="text-muted hover:text-accent transition-colors"
            >
              Explore
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}

