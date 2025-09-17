#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::fs; // Importa a API de sistema de arquivos do Rust padrão
use tauri::Manager;

// Definindo categorias fixas
fn get_categories() -> HashMap<&'static str, Vec<&'static str>> {
    let mut categories = HashMap::new();
    categories.insert("Images", vec!["jpg", "jpeg", "png", "gif", "bmp", "svg"]);
    categories.insert(
        "Documents",
        vec!["pdf", "docx", "doc", "txt", "xlsx", "pptx"],
    );
    categories.insert("Videos", vec!["mp4", "mov", "avi", "mkv"]);
    categories.insert("Audio", vec!["mp3", "wav", "flac"]);
    categories.insert("Archives", vec!["zip", "rar", "7z"]);
    categories
}

fn get_file_category(extension: &str) -> Option<String> {
    let categories = get_categories();
    for (category, extensions) in categories.iter() {
        if extensions.contains(&extension.to_lowercase().as_str()) {
            return Some(category.to_string());
        }
    }
    None
}

// Função auxiliar para verificar se um caminho é seguro
fn is_safe_path(path: &Path) -> bool {
    let unsafe_paths = [
        "/Windows",
        "/Program Files",
        "/Program Files (x86)",
        "/System32",
        "/Users/*/AppData",
        "/etc",
        "/bin",
        "/sbin",
        "/usr/bin",
        "/usr/sbin",
    ];

    for unsafe_path in unsafe_paths {
        if path.starts_with(unsafe_path) || path.ends_with(unsafe_path) {
            return false;
        }
    }
    true
}

// Comando para previsualizar a organização
#[tauri::command]
async fn preview_organisation(path: &str) -> Result<Vec<(String, usize)>, String> {
    let path_buf = PathBuf::from(path);

    if !is_safe_path(&path_buf) {
        return Err(format!("Caminho {} é protegido pelo sistema.", path));
    }

    let mut preview_data = HashMap::new();

    // AQUI: Usando fs::read_dir do Rust padrão, conforme a documentação do Tauri 2.0.
    match fs::read_dir(&path_buf) {
        Ok(entries) => {
            for entry in entries {
                match entry {
                    Ok(entry) => {
                        if entry.path().is_file() {
                            if let Some(extension) = entry.path().extension().and_then(|e| e.to_str()) {
                                if let Some(category) = get_file_category(extension) {
                                    *preview_data.entry(category).or_insert(0) += 1;
                                }
                            }
                        }
                    }
                    Err(e) => return Err(format!("Erro ao ler entrada: {}", e)),
                }
            }
        }
        Err(e) => return Err(format!("Erro ao acessar diretório: {}", e)),
    };

    Ok(preview_data.into_iter().collect())
}

// Comando para organizar os arquivos
#[tauri::command]
async fn organise_files(path: &str) -> Result<(), String> {
    let path_buf = PathBuf::from(path);

    if !is_safe_path(&path_buf) {
        return Err(format!("Caminho {} é protegido pelo sistema.", path));
    }

    let categories = get_categories();

    // Criar subpastas para cada categoria
    for category in categories.keys() {
        let category_path = path_buf.join(category);
        if !category_path.exists() {
            if let Err(e) = fs::create_dir(&category_path) {
                return Err(format!("Erro ao criar pasta {}: {}", category, e));
            }
        }
    }

    // Mover arquivos para suas respectivas pastas
    // AQUI: Usando fs::read_dir do Rust padrão.
    match fs::read_dir(&path_buf) {
        Ok(entries) => {
            for entry in entries {
                match entry {
                    Ok(entry) => {
                        if entry.path().is_file() {
                            if let Some(extension) = entry.path().extension().and_then(|e| e.to_str()) {
                                if let Some(category) = get_file_category(extension) {
                                    let source_path = entry.path();
                                    let file_name = source_path
                                        .file_name()
                                        .ok_or_else(|| "Erro ao obter nome do arquivo")?;
                                    let destination_path = path_buf.join(category).join(file_name);

                                    if let Err(e) = fs::rename(&source_path, &destination_path) {
                                        return Err(format!("Erro ao mover arquivo: {}", e));
                                    }
                                }
                            }
                        }
                    }
                    Err(e) => return Err(format!("Erro ao ler entrada: {}", e)),
                }
            }
        }
        Err(e) => return Err(format!("Erro ao acessar diretório: {}", e)),
    };

    Ok(())
}

fn main() {
    tauri::Builder::default()
        // Plugins de `dialog` e `fs` são importantes, então os mantenha aqui
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            preview_organisation,
            organise_files
        ])
        .run(tauri::generate_context!())
        .expect("erro enquanto executava a aplicação Tauri");
}