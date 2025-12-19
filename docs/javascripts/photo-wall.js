/**
 * PhotoWall Library
 * A cyber corkboard for displaying images and notes.
 */

class PhotoWall {
    constructor(container, config) {
        if (!container) throw new Error("PhotoWall: Container element is required.");
        this.container = container;
        this.config = config || { version: [1, 0], pinned: [] };

        // Internal state
        this.items = [];
        this.zIndexCounter = 100;

        // Styles mapping
        this.paddingMap = {
            's': 'min(0.5%, 8px)',
            'm': 'min(1%, 16px)',
            'l': 'min(1.5%, 24px)'
        };
        this.defaultPadding = 'min(1%, 16px)'; // Default to M

        this._init();
    }

    _init() {
        // 1. Setup Container
        this.container.style.position = 'relative';
        this.container.style.overflow = 'hidden';
        this.container.style.userSelect = 'none';

        // 2. Inject CSS
        this._injectStyles();

        // 3. Generate Texture Background
        this._applyCorkTexture();

        // 4. Render Items
        this._renderItems();

        // 5. Setup Global Events (Lightbox, etc)
        this._setupLightbox();
    }

    _injectStyles() {
        const css = `
            .pw-photo-container {
                position: absolute;
                background-color: white;
                box-shadow: 0 0.5em 1.5em rgba(0, 0, 0, 0.3);
                cursor: grab;
                transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
                transform-origin: center center;
                box-sizing: border-box;
                display: flex;
                width: 25%;
                min-height: 12%
                flex-direction: column;
                align-items: center;
                justify-content: center;
            }
            .pw-photo-container:active {
                cursor: grabbing;
                box-shadow: 0 1em 2.5em rgba(0, 0, 0, 0.4);
            }
            .pw-content-img {
                display: block;
                width: 100%;
                height: auto;
                pointer-events: none;
                object-fit: contain;
            }
            .pw-content-note {
                width: 100%;
                height: 100%;
                font-family: 'Comic Sans MS', 'Marker Felt', sans-serif;
                font-size: 1.2em;
                color: #333;
                text-align: center;
                display: flex;
                align-items: center;
                justify-content: center;
                word-wrap: break-word;
                padding: 10%;
                background: #fff9c4; /* Light yellow for notes */
            }
            /* Pin Styles */
            .pw-pin {
                position: absolute;
                width: min(10%, 16px);
                aspect-ratio: 1;
                border-radius: 50%;
                top: max(-5%, -8px);
                left: 50%;
                transform: translateX(-50%);
                box-shadow: 1px 1px 4px rgba(0, 0, 0, 0.5);
                border: 2px solid rgba(255, 255, 255, 0.8);
                z-index: 10;
                background-image: radial-gradient(circle at 65% 35%, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0) 50%);
            }

            /* Lightbox Styles */
            #pw-lightbox {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background-color: rgba(0, 0, 0, 0.85);
                z-index: 99999;
                display: none;
                opacity: 0;
                transition: opacity 0.3s ease;
                overflow: hidden;
            }
            #pw-lightbox.active {
                opacity: 1;
            }
            #pw-lightbox-content {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) scale(1);
                max-width: 90%;
                max-height: 90%;
                cursor: move;
                user-select: none;
            }
            #pw-lightbox-content img {
                max-width: 80vw;
                max-height: 80vh;
                box-shadow: 0 0 20px rgba(0,0,0,0.5);
                background: white;
            }
            #pw-lightbox-content .pw-note-large {
                background: #fff9c4;
                padding: 40px;
                font-size: 2rem;
                font-family: 'Comic Sans MS', sans-serif;
                box-shadow: 0 0 20px rgba(0,0,0,0.5);
                max-width: 60vw;
            }
            #pw-lightbox-close {
                position: absolute;
                top: 20px;
                right: 30px;
                color: white;
                font-size: 40px;
                cursor: pointer;
                font-family: sans-serif;
                z-index: 100000;
                text-shadow: 0px 0px 4px rgb(0 0 0);
            }
        `;
        const style = document.createElement('style');
        style.innerHTML = css;
        document.head.appendChild(style);
    }

    _applyCorkTexture() {
        // Reusing the canvas generation logic but optimized
        const createPattern = () => {
            const size = 256;
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');

            // Base
            ctx.fillStyle = '#d2b48c';
            ctx.fillRect(0, 0, size, size);

            // Noise
            const grainColors = ['#6b4a24', '#a57d52', '#c19a6b', '#e0c5a1'];
            for (let i = 0; i < size * 2; i++) {
                const x = Math.random() * size;
                const y = Math.random() * size;
                const r = Math.random() * 2 + 1;
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fillStyle = grainColors[Math.floor(Math.random() * grainColors.length)];
                ctx.globalAlpha = Math.random() * 0.3 + 0.2;
                ctx.fill();
            }
            return canvas;
        };

        const patternCanvas = createPattern();

        // Generate a larger rotated texture to avoid obvious tiling
        const textureSize = 1024;
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = textureSize;
        finalCanvas.height = textureSize;
        const ctx = finalCanvas.getContext('2d');
        const patternSize = 256;

        for (let y = 0; y < 4; y++) {
            for (let x = 0; x < 4; x++) {
                ctx.save();
                ctx.translate(x * patternSize + patternSize / 2, y * patternSize + patternSize / 2);
                ctx.rotate(Math.floor(Math.random() * 4) * (Math.PI / 2));
                ctx.drawImage(patternCanvas, -patternSize / 2, -patternSize / 2);
                ctx.restore();
            }
        }

        finalCanvas.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            this.container.style.backgroundImage = `url(${url})`;
            this.container.style.border = '12px solid #7d563d'; // Relative border size
            this.container.style.boxSizing = 'border-box';
        });
    }

    _renderItems() {
        if (!this.config.pinned) return;

        this.config.pinned.forEach((item, index) => {
            this._createPin(item, index);
        });
    }

    _createPin(data, index) {
        const el = document.createElement('div');
        el.className = 'pw-photo-container';

        // 1. Calculate Padding
        const padding = this.paddingMap[data.margin] || this.defaultPadding;
        el.style.padding = padding;

        // 2. Add Pin Visual
        const pin = document.createElement('div');
        pin.className = 'pw-pin';
        const colors = ['#e74c3c', '#347cdb', '#2ecc71', '#f1ea0f', '#9b59b6', '#e67e22'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        pin.style.backgroundColor = color;
        pin.style.borderColor = this._darkenColor(color);
        el.appendChild(pin);

        // 3. Add Content
        let contentEl;
        if (data.type === 'image' || data.type === 'svg') {
            contentEl = document.createElement('img');
            contentEl.src = data.content;
            contentEl.loading = 'lazy';
            contentEl.className = 'pw-content-img';
        } else if (data.type === 'note') {
            contentEl = document.createElement('div');
            contentEl.className = 'pw-content-note';
            contentEl.textContent = data.content;
        }

        if (contentEl) {
            el.appendChild(contentEl);
        }

        // 4. Position & Rotate (Random Scattering)
        // Using % for positions to ensure scalability
        const rot = Math.random() * 20 - 10;
        const top = 2 + Math.random() * 75; 
        const left = 2 + Math.random() * 75; 

        el.style.top = `${top}%`;
        el.style.left = `${left}%`;
        el.style.transform = `rotate(${rot}deg)`;
        el.dataset.rotation = rot;

        // Store raw data for lightbox
        el.dataset.type = data.type;
        el.dataset.content = data.content;

        this.container.appendChild(el);
        this._makeDraggable(el);

        // Click event for Lightbox (distinguish from drag)
        el.addEventListener('click', (e) => {
            if (el.dataset.isDragging === 'true') return;
            this._showLightbox(data);
        });
    }

    _makeDraggable(el) {
        let isDragging = false;
        let startX, startY;
        let startLeftPct, startTopPct;
        let didMove = false;

        const onMouseDown = (e) => {
            if (e.button !== 0) return; // Only left click
            e.preventDefault();
            e.stopPropagation();

            isDragging = true;
            didMove = false;
            el.dataset.isDragging = 'false';

            // Bring to front
            this.zIndexCounter++;
            el.style.zIndex = this.zIndexCounter;
            el.style.transition = 'none'; // Disable transition during drag

            startX = e.clientX;
            startY = e.clientY;

            // Get current percentage positions
            const containerRect = this.container.getBoundingClientRect();
            startLeftPct = parseFloat(el.style.left);
            startTopPct = parseFloat(el.style.top);

            // Store container dimensions for pixel-to-percent conversion
            this.containerWidth = containerRect.width;
            this.containerHeight = containerRect.height;

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };

        const onMouseMove = (e) => {
            if (!isDragging) return;

            const dxPx = e.clientX - startX;
            const dyPx = e.clientY - startY;

            if (Math.abs(dxPx) > 2 || Math.abs(dyPx) > 2) {
                didMove = true;
                el.dataset.isDragging = 'true';
            }

            // Convert delta pixels to delta percentage
            const dxPct = (dxPx / this.containerWidth) * 100;
            const dyPct = (dyPx / this.containerHeight) * 100;

            el.style.left = `${startLeftPct + dxPct}%`;
            el.style.top = `${startTopPct + dyPct}%`;
        };

        const onMouseUp = () => {
            isDragging = false;
            el.style.transition = 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out';
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        el.addEventListener('mousedown', onMouseDown);
    }

    _darkenColor(hex) {
        hex = hex.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        const dr = Math.round(r * 0.75).toString(16).padStart(2, '0');
        const dg = Math.round(g * 0.75).toString(16).padStart(2, '0');
        const db = Math.round(b * 0.75).toString(16).padStart(2, '0');
        return `#${dr}${dg}${db}`;
    }

    // --- Lightbox Logic ---

    _setupLightbox() {
        // Create Lightbox DOM
        this.lightbox = document.createElement('div');
        this.lightbox.id = 'pw-lightbox';

        const closeBtn = document.createElement('div');
        closeBtn.id = 'pw-lightbox-close';
        closeBtn.innerHTML = '&times;';

        this.lightboxContent = document.createElement('div');
        this.lightboxContent.id = 'pw-lightbox-content';

        this.lightbox.appendChild(closeBtn);
        this.lightbox.appendChild(this.lightboxContent);
        document.body.appendChild(this.lightbox);

        // Events
        closeBtn.addEventListener('click', () => this._hideLightbox());

        // Zoom & Pan Variables
        this.lbState = { scale: 1, x: 0, y: 0, isDragging: false };

        // Wheel Zoom
        this.lightbox.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY * -0.001;
            const newScale = Math.min(Math.max(.5, this.lbState.scale + delta), 4);
            this.lbState.scale = newScale;
            this._updateLightboxTransform();
        });

        // Pan Logic
        this.lightboxContent.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.lbState.isDragging = true;
            this.lbState.startX = e.clientX - this.lbState.x;
            this.lbState.startY = e.clientY - this.lbState.y;
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.lbState.isDragging || this.lightbox.style.display === 'none') return;
            e.preventDefault();
            this.lbState.x = e.clientX - this.lbState.startX;
            this.lbState.y = e.clientY - this.lbState.startY;
            this._updateLightboxTransform();
        });

        window.addEventListener('mouseup', () => {
            this.lbState.isDragging = false;
        });
    }

    _showLightbox(data) {
        this.lightboxContent.innerHTML = '';
        this.lbState = { scale: 1, x: 0, y: 0, isDragging: false };
        this._updateLightboxTransform();

        let el;
        if (data.type === 'image' || data.type === 'svg') {
            el = document.createElement('img');
            el.src = data.content;
        } else {
            el = document.createElement('div');
            el.className = 'pw-note-large';
            el.textContent = data.content;
        }

        this.lightboxContent.appendChild(el);
        this.lightbox.style.display = 'block';
        // Force reflow
        this.lightbox.offsetWidth;
        this.lightbox.classList.add('active');
    }

    _hideLightbox() {
        this.lightbox.classList.remove('active');
        setTimeout(() => {
            this.lightbox.style.display = 'none';
            this.lightboxContent.innerHTML = '';
        }, 300);
    }

    _updateLightboxTransform() {
        this.lightboxContent.style.transform =
            `translate(calc(-50% + ${this.lbState.x}px), calc(-50% + ${this.lbState.y}px)) scale(${this.lbState.scale})`;
    }
}