#!/usr/bin/env python3
"""
Zenith Market Station - Desktop Orchestration Wrapper
Avvia autonomamente il backend Node.js in background, verifica la disponibilità
dell'API /api/* su localhost:3000, apre l'applicazione in finestra desktop nativa
(via pywebview o PyQt/PySide), e termina in modo pulito tutti i processi Node alla chiusura.
"""

import os
import sys
import time
import signal
import socket
import atexit
import subprocess
import urllib.request
import urllib.error

# Configurazione Server
PORT = int(os.environ.get("PORT", "3000"))
TARGET_URL = f"http://127.0.0.1:{PORT}"
HEALTH_CHECK_URL = f"{TARGET_URL}/api/config"
APP_TITLE = "Zenith Market Station | Advanced Quantitative Terminal"

# Directory radice del progetto
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Handle globale processo Node
node_process = None


def is_port_in_use(port: int) -> bool:
    """Verifica se la porta locale è già occupata."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex(("127.0.0.1", port)) == 0


def is_backend_healthy() -> bool:
    """Verifica se l'endpoint API del server risponde con successo."""
    try:
        req = urllib.request.Request(
            HEALTH_CHECK_URL,
            headers={"User-Agent": "ZenithDesktopApp/1.0"}
        )
        with urllib.request.urlopen(req, timeout=1.5) as response:
            return response.status in (200, 304)
    except Exception:
        return False


def start_node_backend():
    """Lancia il backend Node.js in un sottoprocesso separato."""
    global node_process

    if is_backend_healthy():
        print(f"[Desktop] Server Node.js già attivo e operativo su {TARGET_URL}")
        return None

    print(f"[Desktop] Avvio orchestrato del backend Node.js in corso (dir: {ROOT_DIR})...")

    # Determina comando per avviare il server
    is_windows = sys.platform.startswith("win")
    
    # Se esiste dist/index.html prova prima modalità produzione o npm run start/dev
    dist_dir = os.path.join(ROOT_DIR, "dist")
    cmd = []
    
    npm_exec = "npm.cmd" if is_windows else "npm"
    
    # Se package.json ha start/dev usiamo npm
    if os.path.exists(os.path.join(ROOT_DIR, "package.json")):
        cmd = [npm_exec, "run", "dev"]
    else:
        cmd = ["npx" if not is_windows else "npx.cmd", "tsx", "server.ts"]

    env = os.environ.copy()
    env["PORT"] = str(PORT)

    kwargs = {
        "cwd": ROOT_DIR,
        "env": env,
        "stdout": subprocess.PIPE,
        "stderr": subprocess.STDOUT,
        "text": True
    }

    # Creazione in nuovo gruppo di processi per garantire chiusura pulita dell'albero dei task
    if is_windows:
        kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP
    else:
        kwargs["preexec_fn"] = os.setsid

    try:
        node_process = subprocess.Popen(cmd, **kwargs)
        print(f"[Desktop] Processo Node avviato con PID {node_process.pid}")
    except Exception as e:
        print(f"[Desktop] Errore avvio comando {' '.join(cmd)}: {e}")
        # Tentativo di fallback con 'node' diretto
        try:
            node_exec = "node.exe" if is_windows else "node"
            alt_cmd = ["npx", "tsx", "server.ts"]
            node_process = subprocess.Popen(alt_cmd, **kwargs)
            print(f"[Desktop] Processo alternativo avviato con PID {node_process.pid}")
        except Exception as e2:
            print(f"[Desktop] Impossibile avviare il server Node: {e2}")
            return None

    return node_process


def wait_for_backend(timeout_sec: float = 30.0) -> bool:
    """Attende che il backend Node.js sia pronto e risponda alle chiamate HTTP."""
    print(f"[Desktop] In attesa che il server sia pronto su {TARGET_URL}...")
    start_time = time.time()
    
    while time.time() - start_time < timeout_sec:
        # Verifica se il processo è morto inaspettatamente
        if node_process and node_process.poll() is not None:
            stdout_data, _ = node_process.communicate()
            print(f"[Desktop] Errore: il server Node si è arrestato con codice {node_process.returncode}")
            if stdout_data:
                print(f"[Server Output]:\n{stdout_data[:1000]}")
            return False

        if is_backend_healthy():
            elapsed = round(time.time() - start_time, 2)
            print(f"[Desktop] ✓ Backend pronto e operativo in {elapsed}s!")
            return True

        time.sleep(0.4)

    print(f"[Desktop] Timeout ({timeout_sec}s) raggiunto nell'attesa del backend.")
    return False


def terminate_node_backend():
    """Termina in modo sicuro il processo Node.js e tutti i suoi figli."""
    global node_process
    if not node_process:
        return

    print(f"[Desktop] Chiusura pulita del processo Node.js (PID: {node_process.pid})...")
    try:
        if sys.platform.startswith("win"):
            # Su Windows usiamo taskkill per terminare l'albero di processi figli
            subprocess.run(
                ["taskkill", "/F", "/T", "/PID", str(node_process.pid)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
        else:
            # Su POSIX inviamo SIGTERM all'intero Process Group
            pgid = os.getpgid(node_process.pid)
            os.killpg(pgid, signal.SIGTERM)
            time.sleep(0.5)
            # Se ancora attivo dopo mezzo secondo, forziamo SIGKILL
            if node_process.poll() is None:
                os.killpg(pgid, signal.SIGKILL)
    except Exception as e:
        print(f"[Desktop] Avviso durante arresto server: {e}")
        try:
            node_process.kill()
        except Exception:
            pass

    node_process = None
    print("[Desktop] Processo backend terminato correttamente.")


# Registra handler di uscita
atexit.register(terminate_node_backend)


def handle_signal(sig, frame):
    """Intercetta segnali di terminazione da terminale."""
    terminate_node_backend()
    sys.exit(0)


signal.signal(signal.SIGINT, handle_signal)
signal.signal(signal.SIGTERM, handle_signal)


def launch_gui_window():
    """Apre la finestra nativa desktop caricando la webapp."""
    # 1. Tentativo con pywebview (soluzione leggera e moderna Chromium/WebKit)
    try:
        import webview
        print("[Desktop] Inizializzazione interfaccia tramite 'pywebview'...")

        window = webview.create_window(
            title=APP_TITLE,
            url=TARGET_URL,
            width=1380,
            height=880,
            min_size=(1024, 680),
            resizable=True,
            confirm_close=False,
            background_color='#131722'
        )

        def on_closed():
            print("[Desktop] Finestra chiusa dall'utente.")
            terminate_node_backend()

        window.events.closed += on_closed
        webview.start(debug=False)
        return
    except ImportError:
        pass

    # 2. Tentativo con PySide6 / PyQt6 (QtWebEngine nativo)
    try:
        from PySide6.QtWidgets import QApplication, QMainWindow
        from PySide6.QtWebEngineWidgets import QWebEngineView
        from PySide6.QtCore import QUrl, QSize

        print("[Desktop] Inizializzazione interfaccia tramite 'PySide6 QtWebEngine'...")
        app = QApplication(sys.argv)
        app.setApplicationName(APP_TITLE)

        window = QMainWindow()
        window.setWindowTitle(APP_TITLE)
        window.resize(1380, 880)
        window.setMinimumSize(QSize(1024, 680))

        view = QWebEngineView()
        view.load(QUrl(TARGET_URL))
        window.setCentralWidget(view)
        window.show()

        def on_app_exit():
            terminate_node_backend()

        app.aboutToQuit.connect(on_app_exit)
        sys.exit(app.exec())
    except ImportError:
        pass

    # 3. Fallback browser predefinito di sistema con indicazione
    import webbrowser
    print("\n" + "=" * 65)
    print("Zenith Market Station Desktop Mode:")
    print("PyWebView o PySide6 non risultano installati nel runtime Python.")
    print("Apertura automatica nel browser predefinito di sistema...")
    print(f"URL: {TARGET_URL}")
    print("Premi CTRL+C per arrestare il backend e terminare l'applicazione.")
    print("=" * 65 + "\n")
    
    webbrowser.open(TARGET_URL)
    
    # Mantieni il processo attivo fino al CTRL+C
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[Desktop] Uscita richiesta dall'utente.")
        terminate_node_backend()


def main():
    print("=" * 65)
    print(f" {APP_TITLE} ")
    print("=" * 65)

    # 1. Avvio orchestrato del backend
    start_node_backend()

    # 2. Attesa disponibilità API /api/*
    ready = wait_for_backend(timeout_sec=35.0)
    if not ready:
        print("[Desktop] Impossibile stabilire la connessione con il backend.")
        terminate_node_backend()
        sys.exit(1)

    # 3. Apertura finestra GUI nativa
    launch_gui_window()


if __name__ == "__main__":
    main()
