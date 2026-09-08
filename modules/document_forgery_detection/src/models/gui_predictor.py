import os
import tkinter as tk
from tkinter import filedialog, Label, Button
from PIL import Image, ImageTk
import torch
import torch.nn as nn
from torchvision import models, transforms

# 🧠 Load model (same as training code)
model = models.resnet18(weights=None)
model.fc = nn.Linear(model.fc.in_features, 2)

model_path = r"C:\Users\Viraj\Downloads\Document-Forgery-Detection-main\forgery_classifier.pth"
model.load_state_dict(torch.load(model_path, map_location=torch.device('cpu')))
model.eval()

# 🖼️ Image transform
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
])

# 🎨 GUI setup
window = tk.Tk()
window.title("Document Forgery Detector")
window.geometry("500x600")
window.resizable(False, False)

label_result = Label(window, text="Upload an image", font=("Arial", 16))
label_result.pack(pady=20)

canvas = tk.Canvas(window, width=300, height=300)
canvas.pack()

def predict_image(img_path):
    image = Image.open(img_path).convert("RGB")
    img_resized = image.resize((300, 300))
    photo = ImageTk.PhotoImage(img_resized)
    canvas.image = photo
    canvas.create_image(150, 150, image=photo)

    image_tensor = transform(image).unsqueeze(0)

    with torch.no_grad():
        output = model(image_tensor)
        probs = torch.softmax(output, dim=1)
        conf, pred = torch.max(probs, 1)
        label = "Real" if pred.item() == 0 else "Fake"
        label_result.config(text=f"{label} ({conf.item()*100:.2f}%)", fg="green" if label == "Real" else "red")

def browse_file():
    filepath = filedialog.askopenfilename(filetypes=[("Image Files", "*.jpg *.jpeg *.png")])
    if filepath and os.path.exists(filepath):
        predict_image(filepath)
    else:
        label_result.config(text="❌ Invalid file", fg="red")

btn_upload = Button(window, text="Browse Image", command=browse_file, font=("Arial", 14))
btn_upload.pack(pady=10)

window.mainloop()
