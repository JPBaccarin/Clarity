import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import Settings from "./pages/config";

// Importações dos componentes Shadcn/UI e ícones
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Settings as SettingsIcon, ArrowLeft, Folder } from "lucide-react";
import { ModeToggle } from "./components/ui/mode-toggle";

function App() {
  const [view, setView] = useState("main"); // 'main' ou 'settings'
  const [folderPath, setFolderPath] = useState("");
  const [previewData, setPreviewData] = useState<[string, number][]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // ... (suas funções handleSelectFolder, handlePreview, handleOrganize permanecem exatamente as mesmas)
  const handleSelectFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Selecione a pasta para organizar",
      });
      if (selected && typeof selected === "string") {
        setFolderPath(selected);
        await handlePreview(selected);
      }
    } catch (e) {
      setMessage(`Erro ao selecionar a pasta: ${e}`);
    }
  };

  const handlePreview = async (path: string) => {
    setLoading(true);
    setMessage("");
    try {
      const data: [string, number][] = await invoke("preview_organisation", {
        path,
      });
      setPreviewData(data);
      if (data.length > 0) {
        setMessage(`Pré-visualização gerada para ${data.reduce((acc, [, count]) => acc + count, 0)} arquivos.`);
      } else {
        setMessage("Nenhum arquivo correspondente às suas regras foi encontrado na pasta.");
      }
    } catch (e) {
      setMessage(`Erro ao pré-visualizar: ${e}`);
      setPreviewData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOrganize = async () => {
    setLoading(true);
    setMessage("");
    try {
      await invoke("organise_files", { path: folderPath });
      setMessage("Arquivos organizados com sucesso! ✨");
      setPreviewData([]); // Limpa a pré-visualização após a organização
    } catch (e) {
      setMessage(`Erro ao organizar: ${e}`);
    } finally {
      setLoading(false);
    }
  };

  // View de Configurações
  if (view === "settings") {
    return (
      <div className="bg-background min-h-screen h-full">
        <div className="container text-foreground  mx-auto p-4 sm:p-8">
          <div className=" flex justify-between">
            <Button variant="outline" onClick={() => setView("main")} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
            <ModeToggle />
          </div>
          <Settings />
        </div>
      </div>
    );
  }

  // View Principal
  return (
    <div className="bg-background h-screen">
      <div className="container text-foreground  mx-auto p-4 sm:p-8">
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-3xl text-foreground font-bold tracking-tight">Organizador de Arquivos</h1>
          <Button variant="outline" size="icon" onClick={() => setView("settings")}>
            <SettingsIcon className="h-4 w-4" />
          </Button>
        </header>

        <main className="space-y-4">
          <div className="flex w-full items-center space-x-2">
            <Input
              type="text"
              value={folderPath}
              placeholder="Nenhuma pasta selecionada"
              readOnly
              className="cursor-default"
            />
            <Button onClick={handleSelectFolder}>
              <Folder className="mr-2 h-4 w-4" />
              Selecionar Pasta
            </Button>
          </div>

          {folderPath && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Pré-visualização da Organização</CardTitle>
              </CardHeader>
              <CardContent>
                {loading && previewData.length === 0 ? (
                  <div className="flex justify-center items-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : previewData.length > 0 ? (
                  <ul className="space-y-2">
                    {previewData.map(([category, count]) => (
                      <li key={category} className="text-sm text-muted-foreground flex justify-between">
                        <span>{category}</span>
                        <span className="font-medium text-foreground">{count} arquivo(s)</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-center text-muted-foreground p-8">
                    Nenhum arquivo encontrado para organizar com base nas suas categorias.
                  </p>
                )}

                <Button onClick={handleOrganize} disabled={loading || previewData.length === 0} className="w-full mt-6">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Organizar Arquivos
                </Button>
              </CardContent>
            </Card>
          )}
        </main>

        {message && <p className="mt-4 text-center text-sm text-muted-foreground">{message}</p>}
      </div>
    </div>
  );
}

export default App;
