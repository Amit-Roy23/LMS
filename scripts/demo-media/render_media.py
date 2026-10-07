#!/usr/bin/env python3
"""Render the demo lesson videos, posters and course covers from the demo catalogue.

Every lesson in apps/api/prisma/demo-content/catalog.json becomes a short animated
explainer video (title card -> key ideas -> worked example -> recap -> up next) with a
soft music bed. Output goes to apps/web/public/media so it ships with the web app, and a
manifest with exact durations is written for the database seed.

Requirements: python3 with Pillow + numpy, and ffmpeg with libx264/aac on PATH.

Usage:
    python3 scripts/demo-media/render_media.py            # render everything missing
    python3 scripts/demo-media/render_media.py --force    # re-render everything
    python3 scripts/demo-media/render_media.py --only ui-ux-product-design
"""
from __future__ import annotations

import argparse
import json
import math
import os
import re
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[2]
CATALOG = ROOT / 'apps/api/prisma/demo-content/catalog.json'
OUT = ROOT / 'apps/web/public/media'
MANIFEST = ROOT / 'apps/api/prisma/demo-content/media-manifest.json'

W, H, FPS = 1280, 720, 24
BG = (11, 16, 32)
INK = (241, 245, 249)
MUTED = (148, 163, 184)
BRAND = 'Creative & IT Academy'

FONT_DIRS = ['/usr/share/fonts/opentype/inter', '/usr/share/fonts/truetype/dejavu']


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    for d in FONT_DIRS:
        p = Path(d) / name
        if p.exists():
            return ImageFont.truetype(str(p), size)
    return ImageFont.truetype('DejaVuSans.ttf', size)


F = {
    'title': font('Inter-ExtraBold.otf', 60),
    'h2': font('Inter-Bold.otf', 44),
    'point': font('Inter-SemiBold.otf', 34),
    'body': font('Inter-Medium.otf', 28),
    'small': font('Inter-SemiBold.otf', 22),
    'tiny': font('Inter-Medium.otf', 18),
    'code': font('DejaVuSansMono.ttf', 28),
    'codeb': font('DejaVuSansMono-Bold.ttf', 22),
    'mark': font('Inter-ExtraBold.otf', 220),
    'cover_title': font('Inter-ExtraBold.otf', 64),
    'cover_cat': font('Inter-Bold.otf', 26),
}


def hex_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip('#')
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


def ease(t: float) -> float:
    t = max(0.0, min(1.0, t))
    return 1 - (1 - t) ** 3


def wrap(draw: ImageDraw.ImageDraw, text: str, fnt, width: int) -> list[str]:
    words, lines, line = text.split(), [], ''
    for w in words:
        trial = f'{line} {w}'.strip()
        if draw.textlength(trial, font=fnt) <= width:
            line = trial
        else:
            if line:
                lines.append(line)
            line = w
    if line:
        lines.append(line)
    return lines


def gradient_bg(c1, c2, w=W, h=H) -> Image.Image:
    """Dark navy canvas with two soft glowing colour blobs."""
    img = Image.new('RGB', (w, h), BG)
    glow = Image.new('RGB', (w, h), (0, 0, 0))
    g = ImageDraw.Draw(glow)
    g.ellipse([w * 0.55, -h * 0.35, w * 1.25, h * 0.75], fill=c1)
    g.ellipse([-w * 0.25, h * 0.45, w * 0.45, h * 1.4], fill=c2)
    glow = glow.filter(ImageFilter.GaussianBlur(160))
    img = Image.blend(img, glow, 0.38)
    # subtle dot grid
    d = ImageDraw.Draw(img)
    for x in range(0, w, 32):
        for y in range(0, h, 32):
            d.point((x, y), fill=(36, 44, 66))
    return img


# ---------------------------------------------------------------- scenes
class Lesson:
    def __init__(self, course: dict, module_idx: int, lesson: dict, next_title: str | None):
        self.course = course
        self.module_idx = module_idx
        self.lesson = lesson
        self.next_title = next_title
        self.c1 = hex_rgb(course['palette'][0])
        self.c2 = hex_rgb(course['palette'][1])
        ex = lesson['example']
        self.scenes = [
            ('intro', 6.0),
            ('points', 5.5 * len(lesson['points']) + 3.0),
            ('example', 2.6 * len(ex['lines']) + 6.0),
            ('recap', 8.0),
            ('outro', 6.0),
        ]
        self.duration = sum(s[1] for s in self.scenes)
        self.bg = gradient_bg(self.c1, self.c2)

    # chrome shared by every frame
    def chrome(self, img: Image.Image, t: float) -> None:
        d = ImageDraw.Draw(img)
        tag = self.lesson['title'].split(' ')[0]
        pill_w = d.textlength(f'Lesson {tag}', font=F['small']) + 44
        d.rounded_rectangle([48, 36, 48 + pill_w, 78], 21, fill=(30, 41, 59), outline=self.c1, width=2)
        d.text((70, 44), f'Lesson {tag}', font=F['small'], fill=INK)
        bw = d.textlength(BRAND, font=F['small'])
        d.text((W - 48 - bw, 44), BRAND, font=F['small'], fill=MUTED)
        # progress bar
        d.rectangle([0, H - 6, W, H], fill=(30, 41, 59))
        p = int(W * t / self.duration)
        for x in range(0, p, 4):
            k = x / W
            col = tuple(int(self.c1[i] * (1 - k) + self.c2[i] * k) for i in range(3))
            d.rectangle([x, H - 6, x + 4, H], fill=col)

    def frame(self, t: float) -> Image.Image:
        img = self.bg.copy()
        start = 0.0
        for name, dur in self.scenes:
            if t < start + dur or name == 'outro':
                local = t - start
                getattr(self, f'scene_{name}')(img, local, dur)
                break
            start += dur
        self.chrome(img, t)
        return img

    def fade(self, img: Image.Image, local: float, dur: float) -> None:
        a = min(1.0, local / 0.5, max(0.0, (dur - local) / 0.5))
        if a < 1:
            dark = Image.new('RGB', img.size, BG)
            img.paste(Image.blend(dark, img, a))

    def scene_intro(self, img, local, dur):
        d = ImageDraw.Draw(img)
        course_title = self.course['title']
        d.text((96, 190), course_title.upper(), font=F['small'], fill=self.c1)
        title = re.sub(r'^\d+\.\d+\s+', '', self.lesson['title'])
        lines = wrap(d, title, F['title'], W - 200)
        y = 240
        for i, line in enumerate(lines):
            k = ease((local - 0.3 - i * 0.25) / 0.8)
            d.text((96, y + int(30 * (1 - k))), line, font=F['title'], fill=tuple(int(c * k + BG[j] * (1 - k)) for j, c in enumerate(INK)))
            y += 76
        k = ease((local - 1.2) / 1.2)
        d.rounded_rectangle([96, y + 18, 96 + int(260 * k), y + 26], 4, fill=self.c1)
        sk = ease((local - 1.8) / 1.0)
        for i, line in enumerate(wrap(d, self.lesson['summary'], F['body'], W - 260)):
            d.text((96, y + 60 + i * 40), line, font=F['body'], fill=tuple(int(c * sk + BG[j] * (1 - sk)) for j, c in enumerate(MUTED)))
        self.fade(img, local, dur)

    def scene_points(self, img, local, dur):
        d = ImageDraw.Draw(img)
        d.text((96, 130), 'Key ideas', font=F['h2'], fill=INK)
        d.rounded_rectangle([96, 190, 156, 196], 3, fill=self.c1)
        y = 250
        for i, point in enumerate(self.lesson['points']):
            k = ease((local - 0.8 - i * 5.5) / 0.7)
            if k <= 0:
                break
            x = 96 + int(40 * (1 - k))
            col = tuple(int(c * k + BG[j] * (1 - k)) for j, c in enumerate(INK))
            d.ellipse([x, y + 4, x + 40, y + 44], fill=self.c1 if k >= 1 else tuple(int(c * k) for c in self.c1))
            d.line([x + 11, y + 24, x + 18, y + 31, x + 30, y + 16], fill=(255, 255, 255), width=4)
            for j, line in enumerate(wrap(d, point, F['point'], W - 300)):
                d.text((x + 64, y + j * 44), line, font=F['point'], fill=col)
            y += 44 * max(1, len(wrap(d, point, F['point'], W - 300))) + 40
        self.fade(img, local, dur)

    def scene_example(self, img, local, dur):
        d = ImageDraw.Draw(img)
        ex = self.lesson['example']
        heading = 'Worked example' if ex['kind'] == 'code' else 'In practice'
        d.text((96, 110), heading, font=F['h2'], fill=INK)
        box = [96, 190, W - 96, H - 70]
        d.rounded_rectangle(box, 22, fill=(17, 24, 44), outline=(51, 65, 85), width=2)
        d.rounded_rectangle([box[0], box[1], box[2], box[1] + 54], 22, fill=(30, 41, 59))
        d.rectangle([box[0], box[1] + 30, box[2], box[1] + 54], fill=(30, 41, 59))
        for i, c in enumerate([(248, 113, 113), (251, 191, 36), (74, 222, 128)]):
            d.ellipse([box[0] + 24 + i * 26, box[1] + 19, box[0] + 40 + i * 26, box[1] + 35], fill=c)
        d.text((box[0] + 110, box[1] + 15), ex['label'], font=F['codeb'] if ex['kind'] == 'code' else F['small'], fill=MUTED)
        y = box[1] + 86
        per = 2.6
        for i, line in enumerate(ex['lines']):
            t0 = 0.8 + i * per
            if local < t0:
                break
            if ex['kind'] == 'code':
                n = int(len(line) * min(1.0, (local - t0) / (per * 0.75)))
                shown = line[:n]
                d.text((box[0] + 40, y), f'{i + 1:>2}', font=F['code'], fill=(71, 85, 105))
                col = (134, 239, 172) if shown.lstrip().startswith(('#', '//')) else INK
                d.text((box[0] + 100, y), shown, font=F['code'], fill=col)
                if n < len(line) and int(local * 3) % 2 == 0:
                    cx = box[0] + 100 + d.textlength(shown, font=F['code'])
                    d.rectangle([cx + 2, y + 4, cx + 16, y + 34], fill=self.c1)
                y += 46
            else:
                k = ease((local - t0) / 0.6)
                col = tuple(int(c * k + 17 * (1 - k)) for c in INK)
                d.rounded_rectangle([box[0] + 40, y + 10, box[0] + 54, y + 24], 4, fill=self.c1)
                d.text((box[0] + 76, y), line, font=F['body'], fill=col)
                y += 52
        self.fade(img, local, dur)

    def scene_recap(self, img, local, dur):
        d = ImageDraw.Draw(img)
        k = ease((local - 0.3) / 0.8)
        d.text((96, 170), 'Recap', font=F['small'], fill=self.c1)
        lines = wrap(d, self.lesson['recap'], F['h2'], W - 260)
        y = 220
        for line in lines:
            d.text((96, y + int(24 * (1 - k))), line, font=F['h2'], fill=tuple(int(c * k + BG[j] * (1 - k)) for j, c in enumerate(INK)))
            y += 60
        self.fade(img, local, dur)

    def scene_outro(self, img, local, dur):
        d = ImageDraw.Draw(img)
        k = ease((local - 0.2) / 0.8)
        cx, cy, r = W // 2, 250, int(56 * k) + 1
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=self.c1)
        if k > 0.6:
            d.line([cx - 22, cy, cx - 6, cy + 18, cx + 26, cy - 18], fill=(255, 255, 255), width=8)
        msg = 'Lesson complete'
        d.text((cx - d.textlength(msg, font=F['h2']) / 2, 340), msg, font=F['h2'], fill=INK)
        next_name = re.sub(r'^\d+\.\d+\s+', '', self.next_title) if self.next_title else None
        sub = f'Up next: {next_name}' if next_name else 'Next: test yourself in the module quiz'
        for i, line in enumerate(wrap(d, sub, F['body'], W - 300)):
            d.text((cx - d.textlength(line, font=F['body']) / 2, 410 + i * 40), line, font=F['body'], fill=MUTED)


# ---------------------------------------------------------------- audio
def music_bed(path: Path, seconds: float, seed: int) -> None:
    """Soft ambient pad: slow chord progression of sine partials with gentle envelopes."""
    sr = 44100
    t = np.arange(int(sr * seconds)) / sr
    progressions = [
        [(220.0, 277.18, 329.63), (196.0, 246.94, 293.66), (174.61, 220.0, 261.63), (196.0, 246.94, 329.63)],
        [(261.63, 329.63, 392.0), (220.0, 261.63, 329.63), (174.61, 220.0, 261.63), (196.0, 246.94, 293.66)],
        [(146.83, 185.0, 220.0), (164.81, 207.65, 246.94), (130.81, 164.81, 196.0), (146.83, 185.0, 220.0)],
    ]
    prog = progressions[seed % len(progressions)]
    bar = 8.0
    sig = np.zeros_like(t)
    for idx in range(int(math.ceil(seconds / bar)) + 1):
        chord = prog[idx % len(prog)]
        start = idx * bar
        local = t - start
        env = np.clip(local / 2.5, 0, 1) * np.clip((bar + 2.5 - local) / 2.5, 0, 1)
        env *= (local > 0) & (local < bar + 2.5)
        for f in chord:
            sig += env * (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * f * 2 * t)) / 3
    sig += 0.15 * np.sin(2 * np.pi * prog[0][0] / 2 * t)
    fade = np.clip(t / 2.0, 0, 1) * np.clip((seconds - t) / 2.5, 0, 1)
    sig = sig * fade
    sig = sig / (np.abs(sig).max() + 1e-9) * 0.18
    data = (sig * 32767).astype(np.int16)
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(data.tobytes())


# ---------------------------------------------------------------- outputs
def render_video(lesson: Lesson, out_mp4: Path, poster: Path, seed: int) -> float:
    out_mp4.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / 'bed.wav'
        music_bed(wav, lesson.duration, seed)
        cmd = [
            'ffmpeg', '-y', '-loglevel', 'error',
            '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
            '-i', str(wav),
            '-c:v', 'libx264', '-preset', 'slow', '-crf', '32', '-tune', 'stillimage',
            '-pix_fmt', 'yuv420p', '-g', str(FPS * 4),
            '-c:a', 'aac', '-b:a', '48k',
            '-movflags', '+faststart', '-shortest', str(out_mp4),
        ]
        proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
        frames = int(lesson.duration * FPS)
        last_key, last_bytes = None, None
        for i in range(frames):
            t = i / FPS
            img = lesson.frame(t)
            if i == int(3.0 * FPS):
                img.convert('RGB').save(poster, quality=82)
            proc.stdin.write(img.tobytes())  # type: ignore[union-attr]
        proc.stdin.close()  # type: ignore[union-attr]
        if proc.wait() != 0:
            raise RuntimeError(f'ffmpeg failed for {out_mp4}')
    return lesson.duration


def render_cover(course: dict, path: Path) -> None:
    c1, c2 = hex_rgb(course['palette'][0]), hex_rgb(course['palette'][1])
    w, h = 1200, 675
    img = Image.new('RGB', (w, h))
    px = np.zeros((h, w, 3), dtype=np.float32)
    yy, xx = np.mgrid[0:h, 0:w]
    k = (xx / w * 0.6 + yy / h * 0.4)[..., None]
    px[:] = np.array(c1) * (1 - k) + np.array(c2) * k
    img = Image.fromarray(px.astype(np.uint8))
    d = ImageDraw.Draw(img, 'RGBA')
    for i in range(6):
        r = 120 + i * 90
        d.ellipse([w - 260 - r, h // 2 - r, w - 260 + r, h // 2 + r], outline=(255, 255, 255, 34), width=2)
    mark = course['mark']
    layer = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    mw = ld.textlength(mark, font=F['mark'])
    ld.text((w - 260 - mw / 2, h // 2 - 150), mark, font=F['mark'], fill=(255, 255, 255, 56))
    img = Image.alpha_composite(img.convert('RGBA'), layer).convert('RGB')
    d = ImageDraw.Draw(img, 'RGBA')
    d.rounded_rectangle([60, 60, 60 + d.textlength(course['category'].upper(), font=F['cover_cat']) + 40, 110], 25, fill=(255, 255, 255, 46))
    d.text((80, 70), course['category'].upper(), font=F['cover_cat'], fill=(255, 255, 255))
    y = h - 90 - 76 * len(wrap(d, course['title'], F['cover_title'], 760))
    for line in wrap(d, course['title'], F['cover_title'], 760):
        d.text((60, y), line, font=F['cover_title'], fill=(255, 255, 255))
        y += 76
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, quality=86)


def slugify(text: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')[:60]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--force', action='store_true')
    ap.add_argument('--only', help='render a single course slug')
    args = ap.parse_args()

    catalog = json.loads(CATALOG.read_text())
    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() and not args.force else {'lessons': {}, 'covers': {}}

    courses = list(catalog['courses'])
    # The flagship full-stack course keeps its seed structure but gets rendered videos too
    fs = catalog['fullstackLessons']
    fs_titles = list(fs.keys())
    courses.append({
        'slug': 'fullstack-ai-engineering',
        'title': 'Full-Stack Web Development & Modern AI Engineering',
        'category': 'Full-Stack Engineering',
        'palette': ['#6366f1', '#a855f7'],
        'mark': 'FS',
        'modules': [{'lessons': [dict(fs[k], title=k) for k in fs_titles]}],
    })

    seed = 0
    for course in courses:
        if args.only and course['slug'] != args.only:
            continue
        title = course.get('title') or course['slug']
        cover = OUT / 'covers' / f"{course['slug']}.jpg"
        if args.force or not cover.exists():
            render_cover({**course, 'title': title, 'category': course.get('category', 'Data Science & AI')}, cover)
        manifest['covers'][course['slug']] = f"/media/covers/{course['slug']}.jpg"

        flat = [(mi, l) for mi, m in enumerate(course['modules']) for l in m['lessons']]
        for i, (mi, lesson) in enumerate(flat):
            nxt = flat[i + 1][1]['title'] if i + 1 < len(flat) and flat[i + 1][0] == mi else None
            name = slugify(lesson['title'])
            mp4 = OUT / 'lessons' / course['slug'] / f'{name}.mp4'
            poster = OUT / 'lessons' / course['slug'] / f'{name}.jpg'
            key = f"{course['slug']}::{lesson['title']}"
            seed += 1
            if not args.force and mp4.exists() and key in manifest['lessons']:
                continue
            print(f'rendering {course["slug"]} / {lesson["title"]}', flush=True)
            dur = render_video(Lesson({**course, 'title': title}, mi, lesson, nxt), mp4, poster, seed)
            manifest['lessons'][key] = {
                'videoUrl': f"/media/lessons/{course['slug']}/{name}.mp4",
                'posterUrl': f"/media/lessons/{course['slug']}/{name}.jpg",
                'durationSeconds': int(round(dur)),
            }
            MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n')

    MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n')
    print('done')


if __name__ == '__main__':
    main()
