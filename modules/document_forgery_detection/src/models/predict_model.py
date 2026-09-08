import os
import torch
from PIL import Image
from torchvision import transforms, models
import torch.nn as nn

# 🔁 Same transform as training
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
])

# 🧠 Load model
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = models.resnet18()
model.fc = nn.Linear(model.fc.in_features, 2)
model.load_state_dict(torch.load("forgery_classifier.pth", map_location=device))
model.eval()
model.to(device)

def predict_image(img_path, label_path):
    image = Image.open(img_path).convert("RGB")
    w, h = image.size
    results = []

    if not os.path.exists(label_path):
        print("❌ Label file not found.")
        return []

    with open(label_path, "r") as f:
        for line in f:
            parts = line.strip().split()
            if len(parts) != 5:
                continue
            class_id = int(parts[0])
            x_c, y_c, bw, bh = map(float, parts[1:])
            x1 = int((x_c - bw / 2) * w)
            y1 = int((y_c - bh / 2) * h)
            x2 = int((x_c + bw / 2) * w)
            y2 = int((y_c + bh / 2) * h)

            crop = image.crop((x1, y1, x2, y2))
            crop = transform(crop).unsqueeze(0).to(device)

            with torch.no_grad():
                output = model(crop)
                _, predicted = torch.max(output, 1)
                label = "Fake" if predicted.item() == 1 else "Real"
                results.append(label)

    return results


# ▶️ Test
if __name__ == "__main__":
    # 🔁 CHANGE THESE to a test image and label file from your dataset
    img_path = r"C:\Users\Viraj\Downloads\Document-Forgery-Detection-main\src\data\id_dataset\test\images\your_image.jpg"
    label_path = r"C:\Users\Viraj\Downloads\Document-Forgery-Detection-main\src\data\id_dataset\test\labels\your_image.txt"

    predictions = predict_image(img_path, label_path)
    if predictions:
        for idx, result in enumerate(predictions):
            print(f"Region {idx+1}: {result}")
    else:
        print("⚠️ No predictions made.")
