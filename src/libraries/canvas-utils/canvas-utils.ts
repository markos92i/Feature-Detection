interface Bounds {
    x: number;
    y: number;
    width: number;
    height: number;
}
export class CanvasUtils {

    // Maniputale canvas ============================================================
    public static rotate(context: CanvasRenderingContext2D, degree, rotatePoint) {
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
        context.arcTo(x + w,  y,     x + w, y + h, r);
        context.arcTo(x + w,  y + h, x,     y + h, r);
        context.arcTo(x,      y + h, x,     y,     r);
        context.arcTo(x,      y,     x + w, y,     r);
    }
    public static drawFeatureFrame(
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
    private static cardBounds(width: number, height: number, scale: number): Bounds {
        const ratio = 1.586;

        const w = width * scale;
        const h = w / ratio;
        const x = (width * 0.5) - (w / 2);
        const y = (height * 0.5) - (h / 2);

        const bounds = { x, y, width: w, height: h };
        return bounds;
    }

    public static drawCardFilterWith(context: CanvasRenderingContext2D, scale: number, fillStyle: string, strokeStyle: string) {
        const width = context.canvas.width;
        const height = context.canvas.height;

        const bounds = this.cardBounds(width, height, scale);
        this.drawFilterWith(context, bounds, scale, fillStyle, strokeStyle);
    }

    public static drawCardFilter(context: CanvasRenderingContext2D) {
        this.drawCardFilterWith(context, 0.85, 'rgba(0,0,0,0.8)', 'rgba(255,255,255,0.8)');
    }

    public static drawCardBorderWith(context: CanvasRenderingContext2D, scale: number, strokeStyle: string) {
        const width = context.canvas.width;
        const height = context.canvas.height;

        const bounds = this.cardBounds(width, height, scale);
        const x = bounds.x, y = bounds.y, w = bounds.width, h = bounds.height;
        const r = w * 0.05;

        this.drawFeatureFrame(context, x, y, w, h, r, strokeStyle);
    }

    public static drawCardDetection(context: CanvasRenderingContext2D, x, y, w, h) {
        const r = w * 0.05;

        this.drawFeatureFrame(context, x, y, w, h, r, 'rgba(255,0,0,1)');
    }

    public static drawCardHighlight(context: CanvasRenderingContext2D) {
        this.drawCardBorderWith(context, 0.6, 'rgba(255,102,0,1)');
    }

    public static drawCardSuccess(context: CanvasRenderingContext2D) {
        this.drawCardBorderWith(context, 0.6, 'rgba(0,255,0,1)');
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

    public static drawFaceFilterWith(context: CanvasRenderingContext2D, scale: number, fillStyle: string, strokeStyle: string) {
        const width = context.canvas.width;
        const height = context.canvas.height;

        const bounds = this.faceBounds(width, height, scale);
        this.drawFilterWith(context, bounds, scale, fillStyle, strokeStyle);
    }

    public static drawFaceFilter(context) {
        this.drawFaceFilterWith(context, 0.85, 'rgba(0,0,0,0.8)', 'rgba(255,255,255,0.8)');
    }

    public static drawFaceBorderWith(context: CanvasRenderingContext2D, scale: number, strokeStyle: string) {
        const width = context.canvas.width;
        const height = context.canvas.height;

        const bounds = this.faceBounds(width, height, scale);
        const x = bounds.x, y = bounds.y, w = bounds.width, h = bounds.height;
        const r = w * 0.05;

        this.drawFeatureFrame(context, x, y, w, h, r, strokeStyle);
    }

    public static drawFaceHighlight(context: CanvasRenderingContext2D) {
        this.drawFaceBorderWith(context, 0.85, 'rgba(255,102,0,1)');
    }

    public static drawFaceSuccess(context: CanvasRenderingContext2D) {
        this.drawFaceBorderWith(context, 0.85, 'rgba(0,255,0,1)');
    }

}
