import os
import torch
from torchvision import models, transforms
from PIL import Image

# ✅ Define image and label path
image_path = r"C:\Users\Viraj\Downloads\Document-Forgery-Detection-main\src\data\id_dataset\test\images\sample.jpg"
label_path = image_path.replace("images", "labels").replace(".jpg", ".txt")
model_path = r"C:\Users\Viraj\Downloads\Document-Forgery-Detection-main\forgery_classifier.pth"

# ✅ Preprocess pipeline
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
])

# ✅ Load image and crop if label exists
image = Image.open(image_path).convert("RGB")
w, h = image.size

if os.path.exists(label_path):
    with open(label_path, "r") as f:
        line = f.readline().strip()
        parts = line.split()
        if len(parts) == 5:
            x_c, y_c, bw, bh = map(float, parts[1:])
            x1 = int((x_c - bw / 2) * w)
            y1 = int((y_c - bh / 2) * h)
            x2 = int((x_c + bw / 2) * w)
            y2 = int((y_c + bh / 2) * h)
            image = image.crop((x1, y1, x2, y2))
        else:
            print("⚠️ Invalid label format. Using full image.")
else:
    print("⚠️ Label not found. Using full image.")

# ✅ Transform the image
input_tensor = transform(image).unsqueeze(0)  # Add batch dimension

# ✅ Load model
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

class ForgeryClassifier(torch.nn.Module):
    def __init__(self):
        super(ForgeryClassifier, self).__init__()
        self.model = models.resnet18(pretrained=False)
        self.model.fc = torch.nn.Linear(self.model.fc.in_features, 2)

    def forward(self, x):
        return self.model(x)

model = ForgeryClassifier().to(device)
model.load_state_dict(torch.load(model_path, map_location=device))
model.eval()

# ✅ Run prediction
with torch.no_grad():
    input_tensor = input_tensor.to(device)
    output = model(input_tensor)
    _, pred = torch.max(output, 1)
    label = "REAL" if pred.item() == 0 else "FAKE"

print(f"🔍 Prediction: {label}")
