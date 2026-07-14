import os
from PIL import Image

END_SENTINEL = b'\x00\xff\xff\x00\x00\xff\xff\x00'

def encode_image(image_path, secret_message, output_path):
    """
    Encodes a secret message into the LSB (Least Significant Bit) of the RGB channels
    of an image, then saves the result as a lossless PNG.
    """
    try:
        img = Image.open(image_path)
    except Exception as e:
        raise ValueError(f"Failed to open image: {str(e)}")

    original_mode = img.mode
    # Convert palette/grayscale images to RGB for manipulation
    if original_mode not in ('RGB', 'RGBA'):
        img = img.convert('RGB')

    # Convert secret message to UTF-8 bytes and append sentinel
    message_bytes = secret_message.encode('utf-8') + END_SENTINEL
    
    # Convert message bytes to bits
    message_bits = []
    for byte in message_bytes:
        for i in range(8):
            message_bits.append((byte >> (7 - i)) & 1)

    num_bits = len(message_bits)
    width, height = img.size
    
    # We only modify RGB channels to preserve any existing alpha transparency intact
    max_bits = width * height * 3
    if num_bits > max_bits:
        max_chars = (max_bits // 8) - len(END_SENTINEL)
        raise ValueError(
            f"The secret message is too long for this image. "
            f"Maximum capacity for this image size is {max_chars} characters, "
            f"but the message requires {len(secret_message)} characters (plus sentinel)."
        )

    pixels = img.load()
    bit_index = 0

    for y in range(height):
        for x in range(width):
            if bit_index >= num_bits:
                break
                
            pixel = list(pixels[x, y])
            
            # Modify only R, G, B (indices 0, 1, 2)
            for c in range(3):
                if bit_index < num_bits:
                    pixel[c] = (pixel[c] & ~1) | message_bits[bit_index]
                    bit_index += 1
                    
            pixels[x, y] = tuple(pixel)
            
        if bit_index >= num_bits:
            break

    # Save the output image as PNG (lossless)
    img.save(output_path, format='PNG')
    img.close()
    return output_path

def decode_image(image_path):
    """
    Decodes a secret message from the LSB (Least Significant Bit) of the RGB channels
    of an image. Looks for the special end sentinel to determine the end of message.
    """
    try:
        img = Image.open(image_path)
    except Exception as e:
        raise ValueError(f"Failed to open image: {str(e)}")

    if img.mode not in ('RGB', 'RGBA'):
        img = img.convert('RGB')

    pixels = img.load()
    width, height = img.size

    extracted_bits = []
    extracted_bytes = bytearray()
    sentinel_len = len(END_SENTINEL)
    found_sentinel = False

    for y in range(height):
        for x in range(width):
            pixel = pixels[x, y]
            # Extract from R, G, B channels
            for c in range(3):
                extracted_bits.append(pixel[c] & 1)
                
                if len(extracted_bits) == 8:
                    byte_val = 0
                    for bit in extracted_bits:
                        byte_val = (byte_val << 1) | bit
                    extracted_bytes.append(byte_val)
                    extracted_bits = []

                    # Perform a rolling check for the END_SENTINEL
                    if len(extracted_bytes) >= sentinel_len:
                        if extracted_bytes[-sentinel_len:] == END_SENTINEL:
                            found_sentinel = True
                            break
            if found_sentinel:
                break
        if found_sentinel:
            break

    img.close()

    if not found_sentinel:
        raise ValueError("No hidden message found in this image, or the image format/data is corrupted.")

    # Remove the sentinel from the bytes
    message_bytes = extracted_bytes[:-sentinel_len]
    try:
        return message_bytes.decode('utf-8')
    except UnicodeDecodeError:
        raise ValueError("Decoded data is not valid UTF-8. The image might not contain a hidden message or is corrupted.")
