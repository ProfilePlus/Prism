use std::sync::Mutex;
use tauri::{Emitter, Manager, State};

struct PendingFiles(Mutex<Vec<String>>);

#[tauri::command]
fn get_pending_files(state: State<PendingFiles>) -> Vec<String> {
  let mut files = state.0.lock().unwrap();
  let result = files.clone();
  files.clear();
  result
}

#[cfg(not(target_os = "macos"))]
fn extract_file_paths_from_args() -> Vec<String> {
  std::env::args()
    .skip(1)
    .filter(|arg| {
      let lower = arg.to_lowercase();
      lower.ends_with(".md") || lower.ends_with(".markdown")
    })
    .filter(|path| std::path::Path::new(path).exists())
    .collect()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let pending_files = PendingFiles(Mutex::new(Vec::new()));

  tauri::Builder::default()
    .manage(pending_files)
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // Windows/Linux: 从命令行参数读取文件路径
      #[cfg(not(target_os = "macos"))]
      {
        let paths = extract_file_paths_from_args();
        if !paths.is_empty() {
          let state: State<PendingFiles> = app.state();
          state.0.lock().unwrap().extend(paths.clone());
          let _ = app.emit("file-opened", &paths);
        }
      }

      Ok(())
    })
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_opener::init())
    .invoke_handler(tauri::generate_handler![get_pending_files])
    .build(tauri::generate_context!())
    .expect("error while building tauri application")
    .run(|app, event| {
      // macOS: 通过 RunEvent::Opened 接收文件路径
      if let tauri::RunEvent::Opened { urls } = event {
        let paths: Vec<String> = urls
          .iter()
          .filter_map(|u| u.to_file_path().ok())
          .filter_map(|p| p.to_str().map(|s| s.to_string()))
          .collect();
        if !paths.is_empty() {
          let state: State<PendingFiles> = app.state();
          state.0.lock().unwrap().extend(paths.clone());
          let _ = app.emit("file-opened", &paths);
        }
      }
    });
}
