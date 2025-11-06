import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Clock } from "lucide-react";

type Phase = "selection" | "question" | "completed";
type Difficulty = "mudah" | "sedang" | "sulit";

const SELECTION_TIME = 30; // 30 seconds
const QUESTION_TIME = 600; // 10 minutes
const SETS = ["A", "B", "C", "D", "E", "F"];

const DIFFICULTY_INFO = {
  mudah: { label: "Mudah (Easy)", correct: 5, wrong: -1, color: "bg-green-500" },
  sedang: { label: "Sedang (Medium)", correct: 8, wrong: -2, color: "bg-yellow-500" },
  sulit: { label: "Sulit (Hard)", correct: 15, wrong: -4, color: "bg-red-500" },
};

export default function OlympiadCompetition() {
  const { sessionToken } = useParams<{ sessionToken: string }>();
  const [, setLocation] = useLocation();
  
  const [phase, setPhase] = useState<Phase>("selection");
  const [currentRound, setCurrentRound] = useState(1);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null);
  const [timer, setTimer] = useState(SELECTION_TIME);
  const [totalScore, setTotalScore] = useState(0);
  const [randomizedSet, setRandomizedSet] = useState<string>("");
  const [sessionLoading, setSessionLoading] = useState(true);

  // Queries
  const sessionQuery = trpc.olympiad.getSession.useQuery(
    { sessionToken: sessionToken || "" },
    { enabled: !!sessionToken }
  );

  const selectDifficultyMutation = trpc.olympiad.selectDifficulty.useMutation();
  const advanceRoundMutation = trpc.olympiad.advanceToNextRound.useMutation();
  const questionImageQuery = trpc.olympiad.getQuestionImage.useQuery(
    {
      set: randomizedSet,
      difficulty: selectedDifficulty || "sulit",
    },
    { enabled: phase === "question" && !!randomizedSet && !!selectedDifficulty }
  );

  // Initialize session and randomize set
  useEffect(() => {
    if (sessionQuery.data?.found && sessionQuery.data.session) {
      const session = sessionQuery.data.session;
      setCurrentRound(session.currentRound);
      setTotalScore(session.totalScore);
      setPhase(session.currentPhase as Phase);
      
      // Randomize set based on round
      const randomIndex = Math.floor(Math.random() * SETS.length);
      setRandomizedSet(SETS[randomIndex]);
      setSessionLoading(false);
    }
  }, [sessionQuery.data]);

  // Timer effect
  useEffect(() => {
    if (sessionLoading) return;

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          // Time's up
          if (phase === "selection") {
            // Auto-select "sulit" if no selection made
            if (!selectedDifficulty) {
              handleSelectDifficulty("sulit");
            }
          } else if (phase === "question") {
            // Move to next round
            handleAdvanceRound();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, selectedDifficulty, sessionLoading]);

  // Update timer based on phase
  useEffect(() => {
    if (phase === "selection") {
      setTimer(SELECTION_TIME);
    } else if (phase === "question") {
      setTimer(QUESTION_TIME);
    }
  }, [phase]);

  const handleSelectDifficulty = async (difficulty: Difficulty) => {
    setSelectedDifficulty(difficulty);
    try {
      await selectDifficultyMutation.mutateAsync({
        sessionToken: sessionToken || "",
        difficulty,
      });
      setPhase("question");
    } catch (error) {
      console.error("Failed to select difficulty:", error);
    }
  };

  const handleAdvanceRound = async () => {
    try {
      const result = await advanceRoundMutation.mutateAsync({
        sessionToken: sessionToken || "",
      });

      if ("completed" in result && result.completed) {
        setPhase("completed");
      } else if ("round" in result && result.round) {
        setCurrentRound(result.round as number);
        setSelectedDifficulty(null);
        setPhase("selection");
        // Randomize new set
        const randomIndex = Math.floor(Math.random() * SETS.length);
        setRandomizedSet(SETS[randomIndex]);
      }
    } catch (error) {
      console.error("Failed to advance round:", error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (sessionLoading || sessionQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-600 mb-4" />
          <p className="text-gray-700">Memuat sesi kompetisi...</p>
        </div>
      </div>
    );
  }

  if (!sessionQuery.data?.found) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-red-600 font-semibold mb-4">Session tidak ditemukan</p>
            <Button onClick={() => setLocation("/token")} className="w-full">
              Kembali ke Token Entry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-blue-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">PDC Math Olympiad</h1>
              <p className="text-blue-100">Math Jeopardy</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-2xl font-bold mb-2">
                <Clock className="h-6 w-6" />
                {formatTime(timer)}
              </div>
              <p className="text-sm text-blue-100">Round {currentRound}/6</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {phase === "selection" && (
          <div className="max-w-2xl mx-auto">
            <Card className="shadow-lg">
              <CardContent className="pt-8">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    Pilih Tingkat Kesulitan
                  </h2>
                  <p className="text-gray-600">
                    Anda memiliki {SELECTION_TIME} detik untuk memilih
                  </p>
                  <div className="text-4xl font-bold text-blue-600 mt-4">
                    {formatTime(timer)}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(Object.entries(DIFFICULTY_INFO) as Array<[Difficulty, typeof DIFFICULTY_INFO[Difficulty]]>).map(
                    ([key, info]) => (
                      <Button
                        key={key}
                        onClick={() => handleSelectDifficulty(key)}
                        disabled={selectDifficultyMutation.isPending}
                        className={`h-auto py-6 flex flex-col items-center gap-2 ${info.color} hover:opacity-90 text-white font-semibold`}
                      >
                        <span className="text-lg">{info.label}</span>
                        <span className="text-sm">
                          Benar: +{info.correct} | Salah: {info.wrong}
                        </span>
                      </Button>
                    )
                  )}
                </div>

                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                  <p className="font-semibold mb-1">Catatan:</p>
                  <p>
                    Jika Anda tidak memilih dalam {SELECTION_TIME} detik, sistem akan
                    secara otomatis memilih tingkat kesulitan "Sulit" untuk Anda.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {phase === "question" && (
          <div className="max-w-4xl mx-auto">
            <Card className="shadow-lg mb-6">
              <CardContent className="pt-8">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    {selectedDifficulty && DIFFICULTY_INFO[selectedDifficulty].label}
                  </h2>
                  <p className="text-gray-600 mb-4">
                    Set {randomizedSet} - Round {currentRound}/6
                  </p>
                  <div className="text-4xl font-bold text-blue-600">
                    {formatTime(timer)}
                  </div>
                </div>

                {/* Question Image Display */}
                {questionImageQuery.data?.imagePath && (
                  <div className="flex justify-center mb-8">
                    <img
                      src={questionImageQuery.data.imagePath}
                      alt={`Question ${randomizedSet}${selectedDifficulty}`}
                      className="max-w-full h-auto rounded-lg shadow-md border-4 border-gray-200"
                      style={{ maxHeight: "500px" }}
                    />
                  </div>
                )}

                {questionImageQuery.isLoading && (
                  <div className="flex justify-center py-16">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                  </div>
                )}

                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <p className="text-gray-700 font-semibold">
                    Soal sedang ditampilkan. Silakan kerjakan soal ini.
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    Waktu akan otomatis berlanjut ke round berikutnya ketika waktu habis.
                  </p>
                </div>

                <div className="mt-6 text-center">
                  <Button
                    onClick={handleAdvanceRound}
                    disabled={advanceRoundMutation.isPending}
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold"
                  >
                    {advanceRoundMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Memproses...
                      </>
                    ) : (
                      "Lanjut ke Round Berikutnya"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Score Display */}
            <Card className="shadow-lg">
              <CardContent className="pt-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-gray-600 text-sm">Total Skor</p>
                    <p className="text-3xl font-bold text-blue-600">{totalScore}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Round Saat Ini</p>
                    <p className="text-3xl font-bold text-indigo-600">{currentRound}/6</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Tingkat Kesulitan</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {selectedDifficulty && DIFFICULTY_INFO[selectedDifficulty].label.split(" ")[0]}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {phase === "completed" && (
          <div className="max-w-2xl mx-auto">
            <Card className="shadow-lg">
              <CardContent className="pt-8 text-center">
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-gray-800 mb-4">
                    Kompetisi Selesai!
                  </h2>
                  <p className="text-gray-600 mb-8">
                    Terima kasih telah mengikuti PDC Math Olympiad
                  </p>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-8 rounded-lg mb-8">
                  <p className="text-gray-600 text-sm mb-2">Total Skor Akhir</p>
                  <p className="text-5xl font-bold text-blue-600">{totalScore}</p>
                </div>

                <Button
                  onClick={() => setLocation("/token")}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 h-auto"
                  size="lg"
                >
                  Kembali ke Token Entry
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
