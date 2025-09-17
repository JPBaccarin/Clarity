import { invoke } from "@tauri-apps/api/core";
import { open } from '@tauri-apps/plugin-dialog';
import { useState } from "react";

type PreviewData = {
    category: string;
    count: number;
};

function App() {
    const [selectedPath, setSelectedPath] = useState('');
    const [preview, setPreview] = useState<PreviewData[]>([]);
    const [message, setMessage] = useState('');

    const handleSelectFolder = async () => {
        try {
            const result = await open({
                directory: true,
                multiple: false,
            });
            if (typeof result === 'string') {
                setSelectedPath(result);
                // Chama o comando do Rust para previsualizar
                const previewResult: [string, number][] = await invoke('preview_organisation', { path: result });
                const formattedPreview = previewResult.map(([category, count]) => ({ category, count }));
                setPreview(formattedPreview);
                setMessage('');
            }
        } catch (error) {
            setMessage(`Erro: ${error}`);
            setPreview([]);
        }
    };

    const handleOrganize = async () => {
        setMessage('Organizando arquivos...');
        try {
            await invoke('organise_files', { path: selectedPath });
            setMessage('Organização concluída com sucesso! 🎉');
            setPreview([]);
            setSelectedPath('');
        } catch (error) {
            setMessage(`Erro na organização: ${error}`);
        }
    };

    return (
        <div className="p-8 font-sans">
            <h1 className="text-3xl font-bold mb-4">Seu Organizador de Arquivos</h1>
            
            <div className="flex items-center space-x-4 mb-6">
                <button
                    onClick={handleSelectFolder}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition"
                >
                    Selecionar Pasta
                </button>
                {selectedPath && (
                    <span className="text-gray-600 truncate">{selectedPath}</span>
                )}
            </div>
            
            {preview.length > 0 && (
                <div className="bg-gray-100 p-4 rounded-md mb-6">
                    <h2 className="text-lg font-semibold mb-2">Prévia da Organização:</h2>
                    <ul className="list-disc list-inside">
                        {preview.map((item, index) => (
                            <li key={index}>
                                **{item.count}** arquivos de **{item.category}**
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            
            {selectedPath && preview.length > 0 && (
                <button
                    onClick={handleOrganize}
                    className="px-6 py-3 bg-green-500 text-white font-semibold rounded-md hover:bg-green-600 transition"
                >
                    Organizar Agora
                </button>
            )}
            
            {message && (
                <p className="mt-4 text-sm text-gray-800">{message}</p>
            )}
        </div>
    );
}

export default App;