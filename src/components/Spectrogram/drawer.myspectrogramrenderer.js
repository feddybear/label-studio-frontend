import MultiCanvas from "wavesurfer.js/src/drawer.multicanvas.js";

// import WaveSurfer from "./wavesurfer.extended.js";
// import "wavesurfer.js/dist/plugin/wavesurfer.spectrogram.min.js";

export default class MySpectrogramRenderer extends MultiCanvas {
  constructor(container, params) {
    // call the constructor of MultiCanvas:
    super(container, params);
    // ... custom instantiation stuff goes here
    // (you can overwrite properties etc.)
    this.colorMap = [];

    for (let i = 0; i < 256; i++) {
      var val = (255 - i) / 256;
      this.colorMap.push([val, val, val, 1]);
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
          for (let k = 0; k < oldMatrix[0].length; k++) {
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

  // drawSpectrogram(buffer) {
  //   var pixelRatio = this.params.pixelRatio;
  //   var length = buffer.duration;
  //   var fftSamples = this.params.fftSamples || 512;
  //   var height = (fftSamples / 2) * pixelRatio;
  //   var frequenciesData = this.getFrequencies(buffer);

  //   var pixels = this.resample(frequenciesData);

  //   var heightFactor = pixelRatio;

  //   for (var i = 0; i < pixels.length; i++) {
  //     for (var j = 0; j < pixels[i].length; j++) {
  //       // this.waveCc.fillStyle = this.getFrequencyRGB(pixels[i][j]);
  //       // this.waveCc.fillRect(i, height - j * heightFactor, 1, heightFactor);
  //       this.fillRect(i, height - j * heightFactor, 1, heightFactor);
  //     }
  //   }
  // }

  // drawSpectrogram(frequenciesData, my) {
  //   var spectrCc = my.spectrCc;
  //   var height = my.height;
  //   var width = my.width;
  //   var pixels = my.resample(frequenciesData);
  //   var heightFactor = my.buffer ? 2 / my.buffer.numberOfChannels : 1;
  //   var imageData = spectrCc.createImageData(width, height);
  //   var i;
  //   var j;
  //   var k;

  //   for (i = 0; i < pixels.length; i++) {
  //     for (j = 0; j < pixels[i].length; j++) {
  //       var colorMap = my.colorMap[pixels[i][j]];
  //       /* eslint-disable max-depth */

  //       for (k = 0; k < heightFactor; k++) {
  //         var y = height - j * heightFactor;

  //         if (heightFactor === 2 && k === 1) {
  //           y--;
  //         }

  //         var redIndex = y * (width * 4) + i * 4;
  //         imageData.data[redIndex] = colorMap[0] * 255;
  //         imageData.data[redIndex + 1] = colorMap[1] * 255;
  //         imageData.data[redIndex + 2] = colorMap[2] * 255;
  //         imageData.data[redIndex + 3] = colorMap[3] * 255;
  //       }
  //       /* eslint-enable max-depth */

  //     }
  //   }

  //   spectrCc.putImageData(imageData, 0, 0);
  // }

  drawSpectrogram(buffer, start, end) {
    var frequenciesData = this.getFrequencies(buffer);
    var spectrCc = this.spectrCc;
  }

  //   drawSpectrogram(buffer, start, end) {
  //     return this.prepareSpecDraw(
  //         buffer,
  //         start,
  //         end,
  //         ({ absmax, hasMinVals, height, offsetY, halfH, peaks, channelIndex }) => {
  //             if (!hasMinVals) {
  //                 const reflectedPeaks = [];
  //                 const len = peaks.length;
  //                 let i = 0;
  //                 for (i; i < len; i++) {
  //                     reflectedPeaks[2 * i] = peaks[i];
  //                     reflectedPeaks[2 * i + 1] = -peaks[i];
  //                 }
  //                 peaks = reflectedPeaks;
  //             }

  //             // if drawWave was called within ws.empty we don't pass a start and
  //             // end and simply want a flat line
  //             if (start !== undefined) {
  //                 this.drawLine(peaks, absmax, halfH, offsetY, start, end, channelIndex);
  //             }

  //             // always draw a median line
  //             this.fillRect(
  //                 0,
  //                 halfH + offsetY - this.halfPixel,
  //                 this.width,
  //                 this.halfPixel,
  //                 this.barRadius,
  //                 channelIndex
  //             );
  //         }
  //     );
  // }

  // prepareSpecDraw(buffer, start, end, fn, drawIndex, normalizedMax) {
  //   return util.frame(() => {
  //       // Split channels and call this function with the channelIndex set
  //       if (peaks[0] instanceof Array) {
  //           const channels = peaks;

  //           if (this.params.splitChannels) {
  //               const filteredChannels = channels.filter((c, i) => !this.hideChannel(i));
  //               if (!this.params.splitChannelsOptions.overlay) {
  //                   this.setHeight(
  //                       Math.max(filteredChannels.length, 1) *
  //                           this.params.height *
  //                           this.params.pixelRatio
  //                   );
  //               }

  //               let overallAbsMax;
  //               if (this.params.splitChannelsOptions && this.params.splitChannelsOptions.relativeNormalization) {
  //                   // calculate maximum peak across channels to use for normalization
  //                   overallAbsMax = util.max(channels.map((channelPeaks => util.absMax(channelPeaks))));
  //               }

  //               return channels.forEach((channelPeaks, i) =>
  //                   this.prepareDraw(channelPeaks, i, start, end, fn, filteredChannels.indexOf(channelPeaks), overallAbsMax)
  //               );
  //           }
  //           peaks = channels[0];
  //       }

  //       // Return and do not draw channel peaks if hidden.
  //       if (this.hideChannel(channelIndex)) {
  //           return;
  //       }

  //       // calculate maximum modulation value, either from the barHeight
  //       // parameter or if normalize=true from the largest value in the peak
  //       // set
  //       let absmax = 1 / this.params.barHeight;
  //       if (this.params.normalize) {
  //           absmax = normalizedMax === undefined ? util.absMax(peaks) : normalizedMax;
  //       }

  //       // Bar wave draws the bottom only as a reflection of the top,
  //       // so we don't need negative values
  //       const hasMinVals = [].some.call(peaks, val => val < 0);
  //       const height = this.params.height * this.params.pixelRatio;
  //       const halfH = height / 2;

  //       let offsetY = height * drawIndex || 0;

  //       // Override offsetY if overlay is true
  //       if (this.params.splitChannelsOptions && this.params.splitChannelsOptions.overlay) {
  //           offsetY = 0;
  //       }

  //       return fn({
  //           absmax: absmax,
  //           hasMinVals: hasMinVals,
  //           height: height,
  //           offsetY: offsetY,
  //           halfH: halfH,
  //           peaks: peaks,
  //           channelIndex: channelIndex
  //       });
  //   })();
  // }

  drawPeaks(peaks, length, buffer, start, end) {
    // this.resetScroll();
    if (!this.setWidth(length)) {
      this.clearWave();
    }
    var visualization = "spectrogram";

    if (visualization === "spectrogram" && buffer) {
      console.log("SUCCESS!");
      this.drawSpectrogram(buffer, start, end);
    } else {
      console.log("SWITCH TO WAVEFORM.");
      this.params.barWidth ? this.drawBars(peaks, 0, start, end) : this.drawWave(peaks, 0, start, end);
    }
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
    this.windowValues[i] = 0.54 - 0.46 * Math.cos((Math.PI * 2 * i) / (bufferSize - 1));
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
