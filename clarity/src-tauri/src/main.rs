#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::fs;
use tauri::{AppHandle, Manager, State};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Config {
    categories: HashMap<String, Vec<String>>,
    safe_paths: Vec<String>,
    unsafe_paths: Vec<String>,
}

struct AppState {
    config: Mutex<Config>,
}

fn load_config(app_handle: &AppHandle) -> Result<Config, String> {
    let config_dir = app_handle.path().app_config_dir()
        .or_else(|_| Err("Não foi possível encontrar o diretório de configuração do app.".to_string()))?;
    
    let config_path = config_dir.join("config.json");

    if !config_path.exists() {
        let default_config = Config {
            categories: {
                let mut map = HashMap::new();
                map.insert("Images".to_string(), vec!["jpg", "jpeg", "png", "gif", "bmp", "svg"].iter().map(|s| s.to_string()).collect());
                map.insert("Documents".to_string(), vec!["pdf", "docx", "doc", "txt", "xlsx", "pptx"].iter().map(|s| s.to_string()).collect());
                map.insert("Videos".to_string(), vec!["mp4", "mov", "avi", "mkv"].iter().map(|s| s.to_string()).collect());
                map.insert("Audio".to_string(), vec!["mp3", "wav", "flac"].iter().map(|s| s.to_string()).collect());
                map.insert("Archives".to_string(), vec!["zip", "rar", "7z"].iter().map(|s| s.to_string()).collect());
                map
            },
            safe_paths: vec![],
            unsafe_paths: vec![
                "C:\\Windows".to_string(),
                "C:\\Program Files".to_string(),
                "/etc".to_string(),
                "/bin".to_string(),
            ],
        };

        let json = serde_json::to_string_pretty(&default_config)
            .map_err(|e| format!("Erro ao serializar a configuração: {}", e))?;
        
        fs::create_dir_all(&config_dir).map_err(|e| format!("Erro ao criar o diretório de configuração: {}", e))?;
        
        fs::write(&config_path, json)
            .map_err(|e| format!("Erro ao salvar o arquivo de configuração: {}", e))?;
        
        return Ok(default_config);
    }

    let json = fs::read_to_string(&config_path)
        .map_err(|e| format!("Erro ao ler o arquivo de configuração: {}", e))?;
    let config = serde_json::from_str(&json)
        .map_err(|e| format!("Erro ao desserializar a configuração: {}", e))?;

    Ok(config)
}

fn save_config(config: &Config, app_handle: &AppHandle) -> Result<(), String> {
    let config_dir = app_handle.path().app_config_dir()
        .or_else(|_| Err("Não foi possível encontrar o diretório de configuração do app.".to_string()))?;
    let config_path = config_dir.join("config.json");

    let json = serde_json::to_string_pretty(config)
        .map_err(|e| format!("Erro ao serializar a configuração: {}", e))?;

    fs::write(&config_path, json)
        .map_err(|e| format!("Erro ao salvar o arquivo de configuração: {}", e))?;

    Ok(())
}

fn get_file_category(extension: &str, categories: &HashMap<String, Vec<String>>) -> Option<String> {
    for (category, extensions) in categories.iter() {
        if extensions.contains(&extension.to_lowercase()) {
            return Some(category.to_string());
        }
    }
    None
}

#[tauri::command]
fn get_current_config(state: State<'_, AppState>) -> Result<Config, String> {
    let config_state = state.config.lock().unwrap();
    Ok(config_state.clone())
}

#[tauri::command]
fn save_app_config(new_config: Config, state: State<'_, AppState>, app_handle: AppHandle) -> Result<(), String> {
    let mut config_state = state.config.lock().unwrap();
    *config_state = new_config.clone();
    save_config(&new_config, &app_handle)
}

#[tauri::command]
async fn preview_organisation(path: &str, state: State<'_, AppState>) -> Result<Vec<(String, usize)>, String> {
    let path_buf = PathBuf::from(path);
    let config_state = state.config.lock().unwrap();

    if config_state.unsafe_paths.contains(&path_buf.to_string_lossy().to_string()) {
        return Err(format!("Caminho {} é protegido pelo sistema.", path));
    }

    let mut preview_data = HashMap::new();

    match fs::read_dir(&path_buf) {
        Ok(entries) => {
            for entry in entries {
                match entry {
                    Ok(entry) => {
                        if entry.path().is_file() {
                            if let Some(extension) = entry.path().extension().and_then(|e| e.to_str()) {
                                if let Some(category) = get_file_category(extension, &config_state.categories) {
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

#[tauri::command]
async fn organise_files(path: &str, state: State<'_, AppState>) -> Result<(), String> {
    let path_buf = PathBuf::from(path);
    let config_state = state.config.lock().unwrap();

    if config_state.unsafe_paths.contains(&path_buf.to_string_lossy().to_string()) {
        return Err(format!("Caminho {} é protegido pelo sistema.", path));
    }

    let categories = &config_state.categories;

    for category in categories.keys() {
        let category_path = path_buf.join(category);
        if !category_path.exists() {
            if let Err(e) = fs::create_dir(&category_path) {
                return Err(format!("Erro ao criar pasta {}: {}", category, e));
            }
        }
    }

    match fs::read_dir(&path_buf) {
        Ok(entries) => {
            for entry in entries {
                match entry {
                    Ok(entry) => {
                        if entry.path().is_file() {
                            if let Some(extension) = entry.path().extension().and_then(|e| e.to_str()) {
                                if let Some(category) = get_file_category(extension, categories) {
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
        .setup(|app| {
            let handle = app.handle();
            let config = load_config(&handle).expect("Falha ao carregar a configuração");
            app.manage(AppState { config: Mutex::new(config) });
            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            preview_organisation,
            organise_files,
            get_current_config,
            save_app_config
        ])
        .run(tauri::generate_context!())
        .expect("erro enquanto executava a aplicação Tauri");
}