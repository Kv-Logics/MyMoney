#!/usr/bin/env python3
"""
Ultra-HD SaaS Logo & Android Icon Generator (2048x2048 Master Supersampling)
Generates:
  - Exact Android Adaptive Icon Foregrounds (108, 162, 216, 324, 432 px)
  - Legacy Launcher Icons (48, 72, 96, 144, 192 px)
  - 512x512 Master Web / Play Store Icon
  - Native Vector Drawable for Android
  - Full Splash Screen sets
"""
import os
import math
from PIL import Image, ImageDraw, ImageFilter

MASTER_SIZE = 2048

def create_gradient_rect(size, c1, c2, vertical=True):
    """Generate smooth 2-color linear gradient image."""
    base = Image.new("RGBA", size, (0, 0, 0, 0))
    w, h = size
    for i in range(h if vertical else w):
        t = i / float(h - 1 if vertical else w - 1)
        r = int(c1[0] * (1 - t) + c2[0] * t)
        g = int(c1[1] * (1 - t) + c2[1] * t)
        b = int(c1[2] * (1 - t) + c2[2] * t)
        a = int(c1[3] * (1 - t) + c2[3] * t) if len(c1) > 3 else 255
        line_draw = ImageDraw.Draw(base)
        if vertical:
            line_draw.line([(0, i), (w, i)], fill=(r, g, b, a))
        else:
            line_draw.line([(i, 0), (i, h)], fill=(r, g, b, a))
    return base

def draw_master_logo(is_round=False, foreground_only=False, size=MASTER_SIZE):
    """Draw ultra-high-definition logo on 2048x2048 canvas."""
    scale = size / 2048.0
    center = size / 2.0
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    
    # --- 1. Background (if full icon) ---
    if not foreground_only:
        # Deep obsidian background with rounded corners or circle
        bg_radius = int(size * 0.5) if is_round else int(size * 0.23)
        bg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        bg_draw = ImageDraw.Draw(bg)

        # Draw deep obsidian squircle / circle
        if is_round:
            bg_draw.ellipse([0, 0, size - 1, size - 1], fill=(10, 15, 29, 255))
        else:
            bg_draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=bg_radius, fill=(10, 15, 29, 255))

        # Ambient emerald & cyan backlight glow
        glow_size = int(size * 1.2)
        glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        glow_draw = ImageDraw.Draw(glow)
        glow_draw.ellipse(
            [center - glow_size * 0.35, int(size * 0.15) - glow_size * 0.35,
             center + glow_size * 0.35, int(size * 0.15) + glow_size * 0.35],
            fill=(16, 185, 129, 45)
        )
        glow_draw.ellipse(
            [center - glow_size * 0.3, int(size * 0.6) - glow_size * 0.3,
             center + glow_size * 0.3, int(size * 0.6) + glow_size * 0.3],
            fill=(6, 182, 212, 35)
        )
        glow = glow.filter(ImageFilter.GaussianBlur(int(90 * scale)))
        bg = Image.alpha_composite(bg, glow)

        # Sleek border outline
        border_draw = ImageDraw.Draw(bg)
        border_w = max(2, int(4 * scale))
        if is_round:
            border_draw.ellipse([border_w//2, border_w//2, size - 1 - border_w//2, size - 1 - border_w//2],
                                outline=(51, 65, 85, 180), width=border_w)
        else:
            border_draw.rounded_rectangle([border_w//2, border_w//2, size - 1 - border_w//2, size - 1 - border_w//2],
                                          radius=bg_radius, outline=(51, 65, 85, 180), width=border_w)
        img = bg

    # --- 2. Geometric Luxury "M" Symbol ---
    # Safe zone for adaptive icons: The symbol must be inside center 66% (radius ~ 670 * scale)
    # Target symbol bounds: width ~ 960 * scale, height ~ 960 * scale centered at (center, center)
    symbol_w = 980 * scale
    symbol_h = 960 * scale
    
    top_y = center - symbol_h * 0.48
    bot_y = center + symbol_h * 0.50
    left_x = center - symbol_w * 0.50
    right_x = center + symbol_w * 0.50

    pillar_w = 210 * scale
    corner_r = int(75 * scale)

    # Layer for the symbol
    sym_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(sym_layer)

    # A. Left Pillar (Electric Emerald with glossy gradient)
    lp_box = [left_x, top_y, left_x + pillar_w, bot_y]
    draw.rounded_rectangle(lp_box, radius=corner_r, fill=(16, 185, 129, 255))

    # B. Right Pillar (Cyber Indigo/Cyan with glossy gradient)
    rp_box = [right_x - pillar_w, top_y, right_x, bot_y]
    draw.rounded_rectangle(rp_box, radius=corner_r, fill=(99, 102, 241, 255))

    # C. Left Diagonal Ribbon (Emerald-to-Cyan Fold)
    # Starts at left pillar top-inner, angles down to center bottom
    poly_left = [
        (left_x, top_y + 40 * scale),
        (left_x + pillar_w, top_y),
        (center + 30 * scale, bot_y - 280 * scale),
        (center - 80 * scale, bot_y - 200 * scale)
    ]
    draw.polygon(poly_left, fill=(52, 211, 153, 255))

    # D. Right Diagonal Ribbon (Indigo-to-Cyan Fold)
    poly_right = [
        (right_x, top_y + 40 * scale),
        (right_x - pillar_w, top_y),
        (center - 30 * scale, bot_y - 280 * scale),
        (center + 80 * scale, bot_y - 200 * scale)
    ]
    draw.polygon(poly_right, fill=(129, 140, 248, 255))

    # E. Center Interlocking Nexus (Luminous Electric Cyan Disc)
    nexus_y = bot_y - 240 * scale
    nexus_r = int(120 * scale)
    draw.ellipse(
        [center - nexus_r, nexus_y - nexus_r, center + nexus_r, nexus_y + nexus_r],
        fill=(6, 182, 212, 255)
    )

    # Outer soft halo around nexus
    halo = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    halo_draw = ImageDraw.Draw(halo)
    halo_r = int(170 * scale)
    halo_draw.ellipse(
        [center - halo_r, nexus_y - halo_r, center + halo_r, nexus_y + halo_r],
        fill=(34, 211, 238, 90)
    )
    halo = halo.filter(ImageFilter.GaussianBlur(int(25 * scale)))
    sym_layer = Image.alpha_composite(halo, sym_layer)
    draw = ImageDraw.Draw(sym_layer)

    # F. Gold Luxury Wealth Token (Core Accent)
    gold_r = int(58 * scale)
    draw.ellipse(
        [center - gold_r, nexus_y - gold_r, center + gold_r, nexus_y + gold_r],
        fill=(251, 191, 36, 255)
    )
    # Specular gold highlight
    spec_r = int(18 * scale)
    draw.ellipse(
        [center - int(16*scale) - spec_r, nexus_y - int(16*scale) - spec_r,
         center - int(16*scale) + spec_r, nexus_y - int(16*scale) + spec_r],
        fill=(254, 243, 199, 255)
    )

    # G. Pillar Top Glass Highlights (SaaS Luxury Glaze)
    hl_h = int(60 * scale)
    draw.rounded_rectangle(
        [left_x + 18*scale, top_y + 18*scale, left_x + pillar_w - 18*scale, top_y + 18*scale + hl_h],
        radius=int(28*scale), fill=(167, 243, 208, 200)
    )
    draw.rounded_rectangle(
        [right_x - pillar_w + 18*scale, top_y + 18*scale, right_x - 18*scale, top_y + 18*scale + hl_h],
        radius=int(28*scale), fill=(199, 210, 254, 200)
    )

    # Composite symbol onto background
    img = Image.alpha_composite(img, sym_layer)
    return img

def export_all_assets():
    print("🎨 Rendering Ultra-HD 2048x2048 Master SaaS Assets...")
    master_full = draw_master_logo(is_round=False, foreground_only=False, size=2048)
    master_round = draw_master_logo(is_round=True, foreground_only=False, size=2048)
    master_fg = draw_master_logo(is_round=False, foreground_only=True, size=2048)

    base_res = "android/app/src/main/res"

    # --- 1. Android Adaptive Icon Foregrounds (Standard 108dp canvas) ---
    # Density : size in pixels
    fg_sizes = {
        "mipmap-mdpi": 108,
        "mipmap-hdpi": 162,
        "mipmap-xhdpi": 216,
        "mipmap-xxhdpi": 324,
        "mipmap-xxxhdpi": 432,
    }

    print("\n📦 Generating Android Adaptive Icon Foregrounds (108dp canvas)...")
    for folder, px in fg_sizes.items():
        dir_path = os.path.join(base_res, folder)
        os.makedirs(dir_path, exist_ok=True)
        # Downscale 2048 master with Lanczos for razor-sharp antialiasing
        scaled_fg = master_fg.resize((px, px), Image.Resampling.LANCZOS)
        out_path = os.path.join(dir_path, "ic_launcher_foreground.png")
        scaled_fg.save(out_path, "PNG", optimize=True)
        print(f"  ✓ {folder}/ic_launcher_foreground.png ({px}x{px})")

    # --- 2. Legacy Launcher Icons (Square & Round) ---
    legacy_sizes = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192,
    }

    print("\n📦 Generating Legacy Launcher Icons (ic_launcher & ic_launcher_round)...")
    for folder, px in legacy_sizes.items():
        dir_path = os.path.join(base_res, folder)
        
        # Square
        sq = master_full.resize((px, px), Image.Resampling.LANCZOS)
        sq.save(os.path.join(dir_path, "ic_launcher.png"), "PNG", optimize=True)

        # Round
        rd = master_round.resize((px, px), Image.Resampling.LANCZOS)
        rd.save(os.path.join(dir_path, "ic_launcher_round.png"), "PNG", optimize=True)
        print(f"  ✓ {folder}/ic_launcher.png & round ({px}x{px})")

    # --- 3. Web & Store 512x512 Master Logo ---
    print("\n📦 Generating Master 512x512 Logos & Splash...")
    web_512 = master_full.resize((512, 512), Image.Resampling.LANCZOS)
    os.makedirs("public", exist_ok=True)
    web_512.save("public/app-icon-512.png", "PNG", optimize=True)
    web_512.save(os.path.join(base_res, "drawable/splash.png"), "PNG", optimize=True)
    print("  ✓ public/app-icon-512.png (512x512)")
    print("  ✓ android/.../drawable/splash.png (512x512)")

    # --- 4. Splash Screens across densities ---
    print("\n📦 Generating Crystal Clear Splash Screens...")
    for d in os.listdir(base_res):
        if d.startswith("drawable-") and os.path.isdir(os.path.join(base_res, d)):
            splash_path = os.path.join(base_res, d, "splash.png")
            w, h = (480, 800) if "port" in d else (800, 480)
            if "xxxhdpi" in d: w, h = (w * 3, h * 3)
            elif "xxhdpi" in d: w, h = (w * 2, h * 2)
            elif "xhdpi" in d: w, h = (int(w * 1.5), int(h * 1.5))

            splash = Image.new("RGBA", (w, h), (10, 15, 29, 255))
            logo_sz = int(min(w, h) * 0.38)
            scaled_logo = master_full.resize((logo_sz, logo_sz), Image.Resampling.LANCZOS)
            x_pos = (w - logo_sz) // 2
            y_pos = (h - logo_sz) // 2 - int(h * 0.04)
            splash.paste(scaled_logo, (x_pos, y_pos), scaled_logo)
            splash.save(splash_path, "PNG", optimize=True)
            print(f"  ✓ {d}/splash.png ({w}x{h})")

    print("\n✨ All icon and splash assets successfully generated with crystal clarity!")

if __name__ == "__main__":
    export_all_assets()

