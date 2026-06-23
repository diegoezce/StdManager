import math


def _bar_color(rate):
    if rate >= 80:
        return '#16a34a'
    if rate >= 60:
        return '#d97706'
    return '#dc2626'


def attendance_bar_chart(students, width=500):
    """Horizontal bar chart: attendance rate per student. Returns inline SVG string."""
    visible = [s for s in students if s['rate'] is not None]
    if not visible:
        return ''

    label_w = 150
    pct_w = 46
    bar_area = width - label_w - pct_w
    row_h = 26
    gap = 6
    padding_top = 8
    height = len(visible) * (row_h + gap) + padding_top * 2

    rows = []
    for i, s in enumerate(visible):
        y = padding_top + i * (row_h + gap)
        rate = s['rate']
        bar_w = max(rate / 100 * bar_area, 0)
        color = _bar_color(rate)
        name = s['name']
        if len(name) > 24:
            name = name[:23] + '…'

        mid_y = y + row_h // 2 + 4
        rows.append(
            f'<text x="{label_w - 8}" y="{mid_y}" text-anchor="end" '
            f'font-size="12" fill="#4b5563" font-family="Arial,sans-serif">{name}</text>'
            f'<rect x="{label_w}" y="{y + 5}" width="{bar_area}" height="{row_h - 10}" '
            f'rx="3" fill="#f1f5f9"/>'
            f'<rect x="{label_w}" y="{y + 5}" width="{bar_w:.1f}" height="{row_h - 10}" '
            f'rx="3" fill="{color}"/>'
            f'<text x="{label_w + bar_area + 6}" y="{mid_y}" '
            f'font-size="11" fill="#374151" font-weight="bold" font-family="Arial,sans-serif">'
            f'{rate}%</text>'
        )

    inner = '\n  '.join(rows)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
        f'viewBox="0 0 {width} {height}">\n  {inner}\n</svg>'
    )


def attendance_donut_chart(students, size=200):
    """Donut chart: total present/absent/late/excused. Returns inline SVG string."""
    tp = sum(s['present'] for s in students)
    ta = sum(s['absent'] for s in students)
    tl = sum(s['late'] for s in students)
    te = sum(s['excused'] for s in students)
    grand = tp + ta + tl + te

    if grand == 0:
        return ''

    cx = cy = size // 2
    outer_r = size // 2 - 8
    inner_r = int(outer_r * 0.58)

    segments = [
        ('Presente', tp, '#16a34a'),
        ('Ausente',  ta, '#dc2626'),
        ('Tarde',    tl, '#d97706'),
        ('Justif.',  te, '#9ca3af'),
    ]

    paths = []
    legend_items = []
    angle = 0.0

    for label, count, color in segments:
        if count == 0:
            continue
        sweep = 360 * count / grand
        # Avoid degenerate full-circle arc (SVG can't draw 360° arc)
        if sweep >= 359.9:
            sweep = 359.9
        end_angle = angle + sweep
        large = 1 if sweep > 180 else 0

        sr = math.radians(angle - 90)
        er = math.radians(end_angle - 90)

        ox1, oy1 = cx + outer_r * math.cos(sr), cy + outer_r * math.sin(sr)
        ox2, oy2 = cx + outer_r * math.cos(er), cy + outer_r * math.sin(er)
        ix1, iy1 = cx + inner_r * math.cos(er), cy + inner_r * math.sin(er)
        ix2, iy2 = cx + inner_r * math.cos(sr), cy + inner_r * math.sin(sr)

        d = (
            f"M {ox1:.1f},{oy1:.1f} "
            f"A {outer_r},{outer_r} 0 {large},1 {ox2:.1f},{oy2:.1f} "
            f"L {ix1:.1f},{iy1:.1f} "
            f"A {inner_r},{inner_r} 0 {large},0 {ix2:.1f},{iy2:.1f} Z"
        )
        paths.append(f'<path d="{d}" fill="{color}"/>')
        pct = round(count / grand * 100, 1)
        legend_items.append((label, count, pct, color))
        angle = end_angle

    center = (
        f'<text x="{cx}" y="{cy - 5}" text-anchor="middle" font-size="19" '
        f'font-weight="bold" fill="#111827" font-family="Arial,sans-serif">{grand}</text>'
        f'<text x="{cx}" y="{cy + 13}" text-anchor="middle" font-size="10" '
        f'fill="#9ca3af" font-family="Arial,sans-serif">clases</text>'
    )

    # Two-column legend below the donut
    legend_y0 = size + 8
    col_w = size // 2
    legend_svg = []
    for i, (label, count, pct, color) in enumerate(legend_items):
        lx = (i % 2) * col_w
        ly = legend_y0 + (i // 2) * 20
        legend_svg.append(
            f'<rect x="{lx}" y="{ly}" width="9" height="9" rx="2" fill="{color}"/>'
            f'<text x="{lx + 13}" y="{ly + 8}" font-size="11" fill="#4b5563" '
            f'font-family="Arial,sans-serif">{label}: {count} ({pct}%)</text>'
        )

    rows_legend = (len(legend_items) + 1) // 2
    total_h = legend_y0 + rows_legend * 20 + 6

    inner = '\n  '.join(paths + [center] + legend_svg)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{total_h}" '
        f'viewBox="0 0 {size} {total_h}">\n  {inner}\n</svg>'
    )
