export class ImageUtils {
    static laplaceKernel = new Float32Array([-1, -1, -1,  -1, 8, -1,  -1, -1, -1]);
    static sobelSignVector = new Float32Array([-1, 0, 1]);
    static sobelScaleVector = new Float32Array([1, 2, 1]);

    static createImageDataFloat32(w, h) { return { width: w, height: h, data: new Float32Array(w * h * 4) }; }

    static identity(pixels) {
        const output = new ImageData(pixels.width, pixels.height);
        const dst = output.data;
        const d = pixels.data;
        for (let i = 0; i < d.length; i++) {
            dst[i] = d[i];
        }
        return output;
    }

    static horizontalFlip(pixels) {
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

    static verticalFlip(pixels) {
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

    static luminance(pixels) {
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

    static grayscaleWithAlpha(image: ImageData): ImageData {
        const width = image.width;
        const height = image.height;
        const output = new ImageData(width, height);
        // const gray = new Uint8ClampedArray(image.data.length);
        let p = 0;
        let w = 0;
        for (let i = 0; i < height; i++) {
            for (let j = 0; j < width; j++) {
                const value = image.data[w] * 0.299 + image.data[w + 1] * 0.587 + image.data[w + 2] * 0.114;
                output.data[p++] = value;
                w += 4;
            }
        }
        return output;
    }

    static threshold(pixels, threshold, high, low) {
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

    static invert(pixels) {
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

    static brightnessContrast(pixels, brightness, contrast) {
        const lut = this.brightnessContrastLUT(brightness, contrast);
        return this.applyLUT(pixels, {r: lut, g: lut, b: lut, a: this.identityLUT()});
    }

    static applyLUT(pixels, lut) {
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
        return this.separableConvolve(pixels, weights, weights, false);
    }


    static laplace(pixels) { return this.convolve(pixels, this.laplaceKernel, true); }

    // Opaque a false?
    static sobelVerticalGradient(px) { return this.separableConvolveFloat32(px, this.sobelSignVector, this.sobelScaleVector, true); }

    // Opaque a false?
    static sobelHorizontalGradient(px) { return this.separableConvolveFloat32(px, this.sobelScaleVector, this.sobelSignVector, true); }

    static sobelVectors(px) {
        const vertical = this.sobelVerticalGradient(px);
        const horizontal = this.sobelHorizontalGradient(px);
        const id = {width: vertical.width, height: vertical.height,
                    data: new Float32Array(vertical.width * vertical.height * 8)};
        const vd = vertical.data;
        const hd = horizontal.data;
        const idd = id.data;
        for (let i = 0, j = 0; i < idd.length; i += 2, j++) {
            idd[i] = hd[j];
            idd[i + 1] = vd[j];
        }
        return id;
    }

    static sobel(px: ImageData): ImageData {
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

    static nonMaximumSuppression(imgData: GrayImageData): ImageData {
        let copy;
        copy = imgData.copy();
        copy.fill(0);
        imgData.eachPixel(3, function(x, y, c, n) {
          if (n[1][1] > n[0][1] && n[1][1] > n[2][1]) {
            copy.data[x][y] = n[1][1];
          } else {
            copy.data[x][y] = 0;
          }
          if (n[1][1] > n[0][2] && n[1][1] > n[2][0]) {
            copy.data[x][y] = n[1][1];
          } else {
            copy.data[x][y] = 0;
          }
          if (n[1][1] > n[1][0] && n[1][1] > n[1][2]) {
            copy.data[x][y] = n[1][1];
          } else {
            copy.data[x][y] = 0;
          }
          if (n[1][1] > n[0][0] && n[1][1] > n[2][2]) {
            return copy.data[x][y] = n[1][1];
          } else {
            return copy.data[x][y] = 0;
          }
        });
        return copy;
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

    static resize(image: ImageData, scale: number): ImageData {
        if (scale === 1) { return image; }
        const widthScaled = image.width * scale;
        const heightScaled = image.height * scale;
        const scaledImage = new ImageData(widthScaled, heightScaled);
        for (let y = 0; y < heightScaled; y++) {
            for (let x = 0; x < widthScaled; x++) {
                const index = (Math.floor(y / scale) * image.width + Math.floor(x / scale)) * 4;
                const indexScaled = (y * widthScaled + x) * 4;
                scaledImage.data[indexScaled] = image.data[ index ];
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
        context.putImageData(source, 0, 0);

        const new_context = new_canvas.getContext('2d');
        new_context.drawImage(canvas, 0, 0, new_width, new_height);

        const data: ImageData = new_context.getImageData(0, 0, new_width, new_height);
        return data;
    }

    static getImageUri(source: ImageData, mirrored: boolean): string {
        const canvas = document.createElement('canvas');
        canvas.width = source.width;
        canvas.height = source.height;
        const context = canvas.getContext('2d');
        context.putImageData(source, 0, 0);
        if (mirrored) {
            context.translate(canvas.width, 0);
            context.scale(-1, 1);
        }
        const result = canvas.toDataURL();
        return result;
    }

    static cropImage(source: ImageData, x: number, y: number, width: number, height: number): ImageData {
        const canvas = document.createElement('canvas');
        canvas.width = source.width;
        canvas.height = source.height;
        const context = canvas.getContext('2d');
        context.putImageData(source, 0, 0);
        const data: ImageData = context.getImageData(x, y, width, height);
        return data;
    }

    static toMonoChannel(image: ImageData): ImageData {
        const width = image.width;
        const height = image.height;
        const output = new ImageData(width, height);
        let p = 0;
        let w = 0;
        for (let i = 0; i < height; i++) {
            for (let j = 0; j < width; j++) {
                if (image.data[w] === 255 && image.data[w + 1] === 255 && image.data[w + 2] === 255) {
                    output.data[p++] = 255;
                } else {
                    output.data[p++] = 0;
                }
                w += 4;
            }
        }
        return output;
    }

    static toMonoChannelTolerant(image: ImageData): ImageData {
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


}

export class GrayImageData extends ImageData {
    getNeighbors(x, y, size) {
        let i, j, neighbors, trnsX, trnsY, _i, _j, _ref, _ref1;
        neighbors = Util.generateMatrix(size, size, 0);
        for (i = _i = 0, _ref = size - 1; 0 <= _ref ? _i <= _ref : _i >= _ref; i = 0 <= _ref ? ++_i : --_i) {
          neighbors[i] = [];
          for (j = _j = 0, _ref1 = size - 1; 0 <= _ref1 ? _j <= _ref1 : _j >= _ref1; j = 0 <= _ref1 ? ++_j : --_j) {
            trnsX = x - (size - 1) / 2 + i;
            trnsY = y - (size - 1) / 2 + j;
            if (this.data[trnsX] && this.data[trnsX][trnsY]) {
              neighbors[i][j] = this.data[trnsX][trnsY];
            } else {
              neighbors[i][j] = 0;
            }
          }
        }
        return neighbors;
    }

    eachPixel(neighborSize, func) {
        let current, neighbors, x, y, _i, _j, _ref, _ref1;
        for (x = _i = 0, _ref = this.width - 1; 0 <= _ref ? _i <= _ref : _i >= _ref; x = 0 <= _ref ? ++_i : --_i) {
          for (y = _j = 0, _ref1 = this.height - 1; 0 <= _ref1 ? _j <= _ref1 : _j >= _ref1; y = 0 <= _ref1 ? ++_j : --_j) {
            current = this.data[x][y];
            neighbors = this.getNeighbors(x, y, neighborSize);
            func(x, y, current, neighbors);
          }
        }
        return this;
    }

    copy() {
        let copied, x, y, _i, _j, _ref, _ref1;
        copied = new GrayImageData(this.width, this.height);
        for (x = _i = 0, _ref = this.width - 1; 0 <= _ref ? _i <= _ref : _i >= _ref; x = 0 <= _ref ? ++_i : --_i) {
          for (y = _j = 0, _ref1 = this.height - 1; 0 <= _ref1 ? _j <= _ref1 : _j >= _ref1; y = 0 <= _ref1 ? ++_j : --_j) {
            copied.data[x][y] = this.data[x][y];
          }
        }
        copied.width = this.width;
        copied.height = this.height;
        return copied;
    }

}

export class Util {
    static generateMatrix(w, h, initialValue) {
        let matrix, x, y, _i, _j, _ref, _ref1;
        matrix = [];
        for (x = _i = 0, _ref = w - 1; 0 <= _ref ? _i <= _ref : _i >= _ref; x = 0 <= _ref ? ++_i : --_i) {
          matrix[x] = [];
          for (y = _j = 0, _ref1 = h - 1; 0 <= _ref1 ? _j <= _ref1 : _j >= _ref1; y = 0 <= _ref1 ? ++_j : --_j) {
            matrix[x][y] = initialValue;
          }
        }
        return matrix;
    }
}

// export class Canny {
//     canvas;
//     SOBEL_X_FILTER = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
//     SOBEL_Y_FILTER = [[1, 2, 1], [0, 0, 0], [-1, -2, -1]];
//     ROBERTS_X_FILTER = [[1, 0], [0, -1]];
//     ROBERTS_Y_FILTER = [[0, 1], [-1, 0]];
//     PREWITT_X_FILTER = [[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]];
//     PREWITT_Y_FILTER = [[-1, -1, -1], [0, 0, 0], [1, 1, 1]];

//     OPERATORS = {
//         'sobel': {
//             x: this.SOBEL_X_FILTER,
//             y: this.SOBEL_Y_FILTER,
//             len: this.SOBEL_X_FILTER.length
//         },
//         'roberts': {
//             x: this.ROBERTS_X_FILTER,
//             y: this.ROBERTS_Y_FILTER,
//             len: this.ROBERTS_Y_FILTER.length
//         },
//         'prewitt': {
//             x: this.PREWITT_X_FILTER,
//             y: this.PREWITT_Y_FILTER,
//             len: this.PREWITT_Y_FILTER.length
//         }
//     };

//     constructor(canvElem) {
//         this.canvas = canvElem;
//     }

//     // find intensity gradient of image
//     gradient(op) {
//         const imgDataCopy = this.canvas.getCurrentImg(),
//             dirMap = [],
//             gradMap = [],
//             that = this;

//         this.canvas.convolve(function(neighbors, x, y, pixelIndex, cvsIndex) {
//             let edgeX = 0;
//             let edgeY = 0;

//             if (!that.canvas.isBorder({x: x, y: y})) {
//             for (let i = 0; i < this.OPERATORS[op].len; i++) {
//                 for (let j = 0; j < this.OPERATORS[op].len; j++) {
//                 if (!neighbors[i][j]) { continue; }
//                 edgeX += imgDataCopy.data[neighbors[i][j]] * this.OPERATORS[op]['x'][i][j];
//                 edgeY += imgDataCopy.data[neighbors[i][j]] * this.OPERATORS[op]['y'][i][j];
//                 }
//             }
//             }

//             dirMap[cvsIndex] = this.roundDir(Math.atan2(edgeY, edgeX) * (180 / Math.PI));
//             gradMap[cvsIndex] = Math.round(Math.sqrt(edgeX * edgeX + edgeY * edgeY));

//             that.canvas.setPixel({x: x, y: y}, gradMap[cvsIndex]);
//         }, 3);
//         this.canvas.setImg();
//         this.canvas.dirMap = dirMap;
//         this.canvas.gradMap = gradMap;
//     }

//     nonMaximumSuppress() {
//         this.canvas.convolve(function(neighbors, x, y, pixelIndex, cvsIndex) {
//             const pixNeighbors = this.getPixelNeighbors(this.canvas.dirMap[cvsIndex]);

//             // pixel neighbors to compare
//             const pix1 = this.canvas.gradMap[neighbors[pixNeighbors[0].x][pixNeighbors[0].y]];
//             const pix2 = this.canvas.gradMap[neighbors[pixNeighbors[1].x][pixNeighbors[1].y]];

//             if (pix1 > this.canvas.gradMap[cvsIndex] ||
//                 pix2 > this.canvas.gradMap[cvsIndex] ||
//                 (pix2 === this.canvas.gradMap[cvsIndex] &&
//                 pix1 < this.canvas.gradMap[cvsIndex])) {
//                     this.canvas.setPixel({x: x, y: y}, 0);
//             }
//         }, 3);
//         this.canvas.setImg();
//     }

//     // // TODO: Do not use sparse array for storing real edges
//     // // mark strong and weak edges, discard others as false edges; only keep weak edges that are connected to strong edges
//     hysteresis() {
//         const that = this,
//             imgDataCopy = this.canvas.getCurrentImg(),
//             realEdges = [], // where real edges will be stored with the 1st pass
//             t1 = this.fastOtsu(this.canvas), // high threshold value
//             t2 = t1 / 2; // low threshold value

//         // first pass
//         this.canvas.map(function(x, y, pixelIndex, cvsIndex) {
//             if (imgDataCopy.data[cvsIndex] > t1 && realEdges[cvsIndex] === undefined) {// accept as a definite edge
//             const group = that._traverseEdge(cvsIndex, imgDataCopy, t2, []);
//             for (let i = 0; i < group.length; i++) {
//                 realEdges[group[i]] = true;
//             }
//             }
//         });

//         // second pass
//         this.canvas.map(function(x, y, pixelIndex, cvsIndex) {
//             if (realEdges[cvsIndex] === undefined) {
//             that.canvas.setPixel({x: x, y: y}, 0);
//             } else {
//             that.canvas.setPixel({x: x, y: y}, 255);
//             }
//         });

//         this.canvas.setImg();
//     }

//     // just a quick function to look at the direction results
//     showDirMap() {
//         const that = this;
//         this.canvas.map(function(x, y, pixelIndex, cvsIndex) {
//             switch (that.canvas.dirMap[cvsIndex]) {
//             case 0:
//                 that.canvas.setPixel({x: x, y: y}, this.COLORS.RED);
//                 break;
//             case 45:
//                 that.canvas.setPixel({x: x, y: y}, this.COLORS.GREEN);
//                 break;
//             case 90:
//                 that.canvas.setPixel({x: x, y: y}, this.COLORS.BLUE);
//                 break;
//             case 135:
//                 that.canvas.setPixel({x: x, y: y}, this.COLORS.YELLOW);
//                 break;
//             default:
//                 that.canvas.setPixel({x: x, y: y}, this.COLORS.PINK);
//             }
//         });
//         this.canvas.setImg();
//     }

//     // TODO: Evaluate function use/fulness
//     showGradMap() {
//         const that = this;
//         this.canvas.map(function(x, y, pixelIndex, cvsIndex) {
//             if (that.canvas.gradMap[cvsIndex] < 0) {
//             that.canvas.setPixel({x: x, y: y}, this.COLORS.RED);
//             } else if (that.canvas.gradMap[cvsIndex] < 200) {
//             that.canvas.setPixel({x: x, y: y}, this.COLORS.GREEN);
//             } else if (that.canvas.gradMap[cvsIndex] < 400) {
//             that.canvas.setPixel({x: x, y: y}, this.COLORS.BLUE);
//             } else if (that.canvas.gradMap[cvsIndex] < 600) {
//             that.canvas.setPixel({x: x, y: y}, this.COLORS.YELLOW);
//             } else if (that.canvas.gradMap[cvsIndex] < 800) {
//             that.canvas.setPixel({x: x, y: y}, this.COLORS.AQUA);
//             } else {
//             that.canvas.setPixel({x: x, y: y}, this.COLORS.PINK);
//             }
//         });
//         this.canvas.setImg();
//     }

//     getEdgeNeighbors(i, imgData, threshold, includedEdges) {
//         let neighbors = [],
//             pixel = new Pixel(i, imgData.width, imgData.height);
//         for (let j = 0; j < pixel.neighbors.length; j++) {
//             if (
//                 imgData.data[pixel.neighbors[j]] >= threshold &&
//                 (includedEdges === undefined || includedEdges.indexOf(pixel.neighbors[j]) === -1)
//             ) { neighbors.push(pixel.neighbors[j]); }
//         }
//         return neighbors;
//     }

//     // // TODO: Optimize prime!
//     // // traverses the current pixel until a length has been reached
//     _traverseEdge(current, imgData, threshold, traversed) {
//         // initialize the group from the current pixel's perspective
//         let group = [current];
//         // pass the traversed group to the getEdgeNeighbors so that it will not include those anymore
//         const neighbors = this.getEdgeNeighbors(current, imgData, threshold, traversed);
//         for (let i = 0; i < neighbors.length; i++) {
//             // recursively get the other edges connected
//             group = group.concat(this._traverseEdge(neighbors[i], imgData, threshold, traversed.concat(group)));
//         }
//         return group;
//         // if the pixel group is not above max length,
//         // it will return the pixels included in that small pixel group
//     }

// }
