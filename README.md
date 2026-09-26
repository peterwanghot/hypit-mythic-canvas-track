# Hypit Mythic Canvas Track

[中文](#中文) · [English](#english)

## 中文

`hypit-mythic-canvas-track` 是一个独立的 Hypit VisualTrack 组件。它在一个确定性的 HyperFrames browser program 内合成静态分镜运镜、WebGL 散景与金色粒子、透明标题淡出、定时弹出卡片和双色卡拉 OK 字幕。

组件不包含图片、音乐、配音、字幕文案或 Provider 密钥；你的 Hypit Author 应把这些作为显式素材输入。

### 特性

- 确定性逐帧渲染：相同输入、`seed` 与 `localFrame` 得到同一画面，支持跳帧和多 worker 渲染。
- 场景图的 cover 裁切、缩放、垂直位移与短交叉淡化。
- WebGL2 前景散景与缓慢升腾的金粉微尘。
- 可选透明标题图淡出。
- 透明 PNG 卡片按时间弹出，使用轻量级 spring overshoot 入场与淡出，不增加额外 VisualTrack。
- 白底→蓝色/金色 Wipe 的角色字幕与徽标；可选逐词或逐字时间轴。
- 音频继续使用普通 Hypit AudioTrack，不由视觉组件承担混音。

### 底板视频合成

组件支持叠加到底板视频上，但底板视频不是 `mythic:Track` 的直接入参。推荐把视频底板、Mythic 透明叠加轨和音频轨分别声明，再通过 `film:Film` 合成：

```xml
<media:Video id="base-video" src="../assets/base_video_sample.mp4"/>
<pipeline:Normalize id="base-media" source={base-video}
  clock={clock} video="primary-moving" audio="default"
  span-authority="video"/>

<media-track:Track id="base-track" timeline={program.timeline} canvas={canvas}>
  <media-track:Item
    id="base-item"
    media={base-media.media}
    frame={full}
    at="0s"
    for="10s"
    source-audio="content"/>
</media-track:Track>

<mythic:Track
  id="overlay"
  timeline={program.timeline}
  canvas={canvas}
  title={dummy}
  transparent="true"
  during="program">
  <mythic:Scene id="dummy-scene" image={dummy}
    at="0" start-zoom="1.0" end-zoom="1.0"/>
  <mythic:Cue id="cue01" start="0.0" end="1.3"
    text="月满瑶池" tone="gold"/>
  <mythic:Effect id="gold-dust" amount="0.72"
    min-size="2.5" max-size="5.5"
    color="#FFE6A8" seed="12"/>
</mythic:Track>

<film:Film id="main" canvas={canvas}
  timeline={program.timeline} appearance={style.film.main}>
  <film:Track source={base-track.visual}/>
  <film:Track source={overlay.track}/>
  <film:Track source={base-track.audio}/>
</film:Film>
```

底板视频的音频、BGM 和配音仍由普通 Hypit 音频轨处理；组件只负责透明视觉层。若需要视频结束后的定格尾段，应在 `media-track` 中单独追加图片 Item，并把 Timeline 延长到完整交付时长：

```xml
<media-track:Item id="tail-item"
  image={tail-frame}
  extent={tail-extent}
  frame={full}
  at="10s"
  for="2.5s"/>
```

因此，`mythic:Track` 不接受类似 `video={base-video}` 的底板视频属性；视频底板通过外层轨道与 Mythic 透明轨组合。

注意：每个 `mythic:Track` 仍要求至少包含一个 `Scene`、一个 `Cue` 和一个 `Effect`，且 `title` 是必填引用。即使只做底板视频上的透明字幕/粒子叠加，也需要提供一个透明的 dummy title 和透明的 dummy Scene；`transparent="true"` 会隐藏 Scene 底图，但标题图仍会按标题淡出参数绘制。

### 安装与引用

```bash
npm install hypit-mythic-canvas-track @hypit/hypit
```

```svml
<import as="mythic" from="hypit-mythic-canvas-track@1"/>
```

可直接运行的 1080×1920、6 秒完整示例见 [storyboard-demo](./examples/storyboard-demo/) 和 [base-video-demo](./examples/base-video-demo/)；最小嵌入结构可参考各工程的 `authors/main.svml`。

可直接运行的完整示例工程：

- [分镜图工程 / storyboard-demo](./examples/storyboard-demo/)：两张静态分镜（首张左上/右下带 `sample` 水印）、Ken Burns 运镜、逐词字幕、徽标和粒子；已跑出 1080P [storyboard-demo-1080p.mp4](./examples/storyboard-demo/results/storyboard-demo-1080p.mp4)。
- [底板视频工程 / base-video-demo](./examples/base-video-demo/)：`media:Video` + `media-track:Track` 底板视频，左上/右下带 `sample` 水印，再叠加透明 Mythic 字幕和粒子；已跑出 1080P [base-video-demo-1080p.mp4](./examples/base-video-demo/results/base-video-demo-1080p.mp4)。

### API

| 元素 | 必填属性 | 用途 |
| --- | --- | --- |
| `mythic:Track` | `id`, `timeline`, `canvas`, `title`, `during` | 整条画面轨；分辨率由 `canvas` 的 `width` / `height` 统一决定。可选 `title-fade-start`（默认 `2.4s`）、`title-end`（默认 `3s`）、`badge-size`（默认 `34`）、`subtitle-size`（默认 `56`）、`badge-y`（默认 `1450`）、`subtitle-y`（默认 `1574`）和 `transparent`（默认 `false`）。 |
| `mythic:Scene` | `id`, `image`, `at`, `start-zoom`, `end-zoom` | 一张场景图与镜头运动；`start-y` / `end-y` 可选。 |
| `mythic:Cue` | `id`, `start`, `end`, `text`, `tone` | 一条字幕；`role` 可选，用于绘制说话人徽标；`tone` 仅为 `blue` 或 `gold`。可包含多个 `Word`。 |
| `mythic:Word` | `text`, `start`, `end` | Cue 内按顺序定义的一个词或一个汉字；用于逐词/逐字 Wipe。 |
| `mythic:Effect` | `id`, `amount`, `min-size`, `max-size`, `color`, `seed` | 一层粒子/散景；小尺寸作金粉，大尺寸作散景。 |
| `mythic:Popup` | `id`, `image`, `start`, `end`, `width` | 定时透明图片；优先使用 `anchor` 的九宫格位置，`offset-x/y` 做相对微调；也可用 `x/y` 精确定位。`enter` 与 `fade-out` 可选，默认分别为 `0.2s`、`0.3s`。 |

每个 Track 至少需要一个 `Scene`、一个 `Cue` 和一个 `Effect`；`Popup` 是可选的。

`Scene` 应按 `at` 从小到大声明，因为运镜和场景切换按声明顺序计算；`Cue` 也建议避免时间重叠。`transparent="true"` 仅清除场景背景，不会自动把 `title` 变成透明。

Popup 的推荐写法是 `anchor="top-right" offset-x="-0.02" offset-y="0.03"`。九宫格锚点为 `top/center/bottom` × `left/center/right`；偏移和 `x/y` 都是 0–1 的画布相对比例，不使用像素值。旧项目的 `x/y` 写法继续兼容；二者不可同时出现。

建议金粉密度为 `0.45–0.90`、尺寸为 `2–7px`；散景密度为 `0.04–0.20`、尺寸为 `55–140px`。请保持 `seed` 固定，才能复现画面。

不写 `Word` 时，`Cue.start` / `Cue.end` 驱动整句连续 Wipe，兼容旧项目。写入 `Word` 后，每个词或汉字按自己的 `start` / `end` 擦亮；所有 Word 必须按时间排序、不重叠、位于 Cue 区间内，并以声明顺序出现在 `Cue.text` 中。这样空格与标点无需单独写 Word，也可直接承接 WhisperX 的字级或词级对齐结果。

### 开发与发布

```bash
npm install
npm run build
```

发布前请将 `package.json` 的 `YOUR_GITHUB_USER` 替换为你的 GitHub 用户名。这个组件依赖 Hypit，使用时仍须遵守 Hypit 的许可和服务条款。

## English

`hypit-mythic-canvas-track` is a standalone Hypit VisualTrack component. It composes Ken Burns motion for still scenes, WebGL bokeh and gold dust, a fading transparent title, timed popup cards, and two-tone karaoke captions in one deterministic HyperFrames browser program.

It ships no images, music, voice-over, subtitle copy, or provider credentials. Your Hypit Author supplies those materials explicitly.

### Features

- Deterministic frame evaluation from the same inputs, `seed`, and `localFrame`; safe for seeking and multi-worker rendering.
- Cover crop, zoom, vertical drift, and short cross-fades for still scenes.
- WebGL2 foreground bokeh and slowly rising gold-dust atmosphere.
- Optional fading transparent title overlay.
- Timed transparent PNG cards with a lightweight spring-overshoot entrance and fade-out, inside the same VisualTrack.
- White-to-blue or white-to-gold wipe captions with speaker badges, optionally driven by word or character timings.
- Audio remains in normal Hypit AudioTracks rather than this visual component.

### Compositing over a base video

The component supports compositing over a base video, but the video is not a direct `mythic:Track` input. Declare the video with Hypit's media and media-track surfaces, keep the Mythic track transparent, then stack both in a `film:Film`:

```xml
<media:Video id="base-video" src="../assets/base_video_sample.mp4"/>
<pipeline:Normalize id="base-media" source={base-video}
  clock={clock} video="primary-moving" audio="default"
  span-authority="video"/>

<media-track:Track id="base-track" timeline={program.timeline} canvas={canvas}>
  <media-track:Item id="base-item" media={base-media.media}
    frame={full} at="0s" for="10s" source-audio="content"/>
</media-track:Track>

<mythic:Track id="overlay" timeline={program.timeline}
  canvas={canvas} title={dummy} transparent="true" during="program">
  <mythic:Scene id="dummy-scene" image={dummy}
    at="0" start-zoom="1.0" end-zoom="1.0"/>
  <mythic:Cue id="cue01" start="0.0" end="1.3"
    text="Moon over the Jade Lake" tone="gold"/>
  <mythic:Effect id="gold-dust" amount="0.72"
    min-size="2.5" max-size="5.5"
    color="#FFE6A8" seed="12"/>
</mythic:Track>

<film:Film id="main" canvas={canvas}
  timeline={program.timeline} appearance={style.film.main}>
  <film:Track source={base-track.visual}/>
  <film:Track source={overlay.track}/>
  <film:Track source={base-track.audio}/>
</film:Film>
```

The base video's audio, voice-over, and BGM remain ordinary Hypit audio tracks; this package owns only the transparent visual layer. For an intentional freeze tail, append a separate image Item in the media track and extend the Timeline to the full delivery duration:

```xml
<media-track:Item id="tail-item" image={tail-frame}
  extent={tail-extent} frame={full} at="10s" for="2.5s"/>
```

There is no `video={base-video}` attribute on `mythic:Track`; the base video is composed outside the component.

Note: every `mythic:Track` still requires at least one `Scene`, one `Cue`, and one `Effect`, and `title` is a required reference. Even for a transparent caption/particle overlay over a base video, provide a transparent dummy title and a transparent dummy Scene; `transparent="true"` suppresses the Scene background, but the title image is still drawn according to its fade settings.

### Install and import

```bash
npm install hypit-mythic-canvas-track @hypit/hypit
```

```svml
<import as="mythic" from="hypit-mythic-canvas-track@1"/>
```

See [storyboard-demo](./examples/storyboard-demo/) and [base-video-demo](./examples/base-video-demo/) for runnable 1080×1920, six-second projects; the smallest embeddable structure is shown in each project's `authors/main.svml`.

Complete runnable projects:

- [Storyboard project / 分镜图工程](./examples/storyboard-demo/): two still scenes (the first has `sample` watermarks in the top-left and bottom-right), Ken Burns motion, word-level captions, badges, and particles; rendered output: 1080P [storyboard-demo-1080p.mp4](./examples/storyboard-demo/results/storyboard-demo-1080p.mp4).
- [Base-video project / 底板视频工程](./examples/base-video-demo/): a `media:Video` + `media-track:Track` base layer with `sample` watermarks in the top-left and bottom-right, plus a transparent Mythic caption/particle overlay; rendered output: 1080P [base-video-demo-1080p.mp4](./examples/base-video-demo/results/base-video-demo-1080p.mp4).

### API

| Element | Required attributes | Purpose |
| --- | --- | --- |
| `mythic:Track` | `id`, `timeline`, `canvas`, `title`, `during` | Visual track; `canvas` width and height define resolution. Optional attributes: `title-fade-start` (default `2.4s`), `title-end` (default `3s`), `badge-size` (default `34`), `subtitle-size` (default `56`), `badge-y` (default `1450`), `subtitle-y` (default `1574`), and `transparent` (default `false`). |
| `mythic:Scene` | `id`, `image`, `at`, `start-zoom`, `end-zoom` | One scene image and camera motion; `start-y` / `end-y` are optional. |
| `mythic:Cue` | `id`, `start`, `end`, `text`, `tone` | One subtitle cue; optional `role` draws a speaker badge; `tone` is `blue` or `gold`; it may contain `Word` children. |
| `mythic:Word` | `text`, `start`, `end` | An ordered word or character inside Cue for word/character-level Wipe. |
| `mythic:Effect` | `id`, `amount`, `min-size`, `max-size`, `color`, `seed` | One particle/bokeh layer; small sizes behave as dust, large sizes as bokeh. |
| `mythic:Popup` | `id`, `image`, `start`, `end`, `width` | A timed transparent image. Prefer a nine-grid `anchor` with relative `offset-x/y`; exact relative `x/y` coordinates remain supported. `enter` and `fade-out` default to `0.2s` and `0.3s`. |

Each Track must contain at least one `Scene`, one `Cue`, and one `Effect`; `Popup` elements are optional.

Declare `Scene` elements in ascending `at` order because camera motion and scene transitions are evaluated in declaration order; avoid overlapping `Cue` intervals as well. `transparent="true"` clears only the scene background and does not make the `title` image transparent automatically.

Use `anchor="top-right" offset-x="-0.02" offset-y="0.03"` by default. The nine anchors combine `top/center/bottom` with `left/center/right`; offsets and exact `x/y` values are normalized 0–1 canvas ratios, never pixels. The two positioning modes are mutually exclusive.

Use `0.45–0.90` density and `2–7px` sizes for gold dust; use `0.04–0.20` and `55–140px` for bokeh. Keep seeds stable to make rendering reproducible.

Without `Word`, `Cue.start` and `Cue.end` drive a backwards-compatible full-cue linear wipe. With `Word` children, each word or character uses its own timing. Words must be ordered, non-overlapping, contained by the Cue, and occur in declaration order within `Cue.text`; spaces and punctuation do not need a Word of their own. This makes the component compatible with WhisperX word- or character-level alignment.

### Development and publishing

```bash
npm install
npm run build
```

Before publishing, replace `YOUR_GITHUB_USER` in `package.json`. This component depends on Hypit; downstream use remains subject to Hypit's license and service terms.
