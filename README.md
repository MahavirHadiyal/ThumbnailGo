
# AI Thumbnail Generator

AI-powered thumbnail generator for YouTube/LMS creators using Pollinations.ai Flux model. Production-ready MERN app deployed on Vercel with Cloudinary storage, session auth, and instant professional thumbnails.

# ✨ Features

Instant Generation: Title + prompt → professional thumbnails in seconds

Full Customization: 10+ styles, all aspect ratios (1:1, 16:9, 9:16), color schemes

Free Forever: Pollinations.ai Flux - zero API costs, ~10/min rate limit

Production Storage: Cloudinary CDN + MongoDB persistence

Download Ready: Direct high-res downloads via Cloudinary transformations

Responsive UI: React frontend optimized for creators

# 🛠 Tech Stack

Frontend:   React + TypeScript + Tailwind CSS
Backend:    Node.js + Express + TypeScript
Database:   MongoDB + Mongoose (Thumbnail model)
AI:         Pollinations.ai Flux (no API key)
Storage:    Cloudinary uploads/CDN
Deployment: Vercel serverless
Auth:       Session-based user tracking


# 📁 Project Structure

thumbnail-generator/
├── client/                 
│   ├── src/
│   │   ├── components/
│   │   │   └── Generate.tsx
│   │   └── hooks/
│   └── package.json
├── server/                
│   ├── controllers/
│   │   └── ThumbnailController.ts
│   ├── models/
│   │   └── Thumbnail.ts
│   ├── routes/
│   └── api/
│       └── index.ts      
└── .env.example

# 🔧 Key Challenges Solved

✅ 500 Errors → Fixed Gemini model/API → Pollinations.ai Flux

✅ Validation → Mongoose object→string style conversion

✅ Rate Limits → ~10/min perfect for creator workflows

✅ Storage → Cloudinary CDN + MongoDB indexing

✅ Downloads → Direct Cloudinary transformation URLs

✅ TypeScript → Full type safety across stack


