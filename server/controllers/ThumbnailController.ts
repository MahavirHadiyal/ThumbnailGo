import { Request, Response } from "express"
import Thumbnail from "../models/Thumbnail.js";
import path from "node:path";
import axios from "axios";
import fs from 'fs'
import {v2 as cloudinary} from 'cloudinary'

const stylePrompts = {
    'Bold & Graphic': 'eye-catching thumbnail, bold typography, vibrant colors, expressive facial reaction, dramatic lighting, high contrast, click-worthy composition, professional style',
    'Tech/Futuristic': 'futuristic thumbnail, sleek modern design, digital UI elements, glowing accents, holographic effects, cyber-tech aesthetic, sharp lighting, high-tech atmosphere',
    'Minimalist': 'minimalist thumbnail, clean layout, simple shapes, limited color palette, plenty of negative space, modern flat design, clear focal point',
    'Photorealistic': 'photorealistic thumbnail, ultra-realistic lighting, natural skin tones, candid moment, DSLR-style photography, lifestyle realism, shallow depth of field',
    'Illustrated': 'illustrated thumbnail, custom digital illustration, stylized characters, bold outlines, vibrant colors, creative cartoon or vector art style',
}

const colorSchemeDescriptions = {
    vibrant: 'vibrant and energetic colors, high saturation, bold contrasts, eye-catching palette',
    sunset: 'warm sunset tones, orange pink and purple hues, soft gradients, cinematic glow',
    forest: 'natural green tones, earthy colors, calm and organic palette, fresh atmosphere',
    neon: 'neon glow effects, electric blues and pinks, cyberpunk lighting, high contrast glow',
    purple: 'purple-dominant color palette, magenta and violet tones, modern and stylish mood',
    monochrome: 'black and white color scheme, high contrast, dramatic lighting, timeless aesthetic',
    ocean: 'cool blue and teal tones, aquatic color palette, fresh and clean atmosphere',
    pastel: 'soft pastel colors, low saturation, gentle tones, calm and friendly aesthetic',
}

export const generateThumbnail = async (req: Request, res: Response) => {
    try {
        
        
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
        
        
        
        const { data: imageBuffer } = await axios.get(url, { 
            responseType: 'arraybuffer', 
            timeout: 45000 
        });
        
        const finalBuffer = Buffer.from(imageBuffer);
        

        // CLOUDINARY UPLOAD
        const filename = `thumbnail-${Date.now()}.png`;
        const filepath = path.join('images', filename);
        fs.mkdirSync('images', { recursive: true });
        fs.writeFileSync(filepath, finalBuffer);

        const uploadResult = await cloudinary.uploader.upload(filepath, { resource_type: 'image' });
        

        // UPDATE THUMBNAIL
        thumbnail.image_url = uploadResult.url;
        thumbnail.isGenerating = false;
        await thumbnail.save();

        fs.unlinkSync(filepath);
        
        
        res.json({ message: 'Thumbnail Generated', thumbnail });

    } catch (error: any) {
        console.error(' FULL ERROR:', error);
        res.status(500).json({ message: error.message });
    }
};

export const deleteThumbnail = async(req: Request, res: Response) => {
    try {
        const {id} = req.params;
        const {userId} = req.session;

        await Thumbnail.findByIdAndDelete({_id: id, userId});
        res.json({message: "Thumbnail deleted successfully"});
    } catch (error: any) {
        console.log(error);
        res.status(500).json({message: error.message});
    }
};
