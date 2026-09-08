import tkinter as tk
from tkinter import messagebox, simpledialog, scrolledtext
import subprocess
import threading
import os
import pickle
import shutil

# Constants
ADD_USER_SCRIPT = "add_user.py"
RECOGNIZE_SCRIPT = "recognize.py"
VOICE_DB_PATH = "./voice_database/"
GMM_MODELS_PATH = "./gmm_models/"
FACE_DB_FILE = "./face_database/embeddings.pickle"

# Use Python from venv if available
VENV_PYTHON = os.path.join(os.getcwd(), "venv", "Scripts", "python.exe")
PYTHON_EXEC = VENV_PYTHON if os.path.exists(VENV_PYTHON) else "python"

# GUI Setup
root = tk.Tk()
root.title("Biometric Authentication")
root.geometry("500x400")

tk.Label(root, text="Biometric Authentication", font=("Arial", 18)).pack(pady=10)

status_box = scrolledtext.ScrolledText(root, height=15, width=60, wrap=tk.WORD, font=("Courier", 10))
status_box.pack(pady=10)
status_box.insert(tk.END, "Status: Ready\n")
status_box.config(state=tk.DISABLED)

def update_status(msg):
    status_box.config(state=tk.NORMAL)
    status_box.insert(tk.END, msg + "\n")
    status_box.see(tk.END)
    status_box.config(state=tk.DISABLED)

def run_script(script_name, label_text):
    def task():
        update_status(f"[INFO] {label_text}")
        try:
            process = subprocess.Popen(
                [PYTHON_EXEC, script_name],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1
            )

            for line in iter(process.stdout.readline, ''):
                update_status(line.strip())
            process.stdout.close()
            process.wait()

        except Exception as e:
            update_status(f"[ERROR] {str(e)}")
        finally:
            update_status("[DONE] Ready.")

    threading.Thread(target=task).start()

def run_add_user():
    run_script(ADD_USER_SCRIPT, "Adding user...")

def run_recognize_user():
    run_script(RECOGNIZE_SCRIPT, "Recognizing user...")

def run_delete_user():
    name = simpledialog.askstring("Delete User", "Enter user name to delete:")
    if not name:
        return

    deleted = False

    # Delete voice data
    voice_path = os.path.join(VOICE_DB_PATH, name)
    if os.path.isdir(voice_path):
        shutil.rmtree(voice_path)
        deleted = True

    # Delete GMM model
    gmm_file = os.path.join(GMM_MODELS_PATH, f"{name}.gmm")
    if os.path.exists(gmm_file):
        os.remove(gmm_file)
        deleted = True

    # Remove from face DB
    if os.path.exists(FACE_DB_FILE):
        with open(FACE_DB_FILE, 'rb') as f:
            db = pickle.load(f)
        if name in db:
            del db[name]
            with open(FACE_DB_FILE, 'wb') as f:
                pickle.dump(db, f)
            deleted = True

    if deleted:
        update_status(f"[SUCCESS] Deleted user '{name}'")
    else:
        update_status(f"[WARNING] No data found for user: {name}")

# Buttons
tk.Button(root, text="Add User", width=20, height=2, command=run_add_user).pack(pady=5)
tk.Button(root, text="Recognize User", width=20, height=2, command=run_recognize_user).pack(pady=5)
tk.Button(root, text="Delete User", width=20, height=2, command=run_delete_user).pack(pady=5)
tk.Button(root, text="Exit", width=20, height=2, command=root.quit).pack(pady=10)

root.mainloop()
