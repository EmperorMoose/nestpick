import { Routes, Route, NavLink } from "react-router-dom";
import { Home, GitCompareArrows, Map } from "lucide-react";
import { cn } from "@/lib/utils";
import DashboardPage from "@/pages/DashboardPage";
import PropertyPage from "@/pages/PropertyPage";
import ComparisonPage from "@/pages/ComparisonPage";

function NavItem({ to, icon: Icon, label }: { to: string; icon: typeof Home; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
          isActive ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
        )
      }
    >
      <Icon size={18} />
      {label}
    </NavLink>
  );
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-semibold text-lg text-blue-700">House Dashboard</span>
          <nav className="flex items-center gap-1">
            <NavItem to="/" icon={Home} label="Properties" />
            <NavItem to="/compare" icon={GitCompareArrows} label="Compare" />
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/property/:id" element={<PropertyPage />} />
          <Route path="/compare" element={<ComparisonPage />} />
        </Routes>
      </main>
    </div>
  );
}
