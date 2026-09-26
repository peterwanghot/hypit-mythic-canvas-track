# Storyboard demo / 分镜图 Demo

This self-contained example renders two still-image scenes with Ken Burns motion, title fade-out, word-level karaoke timing, role badges, bokeh, and gold dust. The first scene `back.jpg` includes `sample` watermarks in the top-left and bottom-right.

这个独立示例演示两张分镜图的 Ken Burns 运镜、标题淡出、逐词卡拉 OK、角色徽标、散景和金粉粒子。首张分镜 `back.jpg` 在左上和右下加入了 `sample` 水印。

```bash
npm install
hypit check authors/main.svml --workspace . --color never
hypit build runs/preview.svrun --workspace . --runtime ./hypit.runtime.json --follow --color never
```

The result is the `preview.video` output from the local HyperFrames runtime. The example uses a short 6-second, 1080×1920 canvas as a full-resolution component smoke test. A rendered copy is available at `results/storyboard-demo-1080p.mp4`.

构建结果是本地 HyperFrames Runtime 生成的 `preview.video`。示例使用 6 秒、1080×1920 画布，作为满分辨率组件冒烟测试；已生成 `results/storyboard-demo-1080p.mp4`。
