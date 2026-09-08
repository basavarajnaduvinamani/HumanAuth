import tensorflow as tf
import numpy as np
import os
import sys
import pickle
import cv2
from numpy import genfromtxt
from keras import backend as K
from keras.models import load_model

# Set image data format for compatibility
np.set_printoptions(threshold=sys.maxsize)

# Calculates triplet loss (used in facenet training)
def triplet_loss(y_true, y_pred, alpha=0.2):
    anchor, positive, negative = y_pred[0], y_pred[1], y_pred[2]
    pos_dist = tf.reduce_sum(tf.square(anchor - positive))
    neg_dist = tf.reduce_sum(tf.square(anchor - negative))
    basic_loss = pos_dist - neg_dist + alpha
    loss = tf.maximum(basic_loss, 0.0)
    return loss

# Load FaceNet model and prepare it
from keras_facenet import FaceNet
embedder = FaceNet()
model = embedder.model

# Converts an image to a 128-dim embedding
def img_to_encoding(img):
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img = cv2.resize(img, (160, 160))
    img = img.astype('float32') / 255.0
    x_train = np.expand_dims(img, axis=0)
    embedding = model.predict_on_batch(x_train)
    return embedding

# -------------------------------
# VOICE BIOMETRICS SECTION BELOW
# -------------------------------
import pyaudio
import wave
from IPython.display import Audio, display, clear_output
from scipy.io.wavfile import read
from sklearn.mixture import GaussianMixture as GMM
from sklearn import preprocessing
import python_speech_features as mfcc
import warnings
warnings.filterwarnings("ignore")

# Calculates delta (change) of MFCC features over time
def calculate_delta(array):
    rows, cols = array.shape
    deltas = np.zeros((rows, 20))
    N = 2
    for i in range(rows):
        index = []
        for j in range(1, N + 1):
            first = max(i - j, 0)
            second = min(i + j, rows - 1)
            index.append((second, first))
        deltas[i] = (array[index[0][0]] - array[index[0][1]] + 
                     2 * (array[index[1][0]] - array[index[1][1]])) / 10
    return deltas

# Extracts MFCC + delta features from an audio clip
def extract_features(audio, rate):    
    mfcc_feat = mfcc.mfcc(audio, rate, 0.025, 0.01, 20, appendEnergy=True, nfft=1103)
    mfcc_feat = preprocessing.scale(mfcc_feat)
    delta = calculate_delta(mfcc_feat)
    combined = np.hstack((mfcc_feat, delta)) 
    return combined
