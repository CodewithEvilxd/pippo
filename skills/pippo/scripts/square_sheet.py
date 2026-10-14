"""Pad a generated 3x3 sprite sheet so the nine cells are square without scaling art."""
import sys
from statistics import median

import numpy as np
from PIL import Image
from scipy import ndimage


path = sys.argv[1]
sheet = Image.open(path).convert('RGBA')
width, height = sheet.size
side = max((width + 2) // 3, (height + 2) // 3)
square = Image.new('RGBA', (side * 3, side * 3), (0, 0, 0, 0))
cells = []

for row in range(3):
    for col in range(3):
        left, right = round(col * width / 3), round((col + 1) * width / 3)
        top, bottom = round(row * height / 3), round((row + 1) * height / 3)
        tile = sheet.crop((left, top, right, bottom))
        # Ignore model spill or a fragment from the neighboring row; align the main
        # connected opaque character while retaining its antialiased pixels.
        alpha = np.array(tile.getchannel('A')) > 100
        labels, count = ndimage.label(alpha)
        if count:
            sizes = ndimage.sum(alpha, labels, range(1, count + 1))
            main = labels == int(np.argmax(sizes)) + 1
            ys, xs = np.where(main)
            bbox = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
            rgba = np.array(tile)
            rgba[~main, 3] = 0
            tile = Image.fromarray(rgba, 'RGBA').crop(bbox)
        else:
            tile = tile.crop((0, 0, tile.width, tile.height))
        cells.append((row, col, tile))

# Normalize the shoulder band the animation aligns to, preserving each character's
# proportions. Leave a clear side gutter and enough top room inside every cell.
shoulder_widths = []
for _, _, tile in cells:
    alpha = np.array(tile.getchannel('A')) > 100
    band = max(0, tile.height - int(side * 0.05))
    _, xs = np.where(alpha[band:, :])
    shoulder_widths.append(int(xs.max() - xs.min() + 1) if len(xs) else tile.width)
target_shoulder = min(int(side * 0.70), int(median(shoulder_widths)))
for row, col, tile in cells:
    alpha = np.array(tile.getchannel('A')) > 100
    band = max(0, tile.height - int(side * 0.05))
    _, xs = np.where(alpha[band:, :])
    shoulder = int(xs.max() - xs.min() + 1) if len(xs) else tile.width
    scale = min(target_shoulder / shoulder, side * 0.90 / tile.width, side * 0.90 / tile.height)
    size = (max(1, round(tile.width * scale)), max(1, round(tile.height * scale)))
    tile = tile.resize(size, Image.Resampling.LANCZOS)
    x = col * side + (side - tile.width) // 2
    y = row * side + side - tile.height
    square.alpha_composite(tile, (x, y))

square.save(path, 'PNG')
print(f'{path}: normalized each 3x3 cell to {side}x{side}, preserved aspect ratio, and added gutters')
