/* ----------------------------------------------------
   CLOAK — JavaScript Logic
   Tab navigation, Drag & Drop uploads, AJAX API, & Toasts
---------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
    // ------------------------------------------------
    // 1. Toast Notification System
    // ------------------------------------------------
    const toastContainer = document.getElementById('toast-container');

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let iconName = 'info';
        if (type === 'success') iconName = 'check-circle';
        if (type === 'error') iconName = 'alert-triangle';

        toast.innerHTML = `
            <i data-lucide="${iconName}" style="width: 18px; height: 18px; flex-shrink: 0;"></i>
            <div class="toast-message">${message}</div>
            <button class="toast-close">&times;</button>
        `;

        toastContainer.appendChild(toast);
        lucide.createIcons();

        // Close on button click
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            removeToast(toast);
        });

        // Auto remove after 5 seconds
        const timeout = setTimeout(() => {
            removeToast(toast);
        }, 5000);

        toast.dataset.timeoutId = timeout;
    }

    function removeToast(toast) {
        if (toast.dataset.timeoutId) {
            clearTimeout(toast.dataset.timeoutId);
        }
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px) scale(0.9)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }


    // ------------------------------------------------
    // 2. Tab Navigation Logic
    // ------------------------------------------------
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabIndicator = document.querySelector('.tab-indicator');
    const tabPanels = document.querySelectorAll('.tab-panel');

    function updateTabIndicator() {
        const activeBtn = document.querySelector('.tab-btn.active');
        if (activeBtn && tabIndicator) {
            tabIndicator.style.width = `${activeBtn.offsetWidth - 12}px`;
            tabIndicator.style.transform = `translateX(${activeBtn.offsetLeft}px)`;
        }
    }

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const targetTab = btn.getAttribute('data-tab');
            tabPanels.forEach(panel => {
                panel.classList.remove('active');
                if (panel.id === `panel-${targetTab}`) {
                    panel.classList.add('active');
                }
            });

            updateTabIndicator();
        });
    });

    // Handle resize of indicator dynamically
    window.addEventListener('resize', updateTabIndicator);
    // Initial position
    setTimeout(updateTabIndicator, 100);


    // ------------------------------------------------
    // 3. File Drag and Drop & Previews
    // ------------------------------------------------
    const fileStates = {
        hide: { file: null, dataUrl: null },
        reveal: { file: null, dataUrl: null }
    };

    function setupUploadArea(tabType) {
        const dragZone = document.getElementById(`drag-zone-${tabType}`);
        const fileInput = document.getElementById(`file-${tabType}`);
        const previewContainer = document.getElementById(`preview-container-${tabType}`);
        const imgPreview = document.getElementById(`img-preview-${tabType}`);
        const removeBtn = document.getElementById(`remove-img-${tabType}`);
        const metaContainer = document.getElementById(`meta-${tabType}`);

        // Click on zone triggers file input
        dragZone.addEventListener('click', (e) => {
            if (e.target.closest('.remove-btn')) return; // Avoid remove btn clicks
            fileInput.click();
        });

        // Dragover and dragleave states
        ['dragenter', 'dragover'].forEach(eventName => {
            dragZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                dragZone.classList.add('drag-over');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dragZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                dragZone.classList.remove('drag-over');
            }, false);
        });

        // Handle drop
        dragZone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length > 0) {
                handleFileSelection(files[0], tabType, fileInput, previewContainer, imgPreview, metaContainer);
            }
        });

        // Handle normal selection
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                handleFileSelection(fileInput.files[0], tabType, fileInput, previewContainer, imgPreview, metaContainer);
            }
        });

        // Handle removal
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            resetUploadArea(tabType, fileInput, previewContainer, imgPreview, metaContainer);
        });
    }

    function handleFileSelection(file, tabType, fileInput, previewContainer, imgPreview, metaContainer) {
        // Validate size (500MB max)
        const maxBytes = 500 * 1024 * 1024;
        if (file.size > maxBytes) {
            showToast('File size exceeds the 16MB limit.', 'error');
            resetUploadArea(tabType, fileInput, previewContainer, imgPreview, metaContainer);
            return;
        }

        // Validate formats
        const allowedTypes = ['image/png', 'image/bmp', 'image/tiff', 'image/webp', 'image/jpeg', 'image/jpg'];
        if (!allowedTypes.includes(file.type) && !file.name.match(/\.(png|bmp|tiff|webp|jpg|jpeg)$/i)) {
            showToast('Unsupported file format. Please upload PNG, BMP, TIFF, WebP, or JPG.', 'error');
            resetUploadArea(tabType, fileInput, previewContainer, imgPreview, metaContainer);
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            imgPreview.src = e.target.result;
            previewContainer.classList.remove('hidden');

            // Format file size
            const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
            metaContainer.innerHTML = `
                <span>${file.name}</span>
                <span>${sizeMB} MB</span>
            `;

            fileStates[tabType].file = file;
            fileStates[tabType].dataUrl = e.target.result;

            if (tabType === 'hide') {
                // Clear any previous results
                document.getElementById('result-box-hide').classList.add('hidden');
            } else if (tabType === 'reveal') {
                document.getElementById('result-box-reveal').classList.add('hidden');
            }
        };

        reader.onerror = () => {
            showToast('Failed to read file. It might be corrupted.', 'error');
            resetUploadArea(tabType, fileInput, previewContainer, imgPreview, metaContainer);
        };

        reader.readAsDataURL(file);
    }

    function resetUploadArea(tabType, fileInput, previewContainer, imgPreview, metaContainer) {
        fileInput.value = '';
        imgPreview.src = '';
        previewContainer.classList.add('hidden');
        metaContainer.innerHTML = '';
        fileStates[tabType].file = null;
        fileStates[tabType].dataUrl = null;

        if (tabType === 'hide') {
            document.getElementById('result-box-hide').classList.add('hidden');
        } else if (tabType === 'reveal') {
            document.getElementById('result-box-reveal').classList.add('hidden');
        }
    }

    // Initialize both upload areas
    setupUploadArea('hide');
    setupUploadArea('reveal');


    // ------------------------------------------------
    // 4. Character Counter (Hide Tab)
    // ------------------------------------------------
    const textareaHide = document.getElementById('secret-message');
    const charCountSpan = document.getElementById('char-count');

    textareaHide.addEventListener('input', () => {
        const count = textareaHide.value.length;
        charCountSpan.textContent = count.toLocaleString();
    });


    // ------------------------------------------------
    // 5. Encoding Logic (AJAX Submit)
    // ------------------------------------------------
    const formEncode = document.getElementById('form-encode');
    const btnEncode = document.getElementById('btn-encode');
    const resultBoxHide = document.getElementById('result-box-hide');
    const resultPreview = document.getElementById('result-preview');
    const downloadName = document.getElementById('download-name');
    const downloadLink = document.getElementById('download-link');

    formEncode.addEventListener('submit', async (e) => {
        e.preventDefault();

        const file = fileStates.hide.file;
        const message = textareaHide.value.trim();

        if (!file) {
            showToast('Please select or upload a source image first.', 'error');
            return;
        }

        if (!message) {
            showToast('Secret message cannot be empty.', 'error');
            return;
        }

        // Setup loading state
        btnEncode.disabled = true;
        btnEncode.querySelector('.btn-text').textContent = 'Embedding Secret...';
        btnEncode.querySelector('.loader').classList.remove('hidden');
        resultBoxHide.classList.add('hidden');

        const formData = new FormData();
        formData.append('image', file);
        formData.append('message', message);

        try {
            const response = await fetch('/encode', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                showToast(result.message, 'success');

                if (result.converted) {
                    showToast('Note: JPEG image was automatically converted to lossless PNG to prevent compression artifacts from corrupting the hidden data.', 'info');
                }

                // Show download box
                resultPreview.src = result.image_base64;
                downloadName.textContent = result.filename;
                downloadLink.href = result.image_base64;
                downloadLink.download = result.filename;
                
                resultBoxHide.classList.remove('hidden');
                
                // Scroll elegantly into view
                resultBoxHide.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                showToast(result.error || 'Encoding failed.', 'error');
            }
        } catch (error) {
            showToast('An unexpected server error occurred. Please check your network and try again.', 'error');
            console.error(error);
        } finally {
            // Restore button state
            btnEncode.disabled = false;
            btnEncode.querySelector('.btn-text').textContent = 'Encode & Secure';
            btnEncode.querySelector('.loader').classList.add('hidden');
        }
    });


    // ------------------------------------------------
    // 6. Decoding Logic (AJAX Submit)
    // ------------------------------------------------
    const btnDecode = document.getElementById('btn-decode');
    const resultBoxReveal = document.getElementById('result-box-reveal');
    const decodedTextarea = document.getElementById('decoded-message');

    btnDecode.addEventListener('click', async () => {
        const file = fileStates.reveal.file;

        if (!file) {
            showToast('Please select or upload an encoded image first.', 'error');
            return;
        }

        // Setup loading state
        btnDecode.disabled = true;
        btnDecode.querySelector('.btn-text').textContent = 'Extracting Secret...';
        btnDecode.querySelector('.loader').classList.remove('hidden');
        resultBoxReveal.classList.add('hidden');

        const formData = new FormData();
        formData.append('image', file);

        try {
            const response = await fetch('/decode', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                showToast('Secret message successfully extracted!', 'success');
                decodedTextarea.value = result.message;
                resultBoxReveal.classList.remove('hidden');
                
                // Scroll elegantly into view
                resultBoxReveal.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                showToast(result.error || 'Failed to extract any message.', 'error');
            }
        } catch (error) {
            showToast('An unexpected server error occurred. Please check your network and try again.', 'error');
            console.error(error);
        } finally {
            // Restore button state
            btnDecode.disabled = false;
            btnDecode.querySelector('.btn-text').textContent = 'Reveal Hidden Text';
            btnDecode.querySelector('.loader').classList.add('hidden');
        }
    });


    // ------------------------------------------------
    // 7. Clipboard Copy Message
    // ------------------------------------------------
    const btnCopy = document.getElementById('btn-copy');

    btnCopy.addEventListener('click', () => {
        const text = decodedTextarea.value;
        if (!text) return;

        navigator.clipboard.writeText(text).then(() => {
            showToast('Message copied to clipboard!', 'success');
            
            // Temporary button animation text
            const btnSpan = btnCopy.querySelector('span');
            const originalText = btnSpan.textContent;
            btnSpan.textContent = 'Copied!';
            
            setTimeout(() => {
                btnSpan.textContent = originalText;
            }, 2000);
        }).catch(err => {
            showToast('Failed to copy to clipboard. Please copy manually.', 'error');
            console.error(err);
        });
    });
});
