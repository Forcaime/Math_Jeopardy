import { useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Redirect to token entry page
    setLocation("/token");
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-600 mb-4" />
        <p className="text-gray-700">Memuat sistem kompetisi...</p>
      </div>
    </div>
  );
}
