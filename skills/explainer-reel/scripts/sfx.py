"""Synthesizes the micro-SFX library (wav 48 kHz mono). Usage: python3 sfx.py <project>/public/sfx
The template already ships the wav files; run it only to recreate them or to add new sounds."""
import os
import sys
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 48000
OUT = sys.argv[1] if len(sys.argv) > 1 else "public/sfx"
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)


def t(d):
    return np.arange(int(SR * d)) / SR


def env(n, a=0.002, r=0.1):
    x = np.arange(n) / SR
    return np.minimum(1, x / a) * np.exp(-x / r)


def tone(f0, f1, d, r, shape="sine"):
    x = t(d)
    f = np.geomspace(f0, f1, len(x))
    ph = 2 * np.pi * np.cumsum(f) / SR
    w = np.sin(ph) if shape == "sine" else (2 * ((ph / (2 * np.pi)) % 1) - 1)
    return w * env(len(x), r=r)


def noise(d):
    return rng.standard_normal(int(SR * d))


def bp(x, lo, hi):
    return sosfilt(butter(2, [lo, hi], btype="band", fs=SR, output="sos"), x)


def lp(x, hi):
    return sosfilt(butter(2, hi, btype="low", fs=SR, output="sos"), x)


def hp(x, lo):
    return sosfilt(butter(2, lo, btype="high", fs=SR, output="sos"), x)


def mix(*parts):
    n = max(len(p) for p in parts)
    out = np.zeros(n)
    for p in parts:
        out[: len(p)] += p
    return out


def seq(items, d):
    out = np.zeros(int(SR * d))
    for at, x in items:
        i = int(at * SR)
        out[i : i + len(x)] += x[: len(out) - i]
    return out


def save(name, x, gain=0.8):
    x = x / (np.abs(x).max() + 1e-9) * gain
    wavfile.write(os.path.join(OUT, name + ".wav"), SR, (x * 32767).astype(np.int16))


pop = mix(tone(900, 380, 0.09, 0.03), 0.3 * bp(noise(0.02), 2000, 6000) * env(960, r=0.005))
save("pop", pop)
save("click", mix(hp(noise(0.03), 2500) * env(1440, r=0.004), 0.4 * tone(2400, 2200, 0.02, 0.004)))
save("impact", mix(tone(140, 45, 0.35, 0.12), 0.6 * lp(noise(0.25), 900) * env(12000, r=0.05)))
w = bp(noise(0.45), 500, 4000) * np.sin(np.linspace(0, np.pi, int(SR * 0.45))) ** 2
save("whoosh", w, 0.6)
coin = mix(tone(1975, 1975, 0.08, 0.05), np.concatenate([np.zeros(int(0.06 * SR)), tone(2637, 2637, 0.3, 0.1)]))
save("coin", coin, 0.55)
tick = hp(noise(0.012), 3000) * env(576, r=0.002)
save("tick", tick, 0.6)
save("ticker", seq([(i * 0.045, tick) for i in range(22)], 1.05), 0.5)
save("stamp", mix(tone(220, 80, 0.2, 0.06), 0.8 * lp(noise(0.12), 2500) * env(5760, r=0.02)))
scr = bp(noise(0.5), 1500, 5000) * (0.5 + 0.5 * np.sin(2 * np.pi * 14 * t(0.5))) * env(24000, a=0.01, r=0.4)
save("scribble", scr, 0.45)
save("clink", mix(tone(3200, 3150, 0.3, 0.09), 0.5 * tone(4700, 4650, 0.25, 0.06)), 0.45)
al = np.sign(np.sin(2 * np.pi * 880 * t(0.5))) * (np.sin(2 * np.pi * 8 * t(0.5)) > 0) * env(24000, a=0.005, r=1)
save("alarm", lp(al, 3000), 0.35)
save("powerup", tone(200, 1600, 0.45, 0.6, "saw") * np.linspace(0.3, 1, int(SR * 0.45)), 0.4)
whir = bp(noise(0.8), 300, 1400) * (0.6 + 0.4 * np.sin(2 * np.pi * np.linspace(20, 60, int(SR * 0.8)) * t(0.8)))
save("whir", whir * np.sin(np.linspace(0, np.pi, len(whir))), 0.4)
save("chord", mix(*[tone(f, f, 0.9, 0.35) for f in (523, 659, 784, 1047)]), 0.6)
save("boing", tone(180, 520, 0.35, 0.15) * (1 + 0.5 * np.sin(2 * np.pi * 30 * t(0.35))), 0.6)
save("zip", mix(tone(400, 3000, 0.18, 0.12, "saw") * 0.5, 0.3 * bp(noise(0.18), 2000, 7000) * env(8640, r=0.05)), 0.45)
save("ding", mix(tone(1568, 1568, 1.0, 0.35), 0.4 * tone(3136, 3136, 0.6, 0.2)), 0.55)
save("snip", seq([(0, hp(noise(0.02), 3000) * env(960, r=0.004)), (0.07, hp(noise(0.03), 2500) * env(1440, r=0.006))], 0.15), 0.6)
save("splash", bp(noise(0.6), 400, 3500) * env(28800, a=0.02, r=0.18), 0.5)
save("crack", mix(hp(noise(0.25), 1200) * env(12000, r=0.03), tone(90, 40, 0.4, 0.15)), 0.7)
save("alert", seq([(0, tone(988, 988, 0.12, 0.08)), (0.14, tone(988, 988, 0.12, 0.08))], 0.3), 0.5)
save("dig", mix(lp(noise(0.15), 1200) * env(7200, r=0.03), 0.6 * tone(110, 70, 0.12, 0.04)), 0.6)
cash = seq([(0, tone(2093, 2093, 0.1, 0.04)), (0.08, coin)], 0.45)
save("cash", cash, 0.55)
print(sorted(os.listdir(OUT)))
