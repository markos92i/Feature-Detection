import { Component, ViewChild, OnInit, ElementRef } from '@angular/core';

import * as jsfeat from 'jsfeat';

import { VideoTracker } from '../../libraries/rectangle-detector/video-tracker';
import { ImageUtils } from '../../libraries/image-utils/image-utils';
import { HoughTransform, Point } from '../../libraries/math-utils/hough-transform';
import { MathUtils } from '../../libraries/math-utils/math-utils';
import { CanvasUtils } from '../../libraries/canvas-utils/canvas-utils';

@Component({
    selector: 'app-rectangle-detection',
    templateUrl: 'rectangle-detection.html',
    styleUrls: ['rectangle-detection.css']
})
export class RectangleDetectionComponent implements OnInit {
    @ViewChild('video') video_ref: ElementRef;
    @ViewChild('canvas') canvas_ref: ElementRef;

    private video: HTMLVideoElement;
    private canvas: HTMLCanvasElement;

    private tracker: VideoTracker;

    private mirrored = false;

    constructor() { }

    ngOnInit() {
        this.video = this.video_ref.nativeElement;
        this.canvas = this.canvas_ref.nativeElement;

        navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then((stream: MediaStream) => {
            this.video.srcObject = stream;
            this.video.onloadeddata = () => {
                this.fitToContainer(this.video, this.canvas);
                this.initTracker();
            };
        })
        .catch((error) => {
            console.log('Error: ' + error);
        });

    }


    initTracker() {
        const context: CanvasRenderingContext2D = this.canvas.getContext('2d');
        context.imageSmoothingEnabled = true;
        if (this.mirrored) { this.video.style.cssText = 'transform: scale(-1, 1);'; }
        this.tracker = new VideoTracker(this.video);
        this.tracker.on('track', (event) => {
            const image = event.image;
            const width = image.width;
            const height = image.height;

            const sample = event.sample;

            if (this.canvas.width !== width || this.canvas.height !== height) { this.onSizeChange(width, height); }

            context.clearRect(0, 0, width, height);

            context.save();
            if (this.mirrored) {
                context.translate(this.canvas.width, 0);
                context.scale(-1, 1);
            }

            CanvasUtils.drawCardFilter(context);

            // const sobel = ImageUtils.sobel(sample);
            // const thres = ImageUtils.threshold(sobel, 35, 0, 255); // Play with the threshold to improve detection
            // const invert = ImageUtils.invert(thres);
            // const mono = ImageUtils.toMonoChannel(invert);


            const img_u8 = new jsfeat.matrix_t(sample.width, image.height, jsfeat.U8C1_t);

            // tslint:disable-next-line:no-bitwise
            const kernel_size = (2 + 1) << 1;

            jsfeat.imgproc.grayscale(sample.data, sample.width, sample.height, img_u8);
            jsfeat.imgproc.gaussian_blur(img_u8, img_u8, kernel_size, 0);
            jsfeat.imgproc.canny(img_u8, img_u8, 20, 127);

            // render result back to canvas
            const data_u32 = new Uint32Array(sample.data.buffer);
            // tslint:disable-next-line:no-bitwise
            const alpha = (0xff << 24);
            let i = img_u8.cols * img_u8.rows, pix = 0;
            while (--i >= 0) {
                pix = img_u8.data[i];
                // tslint:disable-next-line:no-bitwise
                data_u32[i] = alpha | (pix << 16) | (pix << 8) | pix;
            }
            const mono2 = ImageUtils.toMonoChannel(sample);

            context.putImageData(sample, 0, 0);
            // context.putImageData(invert, 0, 0);

            // image	        image data in 8-bit, single-channel binary source image.
            // colCount         image width.
            // rowCount         image height.
            // rho              distance resolution of the accumulator in pixels.
            // theta	        angle resolution of the accumulator in radians.
            // threshold	    accumulator threshold parameter. Only those lines are returned that get enough votes
            // minLineLength    minimum line length. Line segments shorter than that are rejected.
            // maxLineGap	    maximum allowed gap between points on the same line to link them.
            // maxLines         maximum number or lines retrieved by the function
            const rects = HoughTransform.probabilisticHoughTransform(
                mono2.data,
                sample.width,
                sample.height,
                1,
                Math.PI / 180,
                50,
                50,
                10,
                50
            );
            this.drawLines(context, rects);
            const quadrilaterals = this.getQuadrilaterals(rects);
            // let minArea = 0, best;
            // for (let q = 0; q < quadrilaterals.length; q++) {
            //     const area = MathUtils.polygonArea(quadrilaterals[q]);
            //     if (area > minArea) {
            //         minArea = area;
            //         best = q;
            //     }
            // }
            // this.fillQuadrilateral(context, quadrilaterals[best]);
            this.fillQuadrilaterals(context, quadrilaterals);

            // const margin = 5;

            // const scale = 0.85;
            // const ratio = 1.586;

            // const w = sample.width * scale;
            // const h = w / ratio;
            // const x = (sample.width * 0.5) - (w / 2);
            // const y = (sample.height * 0.5) - (h / 2);

            // const areaTop =     { from: { x: x - margin,        y: y - margin },      to: { x: x + w + margin,    y: y + margin } };
            // const areaRight =   { from: { x: x + w - margin,    y: y - margin },      to: { x: x + w + margin,    y: y + h + margin } };
            // const areaBottom =  { from: { x: x - margin,        y: y + h - margin },  to: { x: x + w + margin,    y: y + h + margin } };
            // const areaLeft =    { from: { x: x - margin,        y: y - margin },      to: { x: x + margin,        y: y + h + margin } };

            // let top = false, right = false, bottom = false, left = false;
            // for (let a = 0; a < rects.length; a++) {
            //     if (MathUtils.isRectInArea(rects[a], areaTop.from, areaTop.to)) {
            //         top = true;
            //         this.fillArea(context, areaTop.from, areaTop.to);
            //     } else if (MathUtils.isRectInArea(rects[a], areaRight.from, areaRight.to)) {
            //         right = true;
            //         this.fillArea(context, areaRight.from, areaRight.to);
            //     } else if (MathUtils.isRectInArea(rects[a], areaBottom.from, areaBottom.to)) {
            //         bottom = true;
            //         this.fillArea(context, areaBottom.from, areaBottom.to);
            //     } else if (MathUtils.isRectInArea(rects[a], areaLeft.from, areaLeft.to)) {
            //         left = true;
            //         this.fillArea(context, areaLeft.from, areaLeft.to);
            //     }
            // }

            // if (top && right && bottom && left) {
            //     console.log('CAPTURE?');
            // }
            context.restore();
        });
        this.tracker.run();
    }

    drawLines(context: CanvasRenderingContext2D, rects) {
        for (let i = 0; i < rects.length; i++) {
            context.beginPath();
            context.moveTo(rects[i].a.x, rects[i].a.y);
            context.lineTo(rects[i].b.x, rects[i].b.y);
            context.closePath();
            context.strokeStyle = 'rgba(255,0,0,1)';
            context.stroke();
            context.strokeStyle = 'rgba(0,0,0,1)';
        }
    }

    getQuadrilaterals(rects) {
        const corners = [];
        for (let i = 0; i < rects.length; i++) {
            for (let j = 0; j < rects.length; j++) {
                if (i !== j) {
                    const point = MathUtils.lineIntersect(rects[i], rects[j]);
                    if (point) {
                        // const angle = Math.abs(MathUtils.angleOfThree(point, rects[i].a, rects[j].a));
                        // if (angle > 120) { continue; }
                        if (point.x < 0 || point.x > 220 || point.y < 0 || point.y > 220 / 1.586) { continue; }
                        corners.push([rects[i], rects[j]]);
                        // points.push(point);
                        // context.fillStyle = 'rgba(0,255,0,1)';
                        // context.fillRect(point.x, point.y, 4, 4);
                    }
                }
            }
        }

        // Second phase where we check if those pairs collide 2 by 2
        const candidates = [];
        for (let i = 0; i < corners.length; i++) {
            for (let j = 0; j < corners.length; j++) {
                if (i !== j) {
                    // First Pair
                    const rect1 = corners[i][0];
                    const rect2 = corners[i][1];

                    // Second Pair
                    const rect3 = corners[j][0];
                    const rect4 = corners[j][1];

                    const pointA = MathUtils.lineIntersect(rect1, rect2);
                    const pointB = MathUtils.lineIntersect(rect3, rect4);
                    const pointC = MathUtils.lineIntersect(rect1, rect3) || MathUtils.lineIntersect(rect1, rect4);
                    const pointD = MathUtils.lineIntersect(rect2, rect4) || MathUtils.lineIntersect(rect2, rect3);

                    if (pointA && pointB && pointC && pointD) {
                        const diagonalA = { a: pointA, b: pointB };
                        const diagonalB = { a: pointC, b: pointD };
                        const center = MathUtils.lineIntersect(diagonalA, diagonalB);

                        if (!center) { continue; }
                        if (pointA.x < 0 || pointA.x > 220 || pointA.y < 0 || pointA.y > 220 / 1.586) { continue; }
                        if (pointB.x < 0 || pointB.x > 220 || pointB.y < 0 || pointB.y > 220 / 1.586) { continue; }
                        if (pointC.x < 0 || pointC.x > 220 || pointC.y < 0 || pointC.y > 220 / 1.586) { continue; }
                        if (pointD.x < 0 || pointD.x > 220 || pointD.y < 0 || pointD.y > 220 / 1.586) { continue; }

                        // const A = Math.abs(MathUtils.angleOfThree(pointC, pointA, pointB));
                        // const B = Math.abs(MathUtils.angleOfThree(pointB, pointC, pointD));
                        // const C = Math.abs(MathUtils.angleOfThree(pointD, pointB, pointA));
                        // const D = Math.abs(MathUtils.angleOfThree(pointA, pointD, pointC));

                        const A = Math.abs(MathUtils.find_angle(pointC, pointD, pointA));
                        const B = Math.abs(MathUtils.find_angle(pointC, pointD, pointB));
                        const C = Math.abs(MathUtils.find_angle(pointA, pointB, pointC));
                        const D = Math.abs(MathUtils.find_angle(pointA, pointB, pointD));

                        if (A > 135 || B > 135 || C > 135 || D > 135) { continue; }
                        if (A < 45 || B < 45 || C < 45 || D < 45) { continue; }

                        const total = Math.round(A + B + C + D);
                        if (total === 360) {
                            const width = MathUtils.distance(pointA, pointC);
                            const height = MathUtils.distance(pointA, pointD);
                            const ratio = Math.round((width / height) * 100) / 100;

                            const w = center.x, h = center.y;
                            const matrix = MathUtils.general2DProjection(
                                0, 0, pointA.x, pointA.y, w, 0, pointC.x, pointC.y, 0, h, pointB.x, pointB.y, w, h, pointD.x, pointD.y
                            );

                            const matrix3d = MathUtils.transform2d(
                                center, pointA.x, pointA.y, pointC.x, pointC.y, pointB.x, pointB.y, pointD.x, pointD.y
                            );

                            //      | a  b  tx |
                            // A =  | c  d  ty |
                            //      | 0  0  1  |

                            // const decomposition = MathUtils.decomposeMatrix(
                            //     {
                            //         a: A,
                            //         b: B,
                            //         c: C,
                            //         d: D,
                            //         e: center.x,
                            //         f: center.y
                            //     }
                            // );
                            // console.log(JSON.stringify(matrix));
                            if (ratio === 1.58) {
                                candidates.push([pointA, pointC, pointB, pointD]);
                            }

                            // context.fillStyle = 'rgba(0,255,0,1)';
                            // context.fillRect(pointA.x, pointA.y, 4, 4);
                            // context.fillRect(pointB.x, pointB.y, 4, 4);
                            // context.fillRect(pointC.x, pointC.y, 4, 4);
                            // context.fillRect(pointD.x, pointD.y, 4, 4);
                        }
                    }
                }
            }
        }
        return candidates;
    }

    fillQuadrilateral(context: CanvasRenderingContext2D, quadrilateral: Point[]) {
        context.save();
        context.fillStyle = 'rgba(0,0,255,0.5)';
        context.beginPath();
        context.moveTo(quadrilateral[0].x, quadrilateral[0].y);
        context.lineTo(quadrilateral[1].x, quadrilateral[1].y);
        context.lineTo(quadrilateral[2].x, quadrilateral[2].y);
        context.lineTo(quadrilateral[3].x, quadrilateral[3].y);
        context.lineTo(quadrilateral[0].x, quadrilateral[0].y);
        context.closePath();
        context.fill();
        context.restore();
    }

    fillQuadrilaterals(context: CanvasRenderingContext2D, quadrilaterals: Point[][]) {
        for (let i = 0; i < quadrilaterals.length; i++) {
            this.fillQuadrilateral(context, quadrilaterals[i]);
        }
    }

    fillArea(context: CanvasRenderingContext2D, from: Point, to: Point) {
        context.save();
        context.fillStyle = 'rgba(0,255,0,0.1)';
        context.beginPath();
        context.moveTo(from.x, from.y);
        context.lineTo(to.x, from.y);
        context.lineTo(to.x, to.y);
        context.lineTo(from.x, to.y);
        context.lineTo(from.x, from.y);
        context.closePath();
        context.fill();
        context.restore();
    }

    fitToContainer(video: HTMLVideoElement, canvas: HTMLCanvasElement) {
        // Make it visually fill the positioned parent
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        // ...then set the internal size to match
        canvas.width  = video.videoWidth;
        canvas.height = video.videoHeight;
    }

    onSizeChange(width: number, height: number): void {
        console.log('card-detector.onSizeChange() width=' + width + ' | height:' + height);
        this.canvas.width = width;
        this.canvas.height = height;
    }

}
