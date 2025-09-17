import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import Settings from "./pages/config";

function App() {
  const [view, setView] = useState("main"); // 'main' ou 'settings'
  const [folderPath, setFolderPath] = useState("");
  const [previewData, setPreviewData] = useState<[string, number][]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

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
      const data: [string, number][] = await invoke("preview_organisation", { path });
      setPreviewData(data);
      setMessage(`Pré-visualização gerada para ${data.reduce((acc, [, count]) => acc + count, 0)} arquivos.`);
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

  if (view === "settings") {
    return (
      <div className="p-8 font-sans">
        <button
          onClick={() => setView("main")}
          className="mb-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
        >
          &lt; Voltar
        </button>
        <Settings />
      </div>
    );
  }

  return (
    <div className="p-8 font-sans">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Organizador de Arquivos</h1>
        <button
          onClick={() => setView("settings")}
          className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 transition"
        >
          Configurações
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={folderPath}
            placeholder="Nenhuma pasta selecionada"
            readOnly
            className="flex-grow p-2 border rounded-md bg-gray-100 text-gray-700"
          />
          <button
            onClick={handleSelectFolder}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
          >
            Selecionar Pasta
          </button>
        </div>

        {folderPath && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-2">Pré-visualização</h2>
            {loading ? (
              <p>Carregando...</p>
            ) : previewData.length > 0 ? (
              <ul className="list-disc list-inside space-y-1">
                {previewData.map(([category, count]) => (
                  <li key={category} className="text-gray-700">
                    <span className="font-medium">{category}:</span> {count} arquivo(s)
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">Nenhum arquivo encontrado para organizar com base nas suas categorias.</p>
            )}

            <button
              onClick={handleOrganize}
              disabled={loading || previewData.length === 0}
              className="mt-4 w-full px-4 py-2 bg-green-500 text-white font-semibold rounded-md hover:bg-green-600 transition disabled:bg-gray-400"
            >
              Organizar Arquivos
            </button>
          </div>
        )}
      </div>

      {message && <p className="mt-4 text-center text-sm font-medium text-gray-700">{message}</p>}
    </div>
  );
}

export default App;
