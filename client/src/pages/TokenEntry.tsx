import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";

export default function TokenEntry() {
  const [token, setToken] = useState("");
  const [, setLocation] = useLocation();
  const [error, setError] = useState("");

  const validateTokenMutation = trpc.olympiad.validateToken.useMutation();
  const startSessionMutation = trpc.olympiad.startSession.useMutation();

  const handleStartCompetition = async () => {
    if (!token || !token.trim()) {
      setError("Token harus diisi");
      return;
    }

    try {
      setError("");
      
      // Validate token first
      const validation = await validateTokenMutation.mutateAsync({ token });
      if (!validation.valid) {
        setError(validation.message);
        return;
      }

      // Start session
      const session = await startSessionMutation.mutateAsync({ token });
      if (session.success && "sessionToken" in session && session.sessionToken) {
        setLocation(`/competition/${session.sessionToken}`);
      } else {
        setError("message" in session && session.message ? session.message : "Gagal memulai sesi");
      }
    } catch (err) {
      setError("Terjadi kesalahan saat memproses token");
      console.error(err);
    }
  };

  const isLoading = validateTokenMutation.isPending || startSessionMutation.isPending;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-blue-600">PDC Math Olympiad</CardTitle>
          <CardDescription className="text-lg mt-2">Math Jeopardy</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Masukkan Token Kompetisi
            </label>
            <Input
              type="text"
              placeholder="Contoh: OS2J8U"
              value={token || ""}
              onChange={(e) => {
                setToken(e.target.value.toUpperCase());
                setError("");
              }}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleStartCompetition();
                }
              }}
              disabled={isLoading}
              className="text-center text-lg font-mono tracking-widest"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          <Button
            onClick={handleStartCompetition}
              disabled={isLoading || !token || !token.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 h-auto"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Memproses...
              </>
            ) : (
              "Mulai Kompetisi"
            )}
          </Button>

          <div className="text-center text-xs text-gray-500 pt-4 border-t">
            <p>Sistem Kompetisi Matematika</p>
            <p>6 Set Soal dengan Tingkat Kesulitan Berbeda</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
