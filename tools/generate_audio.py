"""Generate the game's sound effects and background music from scratch.

Every sound in frontend/public/assets/audio is made by this script, so the
repository contains no third-party audio. Requires numpy and ffmpeg (with libmp3lame).

    python tools/generate_audio.py
"""

import subprocess
import tempfile
import wave
from pathlib import Path

import numpy as np

RATE = 44100
OUT = Path(__file__).resolve().parents[1] / "frontend" / "public" / "assets" / "audio"
rng = np.random.default_rng(7)


def t(seconds):
    return np.arange(int(RATE * seconds)) / RATE


def envelope(n, attack=0.005, release=0.1):
    env = np.ones(n)
    a, r = int(RATE * attack), int(RATE * release)
    if a:
        env[:a] = np.linspace(0, 1, a)
    if r:
        env[-r:] *= np.linspace(1, 0, r)
    return env


def tone(freq, seconds, shape="sine", attack=0.005, release=0.1, decay=0.0):
    x = t(seconds)
    phase = 2 * np.pi * freq * x
    if shape == "sine":
        wave_ = np.sin(phase)
    elif shape == "triangle":
        wave_ = 2 / np.pi * np.arcsin(np.sin(phase))
    else:  # soft square
        wave_ = np.tanh(3 * np.sin(phase))
    if decay:
        wave_ *= np.exp(-decay * x)
    return wave_ * envelope(len(x), attack, release)


def sequence(notes, gap=0.0):
    parts = []
    for freq, seconds, kwargs in notes:
        parts.append(tone(freq, seconds, **kwargs))
        if gap:
            parts.append(np.zeros(int(RATE * gap)))
    return np.concatenate(parts)


def mix(*tracks):
    length = max(len(track) for track in tracks)
    out = np.zeros(length)
    for track in tracks:
        out[: len(track)] += track
    return out


def write_mp3(path, samples, volume=0.8):
    samples = samples / max(1e-9, np.max(np.abs(samples))) * volume
    pcm = (samples * 32767).astype(np.int16)
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
        with wave.open(tmp.name, "wb") as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(RATE)
            wav.writeframes(pcm.tobytes())
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-i", tmp.name,
             "-codec:a", "libmp3lame", "-b:a", "96k", "-map_metadata", "-1", str(path)],
            check=True,
        )
    print(f"wrote {path.relative_to(OUT.parents[3])}")


def sound_effects():
    sfx = OUT / "sfx"
    write_mp3(sfx / "click.mp3", tone(1200, 0.035, "square", 0.001, 0.025, decay=60), 0.6)
    write_mp3(sfx / "hover.mp3", tone(2000, 0.02, "sine", 0.001, 0.015, decay=80), 0.3)
    write_mp3(sfx / "success.mp3", sequence([
        (659.25, 0.12, {"shape": "triangle", "release": 0.04}),
        (880.00, 0.25, {"shape": "triangle", "release": 0.18}),
    ]), 0.7)
    write_mp3(sfx / "failure.mp3", sequence([
        (220.00, 0.14, {"shape": "square", "release": 0.05}),
        (164.81, 0.30, {"shape": "square", "release": 0.22}),
    ]), 0.55)
    write_mp3(sfx / "level_complete.mp3", sequence([
        (523.25, 0.12, {"shape": "triangle", "release": 0.05}),
        (659.25, 0.12, {"shape": "triangle", "release": 0.05}),
        (783.99, 0.12, {"shape": "triangle", "release": 0.05}),
        (1046.50, 0.6, {"shape": "triangle", "release": 0.45}),
    ]), 0.7)
    write_mp3(sfx / "achievement.mp3", mix(
        tone(1046.50, 0.9, "sine", 0.003, 0.6, decay=3),
        tone(1567.98, 0.9, "sine", 0.003, 0.6, decay=4) * 0.6,
        np.concatenate([np.zeros(int(RATE * 0.08)), tone(2093.0, 0.8, "sine", 0.003, 0.6, decay=5) * 0.4]),
    ), 0.7)
    write_mp3(sfx / "alert.mp3", sequence([
        (880.0, 0.1, {"shape": "square", "release": 0.03}),
        (880.0, 0.1, {"shape": "square", "release": 0.03}),
    ], gap=0.06), 0.5)

    # Two seconds of soft key clicks at an uneven typing rhythm; the game loops it
    typing = np.zeros(int(RATE * 2.0))
    position = 0.0
    while position < 1.9:
        click = tone(rng.uniform(1800, 2600), 0.012, "square", 0.0005, 0.008, decay=200)
        start = int(position * RATE)
        typing[start:start + len(click)] += click * rng.uniform(0.5, 1.0)
        position += rng.uniform(0.06, 0.13)
    write_mp3(sfx / "typing.mp3", typing, 0.4)


def pad(chords, seconds_per_chord, brightness=0.3, pulse=0.0):
    """Slow sine-based pad. Frequencies snap to whole cycles so the track loops cleanly."""
    total = seconds_per_chord * len(chords)
    x = t(total)
    out = np.zeros_like(x)
    for index, chord in enumerate(chords):
        start, end = index * seconds_per_chord, (index + 1) * seconds_per_chord
        window = np.clip(np.minimum((x - start + 1.5) / 3, (end - x + 1.5) / 3), 0, 1)
        if index == 0:  # wrap the fade so the end of the loop blends into the start
            window = np.maximum(window, np.clip((x - (total - 1.5)) / 3, 0, 1))
        for freq in chord:
            freq = round(freq * total) / total
            voice = np.sin(2 * np.pi * freq * x) + brightness * np.sin(2 * np.pi * 2 * freq * x)
            out += voice * window
    if pulse:
        beat = round(pulse * total) / total
        out *= 0.75 + 0.25 * (0.5 + 0.5 * np.cos(2 * np.pi * beat * x))
    return out


def music():
    music_dir = OUT / "music"
    # A minor, F major, C major, G major
    write_mp3(music_dir / "menu_ambient.mp3", pad(
        [[110.0, 220.0, 261.63, 329.63], [87.31, 174.61, 220.0, 261.63],
         [130.81, 196.0, 261.63, 329.63], [98.0, 196.0, 246.94, 293.66]], 6.0), 0.5)
    # Faster chord changes and a gentle pulse for gameplay
    write_mp3(music_dir / "gameplay_cyberpunk.mp3", pad(
        [[110.0, 164.81, 220.0, 329.63], [130.81, 196.0, 261.63, 392.0],
         [98.0, 146.83, 196.0, 293.66], [87.31, 130.81, 174.61, 261.63]], 4.0,
        brightness=0.45, pulse=2.0), 0.5)
    # Low, darker chords for story scenes
    write_mp3(music_dir / "story_dramatic.mp3", pad(
        [[73.42, 110.0, 146.83, 174.61], [65.41, 98.0, 130.81, 155.56],
         [58.27, 87.31, 116.54, 146.83], [65.41, 98.0, 130.81, 164.81]], 6.0,
        brightness=0.2), 0.5)


if __name__ == "__main__":
    sound_effects()
    music()
