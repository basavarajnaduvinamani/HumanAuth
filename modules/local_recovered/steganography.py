import cv2
import numpy as np

def encode_data(image_path, data):
    # Load the image
    image = cv2.imread(image_path)
    if image is None:
        raise ValueError("Image not found or unable to load.")

    # Convert data to binary
    data_bin = ''.join(format(ord(char), '08b') for char in data)
    data_len = len(data_bin)

    # Check if the image can hold the data
    if data_len > image.size:
        raise ValueError("Data is too large to be encoded in the image.")

    # Encode data into the image
    data_index = 0
    for row in image:
        for pixel in row:
            for channel in range(3):
                if data_index < data_len:
                    pixel[channel] = int(format(pixel[channel], '08b')[:-1] + data_bin[data_index], 2)
                    data_index += 1

    # Save the encoded image
    encoded_image_path = "encoded_image.png"
    cv2.imwrite(encoded_image_path, image)
    return encoded_image_path

def decode_data(image_path):
    # Load the image
    image = cv2.imread(image_path)
    if image is None:
        raise ValueError("Image not found or unable to load.")

    # Extract data from the image
    data_bin = ""
    for row in image:
        for pixel in row:
            for channel in range(3):
                data_bin += format(pixel[channel], '08b')[-1]

    # Convert binary data to string
    data = ""
    for i in range(0, len(data_bin), 8):
        byte = data_bin[i:i+8]
        data += chr(int(byte, 2))

    return data

# Example usage
if __name__ == "__main__":
    # Encode data
    image_path = "input_image.png"
    data = "This is a secret message."
    encoded_image_path = encode_data(image_path, data)
    print(f"Data encoded in {encoded_image_path}")

    # Decode data
    decoded_data = decode_data(encoded_image_path)
    print(f"Decoded data: {decoded_data}")
