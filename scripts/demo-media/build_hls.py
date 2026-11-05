#!/usr/bin/env python3
"""
Packages the demo lesson videos as AES-128 encrypted HLS for protected streaming.

For every lesson MP4 in apps/web/public/media/lessons/<course>/<lesson>.mp4 this writes
apps/web/public/media/hls/<course>/<lesson>/ with 6-second encrypted .ts segments and an
index.m3u8 template whose key URI is the placeholder __KEY_URI__. The API serves the
playlist per student with a short-lived key link, so the segments are useless without
signing in. Keys go to apps/api/prisma/demo-content/hls-keys.json (seeded into Lesson.hlsKeyHex).

Preview lessons (the first lesson of each course) keep their MP4 for the public preview;
the other MP4s are removed so there is no downloadable file left.

Usage: python3 scripts/demo-media/build_hls.py [--keep-mp4]
"""
import argparse
import json
import os
import secrets
import shutil
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MEDIA = ROOT / 'apps/web/public/media'
KEYS_FILE = ROOT / 'apps/api/prisma/demo-content/hls-keys.json'
MANIFEST = ROOT / 'apps/api/prisma/demo-content/media-manifest.json'


def preview_videos() -> set:
    """First lesson of each course stays a public MP4 (free preview)."""
    manifest = json.loads(MANIFEST.read_text())
    first = {}
    for key, entry in manifest['lessons'].items():
        course = key.split('::')[0]
        first.setdefault(course, entry['videoUrl'])
    return set(first.values())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--keep-mp4', action='store_true')
    args = ap.parse_args()

    keys = json.loads(KEYS_FILE.read_text()) if KEYS_FILE.exists() else {}
    previews = preview_videos()
    out_root = MEDIA / 'hls'
    count = 0
    for mp4 in sorted((MEDIA / 'lessons').glob('*/*.mp4')):
        rel = f'{mp4.parent.name}/{mp4.stem}'
        out = out_root / rel
        if out.exists():
            shutil.rmtree(out)
        out.mkdir(parents=True)
        key = secrets.token_bytes(16)
        iv = secrets.token_hex(16)
        with tempfile.TemporaryDirectory() as tmp:
            key_path = Path(tmp) / 'k.key'
            key_path.write_bytes(key)
            info = Path(tmp) / 'k.keyinfo'
            info.write_text(f'__KEY_URI__\n{key_path}\n{iv}\n')
            subprocess.run(
                [
                    'ffmpeg', '-loglevel', 'error', '-y', '-i', str(mp4), '-c', 'copy',
                    '-hls_time', '6', '-hls_playlist_type', 'vod', '-hls_key_info_file', str(info),
                    '-hls_segment_filename', str(out / 'seg_%03d.ts'), str(out / 'index.m3u8'),
                ],
                check=True,
            )
        keys[rel] = key.hex()
        count += 1
        if not args.keep_mp4 and f'/media/lessons/{rel}.mp4' not in previews:
            mp4.unlink()
        print('hls', rel)

    KEYS_FILE.write_text(json.dumps(keys, indent=2) + '\n')
    print(f'{count} lessons packaged; keys in {KEYS_FILE.relative_to(ROOT)}')


if __name__ == '__main__':
    os.chdir(ROOT)
    main()
