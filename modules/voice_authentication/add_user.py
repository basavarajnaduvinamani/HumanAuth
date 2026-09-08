import pyaudio
import wave
import cv2
import os
import pickle
import time
import numpy as np
from scipy.io.wavfile import read
from sklearn.mixture import GaussianMixture as GMM
from main_functions import *

def add_user():
    name = input("Enter Name: ")

    if os.path.exists('./face_database/embeddings.pickle'):
        with open('./face_database/embeddings.pickle', 'rb') as database:
            db = pickle.load(database)

            if name in db or name == 'unknown':
                print("Name Already Exists! Try Another Name...", flush=True)
                return
    else:
        db = {}

    cap = cv2.VideoCapture(0)
    cap.set(3, 640)
    cap.set(4, 480)

    face_cascade = cv2.CascadeClassifier('./haarcascades/haarcascade_frontalface_default.xml')

    i = 3
    face_found = False

    while True:
        _, frame = cap.read()
        frame = cv2.flip(frame, 1, 0)

        cv2.putText(frame, 'Keep Your Face in front of Camera', (100, 200), cv2.FONT_HERSHEY_SIMPLEX,
                    0.8, (255, 255, 255), 2)
        cv2.putText(frame, 'Starting', (260, 270), cv2.FONT_HERSHEY_SIMPLEX,
                    0.8, (255, 255, 255), 2)
        cv2.putText(frame, str(i), (290, 330), cv2.FONT_HERSHEY_SIMPLEX,
                    1.3, (255, 255, 255), 3)

        i -= 1

        cv2.imshow('frame', frame)
        cv2.waitKey(1000)

        if i < 0:
            break

    start_time = time.time()
    img_path = './saved_image/1.jpg'

    while True:
        curr_time = time.time()

        _, frame = cap.read()
        frame = cv2.flip(frame, 1, 0)
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        face = face_cascade.detectMultiScale(gray, 1.3, 5)

        if len(face) == 1:
            for (x, y, w, h) in face:
                roi = frame[y-10:y+h+10, x-10:x+w+10]
                fh, fw = roi.shape[:2]
                if fh < 20 and fw < 20:
                    continue
                face_found = True
                cv2.rectangle(frame, (x-10, y-10), (x+w+10, y+h+10), (255, 200, 200), 2)

        if curr_time - start_time >= 3:
            break

        cv2.imshow('frame', frame)
        cv2.waitKey(1)

    cap.release()
    cv2.destroyAllWindows()

    if face_found:
        img = cv2.resize(roi, (96, 96))
        db[name] = img_to_encoding(img)

        with open('./face_database/embeddings.pickle', "wb") as database:
            pickle.dump(db, database, protocol=pickle.HIGHEST_PROTOCOL)
    elif len(face) > 1:
        print("More than one face found. Try again...", flush=True)
        return
    else:
        print("No face detected. Try again...", flush=True)
        return

    os.system('cls' if os.name == 'nt' else 'clear')

    # Voice Authentication
    FORMAT = pyaudio.paInt16
    CHANNELS = 2
    RATE = 44100
    CHUNK = 1024
    RECORD_SECONDS = 3

    source = "./voice_database/" + name
    os.mkdir(source)

    for i in range(3):
        audio = pyaudio.PyAudio()

        if i == 0:
            j = 3
            while j >= 0:
                time.sleep(1.0)
                os.system('cls' if os.name == 'nt' else 'clear')
                print(f"Speak your name in {j} seconds", flush=True)
                j -= 1
        elif i == 1:
            time.sleep(2.0)
            print("Speak your name one more time...", flush=True)
            time.sleep(0.8)
        else:
            time.sleep(2.0)
            print("Speak your name one last time...", flush=True)
            time.sleep(0.8)

        stream = audio.open(format=FORMAT, channels=CHANNELS,
                            rate=RATE, input=True,
                            frames_per_buffer=CHUNK)

        print("Recording...", flush=True)
        frames = []

        for _ in range(0, int(RATE / CHUNK * RECORD_SECONDS)):
            data = stream.read(CHUNK)
            frames.append(data)

        stream.stop_stream()
        stream.close()
        audio.terminate()

        waveFile = wave.open(source + '/' + str((i + 1)) + '.wav', 'wb')
        waveFile.setnchannels(CHANNELS)
        waveFile.setsampwidth(audio.get_sample_size(FORMAT))
        waveFile.setframerate(RATE)
        waveFile.writeframes(b''.join(frames))
        waveFile.close()
        print(f"Voice sample {i+1} recorded.", flush=True)

    dest = "./gmm_models/"
    count = 1

    for path in os.listdir(source):
        path = os.path.join(source, path)

        features = np.array([])
        (sr, audio) = read(path)
        vector = extract_features(audio, sr)

        if features.size == 0:
            features = vector
        else:
            features = np.vstack((features, vector))

        if count == 3:
            gmm = GMM(n_components=16, max_iter=200, covariance_type='diag', n_init=3)
            gmm.fit(features)
            pickle.dump(gmm, open(dest + name + '.gmm', 'wb'))
            print(f"{name} added successfully.", flush=True)
            features = np.asarray(())
            count = 0
        count += 1

if __name__ == '__main__':
    add_user()
