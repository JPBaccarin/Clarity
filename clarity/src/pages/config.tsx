import { useState, useEffect } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";

// Importação da biblioteca Sonner e o componente Toaster
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

// Componentes Shadcn/UI (e outros que já estavam)
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Ícones Lucide
import { Loader2, Save, PlusCircle, Pencil, Trash2, Check, X, FolderPlus } from "lucide-react";

interface Config {
  categories: { [key: string]: string[] };
  safe_paths: string[];
  unsafe_paths: string[];
}

const Settings = () => {
  const [config, setConfig] = useState<Config | null>(null);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const currentConfig: Config = await invoke("get_current_config");
        setConfig(currentConfig);
      } catch (e) {
        toast.error(`Não foi possível carregar a configuração: ${e}`, {
          description: "Verifique as permissões de arquivo.",
        });
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async () => {
    if (!config || isSaving) return;
    setIsSaving(true);
    try {
      await invoke("save_app_config", { newConfig: config });
      toast.success("Configuração salva com sucesso! 🎉", {
        description: "Suas alterações foram aplicadas e salvas no disco.",
      });
    } catch (e) {
      toast.error(`Não foi possível salvar a configuração: ${e}`, {
        description: "Tente novamente ou verifique as permissões.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCategory = () => {
    if (!config) return;
    const newConfig = { ...config };
    const newName = `Nova Categoria ${Object.keys(newConfig.categories).length + 1}`;
    newConfig.categories[newName] = [];
    setConfig(newConfig);
    setEditingCategory(newName);
    setNewCategoryName(newName);
  };

  const handleRemoveCategory = (categoryToRemove: string) => {
    if (!config) return;
    const newConfig = { ...config };
    delete newConfig.categories[categoryToRemove];
    setConfig(newConfig);
    toast.info(`A categoria "${categoryToRemove}" foi removida.`, {
      description: "Lembre-se de salvar para aplicar as mudanças.",
    });
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

  const handleExtensionsChange = (category: string, extensions: string) => {
    if (!config) return;
    const newConfig = { ...config };
    newConfig.categories[category] = extensions.split(",").map((ext) => ext.trim().replace(".", ""));
    setConfig(newConfig);
  };

  const handleAddSafePath = async () => {
    if (!config) return;
    try {
      const result = await open({ directory: true, multiple: true, title: "Adicionar Pasta Segura" });
      if (result && Array.isArray(result)) {
        const uniqueNewPaths = result.filter((path) => !config.safe_paths.includes(path));
        if (uniqueNewPaths.length === 0) {
          toast.info("Nenhuma nova pasta foi adicionada.", {
            description: "As pastas selecionadas já estão na lista.",
          });
          return;
        }

        const newConfig = { ...config, safe_paths: [...config.safe_paths, ...uniqueNewPaths] };
        setConfig(newConfig);
        toast.success(`${uniqueNewPaths.length} novas pastas seguras foram adicionadas.`, {
          description: "O organizador agora pode mover arquivos para estes locais.",
        });
      }
    } catch (e) {
      toast.error(`Erro ao adicionar pasta: ${e}`);
    }
  };

  const handleRemoveSafePath = (pathToRemove: string) => {
    if (!config) return;
    const newConfig = { ...config, safe_paths: config.safe_paths.filter((p) => p !== pathToRemove) };
    setConfig(newConfig);
    toast.info("A pasta segura foi removida da lista.");
  };

  if (!config) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      {/* Componente Toaster adicionado aqui! */}
      <Toaster />
      <TooltipProvider>
        <div className="space-y-8">
          {/* Seção de Categorias */}
          <section>
            <h2 className="text-2xl font-semibold tracking-tight mb-4">Categorias de Arquivos</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {Object.entries(config.categories).map(([category, extensions]) => (
                <Card key={category}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      {editingCategory === category ? (
                        <div className="flex items-center gap-2 w-full ">
                          <Input
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleConfirmEdit(category);
                              if (e.key === "Escape") setEditingCategory(null);
                            }}
                            autoFocus
                            className="text-lg font-semibold"
                          />
                          <Button variant="ghost" size="icon" onClick={() => handleConfirmEdit(category)}>
                            <Check className="h-4 w-4 text-green-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setEditingCategory(null)}>
                            <X className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <CardTitle>{category}</CardTitle>
                          <div className="flex items-center gap-1 ">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => handleStartEditing(category)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Editar Nome</p>
                              </TooltipContent>
                            </Tooltip>
                            <AlertDialog>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </AlertDialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Remover Categoria</p>
                                </TooltipContent>
                              </Tooltip>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação não pode ser desfeita. Isso removerá permanentemente a categoria "{category}
                                    ".
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleRemoveCategory(category)}>
                                    Continuar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Label className="mb-2" htmlFor={`exts-${category}`}>Extensões (separadas por vírgula)</Label>
                    <Input
                      id={`exts-${category}`}
                      placeholder="ex: jpg, png, gif"
                      value={extensions.join(", ")}
                      onChange={(e) => handleExtensionsChange(category, e.target.value)}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
            <Button variant="outline" onClick={handleAddCategory} className="mt-4">
              <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Categoria
            </Button>
          </section>

          {/* Seção de Pastas Seguras */}
          <section>
            <Card>
              <CardHeader>
                <CardTitle>Pastas Seguras</CardTitle>
                <CardDescription>
                  O organizador não moverá arquivos para pastas que não estejam nesta lista. Isso evita a criação de
                  pastas em locais indesejados.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {config.safe_paths.length > 0 ? (
                  <ul className="space-y-2">
                    {config.safe_paths.map((path) => (
                      <li key={path} className="flex items-center justify-between p-2 border  rounded-md text-sm">
                        <span className="font-mono truncate pr-4">{path}</span>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover pasta segura?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja remover a pasta "{path}" da lista de locais seguros?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRemoveSafePath(path)}>Remover</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-center text-muted-foreground py-4">Nenhuma pasta segura adicionada.</p>
                )}
              </CardContent>
              <CardFooter>
                <Button variant="outline" onClick={handleAddSafePath}>
                  <FolderPlus className="mr-2 h-4 w-4" /> Adicionar Pasta Segura
                </Button>
              </CardFooter>
            </Card>
          </section>

          {/* Ações Finais */}
          <footer className="flex justify-end pt-4  -t">
            <Button onClick={handleSave} size="lg" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Salvar Configurações
                </>
              )}
            </Button>
          </footer>
        </div>
      </TooltipProvider>
    </>
  );
};

export default Settings;
