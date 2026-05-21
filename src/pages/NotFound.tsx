import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center text-center p-6">
      <p className="text-[#22c55e] text-7xl font-bold mb-4">404</p>
      <h1 className="text-white text-2xl font-semibold mb-2">Page not found</h1>
      <p className="text-[#52525b] text-sm mb-8">The page you're looking for doesn't exist.</p>
      <Link to="/" className="inline-flex items-center gap-2 bg-[#22c55e] hover:bg-[#16a34a] text-white font-medium px-5 py-2.5 rounded-xl transition-colors">
        <Home className="w-4 h-4" /> Go Home
      </Link>
    </div>
  );
}
