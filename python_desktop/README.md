# Zenith Market Station - Desktop Packaging (Python)

Questo modulo consente di distribuire ed eseguire **Zenith Market Station** come applicazione desktop autonoma per Windows, macOS e Linux.

## Come Funziona l'Orchestrazione

Il file `app.py`:
1. **Avvia automaticamente il backend Node.js (`npm run dev` o `tsx server.ts`)** in background se non è già attivo.
2. **Monitora l'health check HTTP (`/api/config`)** su `http://127.0.0.1:3000` con polling ed exponential backoff.
3. **Inizializza una finestra GUI nativa** tramite `pywebview` (o `PySide6 / PyQt6` in fallback).
4. **Intercetta la chiusura della finestra** e i segnali di sistema (`SIGINT`, `SIGTERM`, `atexit`), terminando l'intero albero dei processi Node in background per evitare processi orfani.

---

## Esecuzione Rapida

### 1. Installazione dipendenze Python:
```bash
pip install -r python_desktop/requirements.txt
```

### 2. Avvio dell'applicazione desktop:
```bash
python python_desktop/app.py
```

---

## Compilazione Eseguibile Standalone (.exe / .app)

È possibile compilare l'intera applicazione in un singolo eseguibile desktop tramite **PyInstaller**:

```bash
pip install pyinstaller

# Compilazione su Windows (.exe)
pyinstaller --onefile --windowed --name "ZenithMarketStation" python_desktop/app.py

# Compilazione su Linux / macOS
pyinstaller --onefile --windowed --name "ZenithMarketStation" python_desktop/app.py
```
