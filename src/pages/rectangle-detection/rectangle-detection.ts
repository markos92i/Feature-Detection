import { Component, ViewChild, OnInit, ElementRef } from '@angular/core';

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

    private mirrored = true;

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

            const sobel = ImageUtils.sobel(sample);
            const thres = ImageUtils.threshold(sobel, 50, 0, 255); // Play with the threshold to improve detection
            const invert = ImageUtils.invert(thres);
            // const thres = ImageUtils.threshold(invert, 200, 0, 255);
            const mono = ImageUtils.toMonoChannel(invert);

            context.putImageData(invert, 0, 0);

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
                mono.data,
                mono.width,
                mono.height,
                1,
                Math.PI / 90,
                50,
                50,
                2,
                30
            );
            this.drawLines(context, rects);


            const margin = 5;

            const scale = 0.85;
            const ratio = 1.586;

            const w = mono.width * scale;
            const h = w / ratio;
            const x = (mono.width * 0.5) - (w / 2);
            const y = (mono.height * 0.5) - (h / 2);

            const areaTop = {
                from:   { x: x - margin,        y: y - margin },
                to:     { x: x + w + margin,    y: y + margin }
            };
            const areaRight = {
                from:   { x: x + w - margin,    y: y - margin },
                to:     { x: x + w + margin,    y: y + h + margin }
            };
            const areaBottom = {
                from:   { x: x - margin,        y: y + h - margin },
                to:     { x: x + w + margin,    y: y + h + margin }
            };
            const areaLeft = {
                from:   { x: x - margin,        y: y - margin },
                to:     { x: x + margin,        y: y + h + margin }
            };
            // this.fillArea(context, areaTop.from, areaTop.to);
            // this.fillArea(context, areaRight.from, areaRight.to);
            // this.fillArea(context, areaBottom.from, areaBottom.to);
            // this.fillArea(context, areaLeft.from, areaLeft.to);

            let top = false, right = false, bottom = false, left = false;
            for (let a = 0; a < rects.length; a++) {
                if (MathUtils.isRectInArea(rects[a], areaTop.from, areaTop.to)) {
                    top = true;
                    this.fillArea(context, areaTop.from, areaTop.to);
                } else if (MathUtils.isRectInArea(rects[a], areaRight.from, areaRight.to)) {
                    right = true;
                    this.fillArea(context, areaRight.from, areaRight.to);
                } else if (MathUtils.isRectInArea(rects[a], areaBottom.from, areaBottom.to)) {
                    bottom = true;
                    this.fillArea(context, areaBottom.from, areaBottom.to);
                } else if (MathUtils.isRectInArea(rects[a], areaLeft.from, areaLeft.to)) {
                    left = true;
                    this.fillArea(context, areaLeft.from, areaLeft.to);
                }
            }

            if (top && right && bottom && left) {
                console.log('YASSSSSSSSSSSSSSS');
            }
            context.restore();
        });
        this.tracker.run();
    }

    line_intersect(x1, y1, x2, y2, x3, y3, x4, y4) {
        let ua, ub;
        const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
        if (denom === 0) {
            return null;
        }
        ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
        ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;
        return {
            x: x1 + ua * (x2 - x1),
            y: y1 + ua * (y2 - y1),
            seg1: ua >= 0 && ua <= 1,
            seg2: ub >= 0 && ub <= 1
        };
    }

    drawLines(context: CanvasRenderingContext2D, rects) {
        for (let i = 0; i < rects.length; i++) {
            // console.log(JSON.stringify(rects[i]));
            context.beginPath();
            context.moveTo(rects[i].a.x, rects[i].a.y);
            context.lineTo(rects[i].b.x, rects[i].b.y);
            context.closePath();
            context.strokeStyle = 'rgba(255,0,0,1)';
            context.stroke();
            context.strokeStyle = 'rgba(0,0,0,1)';
        }


        const points = [];
        for (let i = 0; i < rects.length; i++) {
            for (let j = 0; j < rects.length; j++) {
                if (i !== j) {
                    const point = this.line_intersect(
                        rects[i].a.x, rects[i].a.y, rects[i].b.x, rects[i].b.y,
                        rects[j].a.x, rects[j].a.y, rects[j].b.x, rects[j].b.y
                    );
                    // const distance = MathUtils.distance(p1, p2);
                    if (point) {
                        if (point.x < 0 || point.x > 220 || point.y < 0 || point.y > 220 / 1.586) { continue; }
                        points.push(point);
                        context.fillStyle = 'rgba(0,255,0,1)';
                        context.fillRect(point.x, point.y, 4, 4);
                    }
                }
            }
        }

        // const sum = [];
        // // points = this.sortPoints(points);

        // const test = rects.slice();
        // while (test.length) {
        //     const p1 = test.pop();
        //     const remaining = test.slice();
        //     const angle1 = MathUtils.angleOfPoints(p1.a, p1.b);

        //     let closest = MathUtils.closestRect(remaining, p1, 'a');
        //     if (!closest.point) { break; }
        //     let next = closest.side === 'a' ? 'b' : 'a';
        //     remaining.splice(closest.index, 1);
        //     const p2 = closest.point;
        //     const angle2 = MathUtils.angleOfPoints(p2.a, p2.b);

        //     closest = MathUtils.closestRect(remaining, p2, next);
        //     if (!closest.point) { break; }
        //     next = closest.side === 'a' ? 'b' : 'a';
        //     remaining.splice(closest.index, 1);
        //     const p3 = closest.point;
        //     const angle3 = MathUtils.angleOfPoints(p3.a, p3.b);

        //     closest = MathUtils.closestRect(remaining, p3, next);
        //     if (!closest.point) { break; }
        //     // next = closest.side === 'a' ? 'b' : 'a';
        //     // test.splice(closest.index, 1);
        //     const p4 = closest.point;
        //     const angle4 = MathUtils.angleOfPoints(p4.a, p4.b);

        //     console.log('ANGLES DIFFERENCES: A1: ' + angle1 + ' A2: ' + angle2 + ' A3: ' + angle3 + ' A4: ' + angle4);


        //     sum.push([p1, p2, p3, p4]);
        // }

        /*
        // Draw biggest area
        corners = this.sortPoints(corners);
        for (let i = 0; i < 4; i++) {
            context.save();
            context.fillStyle = 'rgba(0,0,255,0.3)';
            context.beginPath();
            context.moveTo(corners[0].x, corners[0].y);
            context.lineTo(corners[1].x, corners[1].y);
            context.lineTo(corners[2].x, corners[2].y);
            context.lineTo(corners[3].x, corners[3].y);
            context.lineTo(corners[0].x, corners[0].y);
            context.closePath();
            context.fill();
            context.restore();
        }

        */
        /*
        points.sort( (a, b) => {
            if (a.x === b.x) { return a.y - b.y; }
            return a.x - b.x;
        });

        /*
        for (let i = 0; i < points.length / 2; i++) {
            for (let j = 0; j < points.length / 2; j++) {
                if (i !== j) {
                    const width = Math.abs(points[i].x - points[j].x);
                    const height = Math.abs(points[i].y - points[j].y);
                    const ratio = width / height;

                    if (ratio > 1.5  && ratio < 1.65) {
                        context.save();
                        context.fillStyle = 'rgba(0,255,0,0.1)';
                        if (points[i].x < points[j].x) {
                            context.fillRect(points[i].x, points[i].y, width, height);
                        } else {
                            context.fillRect(points[j].x, points[j].y, width, height);
                        }
                        context.restore();
                    }
                }
            }
        }
        */

    }

    fillArea(context: CanvasRenderingContext2D, from: Point, to: Point) {
        context.save();
        context.fillStyle = 'rgba(0,255,0,0.5)';
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
