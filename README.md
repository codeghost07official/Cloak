# 🛡️ Cloak — Premium Image Steganography

**Cloak** is a modern, high-performance Flask web application designed for ultimate operational privacy. It allows users to securely embed and extract encrypted secret messages within digital images using the **Least Significant Bit (LSB)** steganography technique. Featuring a premium dark, glassmorphic SaaS-style UI with orange and black accents, Cloak provides a fluid, responsive, and secure experience for secure messaging.

---

## ✨ Features

- **Double Workspace (Hide & Reveal Tabs)**:
  - **Hide Secret**: Seamlessly upload a source image, enter a highly sensitive text message, and instantly encode it.
  - **Reveal Secret**: Upload an encoded stego-image, extract the hidden text, and copy the result with a single click.
- **Sleek, Responsive Dark SaaS UI**:
  - Full-featured **Glassmorphic interface** using custom CSS gradients, modern backdrop blurs, and premium typography.
  - Interactive **Drag & Drop** zones with live image previews and dynamically extracted metadata.
  - Customized active-slide tab transitions and smooth animations.
- **Auto-Conversion for Lossy Formats**:
  - Automatically detects **JPEG/JPG** uploads. Since lossy compression ruins LSB pixel data, Cloak automatically converts JPEGs into lossless **PNG** format prior to encoding, and notifies the user with detailed inline toasts.
- **Robust Security & Validation**:
  - File size validation (limit of 16MB) in both frontend and backend.
  - File format filters (PNG, BMP, TIFF, WebP, JPG, JPEG).
  - Handles empty messages, corrupt images, and images with missing or corrupted hidden data.
  - Employs a custom, rolling binary **end-of-message sentinel** (`\x00\xff\xff\x00\x00\xff\xff\x00`) to guarantee perfect detection and prevent decoding garbage data on un-encoded images.
  - Full client-side and server-side safety checks preventing crashes or memory overload.

---

## 🛠️ Tech Stack

- **Backend**: Python 3, Flask
- **Image Processing**: Pillow (PIL)
- **Frontend**: HTML5, CSS3 (Glassmorphism, custom animations), Vanilla JavaScript (ES6, Fetch API)
- **Icons**: Lucide Icons CDN

---

## 📂 Project Structure

```text
Cloak/
├── app.py                  # Main Flask web server & endpoint routers
├── requirements.txt        # Backend dependencies
├── README.md               # Extensive project documentation
├── templates/
│   └── index.html          # Clean HTML structure (no frontend frameworks)
├── static/
│   ├── css/
│   │   └── style.css       # Premium dark orange theme & animations
│   └── js/
│       └── script.js       # Dynamic tab-switching, Drag & Drop, AJAX API calls, & Toasts
└── utils/
    └── steganography.py    # Robust LSB encoding & decoding engine
```

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have Python 3.8+ installed on your system.

### 2. Install Dependencies
Install the required packages using pip:
```bash
pip install -r requirements.txt
```

### 3. Run the Application
Start the Flask development server:
```bash
python app.py
```
Open your browser and navigate to `http://127.0.0.1:5000` to access Cloak.

---

## 🧩 Steganography Mechanics

The LSB (Least Significant Bit) steganography method hides data by altering the smallest bit of a pixel's color channel values (Red, Green, Blue). Because changing the LSB changes a color channel's value by at most 1 (e.g., from 255 to 254), these modifications are completely invisible to the human eye.

### Encoding Flow
1. **Conversion**: Grayscale or Palette images are converted to RGB. JPEGs are converted to lossless PNGs.
2. **Binary Stream**: The UTF-8 secret message is combined with a special, non-standard end-of-message binary sentinel: `\x00\xff\xff\x00\x00\xff\xff\x00`.
3. **LSB Replacement**: The engine iterates through the pixels, reading the R, G, and B channels. It overwrites the LSB of each channel with successive bits from the stream.
4. **Lossless Save**: The image is saved as a PNG to prevent any lossy compression from discarding the steganography bits.

### Decoding Flow
1. **Stream Extraction**: The engine reads pixels sequentially and gathers the LSB from the RGB channels.
2. **Byte Assembly**: Every 8 extracted bits are converted into a single byte.
3. **Sentinel Check**: A rolling suffix check matches the extracted byte stream against the unique end-of-message sentinel.
4. **Output**: Once the sentinel is found, extraction halts immediately, and the bytes preceding the sentinel are decoded into a UTF-8 string. If the end of the image is reached without finding the sentinel, or if decoding fails, Cloak gracefully reports that no hidden message is present.

---

## 🛡️ Operational Privacy

Cloak runs entirely on transient processing:
- All uploaded files are assigned a unique cryptographic UUID and processed securely in a temporary server directory.
- Input, output, and intermediate converted files are read, converted, and fully deleted from disk **immediately** after encoding/decoding.
- The encoded stego-images are transmitted back to the browser as high-speed base64 Data URLs, leaving absolutely zero trace or persistent logs of files or secret messages on the host server.
