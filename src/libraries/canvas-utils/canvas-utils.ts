interface Bounds {
    x: number;
    y: number;
    width: number;
    height: number;
}
export class CanvasUtils {

    // Maniputale canvas ============================================================
    static rotate(context: CanvasRenderingContext2D, degree, rotatePoint) {
        context.translate(rotatePoint.x, rotatePoint.y);
        context.rotate(degree * Math.PI / 180);
        context.translate(-rotatePoint.x, -rotatePoint.y);
    }

    // Draw paths ============================================================
    private static drawFramePath(context: CanvasRenderingContext2D, w: number, h: number) {
        context.moveTo(0, 0);
        context.lineTo(w, 0);
        context.lineTo(w, h);
        context.lineTo(0, h);
        context.lineTo(0, 0);
    }
    private static drawInnerPath(
        context: CanvasRenderingContext2D,
        x: number, y: number,
        w: number, h: number,
        r: number
    ) {
        context.moveTo(x + r, y);
        context.arcTo(x + w, y, x + w, y + h, r);
        context.arcTo(x + w, y + h, x, y + h, r);
        context.arcTo(x, y + h, x, y, r);
        context.arcTo(x, y, x + w, y, r);
    }
    static drawFeatureFrame(
        context: CanvasRenderingContext2D,
        x: number, y: number,
        w: number, h: number,
        r: number, strokeStyle: string
    ) {
        context.save();
        context.beginPath();
        this.drawInnerPath(context, x, y, w, h, r);
        context.closePath();
        context.lineWidth = 4;
        context.strokeStyle = strokeStyle;
        context.stroke();
        context.restore();
    }

    // Draw filter ============================================================
    public static drawFilterWith(context: CanvasRenderingContext2D, bounds: Bounds, scale: number, fillStyle: string, strokeStyle: string) {
        const width = context.canvas.width;
        const height = context.canvas.height;

        const x = bounds.x, y = bounds.y, w = bounds.width, h = bounds.height;
        const r = w * 0.05;

        context.save();
        context.beginPath();
        this.drawFramePath(context, width, height);
        this.drawInnerPath(context, x, y, w, h, r);
        context.closePath();

        context.lineWidth = 4;
        context.strokeStyle = strokeStyle;
        context.stroke();

        context.clip('evenodd');

        context.fillStyle = fillStyle;
        context.fill();
        context.restore();
    }


    // Draw card ============================================================
    static cardBounds(width: number, height: number, scale: number): Bounds {
        const ratio = 1.586;

        let w, h, x, y;

        if (width > height) {
            h = height * scale;
            w = h * ratio;
            x = (width * 0.5) - (w / 2);
            y = (height * 0.5) - (h / 2);
        } else {
            w = width * scale;
            h = w / ratio;
            x = (width * 0.5) - (w / 2);
            y = (height * 0.5) - (h / 2);
        }

        const bounds = { x, y, width: w, height: h };
        return bounds;
    }

    static drawCardFilterWith(context: CanvasRenderingContext2D, scale: number, fillStyle: string, strokeStyle: string) {
        const width = context.canvas.width;
        const height = context.canvas.height;

        const bounds = this.cardBounds(width, height, scale);
        this.drawFilterWith(context, bounds, scale, fillStyle, strokeStyle);
    }

    static drawCardFilter(context: CanvasRenderingContext2D, scale) {
        this.drawCardFilterWith(context, scale, 'rgba(0,0,0,0.8)', 'rgba(255,255,255,0.8)');
    }

    static drawCardBorderWith(context: CanvasRenderingContext2D, scale: number, strokeStyle: string) {
        const width = context.canvas.width;
        const height = context.canvas.height;

        const bounds = this.cardBounds(width, height, scale);
        const x = bounds.x, y = bounds.y, w = bounds.width, h = bounds.height;
        const r = w * 0.05;

        this.drawFeatureFrame(context, x, y, w, h, r, strokeStyle);
    }

    static drawCardDetection(context: CanvasRenderingContext2D, x, y, w, h) {
        const r = w * 0.05;

        this.drawFeatureFrame(context, x, y, w, h, r, 'rgba(255,0,0,1)');
    }

    static drawCardHighlight(context: CanvasRenderingContext2D, scale) {
        this.drawCardBorderWith(context, scale, 'rgba(255,102,0,1)');
    }

    static drawCardSuccess(context: CanvasRenderingContext2D, scale) {
        this.drawCardBorderWith(context, scale, 'rgba(0,255,0,1)');
    }


    // Draw face ============================================================
    private static faceBounds(width: number, height: number, scale: number): Bounds {
        const w = width * scale;
        const h = height * scale * 0.8;
        const x = (width * 0.5) - (w / 2);
        const y = (height * 0.5) - (h / 2);

        const bounds = { x, y, width: w, height: h };
        return bounds;
    }

    static drawFaceFilterWith(context: CanvasRenderingContext2D, scale: number, fillStyle: string, strokeStyle: string) {
        const width = context.canvas.width;
        const height = context.canvas.height;

        const bounds = this.faceBounds(width, height, scale);
        this.drawFilterWith(context, bounds, scale, fillStyle, strokeStyle);
    }

    static drawFaceFilter(context, scale) {
        this.drawFaceFilterWith(context, scale, 'rgba(0,0,0,0.8)', 'rgba(255,255,255,0.8)');
    }

    static drawFaceBorderWith(context: CanvasRenderingContext2D, scale: number, strokeStyle: string) {
        const width = context.canvas.width;
        const height = context.canvas.height;

        const bounds = this.faceBounds(width, height, scale);
        const x = bounds.x, y = bounds.y, w = bounds.width, h = bounds.height;
        const r = w * 0.05;

        this.drawFeatureFrame(context, x, y, w, h, r, strokeStyle);
    }

    static drawFaceHighlight(context: CanvasRenderingContext2D, scale) {
        this.drawFaceBorderWith(context, scale, 'rgba(255,102,0,1)');
    }

    static drawFaceSuccess(context: CanvasRenderingContext2D, scale) {
        this.drawFaceBorderWith(context, scale, 'rgba(0,255,0,1)');
    }

}
