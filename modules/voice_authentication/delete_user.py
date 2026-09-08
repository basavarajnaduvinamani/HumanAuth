import os 
import pickle
import glob

def delete_user(name):
    try:
        # Load face database
        if not os.path.exists("./face_database/embeddings.pickle"):
            return "No such user !!"

        with open("./face_database/embeddings.pickle", "rb") as database:
            db = pickle.load(database)

        user = db.pop(name, None)

        if user is not None:
            # Save updated face database
            with open('face_database/embeddings.pickle', 'wb') as database:
                pickle.dump(db, database, protocol=pickle.HIGHEST_PROTOCOL)

            # Remove voice data
            voice_path = os.path.join('./voice_database', name)
            if os.path.exists(voice_path):
                for file in glob.glob(voice_path + '/*'):
                    os.remove(file)
                os.rmdir(voice_path)

            # Remove GMM model
            gmm_path = os.path.join('./gmm_models', name + '.gmm')
            if os.path.exists(gmm_path):
                os.remove(gmm_path)

            return f"User '{name}' deleted successfully."
        else:
            return "No such user !!"
    except Exception as e:
        return f"Error: {str(e)}"

if __name__ == '__main__':
    username = input("Enter name of the user: ")
    print(delete_user(username))
