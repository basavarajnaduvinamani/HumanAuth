import os
import glob
import torch
import pandas as pd
from PIL import Image, ImageDraw, ImageFont
from torchvision import models, transforms
import torch.nn as nn

# 🔧 Paths
images_dir = r"C:\Users\Viraj\Downloads\Document-Forgery-Detection-main\src\data\id_dataset\test\images"
labels_dir = r"C:\Users\Viraj\Downloads\Document-Forgery-Detection-main\src\data\id_dataset\test\labels"
model_path = r"C:\Users\Viraj\Downloads\Document-Forgery-Detection-main\forgery_classifier.pth"
output_dir = os.path.join(os.path.dirname(__file__), "predictions_output")
os.makedirs(output_dir, exist_ok=True)

# 🧠 Device
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# 🧠 Model
class ForgeryClassifier(nn.Module):
    def __init__(self):
        super(ForgeryClassifier, self).__init__()
        self.model = models.resnet18(pretrained=False)
        self.model.fc = nn.Linear(self.model.fc.in_features, 2)

    def forward(self, x):
        return self.model(x)

model = ForgeryClassifier()
model.load_state_dict(torch.load(model_path, map_location=device))
model.to(device)
model.eval()

# 🔁 Transform
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor()
])

# 🔮 Color and Font
colors = {0: "green", 1: "red"}
label_names = {0: "real", 1: "fake"}

try:
    font = ImageFont.truetype("arial.ttf", 16)
except:
    font = ImageFont.load_default()

# 🖼️ Process
results = []
image_paths = glob.glob(os.path.join(images_dir, "*.jpg"))

for img_path in image_paths:
    image_name = os.path.basename(img_path)
    label_path = os.path.join(labels_dir, os.path.splitext(image_name)[0] + ".txt")

    try:
        image = Image.open(img_path).convert("RGB")
        w, h = image.size

        draw = ImageDraw.Draw(image)
        crop_img = image

        # Crop if YOLO label exists
        if os.path.exists(label_path):
            with open(label_path, "r") as f:
                line = f.readline()
                parts = line.strip().split()
                if len(parts) == 5:
                    _, x_c, y_c, bw, bh = map(float, parts)
                    x1 = int((x_c - bw / 2) * w)
                    y1 = int((y_c - bh / 2) * h)
                    x2 = int((x_c + bw / 2) * w)
                    y2 = int((y_c + bh / 2) * h)
                    crop_img = image.crop((x1, y1, x2, y2))
                else:
                    x1, y1, x2, y2 = 0, 0, w, h
        else:
            x1, y1, x2, y2 = 0, 0, w, h

        # Predict
        input_tensor = transform(crop_img).unsqueeze(0).to(device)
        with torch.no_grad():
            output = model(input_tensor)
            probs = torch.softmax(output, dim=1)
            confidence, predicted = torch.max(probs, 1)

        label_idx = predicted.item()
        label_str = label_names[label_idx]
        conf = confidence.item()

        # 🎨 Draw box
        draw.rectangle([x1, y1, x2, y2], outline=colors[label_idx], width=3)
        draw.text((x1 + 5, y1 + 5), f"{label_str} ({conf:.2f})", fill=colors[label_idx], font=font)

        # Save result
        image.save(os.path.join(output_dir, image_name))
        print(f"{image_name}: {label_str} ({conf:.2f})")

        results.append({
            "image_name": image_name,
            "prediction": label_str,
            "confidence": round(conf, 4)
        })

    except Exception as e:
        print(f"⚠️ Error processing {image_name}: {e}")

# 💾 Save CSV
csv_path = os.path.join(output_dir, "batch_predictions.csv")
pd.DataFrame(results).to_csv(csv_path, index=False)
print(f"\n✅ Predictions saved to {csv_path}")
print(f"✅ Annotated images saved to: {output_dir}")
