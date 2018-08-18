import { EventEmitter } from './event-emitter';

export class VideoTracker extends EventEmitter {
    private requestId: number;
    private video: HTMLVideoElement;
    private canvas: HTMLCanvasElement;
    private context: CanvasRenderingContext2D;

    private image: ImageData;

    constructor(source: HTMLVideoElement) {
        super();
        this.video = source;
        if (this.video.readyState === HTMLMediaElement.HAVE_ENOUGH_DATA) {
            this.setUpCanvas();
        } else {
            this.video.onloadeddata = () => { this.setUpCanvas(); };
        }
    }

    private setUpCanvas() {
        const width = this.video.videoWidth;
        const height = this.video.videoHeight;
        const ratio = width / height;

        this.image = new ImageData(width, height);

        this.canvas = document.createElement('canvas');
        this.canvas.width = 200;
        this.canvas.height = 200 / ratio;
        this.context = this.canvas.getContext('2d');
        this.context.imageSmoothingEnabled = true;
    }

    private requestFrame() {
        this.requestId = requestAnimationFrame(() => {
            if (this.canvas) {
                this.context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
                const preview = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
                this.track(this.image, preview);
            }
            this.requestFrame();
        });
    }
    private cancelFrame() {
        window.cancelAnimationFrame(this.requestId);
    }

    protected track(image: ImageData, sample: ImageData) {
        this.emit('track', { image, sample });
    }

    public run() {
        this.enableListener('track');
        this.requestFrame();
    }

    public stop() {
        this.disableListener('track');
        this.cancelFrame();
    }

}
