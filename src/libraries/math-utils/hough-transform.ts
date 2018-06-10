import { MathUtils } from './math-utils';

export interface Point {
    x: number;
    y: number;
}

export interface Rect {
    a: Point;
    b: Point;
}

export class HoughTransform {
    static probabilisticHoughTransform(
        image: Uint8ClampedArray,
        colCount: number,
        rowCount: number,
        rho: number,
        theta: number,
        threshold: number,
        minLineLength: number,
        maxLineGap: number,
        maxLines: number
    ): Array<Rect> {
        // tslint:disable:no-bitwise
        const lines = [];
        const numAngleCells = Math.round(Math.PI / theta);
        const numrho = Math.round(((colCount + rowCount) * 2 + 1) / rho);

        const accum = new Array(numAngleCells);
        const mask = new Array(colCount * rowCount);
        const nonZeroPoints = [];

        const cosTable = new Array(numAngleCells);
        const sinTable = new Array(numAngleCells);
        for (let targetIndex = 0; targetIndex < numAngleCells; targetIndex++) {
            cosTable[targetIndex] = Math.cos(targetIndex * theta) / rho;
            sinTable[targetIndex] = Math.sin(targetIndex * theta) / rho;
        }

        // stage 1. collect non-zero image points
        for (let y = 0; y < rowCount; y++) {
            for (let x = 0; x < colCount; x++) {
                if (image[x + y * colCount] === 255) {
                    nonZeroPoints.push([x, y]);
                    mask[x + y * colCount] = 1;
                } else {
                    mask[x + y * colCount] = 0;
                }
            }
        }

        // Shuffle the array randomly
        MathUtils.shuffleArray(nonZeroPoints);

        // stage 2. process all the points in random order
        for (let index = nonZeroPoints.length - 1; index >= 0; index--) {
            const [col, row] = nonZeroPoints[index];

            // check if it has been excluded already (i.e. belongs to some other line)
            if (!mask[row * colCount + col]) {
                continue;
            }

            let maxVal = threshold - 1;
            let maxThetaIndex = 0;
            // update accumulator, find the most probable line
            for (let thetaIndex = 0; thetaIndex < numAngleCells; thetaIndex++) {
                let _rho = Math.round(
                    col * cosTable[thetaIndex] + row * sinTable[thetaIndex]
                );
                _rho += (numrho - 1) / 2;

                if (!accum[thetaIndex]) {
                    accum[thetaIndex] = [];
                }
                if (!accum[thetaIndex][_rho]) {
                    accum[thetaIndex][_rho] = 1;
                } else {
                    accum[thetaIndex][_rho]++;
                }
                const val = accum[thetaIndex][_rho];

                if (maxVal < val) {
                    maxVal = val;
                    maxThetaIndex = thetaIndex;
                }
            }

            // if it is too "weak" candidate, continue with another point
            if (maxVal < threshold) { continue; }

            // from the current point walk in each direction
            // along the found line and extract the line segment
            const lineEnds = new Array(2);
            const shift = 16;
            const a = -sinTable[maxThetaIndex];
            const b = cosTable[maxThetaIndex];
            let x0 = col;
            let y0 = row;
            let dx0;
            let dy0;
            let isWalkingX;
            if (Math.abs(a) > Math.abs(b)) {
                isWalkingX = true;
                dx0 = a > 0 ? 1 : -1;
                dy0 = Math.round(b * (1 << shift) / Math.abs(a));
                y0 = (y0 << shift) + (1 << (shift - 1));
            } else {
                isWalkingX = false;
                dy0 = b > 0 ? 1 : -1;
                dx0 = Math.round(a * (1 << shift) / Math.abs(b));
                x0 = (x0 << shift) + (1 << (shift - 1));
            }

            for (let k = 0; k < 2; k++) {
                let gap = 0;
                let x = x0;
                let y = y0;
                let dx = dx0;
                let dy = dy0;

                // Walk in the opposite direction for the second point
                if (k > 0) {
                    dx = -dx;
                    dy = -dy;
                }

                // walk along the line using fixed-point arithmetics,
                for (; ; (x += dx), (y += dy)) {
                    let i1, j1;

                    if (isWalkingX) {
                        j1 = x;
                        i1 = y >> shift;
                    } else {
                        j1 = x >> shift;
                        i1 = y;
                    }

                    // stop at the image border or in case of too big gap
                    if (j1 < 0 || j1 >= colCount || i1 < 0 || i1 >= rowCount) {
                        break;
                    }

                    // for each non-zero point:
                    //    update line end,
                    //    clear the mask element
                    //    reset the gap
                    if (mask[i1 * colCount + j1]) {
                        gap = 0;
                        lineEnds[k] = [j1, i1]; // x, y of kth point
                    } else if (++gap > maxLineGap) {
                        break;
                    }
                }
            }

            const goodLine =
                Math.abs(lineEnds[1][0] - lineEnds[0][0]) >= minLineLength ||
                Math.abs(lineEnds[1][1] - lineEnds[0][1]) >= minLineLength;

            for (let k = 0; k < 2; k++) {
                let x = x0;
                let y = y0;
                let dx = dx0;
                let dy = dy0;

                if (k > 0) {
                    dx = -dx;
                    dy = -dy;
                }

                // walk along the line using fixed-point arithmetics,
                // stop at the image border or in case of too big gap
                for (; ; (x += dx), (y += dy)) {
                    let i1, j1;

                    if (isWalkingX) {
                        j1 = x;
                        i1 = y >> shift;
                    } else {
                        j1 = x >> shift;
                        i1 = y;
                    }

                    // for each non-zero point:
                    //    update line end,
                    //    clear the mask element
                    //    reset the gap
                    if (mask[i1 * colCount + j1]) {
                        if (goodLine) {
                        // Since we decided on this line as authentic, remove this pixel's
                        // weights for all possible angles from the accumulator array
                        for (let thetaIndex = 0; thetaIndex < numAngleCells; thetaIndex++) {
                            let _rho = Math.round(
                                j1 * cosTable[thetaIndex] + i1 * sinTable[thetaIndex]
                            );
                            _rho += (numrho - 1) / 2;
                            if (accum[thetaIndex] && accum[thetaIndex][_rho]) {
                                accum[thetaIndex][_rho]--;
                            }
                        }
                        }

                        mask[i1 * colCount + j1] = 0;
                    }

                    if (i1 === lineEnds[k][1] && j1 === lineEnds[k][0]) { break; }
                }
            }

            if (goodLine) {
                lines.push({
                    a: { x: lineEnds[0][0], y: lineEnds[0][1], },
                    b: { x: lineEnds[1][0], y: lineEnds[1][1], }
                });

                if (lines.length >= maxLines) {
                    return lines;
                }
            }
        }

        return lines;
    }

}
