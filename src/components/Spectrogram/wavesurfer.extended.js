import WaveSurfer from "wavesurfer.js";

export default class WaveSurferExtended extends WaveSurfer {
  constructor(container, params) {
    // call the constructor of MultiCanvas:
    super(container, params);
    // ... custom instantiation stuff goes here
    // (you can overwrite properties etc.)
  }

  drawBuffer() {
    const nominalWidth = Math.round(this.getDuration() * this.params.minPxPerSec * this.params.pixelRatio);
    const parentWidth = this.drawer.getWidth();
    let width = nominalWidth;
    // always start at 0 after zooming for scrolling : issue redraw left part
    let start = 0;
    let end = Math.max(start + parentWidth, width);
    // Fill container
    if (this.params.fillParent && (!this.params.scrollParent || nominalWidth < parentWidth)) {
      width = parentWidth;
      start = 0;
      end = width;
    }

    let peaks;
    if (this.params.partialRender) {
      const newRanges = this.peakCache.addRangeToPeakCache(width, start, end);
      let i;
      for (i = 0; i < newRanges.length; i++) {
        peaks = this.backend.getPeaks(width, newRanges[i][0], newRanges[i][1]);
        this.drawer.drawPeaks(peaks, width, newRanges[i][0], newRanges[i][1]);
      }
    } else {
      peaks = this.backend.getPeaks(width, start, end);
      this.drawer.drawPeaks(peaks, width, this.backend.buffer);
    }
    this.fireEvent("redraw", peaks, width);
  }
}
