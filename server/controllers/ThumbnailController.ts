import { Request, Response } from "express";
import Thumbnail from "../models/Thumbnail.js";
import path from "node:path";
import axios from "axios";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";

const stylePrompts = {
  "Bold & Graphic":
    "eye-catching thumbnail, bold typography, vibrant colors, dramatic lighting, high contrast",
  "Tech/Futuristic":
    "futuristic thumbnail, glowing UI, cyber-tech aesthetic, neon accents",
  Minimalist: "minimalist thumbnail, clean layout, modern flat design",
  Photorealistic: "photorealistic thumbnail, DSLR lighting, sharp details",
  Illustrated: "illustrated thumbnail, cartoon/vector style, vibrant colors",
};

const colorSchemeDescriptions = {
  vibrant: "vibrant energetic colors",
  sunset: "warm sunset tones",
  forest: "natural green tones",
  neon: "neon cyberpunk colors",
  purple: "purple magenta palette",
  monochrome: "black and white contrast",
  ocean: "cool blue teal tones",
  pastel: "soft pastel colors",
};

export const generateThumbnail = async (req: Request, res: Response) => {
  try {
    console.log('📦 Request body:', req.body);

    const { userId } = req.session || {};
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const {
      title,
      prompt: user_prompt,
      style,
      aspect_ratio,
      color_scheme,
      text_overlay
    } = req.body;

    // 🔥 BULLETPROOF STRING CONVERSION
    const cleanStyle = typeof style === 'string' && style.trim() ? style.trim() : 'Bold & Graphic';
    const cleanAspect = typeof aspect_ratio === 'string' && aspect_ratio.trim() ? aspect_ratio.trim() : '16:9';
    const cleanColor = typeof color_scheme === 'string' && color_scheme.trim() ? color_scheme.trim() : 'vibrant';

    const thumbnailData = {
      userId,
      title: title || '',
      prompt_used: user_prompt || '',
      user_prompt: user_prompt || '',
      style: cleanStyle,
      aspect_ratio: cleanAspect,
      color_scheme: cleanColor,
      text_overlay: text_overlay || true,
      isGenerating: true
    };

    const thumbnail = await Thumbnail.create(thumbnailData);
    console.log('✅ Thumbnail created:', thumbnail._id);

    // SAFE prompt building
    const safeStyle = cleanStyle;
    const safeColorScheme = cleanColor;

    let prompt = `Create a ${stylePrompts[safeStyle as keyof typeof stylePrompts] || 'bold graphic thumbnail'} for: "${title}"`;
    if (safeColorScheme && colorSchemeDescriptions[safeColorScheme as keyof typeof colorSchemeDescriptions]) {
      prompt += ` Use a ${colorSchemeDescriptions[safeColorScheme as keyof typeof colorSchemeDescriptions]} color scheme.`;
    }
    if (user_prompt) {
      prompt += ` Additional details: ${user_prompt}.`;
    }
    prompt += ` Thumbnail ${cleanAspect}, visually stunning, designed to maximize click-through rate. Bold, professional, impossible to ignore.`;

    console.log('🎨 Generated prompt:', prompt);

    // POLLINATIONS.AI
    const aspectMap: Record<string, string> = {
      '16:9': '1024x576',
      '1:1': '1024x1024',
      '9:16': '576x1024'
    };
    const [width, height] = (aspectMap[cleanAspect] || '1024x576').split('x').map(Number);
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&seed=${Date.now()}&nologo=true&model=flux`;

    console.log('🌐 Calling Pollinations.ai:', url);

    const { data: imageBuffer } = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 45000
    });

    const finalBuffer = Buffer.from(imageBuffer);
    console.log('✅ Image generated successfully');

    // 🔥 VERCEL COMPATIBLE - DIRECT BUFFER UPLOAD (NO FILESYSTEM)
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: 'image' },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload failed:', error);
            reject(error);
          } else {
            resolve(result);
          }
        }
      );
      uploadStream.end(finalBuffer);
    });

    const cloudinaryResult = uploadResult as any;
    thumbnail.image_url = cloudinaryResult.secure_url;
    thumbnail.isGenerating = false;
    await thumbnail.save();

    console.log('☁️ Cloudinary upload success:', cloudinaryResult.secure_url);
    console.log('🎉 Thumbnail generation COMPLETE');
    res.json({ message: 'Thumbnail Generated', thumbnail });

  } catch (error: any) {
    console.error('💥 FULL ERROR:', error);
    res.status(500).json({ message: error.message });
  }
};

// CORE IMAGE GENERATION WITH FAIL-SAFE FALLBACKS
async function generateImageWithFallbacks(
  prompt: string,
  width: number,
  height: number
): Promise<Buffer> {
  const services = [
    // 1. Primary: Pollinations.ai (when working)
    async () => {
      const url = `https://pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&seed=${Date.now()}`;
      console.log("🌐 Trying Pollinations.ai:", url.split('?')[0] + '?...');

      const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 25000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "image/*",
          Referer: "https://pollinations.ai/",
        },
      });
      console.log("✅ Pollinations.ai SUCCESS");
      return response.data;
    },

    // 2. Secondary: Picsum (placeholder images)
    async () => {
      const url = `https://picsum.photos/${width}/${height}?random=${Date.now()}&blur=0.5`;
      console.log("🔄 Fallback: Picsum Photos");

      const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 10000,
      });
      return response.data;
    },

    // 3. Tertiary: Unsplash (quality stock photos)
    async () => {
      const url = `https://source.unsplash.com/featured/${width}x${height}?ai,technology,abstract`;
      console.log("🔄 Fallback: Unsplash");

      const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 15000,
      });
      return response.data;
    },

    // 4. Ultimate fallback: Dummy image with text
    async () => {
      const url = `https://via.placeholder.com/${width}x${height}/4285f4/ffffff?text=AI+Thumbnail&font=roboto`;
      console.log("🔄 Ultimate fallback: Dummy image");

      const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 5000,
      });
      return response.data;
    }
  ];

  // Try each service with exponential backoff
  for (let i = 0; i < services.length; i++) {
    try {
      if (i > 0) {
        // Backoff for retries: 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i - 1)));
      }

      return await services[i]();

    } catch (error: any) {
      console.log(`❌ Service ${i + 1} failed:`, error.response?.status || error.code || error.message);

      if (i === services.length - 1) {
        throw new Error("All image services failed");
      }
    }
  }

  throw new Error("No image services available");
}

export const deleteThumbnail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.session || {};

    const result = await Thumbnail.findOneAndDelete({ _id: id, userId });

    if (!result) {
      return res.status(404).json({ message: "Thumbnail not found" });
    }

    res.json({ message: "Thumbnail deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
