import tkinter as tk
from tkinter import messagebox
import subprocess
import sys
import os
import signal

# Keep track of the process globally
process = None

def run_antispoofing():
    global process
    if process is None or process.poll() is not None:
        try:
            script_path = os.path.join(os.getcwd(), "video_predict.py")
            process = subprocess.Popen([sys.executable, script_path])
        except Exception as e:
            messagebox.showerror("Error", f"Failed to run the script:\n{e}")
    else:
        messagebox.showinfo("Info", "Detection is already running.")

def stop_antispoofing():
    global process
    if process is not None and process.poll() is None:
        try:
            # Send a termination signal
            process.terminate()
            process.wait(timeout=5)
            messagebox.showinfo("Info", "Detection stopped.")
        except Exception as e:
            messagebox.showerror("Error", f"Could not stop the detection:\n{e}")
    else:
        messagebox.showinfo("Info", "No detection process is currently running.")

def on_close():
    stop_antispoofing()
    root.destroy()

# GUI setup
root = tk.Tk()
root.title("Face Anti-Spoofing")
root.geometry("300x200")
root.resizable(False, False)

label = tk.Label(root, text="Face Anti-Spoofing GUI", font=("Arial", 14))
label.pack(pady=15)

btn_start = tk.Button(root, text="Start Detection", command=run_antispoofing, font=("Arial", 12), bg="lightgreen")
btn_start.pack(pady=5)

btn_stop = tk.Button(root, text="Stop Detection", command=stop_antispoofing, font=("Arial", 12), bg="lightcoral")
btn_stop.pack(pady=5)

# Handle window close event
root.protocol("WM_DELETE_WINDOW", on_close)

root.mainloop()
