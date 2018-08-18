export class ImageUtils {
    static laplaceKernel = new Float32Array([-1, -1, -1, -1, 8, -1, -1, -1, -1]);
    static sobelSignVector = new Float32Array([-1, 0, 1]);
    static sobelScaleVector = new Float32Array([1, 2, 1]);

    static createImageDataFloat32(w, h) { return { width: w, height: h, data: new Float32Array(w * h * 4) }; }

    static identity(pixels: ImageData): ImageData {
        const output = new ImageData(pixels.width, pixels.height);
        const dst = output.data;
        const d = pixels.data;
        for (let i = 0; i < d.length; i++) {
            dst[i] = d[i];
        }
        return output;
    }

    static horizontalFlip(pixels: ImageData): ImageData {
        const output = new ImageData(pixels.width, pixels.height);
        const w = pixels.width;
        const h = pixels.height;
        const dst = output.data;
        const d = pixels.data;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const off = (y * w + x) * 4;
                const dstOff = (y * w + (w - x - 1)) * 4;
                dst[dstOff] = d[off];
                dst[dstOff + 1] = d[off + 1];
                dst[dstOff + 2] = d[off + 2];
                dst[dstOff + 3] = d[off + 3];
            }
        }
        return output;
    }

    static verticalFlip(pixels: ImageData): ImageData {
        const output = new ImageData(pixels.width, pixels.height);
        const w = pixels.width;
        const h = pixels.height;
        const dst = output.data;
        const d = pixels.data;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const off = (y * w + x) * 4;
                const dstOff = ((h - y - 1) * w + x) * 4;
                dst[dstOff] = d[off];
                dst[dstOff + 1] = d[off + 1];
                dst[dstOff + 2] = d[off + 2];
                dst[dstOff + 3] = d[off + 3];
            }
        }
        return output;
    }

    static luminance(pixels: ImageData): ImageData {
        const output = new ImageData(pixels.width, pixels.height);
        const dst = output.data;
        const d = pixels.data;
        for (let i = 0; i < d.length; i += 4) {
            const r = d[i];
            const g = d[i + 1];
            const b = d[i + 2];
            // CIE luminance for the RGB
            const v = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            dst[i] = dst[i + 1] = dst[i + 2] = v;
            dst[i + 3] = d[i + 3];
        }
        return output;
    }

    static grayscale(pixels: ImageData): ImageData {
        const output = new ImageData(pixels.width, pixels.height);
        for (let i = 0; i < pixels.data.length; i += 4) {
            const r = pixels.data[i];
            const g = pixels.data[i + 1];
            const b = pixels.data[i + 2];
            const v = 0.299 * r + 0.587 * g + 0.114 * b;
            output.data[i] = output.data[i + 1] = output.data[i + 2] = v;
            output.data[i + 3] = pixels.data[i + 3];
        }
        return output;
    }

    static grayscaleAvg(pixels: ImageData): ImageData {
        const output = new ImageData(pixels.width, pixels.height);
        const f = 1 / 3;
        for (let i = 0; i < pixels.data.length; i += 4) {
            const r = pixels.data[i];
            const g = pixels.data[i + 1];
            const b = pixels.data[i + 2];
            const v = (r + g + b) * f;
            output.data[i] = output.data[i + 1] = output.data[i + 2] = v;
            output.data[i + 3] = pixels.data[i + 3];
        }
        return output;
    }

    static grayscaleOneChannel(image: ImageData): Uint8ClampedArray {
        const width = image.width;
        const height = image.height;
        const output = new Uint8ClampedArray(image.data.length / 4);
        let p = 0;
        let w = 0;
        for (let i = 0; i < height; i++) {
            for (let j = 0; j < width; j++) {
                const value = image.data[w] * 0.299 + image.data[w + 1] * 0.587 + image.data[w + 2] * 0.114;
                output[p++] = value;
                w += 4;
            }
        }
        return output;
    }

    static grayscaleOneChannelAvg(image: ImageData): Uint8ClampedArray {
        const width = image.width;
        const height = image.height;
        const output = new Uint8ClampedArray(image.data.length / 4);
        const f = 1 / 3;
        let p = 0;
        let w = 0;
        for (let i = 0; i < height; i++) {
            for (let j = 0; j < width; j++) {
                const value = (image.data[w] + image.data[w + 1] + image.data[w + 2]) * f;
                output[p++] = value;
                w += 4;
            }
        }
        return output;
    }

    static toMonoChannel(image: ImageData): ImageData {
        const width = image.width;
        const height = image.height;
        const output = new ImageData(width, height);
        let p = 0;
        let w = 0;
        for (let i = 0; i < height; i++) {
            for (let j = 0; j < width; j++) {
                if (image.data[w] !== 0 && image.data[w + 1] !== 0 && image.data[w + 2] !== 0) {
                    output.data[p++] = 255;
                } else {
                    output.data[p++] = 0;
                }
                w += 4;
            }
        }
        return output;
    }

    static threshold(pixels: ImageData, threshold, high, low): ImageData {
        const output = new ImageData(pixels.width, pixels.height);
        if (high == null) { high = 255; }
        if (low == null) { low = 0; }
        const d = pixels.data;
        const dst = output.data;
        for (let i = 0; i < d.length; i += 4) {
            const r = d[i];
            const g = d[i + 1];
            const b = d[i + 2];
            const v = (0.3 * r + 0.59 * g + 0.11 * b >= threshold) ? high : low;
            dst[i] = dst[i + 1] = dst[i + 2] = v;
            dst[i + 3] = d[i + 3];
        }
        return output;
    }

    static invert(pixels: ImageData): ImageData {
        const output = new ImageData(pixels.width, pixels.height);
        const d = pixels.data;
        const dst = output.data;
        for (let i = 0; i < d.length; i += 4) {
            dst[i] = 255 - d[i];
            dst[i + 1] = 255 - d[i + 1];
            dst[i + 2] = 255 - d[i + 2];
            dst[i + 3] = d[i + 3];
        }
        return output;
    }

    static brightnessContrast(pixels: ImageData, brightness, contrast): ImageData {
        const lut = this.brightnessContrastLUT(brightness, contrast);
        return this.applyLUT(pixels, { r: lut, g: lut, b: lut, a: this.identityLUT() });
    }

    static applyLUT(pixels: ImageData, lut): ImageData {
        const output = new ImageData(pixels.width, pixels.height);
        const d = pixels.data;
        const dst = output.data;
        const r = lut.r;
        const g = lut.g;
        const b = lut.b;
        const a = lut.a;
        for (let i = 0; i < d.length; i += 4) {
            dst[i] = r[d[i]];
            dst[i + 1] = g[d[i + 1]];
            dst[i + 2] = b[d[i + 2]];
            dst[i + 3] = a[d[i + 3]];
        }
        return output;
    }

    static createLUTFromCurve(points) {
        const lut = new Uint8Array(256);
        let p = [0, 0];
        for (let i = 0, j = 0; i < lut.length; i++) {
            while (j < points.length && points[j][0] < i) {
                p = points[j];
                j++;
            }
            lut[i] = p[1];
        }
        return lut;
    }

    static identityLUT() {
        const lut = new Uint8Array(256);
        for (let i = 0; i < lut.length; i++) { lut[i] = i; }
        return lut;
    }

    static invertLUT() {
        const lut = new Uint8Array(256);
        for (let i = 0; i < lut.length; i++) { lut[i] = 255 - i; }
        return lut;
    }

    static brightnessContrastLUT(brightness, contrast) {
        const lut = new Uint8Array(256);
        const contrastAdjust = -128 * contrast + 128;
        const brightnessAdjust = 255 * brightness;
        const adjust = contrastAdjust + brightnessAdjust;
        for (let i = 0; i < lut.length; i++) {
            const c = i * contrast + adjust;
            lut[i] = c < 0 ? 0 : (c > 255 ? 255 : c);
        }
        return lut;
    }

    static convolve(pixels, weights, opaque) {
        const side = Math.round(Math.sqrt(weights.length));
        const halfSide = Math.floor(side / 2);

        const src = pixels.data;
        const sw = pixels.width;
        const sh = pixels.height;

        const w = sw;
        const h = sh;
        const output = new ImageData(w, h);
        const dst = output.data;

        const alphaFac = opaque ? 1 : 0;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const sy = y;
                const sx = x;
                const dstOff = (y * w + x) * 4;
                let r = 0, g = 0, b = 0, a = 0;
                for (let cy = 0; cy < side; cy++) {
                    for (let cx = 0; cx < side; cx++) {
                        const scy = Math.min(sh - 1, Math.max(0, sy + cy - halfSide));
                        const scx = Math.min(sw - 1, Math.max(0, sx + cx - halfSide));
                        const srcOff = (scy * sw + scx) * 4;
                        const wt = weights[cy * side + cx];
                        r += src[srcOff] * wt;
                        g += src[srcOff + 1] * wt;
                        b += src[srcOff + 2] * wt;
                        a += src[srcOff + 3] * wt;
                    }
                }
                dst[dstOff] = r;
                dst[dstOff + 1] = g;
                dst[dstOff + 2] = b;
                dst[dstOff + 3] = a + alphaFac * (255 - a);
            }
        }
        return output;
    }

    static verticalConvolve(pixels, weightsVector, opaque) {
        const side = weightsVector.length;
        const halfSide = Math.floor(side / 2);

        const src = pixels.data;
        const sw = pixels.width;
        const sh = pixels.height;

        const w = sw;
        const h = sh;
        const output = new ImageData(w, h);
        const dst = output.data;

        const alphaFac = opaque ? 1 : 0;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const sy = y;
                const sx = x;
                const dstOff = (y * w + x) * 4;
                let r = 0, g = 0, b = 0, a = 0;
                for (let cy = 0; cy < side; cy++) {
                    const scy = Math.min(sh - 1, Math.max(0, sy + cy - halfSide));
                    const scx = sx;
                    const srcOff = (scy * sw + scx) * 4;
                    const wt = weightsVector[cy];
                    r += src[srcOff] * wt;
                    g += src[srcOff + 1] * wt;
                    b += src[srcOff + 2] * wt;
                    a += src[srcOff + 3] * wt;
                }
                dst[dstOff] = r;
                dst[dstOff + 1] = g;
                dst[dstOff + 2] = b;
                dst[dstOff + 3] = a + alphaFac * (255 - a);
            }
        }
        return output;
    }

    static horizontalConvolve(pixels, weightsVector, opaque) {
        const side = weightsVector.length;
        const halfSide = Math.floor(side / 2);

        const src = pixels.data;
        const sw = pixels.width;
        const sh = pixels.height;

        const w = sw;
        const h = sh;
        const output = new ImageData(w, h);
        const dst = output.data;

        const alphaFac = opaque ? 1 : 0;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const sy = y;
                const sx = x;
                const dstOff = (y * w + x) * 4;
                let r = 0, g = 0, b = 0, a = 0;
                for (let cx = 0; cx < side; cx++) {
                    const scy = sy;
                    const scx = Math.min(sw - 1, Math.max(0, sx + cx - halfSide));
                    const srcOff = (scy * sw + scx) * 4;
                    const wt = weightsVector[cx];
                    r += src[srcOff] * wt;
                    g += src[srcOff + 1] * wt;
                    b += src[srcOff + 2] * wt;
                    a += src[srcOff + 3] * wt;
                }
                dst[dstOff] = r;
                dst[dstOff + 1] = g;
                dst[dstOff + 2] = b;
                dst[dstOff + 3] = a + alphaFac * (255 - a);
            }
        }
        return output;
    }

    static separableConvolve(pixels, horizWeights, vertWeights, opaque) {
        return this.horizontalConvolve(
            this.verticalConvolveFloat32(pixels, vertWeights, opaque),
            horizWeights,
            opaque
        );
    }

    static convolveFloat32(pixels, weights, opaque) {
        const side = Math.round(Math.sqrt(weights.length));
        const halfSide = Math.floor(side / 2);

        const src = pixels.data;
        const sw = pixels.width;
        const sh = pixels.height;

        const w = sw;
        const h = sh;
        const output = this.createImageDataFloat32(w, h);
        const dst = output.data;

        const alphaFac = opaque ? 1 : 0;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const sy = y;
                const sx = x;
                const dstOff = (y * w + x) * 4;
                let r = 0, g = 0, b = 0, a = 0;
                for (let cy = 0; cy < side; cy++) {
                    for (let cx = 0; cx < side; cx++) {
                        const scy = Math.min(sh - 1, Math.max(0, sy + cy - halfSide));
                        const scx = Math.min(sw - 1, Math.max(0, sx + cx - halfSide));
                        const srcOff = (scy * sw + scx) * 4;
                        const wt = weights[cy * side + cx];
                        r += src[srcOff] * wt;
                        g += src[srcOff + 1] * wt;
                        b += src[srcOff + 2] * wt;
                        a += src[srcOff + 3] * wt;
                    }
                }
                dst[dstOff] = r;
                dst[dstOff + 1] = g;
                dst[dstOff + 2] = b;
                dst[dstOff + 3] = a + alphaFac * (255 - a);
            }
        }
        return output;
    }

    static verticalConvolveFloat32(pixels, weightsVector, opaque) {
        const side = weightsVector.length;
        const halfSide = Math.floor(side / 2);

        const src = pixels.data;
        const sw = pixels.width;
        const sh = pixels.height;

        const w = sw;
        const h = sh;
        const output = this.createImageDataFloat32(w, h);
        const dst = output.data;

        const alphaFac = opaque ? 1 : 0;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const sy = y;
                const sx = x;
                const dstOff = (y * w + x) * 4;
                let r = 0, g = 0, b = 0, a = 0;
                for (let cy = 0; cy < side; cy++) {
                    const scy = Math.min(sh - 1, Math.max(0, sy + cy - halfSide));
                    const scx = sx;
                    const srcOff = (scy * sw + scx) * 4;
                    const wt = weightsVector[cy];
                    r += src[srcOff] * wt;
                    g += src[srcOff + 1] * wt;
                    b += src[srcOff + 2] * wt;
                    a += src[srcOff + 3] * wt;
                }
                dst[dstOff] = r;
                dst[dstOff + 1] = g;
                dst[dstOff + 2] = b;
                dst[dstOff + 3] = a + alphaFac * (255 - a);
            }
        }
        return output;
    }

    static horizontalConvolveFloat32(pixels, weightsVector, opaque) {
        const side = weightsVector.length;
        const halfSide = Math.floor(side / 2);

        const src = pixels.data;
        const sw = pixels.width;
        const sh = pixels.height;

        const w = sw;
        const h = sh;
        const output = this.createImageDataFloat32(w, h);
        const dst = output.data;

        const alphaFac = opaque ? 1 : 0;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const sy = y;
                const sx = x;
                const dstOff = (y * w + x) * 4;
                let r = 0, g = 0, b = 0, a = 0;
                for (let cx = 0; cx < side; cx++) {
                    const scy = sy;
                    const scx = Math.min(sw - 1, Math.max(0, sx + cx - halfSide));
                    const srcOff = (scy * sw + scx) * 4;
                    const wt = weightsVector[cx];
                    r += src[srcOff] * wt;
                    g += src[srcOff + 1] * wt;
                    b += src[srcOff + 2] * wt;
                    a += src[srcOff + 3] * wt;
                }
                dst[dstOff] = r;
                dst[dstOff + 1] = g;
                dst[dstOff + 2] = b;
                dst[dstOff + 3] = a + alphaFac * (255 - a);
            }
        }
        return output;
    }

    static separableConvolveFloat32(pixels, horizWeights, vertWeights, opaque) {
        return this.horizontalConvolveFloat32(
            this.verticalConvolveFloat32(pixels, vertWeights, opaque),
            horizWeights, opaque
        );
    }

    // Old methid, ver slow compared to the ones at the bottom
    static gaussianBlur(pixels: ImageData, diameter: number) {
        diameter = Math.abs(diameter);
        if (diameter <= 1) { return pixels; }
        const radius = diameter / 2;
        const len = Math.ceil(diameter) + (1 - (Math.ceil(diameter) % 2));
        const weights = new Float32Array(len);
        const rho = (radius + 0.5) / 3;
        const rhoSq = rho * rho;
        const gaussianFactor = 1 / Math.sqrt(2 * Math.PI * rhoSq);
        const rhoFactor = -1 / (2 * rho * rho);
        let wsum = 0;
        const middle = Math.floor(len / 2);
        for (let i = 0; i < len; i++) {
            const x = i - middle;
            const gx = gaussianFactor * Math.exp(x * x * rhoFactor);
            weights[i] = gx;
            wsum += gx;
        }
        for (let i = 0; i < weights.length; i++) {
            weights[i] /= wsum;
        }
        return this.separableConvolve(pixels, weights, weights, true);
    }


    static laplace(pixels) { return this.convolve(pixels, this.laplaceKernel, true); }

    // Opaque a false?
    static sobelVerticalGradient(px) { return this.separableConvolveFloat32(px, this.sobelSignVector, this.sobelScaleVector, true); }

    // Opaque a false?
    static sobelHorizontalGradient(px) { return this.separableConvolveFloat32(px, this.sobelScaleVector, this.sobelSignVector, true); }

    static sobelVectors(px) {
        const vertical = this.sobelVerticalGradient(px);
        const horizontal = this.sobelHorizontalGradient(px);
        const id = {
            width: vertical.width, height: vertical.height,
            data: new Float32Array(vertical.width * vertical.height * 8)
        };
        const vd = vertical.data;
        const hd = horizontal.data;
        const idd = id.data;
        for (let i = 0, j = 0; i < idd.length; i += 2, j++) {
            idd[i] = hd[j];
            idd[i + 1] = vd[j];
        }
        return id;
    }

    static sobel(px): ImageData {
        px = this.grayscale(px);
        const vertical = this.sobelVerticalGradient(px);
        const horizontal = this.sobelHorizontalGradient(px);
        const id = new ImageData(vertical.width, vertical.height);
        for (let i = 0; i < id.data.length; i += 4) {
            const v = Math.abs(vertical.data[i]);
            id.data[i] = v;
            const h = Math.abs(horizontal.data[i]);
            id.data[i + 1] = h;
            id.data[i + 2] = (v + h) / 4;
            id.data[i + 3] = 255;
        }
        return id;
    }

    static bilinearSample(pixels, x, y, rgba): ImageData {
        const x1 = Math.floor(x);
        const x2 = Math.ceil(x);
        const y1 = Math.floor(y);
        const y2 = Math.ceil(y);
        const a = (x1 + pixels.width * y1) * 4;
        const b = (x2 + pixels.width * y1) * 4;
        const c = (x1 + pixels.width * y2) * 4;
        const d = (x2 + pixels.width * y2) * 4;
        let df = ((x - x1) + (y - y1));
        let cf = ((x2 - x) + (y - y1));
        let bf = ((x - x1) + (y2 - y));
        let af = ((x2 - x) + (y2 - y));
        const rsum = 1 / (af + bf + cf + df);
        af *= rsum;
        bf *= rsum;
        cf *= rsum;
        df *= rsum;
        const data = pixels.data;
        rgba[0] = data[a] * af + data[b] * bf + data[c] * cf + data[d] * df;
        rgba[1] = data[a + 1] * af + data[b + 1] * bf + data[c + 1] * cf + data[d + 1] * df;
        rgba[2] = data[a + 2] * af + data[b + 2] * bf + data[c + 2] * cf + data[d + 2] * df;
        rgba[3] = data[a + 3] * af + data[b + 3] * bf + data[c + 3] * cf + data[d + 3] * df;
        return rgba;
    }

    static distortSine(pixels, amount, yamount): ImageData {
        if (amount == null) { amount = 0.5; }
        if (yamount == null) { yamount = amount; }
        const output = new ImageData(pixels.width, pixels.height);
        const dst = output.data;
        const d = pixels.data;
        const px = new ImageData(1, 1).data;
        for (let y = 0; y < output.height; y++) {
            const sy = -Math.sin(y / (output.height - 1) * Math.PI * 2);
            let srcY = y + sy * yamount * output.height / 4;
            srcY = Math.max(Math.min(srcY, output.height - 1), 0);

            for (let x = 0; x < output.width; x++) {
                const sx = -Math.sin(x / (output.width - 1) * Math.PI * 2);
                let srcX = x + sx * amount * output.width / 4;
                srcX = Math.max(Math.min(srcX, output.width - 1), 0);

                const rgba = this.bilinearSample(pixels, srcX, srcY, px);

                const off = (y * output.width + x) * 4;
                dst[off] = rgba[0];
                dst[off + 1] = rgba[1];
                dst[off + 2] = rgba[2];
                dst[off + 3] = rgba[3];
            }
        }
        return output;
    }

    static darkenBlend(below, above): ImageData {
        const output = new ImageData(below.width, below.height);
        const a = below.data;
        const b = above.data;
        const dst = output.data;
        const f = 1 / 255;
        for (let i = 0; i < a.length; i += 4) {
            dst[i] = a[i] < b[i] ? a[i] : b[i];
            dst[i + 1] = a[i + 1] < b[i + 1] ? a[i + 1] : b[i + 1];
            dst[i + 2] = a[i + 2] < b[i + 2] ? a[i + 2] : b[i + 2];
            dst[i + 3] = a[i + 3] + ((255 - a[i + 3]) * b[i + 3]) * f;
        }
        return output;
    }

    static lightenBlend(below, above): ImageData {
        const output = new ImageData(below.width, below.height);
        const a = below.data;
        const b = above.data;
        const dst = output.data;
        const f = 1 / 255;
        for (let i = 0; i < a.length; i += 4) {
            dst[i] = a[i] > b[i] ? a[i] : b[i];
            dst[i + 1] = a[i + 1] > b[i + 1] ? a[i + 1] : b[i + 1];
            dst[i + 2] = a[i + 2] > b[i + 2] ? a[i + 2] : b[i + 2];
            dst[i + 3] = a[i + 3] + ((255 - a[i + 3]) * b[i + 3]) * f;
        }
        return output;
    }

    static multiplyBlend(below, above): ImageData {
        const output = new ImageData(below.width, below.height);
        const a = below.data;
        const b = above.data;
        const dst = output.data;
        const f = 1 / 255;
        for (let i = 0; i < a.length; i += 4) {
            dst[i] = (a[i] * b[i]) * f;
            dst[i + 1] = (a[i + 1] * b[i + 1]) * f;
            dst[i + 2] = (a[i + 2] * b[i + 2]) * f;
            dst[i + 3] = a[i + 3] + ((255 - a[i + 3]) * b[i + 3]) * f;
        }
        return output;
    }

    static screenBlend(below, above): ImageData {
        const output = new ImageData(below.width, below.height);
        const a = below.data;
        const b = above.data;
        const dst = output.data;
        const f = 1 / 255;
        for (let i = 0; i < a.length; i += 4) {
            dst[i] = a[i] + b[i] - a[i] * b[i] * f;
            dst[i + 1] = a[i + 1] + b[i + 1] - a[i + 1] * b[i + 1] * f;
            dst[i + 2] = a[i + 2] + b[i + 2] - a[i + 2] * b[i + 2] * f;
            dst[i + 3] = a[i + 3] + ((255 - a[i + 3]) * b[i + 3]) * f;
        }
        return output;
    }

    static addBlend(below, above): ImageData {
        const output = new ImageData(below.width, below.height);
        const a = below.data;
        const b = above.data;
        const dst = output.data;
        const f = 1 / 255;
        for (let i = 0; i < a.length; i += 4) {
            dst[i] = (a[i] + b[i]);
            dst[i + 1] = (a[i + 1] + b[i + 1]);
            dst[i + 2] = (a[i + 2] + b[i + 2]);
            dst[i + 3] = a[i + 3] + ((255 - a[i + 3]) * b[i + 3]) * f;
        }
        return output;
    }

    static subBlend(below, above): ImageData {
        const output = new ImageData(below.width, below.height);
        const a = below.data;
        const b = above.data;
        const dst = output.data;
        const f = 1 / 255;
        for (let i = 0; i < a.length; i += 4) {
            dst[i] = (a[i] + b[i] - 255);
            dst[i + 1] = (a[i + 1] + b[i + 1] - 255);
            dst[i + 2] = (a[i + 2] + b[i + 2] - 255);
            dst[i + 3] = a[i + 3] + ((255 - a[i + 3]) * b[i + 3]) * f;
        }
        return output;
    }

    static differenceBlend(below, above): ImageData {
        const output = new ImageData(below.width, below.height);
        const a = below.data;
        const b = above.data;
        const dst = output.data;
        const f = 1 / 255;
        for (let i = 0; i < a.length; i += 4) {
            dst[i] = Math.abs(a[i] - b[i]);
            dst[i + 1] = Math.abs(a[i + 1] - b[i + 1]);
            dst[i + 2] = Math.abs(a[i + 2] - b[i + 2]);
            dst[i + 3] = a[i + 3] + ((255 - a[i + 3]) * b[i + 3]) * f;
        }
        return output;
    }

    static erode(pixels: ImageData): ImageData {
        const src = pixels.data;
        const sw = pixels.width;
        const sh = pixels.height;

        const w = sw;
        const h = sh;
        const output = new ImageData(w, h);
        const dst = output.data;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const sy = y;
                const sx = x;
                const dstOff = (y * w + x) * 4;
                const srcOff = (sy * sw + sx) * 4;
                let v = 0;
                if (src[srcOff] === 0) {
                    if (src[(sy * sw + Math.max(0, sx - 1)) * 4] === 0 &&
                        src[(Math.max(0, sy - 1) * sw + sx) * 4] === 0) {
                        v = 255;
                    }
                } else {
                    v = 255;
                }
                dst[dstOff] = v;
                dst[dstOff + 1] = v;
                dst[dstOff + 2] = v;
                dst[dstOff + 3] = 255;
            }
        }
        return output;
    }

    static histogramEqualization(pixels: ImageData): ImageData {
        const width = pixels.width;
        const height = pixels.height;
        const image = new ImageData(width, height);
        const countR = new Array(), countG = new Array(), countB = new Array();
        for (let i = 0; i < 256; i++) { countR[i] = 0, countG[i] = 0, countB[i] = 0; }
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const a = ((y * width) + x) * 4;
                countR[pixels.data[a + 0]]++;
                countG[pixels.data[a + 1]]++;
                countB[pixels.data[a + 2]]++;
            }
        }
        let minR = 256, minG = 256, minB = 256;
        for (let i = 1; i < 256; i++) {
            countR[i] += countR[i - 1];
            countG[i] += countG[i - 1];
            countB[i] += countB[i - 1];

            minR = ((countR[i] !== 0) && (countR[i] < minR)) ? countR[i] : minR;
            minG = ((countG[i] !== 0) && (countG[i] < minG)) ? countG[i] : minG;
            minB = ((countB[i] !== 0) && (countB[i] < minB)) ? countB[i] : minB;
        }
        for (let i = 0; i < 256; i++) {
            countR[i] = ((countR[i] - minR) / ((width * height) - minR)) * 255;
            countG[i] = ((countG[i] - minG) / ((width * height) - minG)) * 255;
            countB[i] = ((countB[i] - minB) / ((width * height) - minB)) * 255;
        }
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const a = ((y * width) + x) * 4;
                image.data[a + 0] = countR[pixels.data[a + 0]];
                image.data[a + 1] = countG[pixels.data[a + 1]];
                image.data[a + 2] = countB[pixels.data[a + 2]];
                image.data[a + 3] = pixels.data[a + 3];
            }
        }
        return image;
    }

    static equalizeHistogramOneChannel(pixels: Uint8ClampedArray) {
        const output = new Uint8ClampedArray(pixels.length);
        const srcLength = pixels.length;

        // Compute histogram and histogram sum:
        const hist = new Float32Array(256);
        let sum = 0;
        for (let i = 0; i < srcLength; ++i) {
            // tslint:disable-next-line:no-bitwise
            ++hist[~~pixels[i]];
            ++sum;
        }

        // Compute integral histogram:
        let prev = hist[0];
        for (let i = 1; i < 256; ++i) {
            prev = hist[i] += prev;
        }

        // Equalize image:
        const norm = 255 / sum;
        for (let i = 0; i < srcLength; ++i) {
            // tslint:disable-next-line:no-bitwise
            output[i] = hist[~~pixels[i]] * norm;
        }
        return output;
    }


    static resize(image: ImageData, scale: number): ImageData {
        if (scale === 1) { return image; }
        const widthScaled = image.width * scale;
        const heightScaled = image.height * scale;
        const scaledImage = new ImageData(widthScaled, heightScaled);
        for (let y = 0; y < heightScaled; y++) {
            for (let x = 0; x < widthScaled; x++) {
                const index = (Math.floor(y / scale) * image.width + Math.floor(x / scale)) * 4;
                const indexScaled = (y * widthScaled + x) * 4;
                scaledImage.data[indexScaled] = image.data[index];
                scaledImage.data[indexScaled + 1] = image.data[index + 1];
                scaledImage.data[indexScaled + 2] = image.data[index + 2];
                scaledImage.data[indexScaled + 3] = image.data[index + 3];
            }
        }
        return scaledImage;
    }

    static resizeWithCanvas(source: ImageData, new_width: number, new_height: number): ImageData {
        const canvas = document.createElement('canvas');
        canvas.width = source.width;
        canvas.height = source.height;

        const new_canvas = document.createElement('canvas');
        new_canvas.width = new_width;
        new_canvas.height = new_height;

        const context = canvas.getContext('2d');
        context.imageSmoothingEnabled = true;
        context.putImageData(source, 0, 0);
        // context.imageSmoothingQuality = 'high';

        const new_context = new_canvas.getContext('2d');
        new_context.imageSmoothingEnabled = true;
        new_context.drawImage(canvas, 0, 0, new_width, new_height);
        // new_context.imageSmoothingQuality = 'high';

        const data: ImageData = new_context.getImageData(0, 0, new_width, new_height);
        return data;
    }

    static getImageUri(source: ImageData, mirrored: boolean): string {
        const canvas = document.createElement('canvas');
        canvas.width = source.width;
        canvas.height = source.height;
        const context = canvas.getContext('2d');
        context.imageSmoothingEnabled = true;
        context.putImageData(source, 0, 0);
        if (mirrored) {
            context.translate(canvas.width, 0);
            context.scale(-1, 1);
        }
        const result = canvas.toDataURL('image/jpeg');
        return result;
    }

    static cropImage(source: ImageData, x: number, y: number, width: number, height: number): ImageData {
        const canvas = document.createElement('canvas');
        canvas.width = source.width;
        canvas.height = source.height;
        const context = canvas.getContext('2d');
        context.imageSmoothingEnabled = true;
        context.putImageData(source, 0, 0);
        const data: ImageData = context.getImageData(x, y, width, height);
        return data;
    }

    static cropImageFromVideo(source: HTMLVideoElement, x: number, y: number, width: number, height: number): ImageData {
        const canvas = document.createElement('canvas');
        canvas.width = source.videoWidth;
        canvas.height = source.videoHeight;
        const context = canvas.getContext('2d');
        context.imageSmoothingEnabled = true;
        context.drawImage(source, 0, 0);
        const data: ImageData = context.getImageData(x, y, width, height);
        return data;
    }

    static detectEdges(imageData) {
        let greyscaled, sobelKernel;

        if (imageData.width >= 360) {
            greyscaled = this.luminance(this.gaussianBlur(imageData, 5.0));
        } else {
            greyscaled = this.luminance(imageData);
        }

        sobelKernel = new Float32Array(
            [1, 0, -1,
                2, 0, -2,
                1, 0, -1]
        );
        return this.convolve(greyscaled, sobelKernel, true);
    }

    // Reduce imageData from RGBA to only one channel (Y/luminance after conversion to greyscale)
    // since RGB all have the same values and Alpha was ignored.
    static reducedPixels(imageData: ImageData) {
        let i, x, y, row;
        const pixels = imageData.data;
        const rowLen = imageData.width * 4;
        const rows = [];

        for (y = 0; y < pixels.length; y += rowLen) {
            row = new Uint8ClampedArray(imageData.width);
            x = 0;
            for (i = y; i < y + rowLen; i += 4) {
                row[x] = pixels[i];
                x += 1;
            }
            rows.push(row);
        }
        return rows;
    }

    static toImageData(values: Uint8ClampedArray, width, height): ImageData {
        const expanded = new ImageData(width, height);
        for (let i = 0; i < expanded.data.length; i += 4) {
            const x = values[i / 4];
            expanded.data[i] = x;
            expanded.data[i + 1] = x;
            expanded.data[i + 2] = x;
            expanded.data[i + 3] = 255;
        }
        return expanded;
    }

    // pixels = Array of Uint8ClampedArrays (row in original image)
    static detectBlur(pixels: Uint8ClampedArray[]) {
        let x, y, value, oldValue, edgeStart, edgeWidth, bm, percWidth;
        const width = pixels[0].length;
        const height = pixels.length;
        let numEdges = 0, sumEdgeWidths = 0;
        const edgeIntensThresh = 20;

        for (y = 0; y < height; y += 1) {
            // Reset edge marker, none found yet
            edgeStart = -1;
            for (x = 0; x < width; x += 1) {
                value = pixels[y][x];
                // Edge is still open
                if (edgeStart >= 0 && x > edgeStart) {
                    oldValue = pixels[y][x - 1];
                    // Value stopped increasing => edge ended
                    if (value < oldValue) {
                        // Only count edges that reach a certain intensity
                        if (oldValue >= edgeIntensThresh) {
                            edgeWidth = x - edgeStart - 1;
                            numEdges += 1;
                            sumEdgeWidths += edgeWidth;
                        }
                        edgeStart = -1; // Reset edge marker
                    }
                }
                // Edge starts
                if (value === 0) {
                    edgeStart = x;
                }
            }
        }

        if (numEdges === 0) {
            bm = 0;
            percWidth = 0;
        } else {
            bm = sumEdgeWidths / numEdges;
            percWidth = bm / width * 100;
        }

        return {
            width: width,
            height: height,
            num_edges: numEdges,
            avg_edge_width: bm,
            avg_edge_width_perc: percWidth
        };
    }

    static measureBlur(imageData: ImageData) {
        return this.detectBlur(this.reducedPixels(this.detectEdges(imageData)));
    }


    static boxesForGauss(sigma, n) {
        const wIdeal = Math.sqrt((12 * sigma * sigma / n) + 1);  // Ideal averaging filter width
        let wl = Math.floor(wIdeal);
        if (wl % 2 === 0) { wl--; }
        const wu = wl + 2;

        const mIdeal = (12 * sigma * sigma - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4);
        const m = Math.round(mIdeal);

        const sizes = [];
        for (let i = 0; i < n; i++) { sizes.push(i < m ? wl : wu); }
        return sizes;
    }
    static boxBlur(scl, tcl, w, h, r) {
        for (let i = 0; i < scl.length; i++) { tcl[i] = scl[i]; }
        this.boxBlurH(tcl, scl, w, h, r);
        this.boxBlurT(scl, tcl, w, h, r);
    }
    static boxBlurH(scl, tcl, w, h, r) {
        const iarr = 1 / (r + r + 1);
        for (let i = 0; i < h; i++) {
            let ti = i * w, li = ti, ri = ti + r;
            const fv = scl[ti], lv = scl[ti + w - 1];
            let val = (r + 1) * fv;
            for (let j = 0; j < r; j++) { val += scl[ti + j]; }
            for (let j = 0; j <= r; j++) { val += scl[ri++] - fv; tcl[ti++] = Math.round(val * iarr); }
            for (let j = r + 1; j < w - r; j++) { val += scl[ri++] - scl[li++]; tcl[ti++] = Math.round(val * iarr); }
            for (let j = w - r; j < w; j++) { val += lv - scl[li++]; tcl[ti++] = Math.round(val * iarr); }
        }
    }
    static boxBlurT(scl, tcl, w, h, r) {
        const iarr = 1 / (r + r + 1);
        for (let i = 0; i < w; i++) {
            let ti = i, li = ti, ri = ti + r * w;
            const fv = scl[ti], lv = scl[ti + w * (h - 1)];
            let val = (r + 1) * fv;
            for (let j = 0; j < r; j++) { val += scl[ti + j * w]; }
            for (let j = 0; j <= r; j++) { val += scl[ri] - fv; tcl[ti] = Math.round(val * iarr); ri += w; ti += w; }
            for (let j = r + 1; j < h - r; j++) { val += scl[ri] - scl[li]; tcl[ti] = Math.round(val * iarr); li += w; ri += w; ti += w; }
            for (let j = h - r; j < h; j++) { val += lv - scl[li]; tcl[ti] = Math.round(val * iarr); li += w; ti += w; }
        }
    }

    static gaussianBlurMono(source: Uint8ClampedArray, width: number, height: number, radius: number): Uint8ClampedArray {
        const output = new Uint8ClampedArray(source.length);
        const bxs = this.boxesForGauss(radius, 3);
        this.boxBlur(source, output, width, height, (bxs[0] - 1) / 2);
        this.boxBlur(output, source, width, height, (bxs[1] - 1) / 2);
        this.boxBlur(source, output, width, height, (bxs[2] - 1) / 2);
        return output;
    }

    static gaussianBlurRGBA(source: ImageData, radius: number): ImageData {
        const output = new ImageData(source.width, source.height);

        const size = source.width * source.height;

        const rSrc = new Uint8ClampedArray(size);           // source arrays
        const gSrc = new Uint8ClampedArray(size);
        const bSrc = new Uint8ClampedArray(size);
        const aSrc = new Uint8ClampedArray(size);

        // Split channels: define target arrays the same way as above
        for (let i = 0, offset = 0; i < size; i++) {
            rSrc[i] = source.data[offset++];
            gSrc[i] = source.data[offset++];
            bSrc[i] = source.data[offset++];
            aSrc[i] = source.data[offset++];
        }

        const rTrg = this.gaussianBlurMono(rSrc, source.width, source.height, radius);
        const gTrg = this.gaussianBlurMono(gSrc, source.width, source.height, radius);
        const bTrg = this.gaussianBlurMono(bSrc, source.width, source.height, radius);
        const aTrg = this.gaussianBlurMono(aSrc, source.width, source.height, radius);

        // Additional tip: if you're using images (as in photos) you can skip blurring
        // the alpha channel as there is none (or technically, is fully opaque in canvas).

        // Merge channels
        for (let i = 0, offset = 0; i < size; i++) {
            output.data[offset++] = rTrg[i];
            output.data[offset++] = gTrg[i];
            output.data[offset++] = bTrg[i];
            output.data[offset++] = aTrg[i]; // or just increase offset if you skipped alpha
        }

        return output;

    }


    static perspectiveMono(src: ImageData, transform) {
        const dst = new ImageData(src.width, src.height);

        let x = 0, y = 0, off = 0, ixs = 0, iys = 0, xs = 0.0, ys = 0.0, xs0 = 0.0, ys0 = 0.0, ws = 0.0, sc = 0.0, a = 0.0, b = 0.0;
        let p0 = 0.0, p1 = 0.0;

        const m00 = transform[0], m01 = transform[1], m02 = transform[2],
            m10 = transform[3], m11 = transform[4], m12 = transform[5],
            m20 = transform[6], m21 = transform[7], m22 = transform[8];

        for (let dptr = 0; y < dst.height; ++y) {
            xs0 = m01 * y + m02;
            ys0 = m11 * y + m12;
            ws = m21 * y + m22;
            for (x = 0; x < dst.width; ++x, ++dptr, xs0 += m00, ys0 += m10, ws += m20) {
                sc = 1.0 / ws;
                xs = xs0 * sc, ys = ys0 * sc;
                ixs = xs | 0, iys = ys | 0;

                if (xs > 0 && ys > 0 && ixs < (src.width - 1) && iys < (src.height - 1)) {
                    a = Math.max(xs - ixs, 0.0);
                    b = Math.max(ys - iys, 0.0);
                    off = (src.width * iys + ixs) | 0;

                    p0 = src.data[off] + a * (src.data[off + 1] - src.data[off]);
                    p1 = src.data[off + src.width] + a * (src.data[off + src.width + 1] - src.data[off + src.width]);

                    dst.data[dptr] = p0 + b * (p1 - p0);
                } else {
                    dst.data[dptr] = 0;
                }
            }
        }
        return dst;
    }

    static perspectiveRGBA(src: ImageData, transform) {
        const dst = new ImageData(src.width, src.height);

        let off0 = 0, off1 = 0, ixs = 0, iys = 0, xs = 0.0, ys = 0.0, xs0 = 0.0, ys0 = 0.0, ws = 0.0, sc = 0.0, a = 0.0, b = 0.0;
        let p0r = 0.0, p1r = 0.0;
        let p0g = 0.0, p1g = 0.0;
        let p0b = 0.0, p1b = 0.0;

        const m00 = transform[0], m01 = transform[1], m02 = transform[2],
            m10 = transform[3], m11 = transform[4], m12 = transform[5],
            m20 = transform[6], m21 = transform[7], m22 = transform[8];

        let dptr = 0;
        for (let i = 0; i < dst.height; ++i) {
            xs0 = m01 * i + m02;
            ys0 = m11 * i + m12;
            ws = m21 * i + m22;
            for (let j = 0; j < dst.width; j++ , dptr += 4, xs0 += m00, ys0 += m10, ws += m20) {
                sc = 1.0 / ws;
                xs = xs0 * sc, ys = ys0 * sc;
                ixs = xs | 0, iys = ys | 0;

                if (xs > 0 && ys > 0 && ixs < (src.width - 1) && iys < (src.height - 1)) {

                    a = Math.max(xs - ixs, 0.0);
                    b = Math.max(ys - iys, 0.0);
                    // off = (src.width*iys + ixs)|0;
                    off0 = (((src.width * 4) * iys) + (ixs * 4)) | 0;
                    off1 = off0 + (src.width * 4);

                    p0r = src.data[off0] + a * (src.data[off0 + 4] - src.data[off0]);
                    p1r = src.data[off1] + a * (src.data[off1 + 4] - src.data[off1]);

                    p0g = src.data[off0 + 1] + a * (src.data[off0 + 4 + 1] - src.data[off0 + 1]);
                    p1g = src.data[off1 + 1] + a * (src.data[off1 + 4 + 1] - src.data[off1 + 1]);

                    p0b = src.data[off0 + 2] + a * (src.data[off0 + 4 + 2] - src.data[off0 + 2]);
                    p1b = src.data[off1 + 2] + a * (src.data[off1 + 4 + 2] - src.data[off1 + 2]);

                    dst.data[dptr + 0] = p0r + b * (p1r - p0r);
                    dst.data[dptr + 1] = p0g + b * (p1g - p0g);
                    dst.data[dptr + 2] = p0b + b * (p1b - p0b);

                    dst.data[((i * (dst.width * 4)) + (j * 4)) + 3] = 255;
                } else {
                    dst.data[((i * (dst.width * 4)) + (j * 4)) + 3] = 0;
                }
            }
        }
        return dst;
    }


}
