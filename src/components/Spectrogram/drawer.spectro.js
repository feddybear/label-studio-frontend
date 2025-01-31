import { util } from "wavesurfer.js";

export default class Drawer extends util.Observer {
  constructor(container, params) {
    super();

    this.container = container;
    /**
     * @type {WavesurferParams}
     */
    this.params = params;
    /**
     * The width of the renderer
     * @type {number}
     */
    this.width = 0;
    /**
     * The height of the renderer
     * @type {number}
     */
    this.height = params.height * this.params.pixelRatio;

    this.lastPos = 0;
    /**
     * The `<wave>` element which is added to the container
     * @type {HTMLElement}
     */
    this.wrapper = null;
    this.initDrawer(params);
    this.createWrapper();
    this.createElements();
  }

  init() {}

  getScrollX() {
    let x = 0;
    if (this.wrapper) {
      const pixelRatio = this.params.pixelRatio;
      x = Math.round(this.wrapper.scrollLeft * pixelRatio);

      // In cases of elastic scroll (safari with mouse wheel) you can
      // scroll beyond the limits of the container
      // Calculate and floor the scrollable extent to make sure an out
      // of bounds value is not returned
      // Ticket #1312
      if (this.params.scrollParent) {
        const maxScroll = ~~(this.wrapper.scrollWidth * pixelRatio - this.getWidth());
        x = Math.min(maxScroll, Math.max(0, x));
      }
    }
    return x;
  }

  createWrapper() {
    this.wrapper = this.container.appendChild(document.createElement("wave"));

    this.style(this.wrapper, {
      display: "block",
      position: "relative",
      userSelect: "none",
      webkitUserSelect: "none",
      height: this.params.height + "px",
    });

    if (this.params.fillParent || this.params.scrollParent) {
      this.style(this.wrapper, {
        width: "100%",
        overflowX: this.params.hideScrollbar ? "hidden" : "auto",
        overflowY: "hidden",
      });
    }

    this.setupWrapperEvents();
  }

  handleEvent(e) {
    e.preventDefault();

    var bbox = this.wrapper.getBoundingClientRect();

    var nominalWidth = this.width;
    var parentWidth = this.getWidth();

    var progress;

    if (!this.params.fillParent && nominalWidth < parentWidth) {
      progress = ((e.clientX - bbox.left) * this.params.pixelRatio) / nominalWidth || 0;

      if (progress > 1) {
        progress = 1;
      }
    } else {
      progress = (e.clientX - bbox.left + this.wrapper.scrollLeft) / this.wrapper.scrollWidth || 0;
    }

    return progress;
  }

  setupWrapperEvents() {
    var my = this;

    this.wrapper.addEventListener("click", function(e) {
      var scrollbarHeight = my.wrapper.offsetHeight - my.wrapper.clientHeight;
      if (scrollbarHeight !== 0) {
        // scrollbar is visible.  Check if click was on it
        var bbox = my.wrapper.getBoundingClientRect();
        if (e.clientY >= bbox.bottom - scrollbarHeight) {
          // ignore mousedown as it was on the scrollbar
          return;
        }
      }

      if (my.params.interact) {
        my.fireEvent("click", e, my.handleEvent(e));
      }
    });

    this.wrapper.addEventListener("scroll", function(e) {
      my.fireEvent("scroll", e);
    });
  }

  style(el, styles) {
    Object.keys(styles).forEach(function(prop) {
      if (el.style[prop] !== styles[prop]) {
        el.style[prop] = styles[prop];
      }
    });
    return el;
  }

  resetScroll() {
    if (this.wrapper !== null) {
      this.wrapper.scrollLeft = 0;
    }
  }

  recenter(percent) {
    var position = this.wrapper.scrollWidth * percent;
    this.recenterOnPosition(position, true);
  }

  recenterOnPosition(position, immediate) {
    var scrollLeft = this.wrapper.scrollLeft;
    var half = ~~(this.wrapper.clientWidth / 2);
    var target = position - half;
    var offset = target - scrollLeft;
    var maxScroll = this.wrapper.scrollWidth - this.wrapper.clientWidth;

    if (maxScroll === 0) {
      // no need to continue if scrollbar is not there
      return;
    }

    // if the cursor is currently visible...
    if (!immediate && -half <= offset && offset < half) {
      // we'll limit the "re-center" rate.
      var rate = 5;
      offset = Math.max(-rate, Math.min(rate, offset));
      target = scrollLeft + offset;
    }

    // limit target to valid range (0 to maxScroll)
    target = Math.max(0, Math.min(maxScroll, target));
    // no use attempting to scroll if we're not moving
    if (target !== scrollLeft) {
      this.wrapper.scrollLeft = target;
    }
  }

  getWidth() {
    return Math.round(this.container.clientWidth * this.params.pixelRatio);
  }

  setWidth(width) {
    if (width === this.width) {
      return;
    }

    this.width = width;

    if (this.params.fillParent || this.params.scrollParent) {
      this.style(this.wrapper, {
        width: "",
      });
    } else {
      this.style(this.wrapper, {
        width: ~~(this.width / this.params.pixelRatio) + "px",
      });
    }

    this.updateSize();
  }

  setHeight(height) {
    if (height === this.height) {
      return;
    }
    this.height = height;
    this.style(this.wrapper, {
      height: ~~(this.height / this.params.pixelRatio) + "px",
    });
    this.updateSize();
  }

  progress(progress) {
    var minPxDelta = 1 / this.params.pixelRatio;
    var pos = Math.round(progress * this.width) * minPxDelta;

    if (pos < this.lastPos || pos - this.lastPos >= minPxDelta) {
      this.lastPos = pos;

      if (this.params.scrollParent && this.params.autoCenter) {
        var newPos = ~~(this.wrapper.scrollWidth * progress);
        this.recenterOnPosition(newPos);
      }

      this.updateProgress(progress);
    }
  }

  destroy() {
    this.unAll();
    if (this.wrapper) {
      this.container.removeChild(this.wrapper);
      this.wrapper = null;
    }
  }

  /* Renderer-specific methods */
  initDrawer() {}

  createElements() {}

  updateSize() {}

  drawWave(peaks, max) {}

  clearWave() {}

  updateProgress(position) {}
}
