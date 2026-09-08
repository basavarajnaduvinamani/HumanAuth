import os
import torch
import matplotlib.pyplot as plt
import seaborn as sns
from torchvision import datasets, transforms
from torch.utils.data import DataLoader
from train_model import ForgeryClassifier  # Your custom model
from sklearn.metrics import classification_report, confusion_matrix

# === Paths ===
model_path = r"C:\Users\Viraj\Downloads\Document-Forgery-Detection-main\src\saved_models\best_model.pth"
valid_dir = r"C:\Users\Viraj\Downloads\Document-Forgery-Detection-main\src\data\id_dataset\valid"

# === Transform (must match training!) ===
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor()
])

# === Load Dataset ===
class_names = ['fake', 'real']
valid_dataset = datasets.ImageFolder(root=valid_dir, transform=transform)
valid_loader = DataLoader(valid_dataset, batch_size=32, shuffle=False)

# === Load Model ===
model = ForgeryClassifier()
model.load_state_dict(torch.load(model_path, map_location=torch.device('cpu')))
model.eval()

# === Evaluation ===
y_true = []
y_pred = []

with torch.no_grad():
    for images, labels in valid_loader:
        outputs = model(images)
        _, predicted = torch.max(outputs, 1)
        y_true.extend(labels.numpy())
        y_pred.extend(predicted.numpy())

# === Classification Report ===
print("✅ Classification Report:\n")
print(classification_report(y_true, y_pred, target_names=class_names))

# === Confusion Matrix ===
cm = confusion_matrix(y_true, y_pred)
plt.figure(figsize=(6, 5))
sns.heatmap(cm, annot=True, fmt="d", cmap="Blues", xticklabels=class_names, yticklabels=class_names)
plt.xlabel("Predicted")
plt.ylabel("Actual")
plt.title("Confusion Matrix")
plt.tight_layout()
plt.show()
