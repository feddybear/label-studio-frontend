import Drawer from "./drawer.spectro.js";
// import WaveSurfer from 'wavesurfer.js';
// import * as util from './util';

export default class MySpectrogramRenderer extends Drawer {
  constructor(container, params) {
    // call the constructor of MultiCanvas:
    super(container, params);
    // ... custom instantiation stuff goes here
    // (you can overwrite properties etc.)
    // this.params.colorMap = [];
  }

  createElements() {
    var waveCanvas = this.wrapper.appendChild(
      this.style(document.createElement("canvas"), {
        position: "absolute",
        zIndex: 1,
        left: 0,
        top: 0,
        bottom: 0,
      }),
    );
    this.waveCc = waveCanvas.getContext("2d");

    this.progressWave = this.wrapper.appendChild(
      this.style(document.createElement("wave"), {
        position: "absolute",
        zIndex: 2,
        left: 0,
        top: 0,
        bottom: 0,
        overflow: "hidden",
        width: "0",
        display: "none",
        boxSizing: "border-box",
        borderRightStyle: "solid",
        borderRightWidth: this.params.cursorWidth + "px",
        borderRightColor: this.params.cursorColor,
      }),
    );

    if (this.params.waveColor != this.params.progressColor) {
      var progressCanvas = this.progressWave.appendChild(document.createElement("canvas"));
      this.progressCc = progressCanvas.getContext("2d");
    }
  }

  // Takes in integer 0-255 and maps it to rgb string
  getFrequencyRGB(colorValue) {
    if (this.params.colorMap) {
      // If the wavesurfer has a specified colour map
      var rgb = this.params.colorMap[colorValue];
      return "rgb(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ")";
    } else {
      // If not just use gray scale
      let iColorValue = 255 - colorValue;
      return "rgb(" + iColorValue + "," + iColorValue + "," + iColorValue + ")";
    }
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

    var fft = new FFT(fftSamples, sampleRate);

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

  drawPeaks(peaks, length, buffer) {
    this.resetScroll();
    this.setWidth(length);
    // var visualization = this.params.visualization;
    // var visualization = "spectrogram";
    if (buffer) {
      this.drawSpectrogram(buffer);
    } else {
      // this.params.barWidth ?
      //     this.drawBars(peaks) :
      //     this.drawWave(peaks);
    }
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
        this.waveCc.fillStyle = this.getFrequencyRGB(pixels[i][j]);
        this.waveCc.fillRect(i, height - j * heightFactor, 1, heightFactor);
      }
    }
  }

  updateSize() {
    var width = Math.round(this.width / this.params.pixelRatio);

    this.waveCc.canvas.width = this.width;
    this.waveCc.canvas.height = this.height;
    this.style(this.waveCc.canvas, { width: width + "px" });

    this.style(this.progressWave, { display: "block" });

    if (this.progressCc) {
      this.progressCc.canvas.width = this.width;
      this.progressCc.canvas.height = this.height;
      this.style(this.progressCc.canvas, { width: width + "px" });
    }

    this.clearWave();
  }

  clearWave() {
    this.waveCc.clearRect(0, 0, this.width, this.height);
    if (this.progressCc) {
      this.progressCc.clearRect(0, 0, this.width, this.height);
    }
  }

  drawBars(peaks, channelIndex) {
    // Split channels
    if (peaks[0] instanceof Array) {
      var channels = peaks;
      if (this.params.splitChannels) {
        this.setHeight(channels.length * this.params.height * this.params.pixelRatio);
        channels.forEach(this.drawBars, this);
        return;
      } else if (this.params.channel > -1) {
        // Channel specified
        if (this.params.channel >= channels.length) {
          throw new Error("Channel doesn't exist");
        }
        peaks = channels[this.params.channel];
      } else {
        peaks = channels[0];
      }
    }

    // Bar wave draws the bottom only as a reflection of the top,
    // so we don't need negative values
    var hasMinVals = [].some.call(peaks, function(val) {
      return val < 0;
    });
    if (hasMinVals) {
      peaks = [].filter.call(peaks, function(_, index) {
        return index % 2 == 0;
      });
    }

    // A half-pixel offset makes lines crisp
    var $ = 0.5 / this.params.pixelRatio;
    var width = this.width;
    var height = this.params.height * this.params.pixelRatio;
    var offsetY = height * channelIndex || 0;
    var halfH = height / 2;
    var length = peaks.length;
    var bar = this.params.barWidth * this.params.pixelRatio;
    var gap = Math.max(this.params.pixelRatio, ~~(bar / 2));
    var step = bar + gap;

    var absmax = 1;
    if (this.params.normalize) {
      absmax = Math.max.apply(Math, peaks);
    }

    var scale = length / width;

    this.waveCc.fillStyle = this.params.waveColor;
    if (this.progressCc) {
      this.progressCc.fillStyle = this.params.progressColor;
    }

    [this.waveCc, this.progressCc].forEach(function(cc) {
      if (!cc) {
        return;
      }

      for (var i = 0; i < width; i += step) {
        var h = Math.round((peaks[Math.floor(i * scale)] / absmax) * halfH);
        cc.fillRect(i + $, halfH - h + offsetY, bar + $, h * 2);
      }
    }, this);
  }

  drawWave(peaks, channelIndex) {
    // Split channels
    if (peaks[0] instanceof Array) {
      var channels = peaks;
      if (this.params.splitChannels) {
        this.setHeight(channels.length * this.params.height * this.params.pixelRatio);
        channels.forEach(this.drawWave, this);
        return;
      } else if (this.params.channel > -1) {
        // Channel specified
        if (this.params.channel >= channels.length) {
          throw new Error("Channel doesn't exist");
        }
        peaks = channels[this.params.channel];
      } else {
        peaks = channels[0];
      }
    }

    // Support arrays without negative peaks
    var hasMinValues = [].some.call(peaks, function(val) {
      return val < 0;
    });
    if (!hasMinValues) {
      var reflectedPeaks = [];
      for (var i = 0, len = peaks.length; i < len; i++) {
        reflectedPeaks[2 * i] = peaks[i];
        reflectedPeaks[2 * i + 1] = -peaks[i];
      }
      peaks = reflectedPeaks;
    }

    // A half-pixel offset makes lines crisp
    var $ = 0.5 / this.params.pixelRatio;
    var height = this.params.height * this.params.pixelRatio;
    var offsetY = height * channelIndex || 0;
    var halfH = height / 2;
    var length = ~~(peaks.length / 2);

    var scale = 1;
    if (this.params.fillParent && this.width != length) {
      scale = this.width / length;
    }

    var absmax = 1;
    if (this.params.normalize) {
      var max = Math.max.apply(Math, peaks);
      var min = Math.min.apply(Math, peaks);
      absmax = -min > max ? -min : max;
    }

    this.waveCc.fillStyle = this.params.waveColor;
    if (this.progressCc) {
      this.progressCc.fillStyle = this.params.progressColor;
    }

    [this.waveCc, this.progressCc].forEach(function(cc) {
      if (!cc) {
        return;
      }

      cc.beginPath();
      cc.moveTo($, halfH + offsetY);

      for (var i = 0; i < length; i++) {
        var h = Math.round((peaks[2 * i] / absmax) * halfH);
        cc.lineTo(i * scale + $, halfH - h + offsetY);
      }

      // Draw the bottom edge going backwards, to make a single
      // closed hull to fill.
      for (var i = length - 1; i >= 0; i--) {
        var h = Math.round((peaks[2 * i + 1] / absmax) * halfH);
        cc.lineTo(i * scale + $, halfH - h + offsetY);
      }

      cc.closePath();
      cc.fill();

      // Always draw a median line
      cc.fillRect(0, halfH + offsetY - $, this.width, $);
    }, this);
  }

  updateProgress(progress) {
    var pos = Math.round(this.width * progress) / this.params.pixelRatio;
    this.style(this.progressWave, { width: pos + "px" });
  }
}

function FFT(bufferSize, sampleRate) {
  this.bufferSize = bufferSize;
  this.sampleRate = sampleRate;
  this.bandwidth = (2 / bufferSize) * (sampleRate / 2);
  this.sinTable = new Float32Array(bufferSize);
  this.cosTable = new Float32Array(bufferSize);
  this.windowValues = new Float32Array(bufferSize);
  this.reverseTable = new Uint32Array(bufferSize);
  this.peakBand = 0;
  this.peak = 0;
  var i;

  for (i = 0; i < bufferSize; i++) {
    this.windowValues[i] = 0.5 * (1 - Math.cos((Math.PI * 2 * i) / (bufferSize - 1)));
  }

  var limit = 1;
  var bit = bufferSize >> 1;
  var i;

  while (limit < bufferSize) {
    for (i = 0; i < limit; i++) {
      this.reverseTable[i + limit] = this.reverseTable[i] + bit;
    }

    limit = limit << 1;
    bit = bit >> 1;
  }

  for (i = 0; i < bufferSize; i++) {
    this.sinTable[i] = Math.sin(-Math.PI / i);
    this.cosTable[i] = Math.cos(-Math.PI / i);
  }

  this.calculateSpectrum = function(buffer) {
    // Locally scope variables for speed up
    var bufferSize = this.bufferSize,
      cosTable = this.cosTable,
      sinTable = this.sinTable,
      reverseTable = this.reverseTable,
      real = new Float32Array(bufferSize),
      imag = new Float32Array(bufferSize),
      bSi = 2 / this.bufferSize,
      sqrt = Math.sqrt,
      rval,
      ival,
      mag,
      spectrum = new Float32Array(bufferSize / 2);
    var k = Math.floor(Math.log(bufferSize) / Math.LN2);

    if (Math.pow(2, k) !== bufferSize) {
      throw "Invalid buffer size, must be a power of 2.";
    }

    if (bufferSize !== buffer.length) {
      throw "Supplied buffer is not the same size as defined FFT. FFT Size: " +
        bufferSize +
        " Buffer Size: " +
        buffer.length;
    }

    var halfSize = 1,
      phaseShiftStepReal,
      phaseShiftStepImag,
      currentPhaseShiftReal,
      currentPhaseShiftImag,
      off,
      tr,
      ti,
      tmpReal;

    for (var i = 0; i < bufferSize; i++) {
      real[i] = buffer[reverseTable[i]] * this.windowValues[reverseTable[i]];
      imag[i] = 0;
    }

    while (halfSize < bufferSize) {
      phaseShiftStepReal = cosTable[halfSize];
      phaseShiftStepImag = sinTable[halfSize];
      currentPhaseShiftReal = 1;
      currentPhaseShiftImag = 0;

      for (var fftStep = 0; fftStep < halfSize; fftStep++) {
        var i = fftStep;

        while (i < bufferSize) {
          off = i + halfSize;
          tr = currentPhaseShiftReal * real[off] - currentPhaseShiftImag * imag[off];
          ti = currentPhaseShiftReal * imag[off] + currentPhaseShiftImag * real[off];
          real[off] = real[i] - tr;
          imag[off] = imag[i] - ti;
          real[i] += tr;
          imag[i] += ti;
          i += halfSize << 1;
        }

        tmpReal = currentPhaseShiftReal;
        currentPhaseShiftReal = tmpReal * phaseShiftStepReal - currentPhaseShiftImag * phaseShiftStepImag;
        currentPhaseShiftImag = tmpReal * phaseShiftStepImag + currentPhaseShiftImag * phaseShiftStepReal;
      }

      halfSize = halfSize << 1;
    }

    for (var i = 0, N = bufferSize / 2; i < N; i++) {
      rval = real[i];
      ival = imag[i];
      mag = bSi * sqrt(rval * rval + ival * ival);

      if (mag > this.peak) {
        this.peakBand = i;
        this.peak = mag;
      }

      spectrum[i] = mag;
    }

    return spectrum;
  };
}
