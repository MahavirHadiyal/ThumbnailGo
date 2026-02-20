import { Request, Response } from "express";
import Thumbnail from "../models/Thumbnail.js";
import path from "node:path";
import axios from "axios";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";

const stylePrompts = {
  "Bold & Graphic":
    "eye-catching thumbnail, bold typography, vibrant colors, expressive facial reaction, dramatic lighting, high contrast, click-worthy composition",
  "Tech/Futuristic":
    "futuristic thumbnail, sleek modern design, glowing UI, cyber-tech aesthetic",
  Minimalist:
    "minimalist thumbnail, clean layout, simple shapes, modern flat design",
  Photorealistic:
    "photorealistic thumbnail, ultra-real lighting, DSLR photo style",
  Illustrated:
    "illustrated thumbnail, stylized characters, cartoon/vector style",
};

const colorSchemeDescriptions = {
  vibrant: "vibrant energetic colors, bold contrast",
  sunset: "warm sunset tones, orange pink purple",
  forest: "natural green earthy tones",
  neon: "neon glow, cyberpunk colors",
  purple: "purple magenta palette",
  monochrome: "black and white high contrast",
  ocean: "cool blue teal tones",
  pastel: "soft pastel colors",
};

export const generateThumbnail = async (req: Request, res: Response) => {
  try {
    const { userId } = req.session || {};

    // 🔐 AUTH FIX
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const {
      title,
      prompt: user_prompt,
      style,
      aspect_ratio,
      color_scheme,
      text_overlay,
    } = req.body;

    // SAFE VALUES
    const cleanStyle =
      typeof style === "string" && style.trim() ? style.trim() : "Bold & Graphic";
    const cleanAspect =
      typeof aspect_ratio === "string" && aspect_ratio.trim()
        ? aspect_ratio.trim()
        : "16:9";
    const cleanColor =
      typeof color_scheme === "string" && color_scheme.trim()
        ? color_scheme.trim()
        : "vibrant";

    // CREATE DB ENTRY
    const thumbnail = await Thumbnail.create({
      userId,
      title: title || "",
      prompt_used: user_prompt || "",
      style: cleanStyle,
      aspect_ratio: cleanAspect,
      color_scheme: cleanColor,
      text_overlay: text_overlay ?? true,
      isGenerating: true,
    });

    // BUILD PROMPT
    let prompt = `Create a ${
      stylePrompts[cleanStyle as keyof typeof stylePrompts] ||
      "bold thumbnail"
    } for: "${title}"`;

    if (colorSchemeDescriptions[cleanColor as keyof typeof colorSchemeDescriptions]) {
      prompt += ` Use ${colorSchemeDescriptions[
        cleanColor as keyof typeof colorSchemeDescriptions
      ]}.`;
    }

    if (user_prompt) {
      prompt += ` ${user_prompt}.`;
    }

    prompt += ` Aspect ratio ${cleanAspect}, high CTR, YouTube thumbnail.`;

    // ASPECT MAP
    const aspectMap: Record<string, string> = {
      "16:9": "1024x576",
      "1:1": "1024x1024",
      "9:16": "576x1024",
    };

    const [width, height] = (aspectMap[cleanAspect] || "1024x576")
      .split("x")
      .map(Number);

    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(
      prompt
    )}?width=${width}&height=${height}&seed=${Date.now()}&model=flux`;

    console.log("🎨 Generating:", url);

    // RETRY LOGIC
    let imageBuffer: any;

    for (let i = 0; i < 3; i++) {
      try {
        const response = await axios.get(url, {
          responseType: "arraybuffer",
          timeout: 45000,
          headers: {
            "User-Agent": "Mozilla/5.0",
            Accept: "image/*",
          },
        });

        imageBuffer = response.data;
        break;
      } catch (err) {
        console.log(`Retry ${i + 1} failed`);
        if (i === 2) throw err;
      }
    }

    const finalBuffer = Buffer.from(imageBuffer);

    // SAVE TEMP FILE
    const filename = `thumbnail-${Date.now()}.png`;
    const filepath = path.join("images", filename);
    fs.mkdirSync("images", { recursive: true });
    fs.writeFileSync(filepath, finalBuffer);

    // CLOUDINARY UPLOAD
    const uploadResult = await cloudinary.uploader.upload(filepath, {
      resource_type: "image",
    });

    // UPDATE DB
    thumbnail.image_url = uploadResult.secure_url;
    thumbnail.isGenerating = false;
    await thumbnail.save();

    fs.unlinkSync(filepath);

    res.json({ message: "Thumbnail Generated", thumbnail });
  } catch (error: any) {
    console.error("💥 ERROR:", error);
    res.status(500).json({ message: error.message });
  }
};

// DELETE
export const deleteThumbnail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.session || {};

    await Thumbnail.findOneAndDelete({ _id: id, userId });

    res.json({ message: "Thumbnail deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};