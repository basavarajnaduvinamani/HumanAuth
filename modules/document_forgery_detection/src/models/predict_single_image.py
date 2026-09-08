import sys
import os
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import matplotlib.pyplot as plt

#  Check for image path input
if len(sys.argv) < 2:
    print("❌ Usage: python predict_single_image.py <image_path>")
    sys.exit(1)

image_path = sys.argv[1]

if not os.path.exists(image_path):
    print(f"❌ Image not found: {image_path}")
    sys.exit(1)

#  Preprocessing
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
])

image = Image.open(image_path).convert("RGB")
image_tensor = transform(image).unsqueeze(0)  # [1, C, H, W]

#  Model definition (must match training structure exactly!)
class ForgeryClassifier(nn.Module):
    def __init__(self):
        super(ForgeryClassifier, self).__init__()
        self.convnet = models.resnet18(weights=None)
        self.convnet.fc = nn.Linear(self.convnet.fc.in_features, 2)

    def forward(self, x):
        return self.convnet(x)

#  Load model weights
model = ForgeryClassifier()
model_path = r"C:\Users\Viraj\Downloads\Document-Forgery-Detection-main\forgery_classifier.pth"
model.convnet.load_state_dict(torch.load(model_path, map_location=torch.device('cpu')))
model.eval()

#  Prediction
with torch.no_grad():
    output = model(image_tensor)
    probs = torch.softmax(output, dim=1)
    conf, predicted = torch.max(probs, 1)
    label = "Real" if predicted.item() == 0 else "Fake"

#  Display result
print(f"\n✅ Prediction: {label}")
print(f"📊 Confidence: {conf.item() * 100:.2f}%")

#  Show image with prediction title
plt.imshow(image)
plt.title(f"{label} ({conf.item() * 100:.2f}%)", fontsize=14)
plt.axis("off")
plt.show()
