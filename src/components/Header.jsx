import { useAuth } from "../contexts/AuthContext";
import { LogOut } from "lucide-react";

export default function Header() {
  const { user, signOut } = useAuth();

  return (
    <header className="bg-surface border-b border-border-custom sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo / Título */}
        <img
          src="https://atxpazzxrnbmxepilmnq.supabase.co/storage/v1/object/public/src/campos_core_logo.png"
          alt="Campos Core"
          className="h-8 max-w-[120px] rounded-lg object-contain"
        />

        {/* Usuário + Sair */}
        {user && (
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm text-text-secondary truncate max-w-[180px]">
              {user.email}
            </span>
            <button
              onClick={signOut}
              className="p-2 rounded-lg hover:bg-surface-alt text-text-secondary hover:text-error transition-colors"
              title="Sair"
            >
              <LogOut size={18} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
