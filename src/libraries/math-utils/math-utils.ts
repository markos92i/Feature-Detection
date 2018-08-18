interface Point {
    x: number;
    y: number;
}
interface Rect {
    a: Point;
    b: Point;
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

    static cornerAngle(p0: Point, p1: Point, center: Point): number {
        const p0c = Math.sqrt(Math.pow(center.x - p0.x, 2) + Math.pow(center.y - p0.y, 2)); // p0->c (b)
        const p1c = Math.sqrt(Math.pow(center.x - p1.x, 2) + Math.pow(center.y - p1.y, 2)); // p1->c (a)
        const p0p1 = Math.sqrt(Math.pow(p1.x - p0.x, 2) + Math.pow(p1.y - p0.y, 2)); // p0->p1 (c)
        const angleRadians = Math.acos((p1c * p1c + p0c * p0c - p0p1 * p0p1) / (2 * p1c * p0c));
        const angleDeg = angleRadians * 180 / Math.PI;
        return angleDeg;
    }

    static averageValue(values: number[]): number {
        return values.reduce((a, b) => (a + b)) / values.length;
    }

    static averageValueWithoutExtremes(values: number[]): number {
        let min, max, sum;
        min = max = sum = values[0];  // May want to add a check to make sure length > 1
        for (let i = 1; i < values.length; i++) {
            sum += values[i];
            min = Math.min(min, values[i]);
            max = Math.max(max, values[i]);
        }
        sum -= min + max;
        const avg = sum / (values.length - 2);
        return avg;
    }

    static averagePoint(points: Point[]): Point {
        let totalX = 0;
        let totalY = 0;
        for (let i = 0; i < points.length; i++) {
            totalX += points[i].x;
            totalY += points[i].y;
        }
        const avgX = totalX / points.length;
        const avgY = totalY / points.length;
        return { x: avgX, y: avgY };
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

    static closestPoint(points: Point[], point: Point): { point: Point, distance: number } {
        let closest = 0;
        let min = this.distance(points[0], point);
        for (let i = 0; i < points.length; i++) {
            const d = this.distance(points[i], point);
            if (d < min) { min = d; closest = i; }
        }
        return { point: points[closest], distance: min };
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
                } else if (dB < dA && dB < min) {
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

    static sortCorners(points: Point[]) {
        const left = Math.min(Math.min(points[0].x, points[1].x), Math.min(points[2].x, points[3].x));
        const right = Math.max(Math.max(points[0].x, points[1].x), Math.max(points[2].x, points[3].x));
        const top = Math.min(Math.min(points[0].y, points[1].y), Math.min(points[2].y, points[3].y));
        const bottom = Math.max(Math.max(points[0].y, points[1].y), Math.max(points[2].y, points[3].y));

        const topLeft = this.closestPoint(points, { x: left, y: top }).point;
        const topRight = this.closestPoint(points, { x: right, y: top }).point;
        const bottomLeft = this.closestPoint(points, { x: left, y: bottom }).point;
        const bottomRight = this.closestPoint(points, { x: right, y: bottom }).point;

        return { topLeft, topRight, bottomLeft, bottomRight };
    }

    static lineIntersect(lineA: Rect, lineB: Rect) {
        let ua, ub;
        const denom = (lineB.b.y - lineB.a.y) * (lineA.b.x - lineA.a.x) - (lineB.b.x - lineB.a.x) * (lineA.b.y - lineA.a.y);
        if (denom === 0) {
            return null;
        }
        ua = ((lineB.b.x - lineB.a.x) * (lineA.a.y - lineB.a.y) - (lineB.b.y - lineB.a.y) * (lineA.a.x - lineB.a.x)) / denom;
        ub = ((lineA.b.x - lineA.a.x) * (lineA.a.y - lineB.a.y) - (lineA.b.y - lineA.a.y) * (lineA.a.x - lineB.a.x)) / denom;
        return {
            x: lineA.a.x + ua * (lineA.b.x - lineA.a.x),
            y: lineA.a.y + ua * (lineA.b.y - lineA.a.y),
            segA: ua >= 0 && ua <= 1,
            segB: ub >= 0 && ub <= 1
        };
    }


    static shuffleArray(array: Array<any>): void {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }
    }

    static invert_3x3(origin) {
        const t1 = origin[4];
        const t2 = origin[8];
        const t4 = origin[5];
        const t5 = origin[7];
        const t8 = origin[0];

        const t9 = t8 * t1;
        const t11 = t8 * t4;
        const t13 = origin[3];
        const t14 = origin[1];
        const t15 = t13 * t14;
        const t17 = origin[2];
        const t18 = t13 * t17;
        const t20 = origin[6];
        const t21 = t20 * t14;
        const t23 = t20 * t17;
        const t26 = 1.0 / (t9 * t2 - t11 * t5 - t15 * t2 + t18 * t5 + t21 * t4 - t23 * t1);

        const inverted = [];
        inverted[0] = (t1 * t2 - t4 * t5) * t26;
        inverted[1] = -(t14 * t2 - t17 * t5) * t26;
        inverted[2] = -(-t14 * t4 + t17 * t1) * t26;
        inverted[3] = -(t13 * t2 - t4 * t20) * t26;
        inverted[4] = (t8 * t2 - t23) * t26;
        inverted[5] = -(t11 - t18) * t26;
        inverted[6] = -(-t13 * t5 + t1 * t20) * t26;
        inverted[7] = -(t8 * t5 - t21) * t26;
        inverted[8] = (t9 - t15) * t26;

        return inverted;
    }

}
