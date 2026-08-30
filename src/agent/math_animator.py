#!/usr/bin/env python3
import sys
import json
import numpy as np

def generate_animation_frames(function_type, params=None):
    if params is None:
        params = {}
    
    frames_count = int(params.get('frames', 60))
    x_min = float(params.get('x_min', -10))
    x_max = float(params.get('x_max', 10))
    points = int(params.get('points', 200))
    
    x = np.linspace(x_min, x_max, points)
    frames_data = []

    for f in range(frames_count):
        t = f / 10.0 # Time parameter
        
        if function_type == 'sin_wave':
            freq = float(params.get('freq', 1.0))
            amp = float(params.get('amp', 1.0))
            y = amp * np.sin(freq * x - t)
            title = f"Gelombang Sinus: y = {amp}·sin({freq}x - {t:.1f})"

        elif function_type == 'cos_wave':
            freq = float(params.get('freq', 1.0))
            amp = float(params.get('amp', 1.0))
            y = amp * np.cos(freq * x - t)
            title = f"Gelombang Cosinus: y = {amp}·cos({freq}x - {t:.1f})"

        elif function_type == 'fourier_square':
            n_terms = int(params.get('n_terms', 5))
            y = np.zeros_like(x)
            for n in range(1, 2 * n_terms, 2):
                y += (4.0 / (n * np.pi)) * np.sin(n * (x - t))
            title = f"Deret Fourier Gelombang Kotak ({n_terms} Harmonik)"

        elif function_type == 'damped_oscillation':
            gamma = float(params.get('gamma', 0.1))
            decay = np.exp(-gamma * (f % 40))
            y = decay * np.sin(x - t)
            title = f"Osilasi Harmonik Teredam (e^{{-{gamma}t}} sin(x - t))"

        elif function_type == 'polynomial_morph':
            a = np.sin(t * 0.5) * 0.1
            b = np.cos(t * 0.7) * 0.3
            y = a * (x**3) + b * (x**2) - 0.5 * x
            title = f"Polinomial Dinamis: y = {a:.2f}x³ + {b:.2f}x² - 0.5x"

        elif function_type == 'gaussian_pulse':
            v = 1.5
            center = ((x_min + (v * t * 2)) % (x_max - x_min)) + x_min
            sigma = float(params.get('sigma', 1.2))
            y = np.exp(-((x - center)**2) / (2 * (sigma**2)))
            title = f"Pulsa Gaussian Merambat (x_center = {center:.2f})"

        elif function_type == 'lissajous':
            a_val = int(params.get('lissajous_a', 3))
            b_val = int(params.get('lissajous_b', 2))
            phi = t
            t_curve = np.linspace(0, 2 * np.pi, points)
            lx = np.sin(a_val * t_curve + phi)
            ly = np.sin(b_val * t_curve)
            frames_data.append({
                "frame": f,
                "t": t,
                "title": f"Kurva Lissajous (Rasio {a_val}:{b_val}, Fase {phi:.2f})",
                "x": lx.tolist(),
                "y": ly.tolist(),
                "isParametric": True
            })
            continue

        else:
            y = np.sin(x - t)
            title = f"Animasi Fungsi f(x, t)"

        frames_data.append({
            "frame": f,
            "t": t,
            "title": title,
            "x": x.tolist(),
            "y": y.tolist(),
            "isParametric": False
        })

    return {
        "status": "success",
        "function_type": function_type,
        "total_frames": frames_count,
        "frames": frames_data
    }

if __name__ == "__main__":
    try:
        raw_input = sys.stdin.read().strip()
        if raw_input:
            input_data = json.loads(raw_input)
        elif len(sys.argv) > 1:
            input_data = json.loads(sys.argv[1])
        else:
            input_data = {}
        
        func_type = input_data.get('function_type', 'sin_wave')
        params = input_data.get('params', {})
        result = generate_animation_frames(func_type, params)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"status": "error", "message": str(e)}))
