#!/usr/bin/env python3
"""
Local Background Removal Bridge for Zenith District Print Studio
Executes rembg with neural soft mask and true RGBA output.
"""

import sys
import argparse
from pathlib import Path
from rembg import remove, new_session
from PIL import Image

def process_image(input_path: str, output_path: str, model_name: str = "u2net", alpha_matting: bool = False):
    in_file = Path(input_path)
    out_file = Path(output_path)
    
    if not in_file.exists():
        print(f"Error: Input file {input_path} does not exist", file=sys.stderr)
        sys.exit(1)
        
    out_file.parent.mkdir(parents=True, exist_ok=True)
    
    with Image.open(in_file) as img:
        img_rgba = img.convert("RGBA")
        session = new_session(model_name)
        
        result = None
        if alpha_matting:
            try:
                result = remove(
                    img_rgba,
                    session=session,
                    alpha_matting=True,
                    alpha_matting_foreground_threshold=240,
                    alpha_matting_background_threshold=10,
                    alpha_matting_erode_size=10
                )
            except Exception as e:
                print(f"Warning: Alpha matting failed ({e}), falling back to neural soft mask", file=sys.stderr)
                result = None

        if result is None:
            # Neural soft mask (pure ONNX inference, fast, robust, memory safe)
            result = remove(
                img_rgba,
                session=session,
                alpha_matting=False,
                post_process_mask=True
            )
        
        result.save(out_file, format="PNG")
        print(f"SUCCESS: Output saved to {output_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Zenith District rembg bridge")
    parser.add_argument("--input", required=True, help="Input image file path")
    parser.add_argument("--output", required=True, help="Output PNG file path")
    parser.add_argument("--model", default="u2net", help="Model name (e.g. u2net, isnet-general-use)")
    parser.add_argument("--alpha-matting", action="store_true", help="Enable experimental closed-form alpha matting")
    
    args = parser.parse_args()
    process_image(
        input_path=args.input,
        output_path=args.output,
        model_name=args.model,
        alpha_matting=args.alpha_matting
    )
