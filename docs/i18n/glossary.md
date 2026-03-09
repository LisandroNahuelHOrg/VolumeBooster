# i18n Glossary

Use this glossary to keep audio terminology stable across locales.

| Term | Meaning in Prism |
| --- | --- |
| Boost | User-facing gain increase applied to a tab or automatic session. |
| Clip / Clipping | Audible overload when output exceeds safe headroom. |
| Clip events | Count of clipping incidents detected during a live session. |
| Clip peak | Highest peak that crossed the clipping threshold during a session. |
| Ceiling | Output ceiling target used to prevent clipping. |
| Lookahead | How early the processor reacts before a peak lands. |
| Release | How quickly gain reduction relaxes after a loud peak. |
| Soft Clip | Gentle saturation blended in to smooth harsh peaks. |
| Sound Mode | Global DSP voicing preset that shapes tone and loudness. |
| Audio Quality Protector | Global protection mode that trades tone and control to reduce distortion. |
| Manual lane | The robust single-tab capture path based on explicit user activation. |
| Automatic lane | The site/global auto-attach path used for `All Sites`. |
| Current Tab | Mode that keeps boosting limited to the active tab only. |
| All Sites | Mode that auto-starts boosting on compatible tabs and sites. |
| DSP | Digital signal processing engine that shapes and protects the audio. |
| AudioWorklet | Browser audio processing path used by the premium Faust engine. |
| Web Audio bridge | Fallback auto-attach path that hooks pages already using Web Audio. |

## Translation policy

- Keep `Prism Volume Booster` untranslated.
- Terms like `Bass Boost`, `Lookahead`, or `Release` may remain in English only if product explicitly chooses that and the key is allowlisted.
- Prefer semantic consistency over literal translation when audio terminology would sound unnatural to end users.
