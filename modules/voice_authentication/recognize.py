import pyaudio
import wave
import cv2
import os
import pickle
import time
import numpy as np
from scipy.io.wavfile import read
from main_functions import *

def recognize():
    try:
        # Voice Authentication
        FORMAT = pyaudio.paInt16
        CHANNELS = 2
        RATE = 44100
        CHUNK = 1024
        RECORD_SECONDS = 4
        FILENAME = "./test.wav"

        audio = pyaudio.PyAudio()
        stream = audio.open(format=FORMAT, channels=CHANNELS,
                            rate=RATE, input=True,
                            frames_per_buffer=CHUNK)

        time.sleep(2.0)
        print("Recording voice... Please speak now.", flush=True)
        frames = []

        for _ in range(0, int(RATE / CHUNK * RECORD_SECONDS)):
            data = stream.read(CHUNK)
            frames.append(data)

        stream.stop_stream()
        stream.close()
        audio.terminate()

        waveFile = wave.open(FILENAME, 'wb')
        waveFile.setnchannels(CHANNELS)
        waveFile.setsampwidth(audio.get_sample_size(FORMAT))
        waveFile.setframerate(RATE)
        waveFile.writeframes(b''.join(frames))
        waveFile.close()

        modelpath = "./gmm_models/"
        gmm_files = [os.path.join(modelpath, f) for f in os.listdir(modelpath) if f.endswith('.gmm')]

        if not gmm_files:
            return "No users found in the voice database."

        models = [pickle.load(open(f, 'rb')) for f in gmm_files]
        speakers = [os.path.basename(f).split(".gmm")[0] for f in gmm_files]

        sr, audio_data = read(FILENAME)
        vector = extract_features(audio_data, sr)
        log_likelihood = np.array([model.score(vector).sum() for model in models])

        pred = np.argmax(log_likelihood)
        identity = speakers[pred]

        # Face Recognition
        cap = cv2.VideoCapture(0)
        cap.set(3, 640)
        cap.set(4, 480)

        cascade = cv2.CascadeClassifier('./haarcascades/haarcascade_frontalface_default.xml')
        database = pickle.load(open('face_database/embeddings.pickle', "rb"))
        time.sleep(1.0)

        start_time = time.time()
        min_dist = 100
        name = 'unknown'
        detected = 0

        while True:
            curr_time = time.time()
            _, frame = cap.read()
            frame = cv2.flip(frame, 1, 0)
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = cascade.detectMultiScale(gray, 1.3, 5)

            if len(faces) == 1:
                (x, y, w, h) = faces[0]
                roi = frame[y-10:y+h+10, x-10:x+w+10]
                fh, fw = roi.shape[:2]
                if fh >= 20 and fw >= 20:
                    img = cv2.resize(roi, (96, 96))
                    encoding = img_to_encoding(img)

                    for knownName in database:
                        dist = np.linalg.norm(database[knownName] - encoding)
                        if dist < min_dist:
                            min_dist = dist
                            name = knownName

                    detected = 1
                    if min_dist <= 0.4 and name == identity:
                        cap.release()
                        cv2.destroyAllWindows()
                        return f"Access Granted. Welcome, {name}!"

            if curr_time - start_time > 3:
                break

            cv2.imshow('Verifying Face...', frame)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

        cap.release()
        cv2.destroyAllWindows()

        if detected == 0:
            return "No face detected. Try again."
        elif len(faces) > 1:
            return "Multiple faces detected. Try again."
        elif min_dist > 0.4 or name != identity:
            return "Face not recognized or mismatch with voice. Try again."
        else:
            return "Recognition failed. Try again."

    except Exception as e:
        return f"Error: {str(e)}"

if __name__ == '__main__':
    result = recognize()
    print(result)
