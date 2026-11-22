import os
import math
from PIL import Image, ImageDraw, ImageFilter

def create_saas_logo(size=512, is_round=False, foreground_only=False):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    center = size / 2.0
    scale = size / 512.0

    # 1. Background (unless foreground_only for adaptive icons)
    if not foreground_only:
        bg_radius = int(size * 0.24) if not is_round else int(size * 0.5)
        # Create subtle obsidian gradient background
        bg_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        bg_draw = ImageDraw.Draw(bg_img)

        # Base rounded rect or circle
        if is_round:
            bg_draw.ellipse([0, 0, size - 1, size - 1], fill=(11, 15, 25, 255))
        else:
            bg_draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=bg_radius, fill=(11, 15, 25, 255))

        # Radial glow from center-top
        glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        glow_draw = ImageDraw.Draw(glow)
        glow_r = int(size * 0.6)
        glow_draw.ellipse(
            [center - glow_r, int(size * 0.1) - glow_r, center + glow_r, int(size * 0.1) + glow_r],
            fill=(16, 185, 129, 35)
        )
        glow = glow.filter(ImageFilter.GaussianBlur(int(40 * scale)))
        bg_img = Image.alpha_composite(bg_img, glow)

        # Subtle border ring
        if is_round:
            bg_draw = ImageDraw.Draw(bg_img)
            bg_draw.ellipse([1, 1, size - 2, size - 2], outline=(30, 41, 59, 200), width=max(1, int(2 * scale)))
        else:
            bg_draw = ImageDraw.Draw(bg_img)
            bg_draw.rounded_rectangle([1, 1, size - 2, size - 2], radius=bg_radius, outline=(30, 41, 59, 200), width=max(1, int(2 * scale)))

        img = bg_img
        draw = ImageDraw.Draw(img)

    # 2. SaaS Geometric "M" Symbol
    # Scale coordinates to 512 base
    # Left Pillar (Electric Emerald)
    # Right Pillar (Cyber Indigo/Cyan)
    # Intersecting folded Ribbon
    # Dimensions based on 512
    margin_x = 120 * scale
    top_y = 135 * scale
    bot_y = 375 * scale
    pillar_w = 48 * scale
    corner_r = int(18 * scale)

    # Left Pillar (Emerald)
    lp_left = margin_x
    lp_right = margin_x + pillar_w
    draw.rounded_rectangle([lp_left, top_y, lp_right, bot_y], radius=corner_r, fill=(16, 185, 129, 255))

    # Right Pillar (Cyber Indigo)
    rp_right = size - margin_x
    rp_left = rp_right - pillar_w
    draw.rounded_rectangle([rp_left, top_y, rp_right, bot_y], radius=corner_r, fill=(99, 102, 241, 255))

    # Left Chevron Diagonal Ribbon (from left top to center bottom)
    # Polygon points with smooth styling
    poly1 = [
        (lp_left, top_y + 10 * scale),
        (lp_right, top_y),
        (center + 6 * scale, bot_y - 80 * scale),
        (center - 18 * scale, bot_y - 60 * scale)
    ]
    draw.polygon(poly1, fill=(52, 211, 153, 255))

    # Right Chevron Diagonal Ribbon (from right top to center bottom)
    poly2 = [
        (rp_right, top_y + 10 * scale),
        (rp_left, top_y),
        (center - 6 * scale, bot_y - 80 * scale),
        (center + 18 * scale, bot_y - 60 * scale)
    ]
    draw.polygon(poly2, fill=(129, 140, 248, 255))

    # Center Fold Overlap Nexus (Luminous Cyan/Emerald intersection)
    nexus_r = int(22 * scale)
    nexus_y = bot_y - 75 * scale
    draw.ellipse(
        [center - nexus_r, nexus_y - nexus_r, center + nexus_r, nexus_y + nexus_r],
        fill=(6, 182, 212, 255)
    )

    # Core Wealth Sparkle / Coin Core (Gold luxury accent)
    spark_r = int(9 * scale)
    draw.ellipse(
        [center - spark_r, nexus_y - spark_r, center + spark_r, nexus_y + spark_r],
        fill=(251, 191, 36, 255)
    )

    # Subtle top highlights on pillars
    h_h = int(14 * scale)
    draw.rounded_rectangle([lp_left + 4*scale, top_y + 4*scale, lp_right - 4*scale, top_y + 4*scale + h_h], radius=int(6*scale), fill=(110, 231, 183, 220))
    draw.rounded_rectangle([rp_left + 4*scale, top_y + 4*scale, rp_right - 4*scale, top_y + 4*scale + h_h], radius=int(6*scale), fill=(165, 180, 252, 220))

    return img

def main():
    base_res = "android/app/src/main/res"

    sizes = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192,
    }

    # Generate Mipmap Icons
    for folder, px in sizes.items():
        dir_path = os.path.join(base_res, folder)
        os.makedirs(dir_path, exist_ok=True)

        # Standard icon
        img = create_saas_logo(px, is_round=False)
        img.save(os.path.join(dir_path, "ic_launcher.png"), "PNG")

        # Round icon
        img_round = create_saas_logo(px, is_round=True)
        img_round.save(os.path.join(dir_path, "ic_launcher_round.png"), "PNG")

        # Foreground icon (scaled inside 108dp canvas)
        img_fg = create_saas_logo(px, is_round=False, foreground_only=True)
        img_fg.save(os.path.join(dir_path, "ic_launcher_foreground.png"), "PNG")
        print(f"Generated {folder} ({px}x{px})")

    # Generate Play Store / Web 512x512 Master Logo
    os.makedirs("public", exist_ok=True)
    master = create_saas_logo(512, is_round=False)
    master.save("public/app-icon-512.png", "PNG")
    master.save(os.path.join(base_res, "drawable/splash.png"), "PNG")
    print("Generated 512x512 Master Logo & Splash")

    # Generate Splash screens for all orientations
    for d in os.listdir(base_res):
        if d.startswith("drawable-") and os.path.isdir(os.path.join(base_res, d)):
            splash_path = os.path.join(base_res, d, "splash.png")
            # If landscape, e.g. 800x480, if portrait e.g. 480x800
            w, h = (480, 800) if "port" in d else (800, 480)
            if "xxxhdpi" in d: w, h = (w*3, h*3)
            elif "xxhdpi" in d: w, h = (w*2, h*2)
            elif "xhdpi" in d: w, h = (int(w*1.5), int(h*1.5))

            splash = Image.new("RGBA", (w, h), (11, 15, 25, 255))
            logo_sz = min(w, h) // 3
            scaled_logo = master.resize((logo_sz, logo_sz), Image.LANCZOS)
            x_pos = (w - logo_sz) // 2
            y_pos = (h - logo_sz) // 2 - int(h * 0.05)
            splash.paste(scaled_logo, (x_pos, y_pos), scaled_logo)
            splash.save(splash_path, "PNG")

if __name__ == "__main__":
    main()

