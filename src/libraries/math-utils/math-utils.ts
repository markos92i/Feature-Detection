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

    // static angleOfThree(p1: Point, p2: Point, p3: Point): number {
    //     const angleRadians = Math.atan2(p3.y - p1.y, p3.x - p1.x) - Math.atan2(p2.y - p1.y, p2.x - p1.x);
    //     const angleDeg = angleRadians * 180 / Math.PI;
    //     return angleDeg;
    // }

    static find_angle(p0: Point, p1: Point, center: Point): number {
        const p0c = Math.sqrt(Math.pow(center.x - p0.x, 2) + Math.pow(center.y - p0.y, 2)); // p0->c (b)
        const p1c = Math.sqrt(Math.pow(center.x - p1.x, 2) + Math.pow(center.y - p1.y, 2)); // p1->c (a)
        const p0p1 = Math.sqrt(Math.pow(p1.x - p0.x, 2) +  Math.pow(p1.y - p0.y, 2)); // p0->p1 (c)
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




    static deltaTransformPoint(matrix, point)  {
        const dx = point.x * matrix.a + point.y * matrix.c + 0;
        const dy = point.x * matrix.b + point.y * matrix.d + 0;
        return { x: dx, y: dy };
    }

    static decomposeMatrix(matrix) {
        // @see https://gist.github.com/2052247

        // calculate delta transform point
        const px = this.deltaTransformPoint(matrix, { x: 0, y: 1 });
        const py = this.deltaTransformPoint(matrix, { x: 1, y: 0 });

        // calculate skew
        const skewX = ((180 / Math.PI) * Math.atan2(px.y, px.x) - 90);
        const skewY = ((180 / Math.PI) * Math.atan2(py.y, py.x));

        return {
            translateX: matrix.e,
            translateY: matrix.f,
            scaleX: Math.sqrt(matrix.a * matrix.a + matrix.b * matrix.b),
            scaleY: Math.sqrt(matrix.c * matrix.c + matrix.d * matrix.d),
            skewX: skewX,
            skewY: skewY,
            rotation: skewX // rotation is the same as skew x
        };
    }



    static adj(m) { // Compute the adjugate of m
        return [
            m[4] * m[8] - m[5] * m[7], m[2] * m[7] - m[1] * m[8], m[1] * m[5] - m[2] * m[4],
            m[5] * m[6] - m[3] * m[8], m[0] * m[8] - m[2] * m[6], m[2] * m[3] - m[0] * m[5],
            m[3] * m[7] - m[4] * m[6], m[1] * m[6] - m[0] * m[7], m[0] * m[4] - m[1] * m[3]
        ];
    }
    static multmm(a, b) { // multiply two matrices
        const c = Array(9);
        for (let i = 0; i !== 3; ++i) {
            for (let j = 0; j !== 3; ++j) {
                let cij = 0;
                for (let k = 0; k !== 3; ++k) {
                    cij += a[3 * i + k] * b [3 * k + j];
                }
                c[3 * i + j] = cij;
            }
        }
        return c;
    }
    static multmv(m, v) { // multiply matrix and vector
        return [
            m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
            m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
            m[6] * v[0] + m[7] * v[1] + m[8] * v[2]
        ];
    }
    static pdbg(m, v) {
        const r = this.multmv(m, v);
        return r + " (" + r[0] / r[2] + ", " + r[1] / r[2] + ")";
    }
    static basisToPoints(x1, y1, x2, y2, x3, y3, x4, y4) {
        const m = [
            x1, x2, x3,
            y1, y2, y3,
            1,  1,  1
        ];
        const v = this.multmv(this.adj(m), [x4, y4, 1]);
        return this.multmm(m, [
            v[0], 0, 0,
            0, v[1], 0,
            0, 0, v[2]
        ]);
      }
    static general2DProjection(
        x1s, y1s, x1d, y1d,
        x2s, y2s, x2d, y2d,
        x3s, y3s, x3d, y3d,
        x4s, y4s, x4d, y4d
    ) {
        const s = this.basisToPoints(x1s, y1s, x2s, y2s, x3s, y3s, x4s, y4s);
        const d = this.basisToPoints(x1d, y1d, x2d, y2d, x3d, y3d, x4d, y4d);
        return this.multmm(d, this.adj(s));
    }
    static transform2d(center: Point, x1, y1, x2, y2, x3, y3, x4, y4) {
        const w = center.x, h = center.y;
        let t = this.general2DProjection(0, 0, x1, y1, w, 0, x2, y2, 0, h, x3, y3, w, h, x4, y4);
        for (let i = 0; i !== 9; ++i) { t[i] = t[i]  / t[8]; }
        t = [t[0], t[3], 0, t[6],
             t[1], t[4], 0, t[7],
             0   , 0   , 1, 0   ,
             t[2], t[5], 0, t[8]];
        const result = "matrix3d(" + t.join(", ") + ")";
        // elt.style["-webkit-transform"] = t;
        // elt.style["-moz-transform"] = t;
        // elt.style["-o-transform"] = t;
        // elt.style.transform = t;
        return result;
    }




    static sortPoints(points: Point[]) {
        return points.sort((a, b) => a.x === b.x ? a.y - b.y : a.x - b.x);
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

}
