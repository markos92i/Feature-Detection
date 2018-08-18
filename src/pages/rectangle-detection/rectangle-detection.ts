import { Component, ViewChild, OnInit, ElementRef, Injector } from '@angular/core';

import { VideoTracker } from '../../libraries/rectangle-detector/video-tracker';
import { ImageUtils } from '../../libraries/image-utils/image-utils';
import { HoughTransform, Point } from '../../libraries/math-utils/hough-transform';
import { MathUtils } from '../../libraries/math-utils/math-utils';
import { CanvasUtils } from '../../libraries/canvas-utils/canvas-utils';

import * as jsfeat from 'jsfeat';
import { PerspectiveTransform } from '../../libraries/math-utils/perspective-transform';
import { Matrix } from '../../libraries/math-utils/matrix-transform';
import { WebRTCClient, WebRTCClientState } from '../../libraries/webrtc-client/webrtc-client';
import { HttpClient } from '@angular/common/http';

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

    private context: CanvasRenderingContext2D;
    private tracker: VideoTracker;

    private debug = false;
    private mirrored = false;
    private guide_scale = 0.7;

    private client: WebRTCClient;

    constructor(private injector: Injector) { }

    ngOnInit() {
        this.video = this.video_ref.nativeElement;
        this.canvas = this.canvas_ref.nativeElement;

        // this.initClient();
        // this.connectToRoom('test123456');

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

    /**
     * Controles del cliente WebRTC
     */
    initClient() {
        this.client = new WebRTCClient(this.injector.get(Injector), this.injector.get(HttpClient), this);
    }
    connectToRoom(roomId: string) {
        this.client.connectToRoom(roomId);
    }
    disconnect() {
        this.client.disconnect();
    }

    /**
     * Delegado del cliente WebRTC
     */
    webrtcClientState(state: WebRTCClientState) {
        switch (state) {
            case WebRTCClientState.connected:       console.log('WebRTC Client Connected'); break;
            case WebRTCClientState.connecting:      console.log('WebRTC Client Connecting'); break;
            case WebRTCClientState.registered:      console.log('WebRTC Client Registered'); break;
            case WebRTCClientState.disconnected:    console.log('WebRTC Client Disconnected'); break;
            case WebRTCClientState.call:            console.log('WebRTC Client in Call'); break;
        }
    }
    webrtcClientLocalStream(stream: MediaStream) {
        console.log('Local stream added');
        this.video.srcObject = stream;
    }

    webrtcClientRemoteStream(stream: MediaStream) {
        console.log('Remote stream added');
        // this.video.nativeElement.srcObject = stream;
    }

    webrtcClientError(error: Error) {
        this.disconnect();
    }



    initTracker() {
        const context: CanvasRenderingContext2D = this.canvas.getContext('2d');
        context.imageSmoothingEnabled = true;
        this.context = context;
        if (this.mirrored) { this.video.style.cssText = 'transform: scale(-1, 1);'; }
        this.tracker = new VideoTracker(this.video);
        this.tracker.on('track', (event) => {
            const image = event.image;
            const width = image.width;
            const height = image.height;

            const sample = event.sample;
            const sample_scale = event.sample.width / width;
            const guide_bounds = CanvasUtils.cardBounds(width, height, this.guide_scale);

            if (this.canvas.width !== width || this.canvas.height !== height) { this.onSizeChange(width, height); }

            context.clearRect(0, 0, width, height);

            context.save();
            if (this.mirrored) {
                context.translate(this.canvas.width, 0);
                context.scale(-1, 1);
            }
            CanvasUtils.drawCardFilter(context, this.guide_scale);

            // const dx = ImageUtils.sobelHorizontalGradient(sample);
            // const dy = ImageUtils.sobelVerticalGradient(sample);
            // const magImage = dx.data.map((num, idx) => Math.sqrt(Math.abs(num) + Math.abs(dy.data[idx])));
            // const sumAbsMagnitude = magImage.reduce((acc, val) => acc + val);
            // const low_thresh = sumAbsMagnitude / (sample.width * sample.height);
            // const high_thresh = 3.0 * low_thresh;

            const grayscaleMono = ImageUtils.grayscaleOneChannel(sample);
            const blurMono = ImageUtils.gaussianBlurMono(grayscaleMono, sample.width, sample.height, 1.5);
            const img_u8 = new jsfeat.matrix_t(sample.width, sample.height, jsfeat.U8C1_t);
            img_u8.data = blurMono;
            jsfeat.imgproc.canny(img_u8, img_u8, 25, 125); // 25, 125
            const cannyMono = img_u8.data;


            if (this.debug) {
                const cannyRGBA = ImageUtils.toImageData(cannyMono, sample.width, sample.height);
                context.putImageData(cannyRGBA, 0, 0);
            }

            // const mono = ImageUtils.toMonoChannel(sample);

            const kHoughThresholdLengthDivisor = 6; // larger value --> accept more lines as lines
            const threshold = Math.max(sample.width, sample.height) / kHoughThresholdLengthDivisor;

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
                cannyMono,
                sample.width,
                sample.height,
                1,
                Math.PI / 180,
                threshold,
                20,
                2, // 10% - 20% of the maxLineLenght is usually a good value
                15
            );

            if (this.debug) {
                this.drawLines(context, rects, sample_scale);
            }


            // First phase where we obtain all the possible intersections
            const corners = this.getIntersections(rects, sample.width, sample.height);
            // Second phase where we check if the corners formed by the intersections collide in a quadrilateral
            const quadrilaterals = this.getQuadrilaterals(corners, sample.width, sample.height);
            // Thrid phase where we check if the quadrilaterals are a good rectangle
            const rectangles = this.getRectangles(quadrilaterals);

            if (this.debug) {
                this.fillQuadrilaterals(context, rectangles, sample_scale);
            }

            for (let q = 0; q < rectangles.length; q++) {
                const r = rectangles[q];
                const bounds = rectangles[q].bounds;
                const proj = rectangles[q].projection;
                const tf = rectangles[q].transformation;
                const matrix = rectangles[q].matrix;

                const crop_x0 = Math.min(bounds.topLeft.x, bounds.bottomLeft.x) / sample_scale;
                const crop_y0 = Math.min(bounds.topLeft.y, bounds.topRight.y) / sample_scale;
                const crop_x1 = Math.max(bounds.topRight.x, bounds.bottomRight.x) / sample_scale;
                const crop_y1 = Math.max(bounds.bottomLeft.y, bounds.bottomRight.y) / sample_scale;

                const crop_width = crop_x1 - crop_x0;
                const crop_height = crop_y1 - crop_y0;
                const ratio = crop_width / crop_height;

                if (ratio > 1 && ratio < 2) {

                    // const crop_pre2 = ImageUtils.cropImageFromVideo(this.video, crop_x0, crop_y0, crop_width, crop_height);
                    const crop_pre2 = ImageUtils.cropImageFromVideo(this.video, 0, 0, this.video.videoWidth, this.video.videoHeight);
                    // const transformedImage = ImageUtils.identity(crop_pre2);


                    const transform = new jsfeat.matrix_t(3, 3, jsfeat.F32_t | jsfeat.C1_t);
                    jsfeat.math.perspective_4point_transform(transform,
                        proj.topLeft.x,      proj.topLeft.y,        bounds.topLeft.x,      bounds.topLeft.y,
                        proj.topRight.x,     proj.topRight.y,       bounds.topRight.x,     bounds.topRight.y,
                        proj.bottomRight.x,  proj.bottomRight.y,    bounds.bottomRight.x,  bounds.bottomRight.y,
                        proj.bottomLeft.x,   proj.bottomLeft.y,     bounds.bottomLeft.x,   bounds.bottomLeft.y);
                    jsfeat.matmath.invert_3x3(transform, transform);

                    // const matrix = [t[0], t[3], 0, t[6],
                    //                 t[1], t[4], 0, t[7],
                    //                 0, 0, 1, 0,
                    //                 t[2], t[5], 0, t[8]];

                    // const transform2 = [tf[0], tf[1], tf[2], tf[3], tf[4], tf[5], 0, 0, 1];

                    // const transform2 = [
                    //     matrix[0], matrix[1], matrix[3],
                    //     matrix[4], matrix[5], matrix[7],
                    //     matrix[12], matrix[13], matrix[15]
                    // ];
                    // const transform3 = MathUtils.invert_3x3(transform2);
                    const warped = ImageUtils.perspectiveRGBA(crop_pre2, transform.data);
                    // const warped = ImageUtils.warp_perspective_color(crop_pre2, transform3);

                    const crop_width2 = MathUtils.distance(proj.topLeft, proj.topRight);
                    const crop_height2 = MathUtils.distance(proj.topLeft, proj.bottomLeft);
                    if (crop_width2 > 1 && crop_height2 > 1) {
                        const crop_pre = ImageUtils.cropImage(
                            warped,
                            proj.topLeft.x / sample_scale,
                            proj.topLeft.y / sample_scale,
                            crop_width2 / sample_scale,
                            crop_height2 / sample_scale
                        );
                        context.putImageData(crop_pre, 0, 0);
                    }

                    this.fillQuadrilateral(context, bounds, sample_scale);


                    // context.putImageData(warped, 0, 0);

                    // tslint:disable:no-bitwise
                    // const img_u8 = new jsfeat.matrix_t(transformedImage.width, transformedImage.height, jsfeat.U8_t | jsfeat.C1_t);
                    // const img_u8_warp = new jsfeat.matrix_t(transformedImage.width, transformedImage.height, jsfeat.U8_t | jsfeat.C1_t);

                    // const mat_affine = new jsfeat.matrix_t(3, 2, jsfeat.F32_t | jsfeat.C1_t);

                    // mat_affine.data[0] = tf.a;
                    // mat_affine.data[1] = tf.c;
                    // mat_affine.data[2] = tf.e;
                    // mat_affine.data[3] = tf.b;
                    // mat_affine.data[4] = tf.d;
                    // mat_affine.data[5] = tf.f;

                    // jsfeat.imgproc.grayscale(transformedImage.data, transformedImage.width, transformedImage.height, img_u8);
                    // jsfeat.imgproc.warp_affine(img_u8, img_u8_warp, mat_affine, 0);

                    // render result back to canvas
                    // const data_u32 = new Uint32Array(transformedImage.data.buffer);
                    // const alpha = (0xff << 24);
                    // let i = img_u8_warp.cols * img_u8_warp.rows, pix = 0;
                    // while (--i >= 0) {
                    //     pix = img_u8_warp.data[i];
                    //     data_u32[i] = alpha | (pix << 16) | (pix << 8) | pix;
                    // }
                    // tslint:enable:no-bitwise

                    // const crop_width2 = MathUtils.distance(r.bounds.topLeft, r.bounds.topRight);
                    // const crop_height2 = MathUtils.distance(r.bounds.topLeft, r.bounds.bottomLeft);
                    // if (crop_width2 > 0 && crop_height2 > 0) {
                    //     const crop_pre = ImageUtils.cropImage(
                    //         transformedImage,
                    //         r.bounds.topLeft.x / sample_scale,
                    //         r.bounds.topLeft.y / sample_scale,
                    //         crop_width2 / sample_scale,
                    //         crop_height2 / sample_scale
                    //     );
                    //     context.putImageData(crop_pre, 0, 0);
                    // }




                    // context.font = '30px Arial';
                    // context.fillStyle = 'white';
                    // context.textAlign = 'center';
                    // const angle = Number(rectangles[best].description.angle).toFixed(2);
                    // context.fillText(angle, this.canvas.width / 2, this.canvas.height / 4);


                    // const imageData = ImageUtils.cropImage(image, crop_x, crop_y, crop_width, crop_height);
                    // const preview = { image: imageData, width: crop_width, height: crop_height };

                    // const x = (this.canvas.width / 2) - (preview.width / 2);
                    // const y = (this.canvas.height / 2) - (preview.height / 2);

                    // context.putImageData(preview.image, x, y, 0, 0, preview.width, preview.height);

                    // const resized = ImageUtils.resizeWithCanvas(imageData, 1200, 1200 / 1.586);
                    // const imageUri = ImageUtils.getImageUri(resized, this.mirrored);

                    CanvasUtils.drawCardSuccess(context, this.guide_scale);
                }
            }

            context.restore();
        });
        this.tracker.run();
    }

    drawLines(context: CanvasRenderingContext2D, rects, scale) {
        for (let i = 0; i < rects.length; i++) {
            context.beginPath();
            context.moveTo(rects[i].a.x / scale, rects[i].a.y / scale);
            context.lineTo(rects[i].b.x / scale, rects[i].b.y / scale);
            context.closePath();
            context.strokeStyle = 'rgba(255,0,0,1)';
            context.stroke();
            context.strokeStyle = 'rgba(0,0,0,1)';
        }
    }

    getIntersections(rects, width, height) {
        const aux = rects.slice();
        const corners = [];
        while (aux.length > 0) {
            const a = aux.shift();
            const remaining = aux.slice();
            while (remaining.length > 0) {
                const b = remaining.shift();
                const point = MathUtils.lineIntersect(a, b);
                if (point) {
                    if (point.x < 0 || point.x > width || point.y < 0 || point.y > height) { continue; }
                    corners.push([a, b]);
                }
            }
        }
        return corners;
    }
    getQuadrilaterals(corners, width, height) {
        const aux = corners.slice();
        const quadrilaterals = [];
        while (aux.length > 0) {
            const cornerA = aux.shift();
            const remaining = aux.slice();
            while (remaining.length > 0) {
                const cornerB = remaining.shift();

                const rect1 = cornerA[0];
                const rect2 = cornerA[1];
                const rect3 = cornerB[0];
                const rect4 = cornerB[1];

                const pointA = MathUtils.lineIntersect(rect1, rect2);
                const pointB = MathUtils.lineIntersect(rect3, rect4);
                const pointC = MathUtils.lineIntersect(rect1, rect3) || MathUtils.lineIntersect(rect1, rect4);
                const pointD = MathUtils.lineIntersect(rect2, rect4) || MathUtils.lineIntersect(rect2, rect3);

                if (pointA && pointB && pointC && pointD) {
                    if (pointA.x < 0 || pointA.x > width || pointA.y < 0 || pointA.y > height) { continue; }
                    if (pointB.x < 0 || pointB.x > width || pointB.y < 0 || pointB.y > height) { continue; }
                    if (pointC.x < 0 || pointC.x > width || pointC.y < 0 || pointC.y > height) { continue; }
                    if (pointD.x < 0 || pointD.x > width || pointD.y < 0 || pointD.y > height) { continue; }

                    const A = Math.abs(MathUtils.cornerAngle(pointC, pointD, pointA));
                    const B = Math.abs(MathUtils.cornerAngle(pointC, pointD, pointB));
                    const C = Math.abs(MathUtils.cornerAngle(pointA, pointB, pointC));
                    const D = Math.abs(MathUtils.cornerAngle(pointA, pointB, pointD));

                    if (A > 120 || B > 120 || C > 120 || D > 120 || A < 60 || B < 60 || C < 60 || D < 60) { continue; }

                    const total = A + B + C + D;
                    if (total > 359 && total < 361) {
                        quadrilaterals.push([pointA, pointB, pointC, pointD]);
                    }
                }
            }
        }
        return quadrilaterals;
    }

    getRectangles(points: Point[][]): any {
        const rectangles = [];
        for (let i = 0; i < points.length; i++) {
            const bounds = MathUtils.sortCorners(points[i]);
            const pointTL = bounds.topLeft;
            const pointTR = bounds.topRight;
            const pointBR = bounds.bottomRight;
            const pointBL = bounds.bottomLeft;

            const width = MathUtils.distance(bounds.topRight, bounds.topLeft);
            const height = MathUtils.distance(bounds.bottomLeft, bounds.topLeft);
            const ratio = width / height;
            // if (ratio < 1.2 || ratio > 1.8) { continue; }

            const area = MathUtils.polygonArea([pointTL, pointTR, pointBL, pointBR]);

            const w = width, h = height;
            const t = PerspectiveTransform.general2DProjection(
                0, 0, pointTL.x, pointTL.y, w, 0, pointTR.x, pointTR.y, 0, h, pointBL.x, pointBL.y, w, h, pointBR.x, pointBR.y
            );
            for (let j = 0; j !== 9; ++j) { t[j] = t[j] / t[8]; }
            const matrix = [t[0], t[3], 0, t[6],
                            t[1], t[4], 0, t[7],
                            0, 0, 1, 0,
                            t[2], t[5], 0, t[8]];

            const transformation = new Matrix();
            // transformation.setTransform(t[0], t[1], t[3], t[4], t[6], t[7]);
            transformation.setTransform(matrix[0], matrix[4], matrix[1], matrix[5], matrix[3], matrix[7]);
            // transformation.scale(1, 1);
            // transformation.translate(0, 0);

            const description = transformation.decompose();
            const angle = description.angle;
            const skewX = description.skewX;
            const skewY = description.skewY; // Allways 0
            const scaleX = description.scaleX;
            const scaleY = description.scaleY;
            const translateX = description.translateX;
            const translateY = description.translateY;

            // if (Math.abs(angle) > 5) { continue; }
            // if (Math.abs(skewX) > 5) { continue; }
            // if (scaleX > 2 && scaleX < 0.5 && scaleY > 2 && scaleY < 0.5) { continue; }

            const inverse = transformation.getInverse();
            const projection = MathUtils.sortCorners(inverse.applyToArray([pointTL, pointTR, pointBL, pointBR]));

            const AT = Math.abs(MathUtils.cornerAngle(projection.bottomLeft, projection.topRight, projection.topLeft));
            const BT = Math.abs(MathUtils.cornerAngle(projection.bottomLeft, projection.topRight, projection.bottomRight));
            const CT = Math.abs(MathUtils.cornerAngle(projection.topLeft, projection.bottomRight, projection.topRight));
            const DT = Math.abs(MathUtils.cornerAngle(projection.topLeft, projection.bottomRight, projection.bottomLeft));

            // See if is a real rectangle and not just another quadrilateral
            if (AT > 95 || BT > 95 || CT > 95 || DT > 95 || AT < 85 || BT < 85 || CT < 85 || DT < 85) { continue; }

            const realWidth = MathUtils.distance(projection.topRight, projection.topLeft);
            const realHeight = MathUtils.distance(projection.bottomLeft, projection.topLeft);
            const realRatio = realWidth / realHeight;

            // if (realRatio < 1.5 || realRatio > 1.65) { continue; }

            rectangles.push({ bounds, projection, matrix, inverse, area });
        }
        return rectangles;
    }

    random_rgba() {
        const o = Math.round, r = Math.random, s = 255;
        return 'rgba(' + o(r() * s) + ',' + o(r() * s) + ',' + o(r() * s) + ',' + r().toFixed(1) + ')';
    }

    fillQuadrilateral(context: CanvasRenderingContext2D, quadrilateral: any, scale: number) {
        context.save();
        context.fillStyle = 'rgba(255,0,0,1)';
        // context.fillStyle = this.random_rgba();
        context.beginPath();
        context.moveTo(quadrilateral.topLeft.x / scale, quadrilateral.topLeft.y / scale);
        context.lineTo(quadrilateral.topRight.x / scale, quadrilateral.topRight.y / scale);
        context.lineTo(quadrilateral.bottomRight.x / scale, quadrilateral.bottomRight.y / scale);
        context.lineTo(quadrilateral.bottomLeft.x / scale, quadrilateral.bottomLeft.y / scale);
        context.lineTo(quadrilateral.topLeft.x / scale, quadrilateral.topLeft.y / scale);
        context.closePath();
        context.fill();
        context.restore();
    }

    fillQuadrilaterals(context: CanvasRenderingContext2D, quadrilaterals: any[], scale: number) {
        for (let i = 0; i < quadrilaterals.length; i++) {
            this.fillQuadrilateral(context, quadrilaterals[i].bounds, scale);
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

    perspectiveCorrection() {

    }

    fitToContainer(video: HTMLVideoElement, canvas: HTMLCanvasElement) {
        // Make it visually fill the positioned parent
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        // ...then set the internal size to match
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
    }

    onSizeChange(width: number, height: number): void {
        console.log('card-detector.onSizeChange() width=' + width + ' | height:' + height);
        this.canvas.width = width;
        this.canvas.height = height;
    }

}
