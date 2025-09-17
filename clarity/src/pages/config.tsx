// src/components/Settings.tsx

import { useState, useEffect } from "react";

import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";

interface Config {
  categories: { [key: string]: string[] };
  safe_paths: string[];
  unsafe_paths: string[];
}

const Settings = () => {
  const [config, setConfig] = useState<Config | null>(null);
  const [message, setMessage] = useState("");
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const currentConfig: Config = await invoke("get_current_config");
        setConfig(currentConfig);
      } catch (e) {
        setMessage(`Erro ao carregar a configuração: ${e}`);
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async () => {
    if (!config) return;
    try {
      await invoke("save_app_config", { newConfig: config });
      setMessage("Configuração salva com sucesso! 🎉");
    } catch (e) {
      setMessage(`Erro ao salvar a configuração: ${e}`);
    }
  };

  const handleAddCategory = () => {
    if (config) {
      const newConfig = { ...config };
      const newName = `Nova Categoria ${Object.keys(newConfig.categories).length + 1}`;
      newConfig.categories[newName] = [];
      setConfig(newConfig);
      setEditingCategory(newName);
      setNewCategoryName(newName);
    }
  };

  const handleRemoveCategory = (categoryToRemove: string) => {
    if (config) {
      const newConfig = { ...config };
      delete newConfig.categories[categoryToRemove];
      setConfig(newConfig);
    }
  };

  const handleStartEditing = (categoryName: string) => {
    setEditingCategory(categoryName);
    setNewCategoryName(categoryName);
  };

  const handleConfirmEdit = (oldName: string) => {
    if (config && newCategoryName.trim() !== "" && oldName !== newCategoryName) {
      const newConfig = { ...config };
      const exts = newConfig.categories[oldName];
      delete newConfig.categories[oldName];
      newConfig.categories[newCategoryName] = exts;
      setConfig(newConfig);
    }
    setEditingCategory(null);
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
  };

  const handleExtensionsChange = (category: string, extensions: string) => {
    if (config) {
      const newConfig = { ...config };
      newConfig.categories[category] = extensions.split(",").map((ext) => ext.trim());
      setConfig(newConfig);
    }
  };

  const handleAddSafePath = async () => {
    if (config) {
      try {
        const result = await open({
          directory: true,
          multiple: true,
          title: "Adicionar Pasta Segura",
        });
        if (result && Array.isArray(result)) {
          const newConfig = { ...config };
          newConfig.safe_paths = [...newConfig.safe_paths, ...result];
          setConfig(newConfig);
        }
      } catch (e) {
        setMessage(`Erro ao adicionar pasta: ${e}`);
      }
    }
  };

  const handleRemoveSafePath = (pathToRemove: string) => {
    if (config) {
      const newConfig = { ...config };
      newConfig.safe_paths = newConfig.safe_paths.filter((p) => p !== pathToRemove);
      setConfig(newConfig);
    }
  };

  if (!config) {
    return <div>Carregando configurações...</div>;
  }

  return (
    <div className="p-8 font-sans">
      <h1 className="text-3xl font-bold mb-4">Configurações</h1>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">Categorias de Arquivos</h2>
          {Object.entries(config.categories).map(([category, extensions]) => (
            <div key={category} className="mb-4 p-4 border rounded-md">
              <div className="flex items-center justify-between mb-2">
                {editingCategory === category ? (
                  <div className="flex items-center space-x-2 w-full">
                    <input
                     aria-label="input"
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onBlur={() => handleConfirmEdit(category)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleConfirmEdit(category);
                        if (e.key === "Escape") handleCancelEdit();
                      }}
                      className="font-bold text-lg p-1 border rounded-md focus:border-blue-500 outline-none flex-grow"
                      autoFocus
                    />
                    <button
                      onClick={() => handleConfirmEdit(category)}
                      className="text-green-500 hover:text-green-700 transition"
                    >
                      ✓
                    </button>
                    <button onClick={handleCancelEdit} className="text-red-500 hover:text-red-700 transition">
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-lg">{category}</span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleStartEditing(category)}
                        className="text-blue-500 hover:text-blue-700 transition"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleRemoveCategory(category)}
                        className="text-red-500 hover:text-red-700 transition"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-gray-600 mb-2">Extensões (separadas por vírgula, ex: jpg, png):</p>
              <input
              title="teste"
                type="text"
                value={extensions.join(", ")}
                onChange={(e) => handleExtensionsChange(category, e.target.value)}
                className="w-full p-2 border rounded-md focus:border-blue-500 outline-none"
              />
            </div>
          ))}
          <button onClick={handleAddCategory} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 transition">
            + Adicionar Nova Categoria
          </button>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">Pastas Seguras</h2>
          <ul className="list-disc list-inside space-y-1">
            {config.safe_paths.map((path, index) => (
              <li key={index} className="flex justify-between items-center text-gray-700">
                <span>{path}</span>
                <button
                  onClick={() => handleRemoveSafePath(path)}
                  className="text-red-500 hover:text-red-700 transition"
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
          <button
            onClick={handleAddSafePath}
            className="mt-4 px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 transition"
          >
            + Adicionar Pasta
          </button>
        </div>
      </div>

      <div className="mt-8">
        <button
          onClick={handleSave}
          className="px-6 py-3 bg-green-500 text-white font-semibold rounded-md hover:bg-green-600 transition"
        >
          Salvar Configurações
        </button>
        {message && <p className="mt-2 text-sm text-gray-800">{message}</p>}
      </div>
    </div>
  );
};

export default Settings;
