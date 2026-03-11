/**
 * @fileoverview Metadata Faust generado para el DSP precompilado.
 */
const metadata = {
  "name": "prism-premium-stereo",
  "filename": "prism-premium-stereo",
  "version": "2.84.3",
  "compile_options": "-lang wasm-i -fpga-mem-th 4 -ct 1 -es 1 -mcd 16 -mdd 1024 -mdy 33 -single -ftz 2",
  "library_list": [
    "/usr/share/faust/stdfaust.lib",
    "/usr/share/faust/filters.lib",
    "/usr/share/faust/maths.lib",
    "/usr/share/faust/platform.lib",
    "/usr/share/faust/compressors.lib",
    "/usr/share/faust/basics.lib",
    "/usr/share/faust/signals.lib",
    "/usr/share/faust/routes.lib",
    "/usr/share/faust/analyzers.lib"
  ],
  "include_pathnames": [
    "/faust/user/inc0",
    "/share/faust",
    "/usr/local/share/faust",
    "/usr/share/faust",
    "."
  ],
  "size": 3162956,
  "code": "8Aa9AVQ8Hw==",
  "inputs": 2,
  "outputs": 2,
  "meta": [
    {
      "analyzers.lib/name": "Faust Analyzer Library"
    },
    {
      "analyzers.lib/version": "1.3.0"
    },
    {
      "basics.lib/bypass1:author": "Julius Smith"
    },
    {
      "basics.lib/name": "Faust Basic Element Library"
    },
    {
      "basics.lib/peakholder:author": "Dario Sanfilippo"
    },
    {
      "basics.lib/peakholder:copyright": "Copyright (C) 2022 Dario Sanfilippo <sanfilippo.dario@gmail.com>"
    },
    {
      "basics.lib/peakholder:license": "MIT-style STK-4.3 license"
    },
    {
      "basics.lib/version": "1.22.0"
    },
    {
      "compile_options": "-lang wasm-i -fpga-mem-th 4 -ct 1 -es 1 -mcd 16 -mdd 1024 -mdy 33 -single -ftz 2"
    },
    {
      "compressors.lib/FFcompressor_N_chan:author": "Bart Brouns"
    },
    {
      "compressors.lib/FFcompressor_N_chan:license": "GPLv3"
    },
    {
      "compressors.lib/RMS_FBcompressor_peak_limiter_N_chan:author": "Bart Brouns"
    },
    {
      "compressors.lib/RMS_FBcompressor_peak_limiter_N_chan:license": "GPLv3"
    },
    {
      "compressors.lib/RMS_compression_gain_N_chan_db:author": "Bart Brouns"
    },
    {
      "compressors.lib/RMS_compression_gain_N_chan_db:license": "GPLv3"
    },
    {
      "compressors.lib/RMS_compression_gain_mono_db:author": "Bart Brouns"
    },
    {
      "compressors.lib/RMS_compression_gain_mono_db:license": "GPLv3"
    },
    {
      "compressors.lib/limiter_lad_N:author": "Dario Sanfilippo"
    },
    {
      "compressors.lib/limiter_lad_N:copyright": "Copyright (C) 2020 Dario Sanfilippo       <sanfilippo.dario@gmail.com>"
    },
    {
      "compressors.lib/limiter_lad_N:license": "GPLv3 license"
    },
    {
      "compressors.lib/limiter_lad_stereo:author": "Dario Sanfilippo"
    },
    {
      "compressors.lib/limiter_lad_stereo:copyright": "Copyright (C) 2020 Dario Sanfilippo       <sanfilippo.dario@gmail.com>"
    },
    {
      "compressors.lib/limiter_lad_stereo:license": "GPLv3 license"
    },
    {
      "compressors.lib/name": "Faust Compressor Effect Library"
    },
    {
      "compressors.lib/peak_compression_gain_N_chan_db:author": "Bart Brouns"
    },
    {
      "compressors.lib/peak_compression_gain_N_chan_db:license": "GPLv3"
    },
    {
      "compressors.lib/peak_compression_gain_mono_db:author": "Bart Brouns"
    },
    {
      "compressors.lib/peak_compression_gain_mono_db:license": "GPLv3"
    },
    {
      "compressors.lib/version": "1.6.0"
    },
    {
      "filename": "prism-premium-stereo"
    },
    {
      "filters.lib/crossover2LR4:author": "Dario Sanfilippo"
    },
    {
      "filters.lib/crossover2LR4:copyright": "Copyright (C) 2022 Dario Sanfilippo <sanfilippo.dario@gmail.com>"
    },
    {
      "filters.lib/crossover2LR4:license": "MIT-style STK-4.3 license"
    },
    {
      "filters.lib/crossover3LR4:author": "Dario Sanfilippo"
    },
    {
      "filters.lib/crossover3LR4:copyright": "Copyright (C) 2022 Dario Sanfilippo <sanfilippo.dario@gmail.com>"
    },
    {
      "filters.lib/crossover3LR4:license": "MIT-style STK-4.3 license"
    },
    {
      "filters.lib/fir:author": "Julius O. Smith III"
    },
    {
      "filters.lib/fir:copyright": "Copyright (C) 2003-2019 by Julius O. Smith III <jos@ccrma.stanford.edu>"
    },
    {
      "filters.lib/fir:license": "MIT-style STK-4.3 license"
    },
    {
      "filters.lib/highpass:author": "Julius O. Smith III"
    },
    {
      "filters.lib/highpass:copyright": "Copyright (C) 2003-2019 by Julius O. Smith III <jos@ccrma.stanford.edu>"
    },
    {
      "filters.lib/highpassLR4:author": "Dario Sanfilippo"
    },
    {
      "filters.lib/highpassLR4:copyright": "Copyright (C) 2022 Dario Sanfilippo <sanfilippo.dario@gmail.com>"
    },
    {
      "filters.lib/highpassLR4:license": "MIT-style STK-4.3 license"
    },
    {
      "filters.lib/iir:author": "Julius O. Smith III"
    },
    {
      "filters.lib/iir:copyright": "Copyright (C) 2003-2019 by Julius O. Smith III <jos@ccrma.stanford.edu>"
    },
    {
      "filters.lib/iir:license": "MIT-style STK-4.3 license"
    },
    {
      "filters.lib/integrator:author": "Julius O. Smith III"
    },
    {
      "filters.lib/integrator:copyright": "Copyright (C) 2003-2019 by Julius O. Smith III <jos@ccrma.stanford.edu>"
    },
    {
      "filters.lib/integrator:license": "MIT-style STK-4.3 license"
    },
    {
      "filters.lib/lowpass0_highpass1": "Copyright (C) 2003-2019 by Julius O. Smith III <jos@ccrma.stanford.edu>"
    },
    {
      "filters.lib/lowpass0_highpass1:author": "Julius O. Smith III"
    },
    {
      "filters.lib/lowpassLR4:author": "Dario Sanfilippo"
    },
    {
      "filters.lib/lowpassLR4:copyright": "Copyright (C) 2022 Dario Sanfilippo <sanfilippo.dario@gmail.com>"
    },
    {
      "filters.lib/lowpassLR4:license": "MIT-style STK-4.3 license"
    },
    {
      "filters.lib/name": "Faust Filters Library"
    },
    {
      "filters.lib/svf:author": "Oleg Nesterov"
    },
    {
      "filters.lib/svf:copyright": "Copyright (C) 2020 Oleg Nesterov <oleg@redhat.com>"
    },
    {
      "filters.lib/svf:license": "MIT-style STK-4.3 license"
    },
    {
      "filters.lib/tf2:author": "Julius O. Smith III"
    },
    {
      "filters.lib/tf2:copyright": "Copyright (C) 2003-2019 by Julius O. Smith III <jos@ccrma.stanford.edu>"
    },
    {
      "filters.lib/tf2:license": "MIT-style STK-4.3 license"
    },
    {
      "filters.lib/tf2s:author": "Julius O. Smith III"
    },
    {
      "filters.lib/tf2s:copyright": "Copyright (C) 2003-2019 by Julius O. Smith III <jos@ccrma.stanford.edu>"
    },
    {
      "filters.lib/tf2s:license": "MIT-style STK-4.3 license"
    },
    {
      "filters.lib/version": "1.7.1"
    },
    {
      "maths.lib/author": "GRAME"
    },
    {
      "maths.lib/copyright": "GRAME"
    },
    {
      "maths.lib/license": "LGPL with exception"
    },
    {
      "maths.lib/name": "Faust Math Library"
    },
    {
      "maths.lib/version": "2.9.0"
    },
    {
      "name": "prism-premium-stereo"
    },
    {
      "platform.lib/name": "Generic Platform Library"
    },
    {
      "platform.lib/version": "1.3.0"
    },
    {
      "routes.lib/name": "Faust Signal Routing Library"
    },
    {
      "routes.lib/version": "1.2.0"
    },
    {
      "signals.lib/name": "Faust Signal Routing Library"
    },
    {
      "signals.lib/onePoleSwitching:author": "Jonatan Liljedahl, revised by Dario Sanfilippo"
    },
    {
      "signals.lib/onePoleSwitching:licence": "STK-4.3"
    },
    {
      "signals.lib/version": "1.6.0"
    }
  ],
  "ui": [
    {
      "type": "vgroup",
      "label": "prism-premium-stereo",
      "items": [
        {
          "type": "hslider",
          "label": "controls/clarity_presence_tilt_db",
          "varname": "fHslider12",
          "shortname": "controls_clarity_presence_tilt_db",
          "address": "/prism-premium-stereo/controls_clarity_presence_tilt_db",
          "index": 524652,
          "meta": [
            {
              "0": ""
            },
            {
              "unit": "dB"
            }
          ],
          "init": 0,
          "min": -3,
          "max": 4,
          "step": 0.01
        },
        {
          "type": "hslider",
          "label": "controls/input_drive_db",
          "varname": "fHslider3",
          "shortname": "controls_input_drive_db",
          "address": "/prism-premium-stereo/controls_input_drive_db",
          "index": 60,
          "meta": [
            {
              "0": ""
            },
            {
              "unit": "dB"
            }
          ],
          "init": 0,
          "min": 0,
          "max": 30,
          "step": 0.01
        },
        {
          "type": "hslider",
          "label": "controls/lookahead_ms",
          "varname": "fHslider14",
          "shortname": "controls_lookahead_ms",
          "address": "/prism-premium-stereo/controls_lookahead_ms",
          "index": 1581540,
          "meta": [
            {
              "0": ""
            },
            {
              "unit": "ms"
            }
          ],
          "init": 5,
          "min": 1,
          "max": 8,
          "step": 0.1
        },
        {
          "type": "hslider",
          "label": "controls/low_band_makeup_db",
          "varname": "fHslider6",
          "shortname": "controls_low_band_makeup_db",
          "address": "/prism-premium-stereo/controls_low_band_makeup_db",
          "index": 256,
          "meta": [
            {
              "0": ""
            },
            {
              "unit": "dB"
            }
          ],
          "init": 0,
          "min": -6,
          "max": 6,
          "step": 0.01
        },
        {
          "type": "hslider",
          "label": "controls/low_band_ratio_bias",
          "varname": "fHslider7",
          "shortname": "controls_low_band_ratio_bias",
          "address": "/prism-premium-stereo/controls_low_band_ratio_bias",
          "index": 260,
          "meta": [
            {
              "0": ""
            }
          ],
          "init": 0,
          "min": -1,
          "max": 1,
          "step": 0.01
        },
        {
          "type": "hslider",
          "label": "controls/low_band_threshold_offset_db",
          "varname": "fHslider10",
          "shortname": "controls_low_band_threshold_offset_db",
          "address": "/prism-premium-stereo/controls_low_band_threshold_offset_db",
          "index": 524580,
          "meta": [
            {
              "0": ""
            },
            {
              "unit": "dB"
            }
          ],
          "init": 0,
          "min": -12,
          "max": 6,
          "step": 0.01
        },
        {
          "type": "hslider",
          "label": "controls/low_band_trim_db",
          "varname": "fHslider5",
          "shortname": "controls_low_band_trim_db",
          "address": "/prism-premium-stereo/controls_low_band_trim_db",
          "index": 252,
          "meta": [
            {
              "0": ""
            },
            {
              "unit": "dB"
            }
          ],
          "init": 0,
          "min": -6,
          "max": 6,
          "step": 0.01
        },
        {
          "type": "hslider",
          "label": "controls/mid_high_threshold_offset_db",
          "varname": "fHslider13",
          "shortname": "controls_mid_high_threshold_offset_db",
          "address": "/prism-premium-stereo/controls_mid_high_threshold_offset_db",
          "index": 1049000,
          "meta": [
            {
              "0": ""
            },
            {
              "unit": "dB"
            }
          ],
          "init": 0,
          "min": -12,
          "max": 6,
          "step": 0.01
        },
        {
          "type": "hslider",
          "label": "controls/multiband_depth",
          "varname": "fHslider8",
          "shortname": "controls_multiband_depth",
          "address": "/prism-premium-stereo/controls_multiband_depth",
          "index": 264,
          "meta": [
            {
              "0": ""
            }
          ],
          "init": 45,
          "min": 0,
          "max": 100,
          "step": 1
        },
        {
          "type": "hslider",
          "label": "controls/output_ceiling_db",
          "varname": "fHslider11",
          "shortname": "controls_output_ceiling_db",
          "address": "/prism-premium-stereo/controls_output_ceiling_db",
          "index": 524640,
          "meta": [
            {
              "0": ""
            },
            {
              "unit": "dB"
            }
          ],
          "init": -1,
          "min": -2.5,
          "max": -0.1,
          "step": 0.01
        },
        {
          "type": "hslider",
          "label": "controls/output_limiter_enabled",
          "varname": "fHslider0",
          "shortname": "controls_output_limiter_enabled",
          "address": "/prism-premium-stereo/controls_output_limiter_enabled",
          "index": 0,
          "meta": [
            {
              "0": ""
            }
          ],
          "init": 1,
          "min": 0,
          "max": 1,
          "step": 1
        },
        {
          "type": "hslider",
          "label": "controls/output_soft_clip_mix",
          "varname": "fHslider15",
          "shortname": "controls_output_soft_clip_mix",
          "address": "/prism-premium-stereo/controls_output_soft_clip_mix",
          "index": 3162920,
          "meta": [
            {
              "0": ""
            }
          ],
          "init": 0,
          "min": 0,
          "max": 40,
          "step": 0.1
        },
        {
          "type": "hslider",
          "label": "controls/protector_enabled",
          "varname": "fHslider1",
          "shortname": "controls_protector_enabled",
          "address": "/prism-premium-stereo/controls_protector_enabled",
          "index": 4,
          "meta": [
            {
              "0": ""
            }
          ],
          "init": 1,
          "min": 0,
          "max": 1,
          "step": 1
        },
        {
          "type": "hslider",
          "label": "controls/release_ms",
          "varname": "fHslider9",
          "shortname": "controls_release_ms",
          "address": "/prism-premium-stereo/controls_release_ms",
          "index": 272,
          "meta": [
            {
              "0": ""
            },
            {
              "unit": "ms"
            }
          ],
          "init": 160,
          "min": 60,
          "max": 350,
          "step": 1
        },
        {
          "type": "hslider",
          "label": "controls/tone_low_band_gain_db",
          "varname": "fHslider4",
          "shortname": "controls_tone_low_band_gain_db",
          "address": "/prism-premium-stereo/controls_tone_low_band_gain_db",
          "index": 200,
          "meta": [
            {
              "0": ""
            },
            {
              "unit": "dB"
            }
          ],
          "init": 0,
          "min": -6,
          "max": 6,
          "step": 0.01
        },
        {
          "type": "hslider",
          "label": "controls/tone_mid_band_gain_db",
          "varname": "fHslider2",
          "shortname": "controls_tone_mid_band_gain_db",
          "address": "/prism-premium-stereo/controls_tone_mid_band_gain_db",
          "index": 8,
          "meta": [
            {
              "0": ""
            },
            {
              "unit": "dB"
            }
          ],
          "init": 0,
          "min": -6,
          "max": 6,
          "step": 0.01
        }
      ]
    }
  ]
} as const;

export default metadata;