# HumanAuth: Multi-Factor AI Authentication & Identity Verification Platform

[![Grant Funding](https://img.shields.io/badge/Grant%20Funding-ART--Park%2C%20IISc%20%26%20KSCST-gold.svg)](https://artpark.in/)
[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![PyTorch](https://img.shields.io/badge/PyTorch-Deep%20Learning-EE4C2C.svg)](https://pytorch.org/)
[![Computer Vision](https://img.shields.io/badge/Computer%20Vision-YOLOv5%20%7C%20OpenCV-00FFFF.svg)](https://opencv.org/)
[![ONNX](https://img.shields.io/badge/Inference-ONNX%20Runtime-005CED.svg)](https://onnxruntime.ai/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

An enterprise-grade, multi-layered biometric identity verification and fraud prevention platform developed with grant funding from **ART-Park (Indian Institute of Science, IISc)** and the **Karnataka State Council for Science and Technology (KSCST)**.

HumanAuth prevents identity theft, synthetic media manipulation, and document tampering in digital banking, e-KYC, and national governance workflows by synthesizing **real-time facial liveness detection, document forgery analysis, voice biometrics, and dynamic score-based multi-factor authentication** into a unified verification pipeline.

---

## 🏛️ System Architecture

```text
                               ┌─────────────────────────────────────────┐
                               │       Client Verification Request       │
                               └────────────────────┬────────────────────┘
                                                    │
             ┌──────────────────────────────────────┼──────────────────────────────────────┐
             ▼                                      ▼                                      ▼
   ┌────────────────────┐                ┌────────────────────┐                ┌────────────────────┐
   │ Face Anti-Spoofing │                │  Document Forgery  │                │    Voice & Face    │
   │      (Liveness)    │                │     Detection      │                │   Authentication   │
   ├────────────────────┤                ├────────────────────┤                ├────────────────────┤
   │ • YOLOv5s-Face     │                │ • YOLOv5 Object    │                │ • Inception-FaceNet│
   │ • MiniFASNet       │                │   Localization     │                │ • GMM Acoustic     │
   │ • Texture & Depth  │                │ • Edge Tamper Conv │                │   Modeling         │
   │ • ONNX Acceleration│                │ • Texture Artifacts│                │ • Cosine Distance  │
   └─────────┬──────────┘                └──────────┬─────────┘                └──────────┬─────────┘
             │ (Score: 0.0 - 1.0)                   │ (Score: 0.0 - 1.0)                  │ (Score: 0.0 - 1.0)
             └──────────────────────────────────────┼─────────────────────────────────────┘
                                                    ▼
                                  ┌───────────────────────────────────┐
                                  │ Dynamic Trust Score Fusion Engine │
                                  │       (Multi-Factor Gateway)      │
                                  ├───────────────────────────────────┤
                                  │ • Non-linear Threshold Scoring    │
                                  │ • Fallback & Anti-Spoof Check     │
                                  │ • Sub-1.2s Response SLA           │
                                  └─────────────────┬─────────────────┘
                                                    ▼
                                  ┌───────────────────────────────────┐
                                  │   Verified / Rejected Decision    │
                                  └───────────────────────────────────┘
```

---

## 🚀 Key Modules & Capabilities

### 1. Face Anti-Spoofing & Liveness Detection (`modules/face_anti_spoofing`)
- **Multi-Attack Defense:** Shields against presentation attacks including high-resolution 2D print photos, digital screen replays, and 3D silicone masks.
- **Dual-Stage Architecture:** Couples **YOLOv5s-Face** for ultra-fast face localization with **MiniFASNet** (Fourier spectrum + depth feature extraction).
- **ONNX Optimization:** Exported to ONNX runtime for hardware-accelerated, sub-second inference on edge CPUs and embedded devices.

### 2. Document Forgery & Tampering Detection (`modules/document_forgery_detection`)
- **Tampering Localization:** Utilizes fine-tuned **YOLOv5** to inspect physical and digital credential documents (e.g., National ID, Passports, Driver's Licenses).
- **Artifact Identification:** Flags cut-and-paste photo substitution, spliced typography, character alignment discrepancies, and border tampering.
- **Deep Feature Classifier:** Deploys a dedicated PyTorch forgery classifier (`forgery_classifier.pth`) to score document authenticity confidence.

### 3. Multi-Modal Voice & Face Biometrics (`modules/voice_authentication`)
- **Face Recognition:** Deep 128-dimensional biometric embeddings generated via **Inception-FaceNet** with Euclidean and Cosine similarity matching against an enrolled vector database.
- **Voice Biometrics:** Acoustic feature extraction using Gaussian Mixture Models (GMM) and Mel-Frequency Cepstral Coefficients (MFCCs) to authenticate speaker vocal signatures.

### 4. Dynamic Trust Score Fusion Engine (`modules/score_fusion`)
- **Consolidated Multi-Factor Gateway:** A lightweight Flask microservice that ingests confidence vectors from liveness, document, and biometric pipelines.
- **Auditability:** Enforces adaptive security thresholds to ensure no single modality can compromise authentication integrity.

---

## 📊 Performance Benchmarks

| Metric | Measured Benchmark |
| :--- | :--- |
| **Overall Fraud Detection Accuracy** | **98.5%** |
| **End-to-End Verification Latency** | **< 1.2 seconds** |
| **Face Liveness Frame Rate** | **30+ FPS (Real-time CPU inference)** |
| **False Acceptance Rate (FAR)** | **< 0.1%** |
| **False Rejection Rate (FRR)** | **< 1.2%** |

---

## 📁 Repository Structure

```text
HumanAuth/
├── modules/
│   ├── face_anti_spoofing/          # Real-time liveness detection & attack prevention
│   │   ├── saved_models/            # Pre-trained ONNX and PyTorch weights
│   │   ├── src/                     # MiniFASNet network architectures & utilities
│   │   ├── gui_app.py               # Desktop GUI for real-time webcam liveness testing
│   │   └── video_predict.py         # Batch video stream prediction pipeline
│   │
│   ├── document_forgery_detection/  # ID credential fraud & alteration detection
│   │   ├── yolov5/                  # Fine-tuned YOLOv5 tamper detection architecture
│   │   ├── forgery_classifier.pth   # Pre-trained deep forgery classification model
│   │   └── src/                     # Data processing, feature extraction, and evaluation
│   │
│   ├── voice_authentication/        # Dual voice biometric & face recognition system
│   │   ├── facenet_model/           # Inception-FaceNet weights and architecture
│   │   ├── gmm_models/              # Enrolled Gaussian Mixture Models for speaker verification
│   │   ├── add_user.py              # Biometric user enrollment utility
│   │   └── recognize.py             # Multi-modal recognition runtime
│   │
│   └── score_fusion/                # Flask multi-factor scoring application
│       ├── templates/               # Responsive web UI for verification results
│       ├── static/                  # Stylesheets and visual assets
│       └── app.py                   # Central fusion algorithm & API endpoint
│
├── requirements.txt                 # Unified platform dependencies
├── .gitignore                       # Environment and build artifact exclusions
├── LICENSE                          # MIT Open-Source License
└── README.md                        # Master project documentation
```

---

## ⚡ Quick Start Guide

### 1. Environment Setup
```bash
# Clone the repository
git clone https://github.com/basavarajnaduvinamani/HumanAuth.git
cd HumanAuth

# Create and activate virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install core dependencies
pip install -r requirements.txt
```

### 2. Run Face Anti-Spoofing GUI
```bash
cd modules/face_anti_spoofing
python gui_app.py
```

### 3. Run Multi-Factor Score Fusion Gateway
```bash
cd modules/score_fusion
python app.py
```
Visit `http://localhost:5000` to interact with the authentication gateway.

### 4. Enroll & Authenticate Biometrics
```bash
cd modules/voice_authentication
# Enroll a new user
python add_user.py
# Test real-time recognition
python recognize.py
```

---

## 🏆 Funding & Institutional Attribution

This research and engineering development was supported by:
- **ART-Park (AI & Robotics Technology Park)**, Indian Institute of Science (IISc), Bengaluru.
- **Karnataka State Council for Science and Technology (KSCST)**, Government of Karnataka.
- **Department of Computer Science and Engineering**, Dayananda Sagar University.

---

## 👨‍💻 Lead Engineer

**Basavaraj A Naduvinamani**  
- **Current:** Joint M.S. in Data Science and Artificial Intelligence — *IIT Madras & University of Birmingham*  
- **Undergraduate:** B.Tech. in Computer Science Engineering — *Dayananda Sagar University*  
- **Profiles:** [LinkedIn](https://linkedin.com/in/basavarajnaduvinamani) • [GitHub](https://github.com/basavarajnaduvinamani)

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
