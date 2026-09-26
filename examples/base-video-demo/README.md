# Base-video demo / 底板视频 Demo

This example proves the supported composition path for a moving video: `media:Video` → `pipeline:Normalize` → `media-track:Track`, then a transparent `mythic:Track` stacked in `film:Film`. The base asset is intentionally pre-processed with `sample` watermarks in the top-left and bottom-right corners so the base layer is easy to identify.

这个独立示例验证底板视频的标准合成路径：`media:Video` → `pipeline:Normalize` → `media-track:Track`，再把透明的 `mythic:Track` 叠加到 `film:Film`。底板素材特意在左上和右下加入了 `sample` 水印，方便识别底板层。

```bash
npm install
hypit check authors/main.svml --workspace . --color never
hypit build runs/preview.svrun --workspace . --runtime ./hypit.runtime.json --follow --color never
```

The 6-second, 1080×1920 output keeps the processed base video's original audio and adds Mythic captions and particles as a separate transparent visual layer. The base asset is `assets/base_video_sample.mp4`. A rendered copy is available at `results/base-video-demo-1080p.mp4`. It intentionally does not pass `video={base-video}` to `mythic:Track`.

输出为 6 秒、1080×1920 视频：保留处理后底板视频的原声音轨，并把 Mythic 字幕和粒子作为独立透明视觉层叠加。底板素材是 `assets/base_video_sample.mp4`，已生成 `results/base-video-demo-1080p.mp4`。示例特意没有向 `mythic:Track` 传入 `video={base-video}`。
