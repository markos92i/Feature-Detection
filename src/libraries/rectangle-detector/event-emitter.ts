export class EventEmitter {
    private events_ = {};

    on(event, listener) { return this.addListener(event, listener); }

    addListener(event: string, listener: Function) {
        if (typeof listener !== 'function') { throw new TypeError('Listener must be a function'); }

        this.emit(event, listener);

        if (!this.events_[event]) { this.events_[event] = {}; }

        this.events_[event].enabled = true;
        this.events_[event].listener = listener;

        return this;
    }

    event(event: string) { return this.events_[event]; }

    emit(event, args) {
        const event_ = this.event(event);
        if (event_ && event_.enabled) {
            event_.listener(args);
            return true;
        }
        return false;
    }

    enableListener(event) {
        const event_ = this.event(event);
        if (event_) { this.events_[event].enabled = true; }
        return this;
    }

    disableListener(event) {
        const event_ = this.event(event);
        if (event_) { this.events_[event].enabled = false; }
        return this;
    }

    removeAllListeners(opt_event) {
        delete this.events_;
        return this;
    }

    removeListener(event) {
        const listener = this.event(event);
        if (listener) { delete this.events_[event]; }
        return this;
    }

}
