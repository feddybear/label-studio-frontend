import MultiCanvas from "wavesurfer.js/src/drawer.multicanvas.js";
import WaveSurferExtended from "./wavesurfer.extended.js";
import "wavesurfer.js/dist/plugin/wavesurfer.spectrogram.min.js";

export default class MySpectrogramRenderer extends MultiCanvas {
  constructor(container, params) {
    // call the constructor of MultiCanvas:
    super(container, params);
    // ... custom instantiation stuff goes here
    // (you can overwrite properties etc.)
  }

  getFrequencies(buffer) {
    var fftSamples = this.params.fftSamples || 512;
    var channelOne = Array.prototype.slice.call(buffer.getChannelData(0));
    var bufferLength = buffer.length;
    var sampleRate = buffer.sampleRate;
    var frequencies = [];

    if (!buffer) {
      this.fireEvent("error", "Web Audio buffer is not available");
      return;
    }

    var noverlap = this.params.noverlap;
    if (!noverlap) {
      var uniqueSamplesPerPx = buffer.length / this.width;
      noverlap = Math.max(0, Math.round(fftSamples - uniqueSamplesPerPx));
    }

    var fft = new WaveSurferExtended.FFT(fftSamples, sampleRate);

    var maxSlicesCount = Math.floor(bufferLength / (fftSamples - noverlap));

    var currentOffset = 0;

    while (currentOffset + fftSamples < channelOne.length) {
      var segment = channelOne.slice(currentOffset, currentOffset + fftSamples);
      var spectrum = fft.calculateSpectrum(segment);
      var length = fftSamples / 2 + 1;
      var array = new Uint8Array(length);
      for (var j = 0; j < length; j++) {
        array[j] = Math.max(-255, Math.log(1 + 1e4 * spectrum[j]) * 35);
      }
      frequencies.push(array);
      currentOffset += fftSamples - noverlap;
    }

    return frequencies;
  }

  resample(oldMatrix) {
    var columnsNumber = this.width;
    var newMatrix = [];

    var oldPiece = 1 / oldMatrix.length;
    var newPiece = 1 / columnsNumber;

    for (var i = 0; i < columnsNumber; i++) {
      var column = new Array(oldMatrix[0].length);

      for (var j = 0; j < oldMatrix.length; j++) {
        var oldStart = j * oldPiece;
        var oldEnd = oldStart + oldPiece;
        var newStart = i * newPiece;
        var newEnd = newStart + newPiece;

        var overlap =
          oldEnd <= newStart || newEnd <= oldStart
            ? 0
            : Math.min(Math.max(oldEnd, newStart), Math.max(newEnd, oldStart)) -
              Math.max(Math.min(oldEnd, newStart), Math.min(newEnd, oldStart));

        if (overlap > 0) {
          for (var k = 0; k < oldMatrix[0].length; k++) {
            if (column[k] == null) {
              column[k] = 0;
            }
            column[k] += (overlap / newPiece) * oldMatrix[j][k];
          }
        }
      }

      var intColumn = new Uint8Array(oldMatrix[0].length);

      for (var k = 0; k < oldMatrix[0].length; k++) {
        intColumn[k] = column[k];
      }

      newMatrix.push(intColumn);
    }

    return newMatrix;
  }

  drawSpectrogram(buffer) {
    var pixelRatio = this.params.pixelRatio;
    var length = buffer.duration;
    var height = (this.params.fftSamples / 2) * pixelRatio;
    var frequenciesData = this.getFrequencies(buffer);

    var pixels = this.resample(frequenciesData);

    var heightFactor = pixelRatio;

    for (var i = 0; i < pixels.length; i++) {
      for (var j = 0; j < pixels[i].length; j++) {
        // this.waveCc.fillStyle = this.getFrequencyRGB(pixels[i][j]);
        this.waveCc.fillRect(i, height - j * heightFactor, 1, heightFactor);
      }
    }
  }

  drawPeaks(peaks, length, buffer) {
    this.resetScroll();
    this.setWidth(length);
    var visualization = "spectrogram";

    if (visualization === "spectrogram" && buffer) {
      console.log("SUCCESS!");
      this.drawSpectrogram(buffer);
    } else {
      console.log("CAN'T ACCESS ANYTHING TO DRAW?");
      this.params.barWidth ? this.drawBars(peaks) : this.drawWave(peaks);
    }
  }
}
