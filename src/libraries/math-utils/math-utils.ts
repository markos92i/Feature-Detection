import { Rect } from './hough-transform';

interface Point {
    x: number;
    y: number;
}

export class MathUtils {
    static distance(p1: Point, p2: Point): number {
        const dx = Math.abs(p1.x - p2.x);
        const dy = Math.abs(p1.y - p2.y);
        return Math.sqrt(dx * dx + dy * dy);
    }

    static angle(p1: Point, p2: Point): number {
        const angleRadians = Math.atan2(p2.x - p1.y, p2.x - p1.x);
        const angleDeg = angleRadians * 180 / Math.PI;
        return angleDeg;
    }

    static averageValue(points: number[]): number {
        return points.reduce((a, b) => (a + b)) / points.length;
    }

    static averageValueWithoutExtremes(points: number[]): number {
        let min, max, sum;
        min = max = sum = points[0];  // May want to add a check to make sure length > 1
        for (let i = 1; i < points.length; i++) {
            sum += points[i];
            min = Math.min(min, points[i]);
            max = Math.max(max, points[i]);
        }
        sum -= min + max;
        const avg = sum / (points.length - 2);
        return avg;
    }

    static averagePoint(points: number[][]): number[] {
        let totalX = 0;
        let totalY = 0;
        for (let i = 0; i < points.length; i++) {
            totalX += points[i][0];
            totalY += points[i][1];
        }
        const avgX = totalX / points.length;
        const avgY = totalY / points.length;
        return [avgX, avgY];
    }

    static averagePointWithoutExtremes(points: number[][]): number[] {
        let totalX = 0;
        let totalY = 0;

        let minX = 0;
        let minY = 0;
        let maxX = 0;
        let maxY = 0;
        for (let i = 0; i < points.length; i++) {
            minX = Math.min(minX, points[i][0]);
            minY = Math.min(minY, points[i][1]);
            maxX = Math.max(maxX, points[i][0]);
            maxY = Math.max(maxY, points[i][1]);

            totalX += points[i][0];
            totalY += points[i][1];
        }
        totalX -= minX + maxX;
        totalY -= minY + maxY;

        const avgX = totalX / (points.length - 2);
        const avgY = totalY / (points.length - 2);
        return [avgX, avgY];
    }

    static closestPoint(points: Point[], point: Point): any {
        let closest = 0;
        let min = this.distance(points[0], point);
        for (let i = 0; i < points.length; i++) {
            const d = this.distance(points[i], point);
            if (d < min) { min = d; closest = i; }
        }
        return { point: points[closest], fastDistance: min };
    }

    static closestRect(rects: Rect[], rect: Rect, from: string): any {
        let closest = 0;
        let side = 'a';
        if (rects[0]) {
            let min = this.distance(rects[0][from], rect.a);
            for (let i = 0; i < rects.length; i++) {
                const dA = this.distance(rects[i].a, rect.a);
                const dB = this.distance(rects[i].a, rect.b);
                if (dA < dB && dA < min) {
                    min = dA; closest = i; side = 'a';
                } else  if (dB < dA && dB < min) {
                    min = dA; closest = i; side = 'b';
                }
            }
            return {
                point: rects[closest],
                index: closest,
                fastDistance: min,
                side
            };
        } else {
            return {};
        }
    }

    static isRectInArea(rect: Rect, from: Point, to: Point): boolean {
        if (
            rect.a.x > from.x && rect.a.x < to.x &&
            rect.a.y > from.y && rect.a.y < to.y &&
            rect.b.x > from.x && rect.b.x < to.x &&
            rect.b.y > from.y && rect.b.y < to.y
        ) {
            return true;
        } else {
            return false;
        }
    }

    static polygonArea(points: Point[]): number {
        let total = 0;

        for (let i = 0, l = points.length; i < l; i++) {
            const addX = points[i].x;
            const addY = points[i === points.length - 1 ? 0 : i + 1].y;
            const subX = points[i === points.length - 1 ? 0 : i + 1].x;
            const subY = points[i].y;

            total += (addX * addY * 0.5);
            total -= (subX * subY * 0.5);
        }

        return Math.abs(total);
    }

    static sortPoints(points: Point[]) {
        return points.sort((a, b) => a.x === b.x ? a.y - b.y : a.x - b.x);
    }

    static shuffleArray(array: Array<any>): void {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }
    }

}
