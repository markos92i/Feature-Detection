import { EventEmitter } from './event-emitter';

export class VideoTracker extends EventEmitter {
    private requestId: number;
    private video: HTMLVideoElement;
    private canvas: HTMLCanvasElement;
    private context: CanvasRenderingContext2D;

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
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        this.context = this.canvas.getContext('2d');
    }

    private requestFrame = () => {
        this.requestId = window.requestAnimationFrame(() => {
            if (this.video.readyState === this.video.HAVE_ENOUGH_DATA && this.canvas) {
                const width = this.canvas.width;
                const height = this.canvas.height;
                const ratio = width / height;

                this.context.drawImage(this.video, 0, 0, width, height);
                const image = this.context.getImageData(0, 0, width, height);

                const p_width = 220;
                const p_height = p_width / ratio;

                this.context.drawImage(this.video, 0, 0, p_width, p_height);
                const sample = this.context.getImageData(0, 0, p_width, p_height);

                this.track(image, sample);
            }
            this.requestFrame();
        });
    }

    private cancelFrame = () => {
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
